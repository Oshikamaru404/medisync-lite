import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRIVATE_BUCKET = "patient-documents-private";
const LEGACY_BUCKET = "patient-documents";
const ASSETS_BUCKET = "cabinet-assets";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_ANALYSIS_SIZE = 200 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const EXTENSION_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

type JsonRecord = Record<string, unknown>;

const jsonResponse = (body: JsonRecord, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const asString = (value: unknown) => typeof value === "string" ? value.trim() : "";

function normalizeDocumentAnalysis(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError("Le rapport documentaire est invalide.", 400);
  }
  const raw = value as JsonRecord;
  const summary = typeof raw.summary === "string" ? raw.summary.slice(0, 4000) : "";
  const detailedReport = typeof raw.detailedReport === "string" ? raw.detailedReport.slice(0, 10000) : "";
  const extractedText = typeof raw.extractedText === "string" ? raw.extractedText.slice(0, 30000) : "";
  if (!summary || !detailedReport) {
    throw new HttpError("Le rapport doit contenir un résumé et un compte rendu détaillé.", 400);
  }

  const labResults = Array.isArray(raw.labResults)
    ? raw.labResults.slice(0, 150).flatMap((entry): JsonRecord[] => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const row = entry as JsonRecord;
      if (typeof row.name !== "string" || typeof row.value !== "string") return [];
      const flag = ["low", "normal", "high", "unknown"].includes(String(row.flag)) ? String(row.flag) : "unknown";
      const confidence = typeof row.confidence === "number" && Number.isFinite(row.confidence)
        ? Math.max(0, Math.min(1, row.confidence))
        : 0;
      return [{
        name: row.name.slice(0, 120),
        value: row.value.slice(0, 120),
        unit: typeof row.unit === "string" ? row.unit.slice(0, 40) : "",
        referenceRange: typeof row.referenceRange === "string" ? row.referenceRange.slice(0, 100) : "",
        flag,
        confidence,
      }];
    })
    : [];

  const normalized: JsonRecord = {
    documentType: typeof raw.documentType === "string" ? raw.documentType.slice(0, 80) : "Document médical",
    documentDate: typeof raw.documentDate === "string" ? raw.documentDate.slice(0, 40) : "",
    summary,
    detailedReport,
    keyPoints: Array.isArray(raw.keyPoints)
      ? raw.keyPoints.filter((point): point is string => typeof point === "string").slice(0, 20).map((point) => point.slice(0, 500))
      : [],
    labResults,
    extractedText,
    verificationNotes: Array.isArray(raw.verificationNotes)
      ? raw.verificationNotes.filter((note): note is string => typeof note === "string").slice(0, 20).map((note) => note.slice(0, 500))
      : [],
    generatedAt: new Date().toISOString(),
    model: "qwen/qwen3.8-27b",
    reviewStatus: "to_review",
  };
  if (new TextEncoder().encode(JSON.stringify(normalized)).byteLength > MAX_ANALYSIS_SIZE) {
    throw new HttpError("Le rapport dépasse la taille maximale autorisée.", 413);
  }
  return normalized;
}

function legacyObjectPath(url: string): string | null {
  const marker = `/storage/v1/object/public/${LEGACY_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;

  try {
    return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
  } catch {
    throw new Error("Le chemin de l’ancien document est invalide.");
  }
}

function privateObjectPath(url: string): string | null {
  return url.startsWith("private:") ? url.slice("private:".length) : null;
}

function isSafePath(path: string, patientId: string): boolean {
  return path.startsWith(`${patientId}/`) && !path.split("/").some((part) => part === "..");
}

async function authenticate(supabase: SupabaseClient, sessionToken: string) {
  if (!sessionToken) throw new HttpError("Session requise.", 403);

  const { data: session, error: sessionError } = await supabase
    .from("app_sessions")
    .select("user_id")
    .eq("session_token", sessionToken)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) throw new HttpError("Session expirée ou invalide.", 403);

  const { data: user, error: userError } = await supabase
    .from("app_users")
    .select("id, role, is_active")
    .eq("id", session.user_id)
    .maybeSingle();

  if (userError) throw userError;
  if (!user?.is_active || user.role !== "medecin") {
    throw new HttpError("Accès médecin requis pour les documents du dossier.", 403);
  }
  return user;
}

async function ensurePatient(supabase: SupabaseClient, patientId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(patientId)) {
    throw new HttpError("Identifiant patient invalide.", 400);
  }
  const { data, error } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError("Patient introuvable.", 404);
}

async function migrateLegacyLogo(supabase: SupabaseClient) {
  const { data: setting, error: settingError } = await supabase
    .from("settings")
    .select("id, value")
    .eq("key", "custom_logo")
    .maybeSingle();
  if (settingError) throw settingError;

  const oldPath = legacyObjectPath(asString(setting?.value));
  if (!setting || !oldPath || !oldPath.startsWith("logos/")) return null;

  const { data: file, error: downloadError } = await supabase.storage.from(LEGACY_BUCKET).download(oldPath);
  if (downloadError) throw downloadError;

  const { error: uploadError } = await supabase.storage
    .from(ASSETS_BUCKET)
    .upload(oldPath, file, { upsert: true, contentType: file.type || "image/png" });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(oldPath);
  const { error: updateError } = await supabase
    .from("settings")
    .update({ value: publicUrlData.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", setting.id);
  if (updateError) throw updateError;

  const { error: removeError } = await supabase.storage.from(LEGACY_BUCKET).remove([oldPath]);
  if (removeError) throw removeError;
  return publicUrlData.publicUrl;
}

async function moveLegacyDocument(supabase: SupabaseClient, document: {
  id: string;
  patient_id: string;
  url: string;
}) {
  const sourcePath = legacyObjectPath(document.url);
  if (!sourcePath) return document.url;
  if (!isSafePath(sourcePath, document.patient_id)) {
    throw new Error("Le chemin du document ne correspond pas au patient.");
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from(LEGACY_BUCKET)
    .download(sourcePath);
  if (downloadError) throw downloadError;

  const extension = sourcePath.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin";
  const destinationPath = `${document.patient_id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .upload(destinationPath, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (uploadError) throw uploadError;

  const privateUrl = `private:${destinationPath}`;
  const { error: updateError } = await supabase
    .from("documents")
    .update({ url: privateUrl })
    .eq("id", document.id);
  if (updateError) {
    await supabase.storage.from(PRIVATE_BUCKET).remove([destinationPath]);
    throw updateError;
  }

  const { error: removeError } = await supabase.storage.from(LEGACY_BUCKET).remove([sourcePath]);
  if (removeError) throw removeError;
  return privateUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Méthode non autorisée." }, 405);

  try {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_ANALYSIS_SIZE + 32 * 1024) {
      throw new HttpError("Le rapport dépasse la taille maximale autorisée.", 413);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Configuration serveur Supabase incomplète.");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const body = await req.json() as JsonRecord;
    const action = asString(body.action);
    await authenticate(supabase, asString(body.sessionToken));

    if (action === "migrate_legacy_logo") {
      return jsonResponse({ success: true, publicUrl: await migrateLegacyLogo(supabase) });
    }

    const patientId = asString(body.patientId);
    if (action === "prepare_logo_upload") {
      const extension = asString(body.extension).toLowerCase().replace(/^\./, "");
      if (!["jpg", "jpeg", "png", "webp"].includes(extension)) {
        return jsonResponse({ error: "Format de logo non pris en charge." }, 400);
      }
      const path = `logos/${crypto.randomUUID()}.${extension}`;
      const { data, error } = await supabase.storage.from(ASSETS_BUCKET).createSignedUploadUrl(path);
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path);
      return jsonResponse({ path, token: data.token, publicUrl: publicUrlData.publicUrl });
    }

    await ensurePatient(supabase, patientId);

    if (action === "list") {
      await migrateLegacyLogo(supabase);
      const { data, error } = await supabase
        .from("documents")
        .select("id, patient_id, type, nom, url, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return jsonResponse({ documents: data ?? [] });
    }

    if (action === "prepare_upload") {
      const extension = asString(body.extension).toLowerCase().replace(/^\./, "");
      const contentType = asString(body.contentType);
      if (!ALLOWED_TYPES.has(contentType) || EXTENSION_TYPES[extension] !== contentType) {
        return jsonResponse({ error: "Format de fichier non pris en charge." }, 400);
      }

      const path = `${patientId}/${crypto.randomUUID()}.${extension}`;
      const { data, error } = await supabase.storage
        .from(PRIVATE_BUCKET)
        .createSignedUploadUrl(path);
      if (error) throw error;
      return jsonResponse({ path, token: data.token });
    }

    if (action === "register_upload") {
      const path = asString(body.path);
      const name = asString(body.name);
      const type = asString(body.type);
      if (!isSafePath(path, patientId) || !name || name.length > 140 || !type || type.length > 40) {
        return jsonResponse({ error: "Informations du document invalides." }, 400);
      }
      const { data: file, error: fileError } = await supabase.storage
        .from(PRIVATE_BUCKET)
        .download(path);
      if (fileError) throw fileError;
      if (file.size > MAX_FILE_SIZE) {
        await supabase.storage.from(PRIVATE_BUCKET).remove([path]);
        return jsonResponse({ error: "Le fichier dépasse la limite de 20 Mo." }, 413);
      }

      const { data, error } = await supabase
        .from("documents")
        .insert({ patient_id: patientId, nom: name, type, url: `private:${path}` })
        .select("id, patient_id, type, nom, url, created_at")
        .single();
      if (error) {
        await supabase.storage.from(PRIVATE_BUCKET).remove([path]);
        throw error;
      }
      return jsonResponse({ document: data }, 201);
    }

    const documentId = asString(body.documentId);
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id, patient_id, type, nom, url, created_at")
      .eq("id", documentId)
      .eq("patient_id", patientId)
      .maybeSingle();
    if (documentError) throw documentError;
    if (!document) return jsonResponse({ error: "Document introuvable." }, 404);

    if (action === "get_analysis") {
      const { data, error } = await supabase
        .from("documents")
        .select("ai_analysis")
        .eq("id", documentId)
        .eq("patient_id", patientId)
        .maybeSingle();
      if (error) throw error;
      return jsonResponse({ analysis: data?.ai_analysis ?? null });
    }

    if (action === "save_analysis") {
      const analysis = normalizeDocumentAnalysis(body.analysis);
      const { data, error } = await supabase
        .from("documents")
        .update({ ai_analysis: analysis })
        .eq("id", documentId)
        .eq("patient_id", patientId)
        .select("ai_analysis")
        .single();
      if (error) throw error;
      return jsonResponse({ analysis: data.ai_analysis });
    }

    if (action === "signed_url") {
      const objectPath = privateObjectPath(document.url)
        ?? privateObjectPath(await moveLegacyDocument(supabase, document));
      if (!objectPath || !isSafePath(objectPath, patientId)) {
        return jsonResponse({ error: "Chemin du document invalide." }, 400);
      }
      const { data, error } = await supabase.storage
        .from(PRIVATE_BUCKET)
        .createSignedUrl(objectPath, 900);
      if (error) throw error;
      return jsonResponse({ signedUrl: data.signedUrl });
    }

    if (action === "delete") {
      const path = privateObjectPath(document.url);
      if (path) {
        if (!isSafePath(path, patientId)) return jsonResponse({ error: "Chemin du document invalide." }, 400);
        const { error } = await supabase.storage.from(PRIVATE_BUCKET).remove([path]);
        if (error) throw error;
      } else {
        const legacyPath = legacyObjectPath(document.url);
        if (legacyPath && isSafePath(legacyPath, patientId)) {
          const { error } = await supabase.storage.from(LEGACY_BUCKET).remove([legacyPath]);
          if (error) throw error;
        }
      }
      const { error } = await supabase.from("documents").delete().eq("id", documentId).eq("patient_id", patientId);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Action inconnue." }, 400);
  } catch (error) {
    console.error("patient-documents error:", error);
    const message = error instanceof Error ? error.message : "Erreur interne du service documentaire.";
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ error: message }, status);
  }
});
