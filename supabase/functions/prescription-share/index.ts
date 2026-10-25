import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const ACCESS_CODE_PATTERN = /^\d{8}$/;
const SHARE_WINDOW_HOURS = new Set([24, 72, 168]);
const SAFE_SETTINGS = [
  "doctor_name",
  "doctor_name_arabic",
  "cabinet_specialty",
  "cabinet_specialty_arabic",
  "cabinet_address",
  "cabinet_city",
  "cabinet_phone",
  "cabinet_email",
  "doctor_email",
  "order_number",
];

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

type JsonRecord = Record<string, unknown>;

const jsonResponse = (body: JsonRecord, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store, private",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });

const readString = (value: unknown) => typeof value === "string" ? value.trim() : "";

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function secureHex(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function secureAccessCode(): string {
  const ceiling = Math.floor(0x1_0000_0000 / 90_000_000) * 90_000_000;
  const random = new Uint32Array(1);
  do {
    crypto.getRandomValues(random);
  } while (random[0] >= ceiling);
  return String(10_000_000 + random[0] % 90_000_000);
}

function calculateAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const birthDate = new Date(`${dateOfBirth}T12:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  const years = today.getFullYear() - birthDate.getFullYear();
  const beforeBirthday = today.getMonth() < birthDate.getMonth()
    || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  return Math.max(0, years - (beforeBirthday ? 1 : 0));
}

async function loadDocument(admin: SupabaseClient, prescriptionId: string) {
  const { data: prescription, error: prescriptionError } = await admin
    .from("prescriptions")
    .select("id, date, notes, prescription_type, patient_id")
    .eq("id", prescriptionId)
    .maybeSingle();
  if (prescriptionError) throw prescriptionError;
  if (!prescription) throw new HttpError("Ordonnance introuvable ou modifiée.", 410);

  const { data: patient, error: patientError } = await admin
    .from("patients")
    .select("nom, prenom, date_naissance, sexe")
    .eq("id", prescription.patient_id)
    .maybeSingle();
  if (patientError) throw patientError;
  if (!patient) throw new HttpError("Ordonnance introuvable ou modifiée.", 410);

  const { data: items, error: itemsError } = await admin
    .from("prescription_items")
    .select("nom_medicament, dosage, posologie, duree, instructions, ordre, request_type, request_details")
    .eq("prescription_id", prescription.id)
    .order("ordre", { ascending: true })
    .order("nom_medicament", { ascending: true })
    .limit(101);
  if (itemsError) throw itemsError;
  if ((items ?? []).length > 100) {
    throw new HttpError("Cette ordonnance contient trop de lignes pour un partage sécurisé.", 413);
  }

  const { data: settings, error: settingsError } = await admin
    .from("settings")
    .select("key, value")
    .in("key", SAFE_SETTINGS);
  if (settingsError) throw settingsError;
  const settingValues = new Map((settings ?? []).map(({ key, value }) => [key, value]));
  const cabinet = Object.fromEntries(SAFE_SETTINGS.map((key) => [key, settingValues.get(key) ?? null]));

  return {
    prescription: {
      id: prescription.id,
      date: prescription.date,
      notes: prescription.notes,
      prescriptionType: prescription.prescription_type,
      items: items ?? [],
    },
    patient: {
      nom: patient.nom,
      prenom: patient.prenom,
      age: calculateAge(patient.date_naissance),
      sexe: patient.sexe,
    },
    cabinet,
  };
}

function requireRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError("Requête invalide.", 400);
  }
  return value as JsonRecord;
}

async function authenticateDoctor(admin: SupabaseClient, token: string) {
  if (!token || token.length > 128) throw new HttpError("Session médecin requise.", 403);

  const { data: session, error: sessionError } = await admin
    .from("app_sessions")
    .select("user_id")
    .eq("session_token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (sessionError) throw sessionError;
  if (!session) throw new HttpError("Session expirée ou invalide.", 403);

  const { data: user, error: userError } = await admin
    .from("app_users")
    .select("id, role, is_active")
    .eq("id", session.user_id)
    .maybeSingle();
  if (userError) throw userError;
  if (!user?.is_active || user.role !== "medecin") {
    throw new HttpError("Le partage d’ordonnance est réservé au médecin.", 403);
  }
  return user;
}

async function createShare(admin: SupabaseClient, body: JsonRecord) {
  const user = await authenticateDoctor(admin, readString(body.sessionToken));
  const prescriptionId = readString(body.prescriptionId);
  const expiresInHours = Number(body.expiresInHours);
  if (!UUID_PATTERN.test(prescriptionId) || !SHARE_WINDOW_HOURS.has(expiresInHours)) {
    throw new HttpError("Ordonnance ou durée de partage invalide.", 400);
  }

  const document = await loadDocument(admin, prescriptionId);
  const documentFingerprint = await sha256(JSON.stringify(document));

  const token = secureHex(32);
  const accessCode = secureAccessCode();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + expiresInHours * 60 * 60 * 1000);
  const { data: share, error: insertError } = await admin
    .from("prescription_shares")
    .insert({
      prescription_id: prescriptionId,
      created_by: user.id,
      token_hash: await sha256(token),
      access_code_hash: await sha256(`${token}:${accessCode}`),
      document_fingerprint: documentFingerprint,
      created_at: createdAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("id, expires_at")
    .single();
  if (insertError) throw insertError;

  const { error: eventError } = await admin
    .from("prescription_share_events")
    .insert({ share_id: share.id, actor_user_id: user.id, event_type: "created" });
  if (eventError) throw eventError;

  return { shareId: share.id, token, accessCode, expiresAt: share.expires_at };
}

async function listShares(admin: SupabaseClient, body: JsonRecord) {
  const user = await authenticateDoctor(admin, readString(body.sessionToken));
  const prescriptionId = readString(body.prescriptionId);
  if (!UUID_PATTERN.test(prescriptionId)) throw new HttpError("Ordonnance invalide.", 400);

  const { data, error } = await admin
    .from("prescription_shares")
    .select("id, created_at, expires_at, revoked_at, access_count, last_accessed_at")
    .eq("prescription_id", prescriptionId)
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return { shares: data ?? [] };
}

async function revokeShare(admin: SupabaseClient, body: JsonRecord) {
  const user = await authenticateDoctor(admin, readString(body.sessionToken));
  const shareId = readString(body.shareId);
  if (!UUID_PATTERN.test(shareId)) throw new HttpError("Lien de partage invalide.", 400);

  const revokedAt = new Date().toISOString();
  const { data, error } = await admin
    .from("prescription_shares")
    .update({ revoked_at: revokedAt })
    .eq("id", shareId)
    .eq("created_by", user.id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError("Lien introuvable ou déjà révoqué.", 404);

  const { error: eventError } = await admin
    .from("prescription_share_events")
    .insert({ share_id: shareId, actor_user_id: user.id, event_type: "revoked" });
  if (eventError) throw eventError;
  return { revoked: true };
}

async function openShare(admin: SupabaseClient, body: JsonRecord) {
  const token = readString(body.token);
  const accessCode = readString(body.accessCode);
  if (!TOKEN_PATTERN.test(token) || !ACCESS_CODE_PATTERN.test(accessCode)) {
    throw new HttpError("Lien ou code invalide, expiré ou révoqué.", 403);
  }

  const tokenHash = await sha256(token);
  const { data: share, error: shareError } = await admin
    .from("prescription_shares")
    .select("id, prescription_id, access_code_hash, document_fingerprint, expires_at")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (shareError) throw shareError;
  if (!share) throw new HttpError("Lien ou code invalide, expiré ou révoqué.", 403);

  if (!constantTimeEqual(share.access_code_hash, await sha256(`${token}:${accessCode}`))) {
    const { error: attemptError } = await admin
      .rpc("claim_prescription_share_attempt", { p_token_hash: tokenHash });
    if (attemptError) throw attemptError;
    throw new HttpError("Lien ou code invalide, expiré ou révoqué.", 403);
  }

  const document = await loadDocument(admin, share.prescription_id);
  if (!constantTimeEqual(share.document_fingerprint, await sha256(JSON.stringify(document)))) {
    throw new HttpError("Cette ordonnance a été modifiée depuis la création du lien. Demandez au cabinet un nouveau lien.", 410);
  }

  const { data: accessCount, error: accessError } = await admin
    .rpc("record_prescription_share_access", { p_share_id: share.id });
  if (accessError) throw accessError;
  if (accessCount === null) throw new HttpError("Lien ou code invalide, expiré ou révoqué.", 403);

  return { ...document, expiresAt: share.expires_at };
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Méthode non autorisée." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase Edge Function credentials are not configured.");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const body = requireRecord(await request.json());
    const action = readString(body.action);

    if (action === "create") return jsonResponse(await createShare(admin, body));
    if (action === "list") return jsonResponse(await listShares(admin, body));
    if (action === "revoke") return jsonResponse(await revokeShare(admin, body));
    if (action === "open") return jsonResponse(await openShare(admin, body));
    throw new HttpError("Action de partage inconnue.", 400);
  } catch (error) {
    if (error instanceof HttpError) return jsonResponse({ error: error.message }, error.status);
    console.error("Prescription sharing request failed:", error);
    return jsonResponse({ error: "Le service de partage est momentanément indisponible." }, 500);
  }
});
