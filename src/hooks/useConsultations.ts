import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Consultation {
  id: string;
  queue_id: string;
  patient_id: string;
  status: "in_progress" | "completed";
  motif: string | null;
  histoire: string | null;
  examen_clinique: string | null;
  diagnostic: string | null;
  plan: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  follow_up_decision: "pending" | "none" | "planned" | "not_recorded";
}

export type ConsultationFields = Pick<
  Consultation,
  "motif" | "histoire" | "examen_clinique" | "diagnostic" | "plan"
>;

export interface ConsultationPricingItemInput {
  templateId: string | null;
  description: string;
  unitPrice: number;
  quantity: number;
}

export interface ConsultationPricingItem extends ConsultationPricingItemInput {
  description: string;
  unitPrice: number;
}

export interface ConsultationPricingDetails {
  consultationAmount: number | null;
  items: ConsultationPricingItem[];
}

export const useConsultationPricingItems = (queueId: string | undefined) => {
  const { currentUser, sessionToken } = useAuth();

  return useQuery({
    queryKey: ["consultation-pricing-items", queueId, currentUser?.id],
    enabled: Boolean(queueId && sessionToken),
    queryFn: async (): Promise<ConsultationPricingDetails> => {
      if (!queueId || !sessionToken) throw new Error("Une session médecin est nécessaire pour consulter les lignes de facture.");
      const { data, error } = await supabase.rpc("get_consultation_pricing_items", {
        _queue_id: queueId,
        _actor_session_token: sessionToken,
      });
      if (error) throw error;

      const details = data as unknown as {
        consultation_amount: number | null;
        items: { template_id: string | null; description: string; quantity: number; unit_price: number }[];
      } | null;
      if (!details || !Array.isArray(details.items)) {
        throw new Error("Les lignes de tarification reçues sont incomplètes.");
      }
      if (
        (details.consultation_amount !== null && !Number.isFinite(Number(details.consultation_amount)))
        || details.items.some((item) =>
          (item.template_id !== null && typeof item.template_id !== "string")
          || typeof item.description !== "string"
          || !Number.isFinite(Number(item.quantity))
          || !Number.isFinite(Number(item.unit_price)),
        )
      ) {
        throw new Error("Une ou plusieurs lignes de tarification sont invalides.");
      }
      return {
        consultationAmount: details.consultation_amount === null ? null : Number(details.consultation_amount),
        items: details.items.map((item) => ({
          templateId: item.template_id,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
        })),
      };
    },
  });
};

export type LatestPatientConsultation = Pick<
  Consultation,
  "id" | "updated_at" | "completed_at" | "motif" | "examen_clinique" | "diagnostic" | "plan"
>;

export interface LatestPatientPrescription {
  id: string;
  created_at: string;
  prescription_type: "medication" | "laboratory" | "imaging";
  notes: string | null;
  items: {
    nom_medicament: string;
    dosage: string | null;
    posologie: string;
    duree: string | null;
    request_type: "medication" | "laboratory" | "imaging";
    request_details: {
      indication?: string;
      priority?: "routine" | "urgent" | "very_urgent";
      modality?: string;
      region?: string;
    } | null;
  }[];
}

export interface LatestPatientConsultationData {
  consultation: LatestPatientConsultation | null;
  prescriptions: LatestPatientPrescription[];
}

export const useConsultation = (queueId: string | undefined) =>
  useQuery({
    queryKey: ["consultation", queueId],
    queryFn: async () => {
      if (!queueId) return null;

      const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .eq("queue_id", queueId)
        .maybeSingle();

      if (error) throw error;
      return data as Consultation | null;
    },
    enabled: !!queueId,
  });

export const useLatestPatientConsultation = (patientId: string | undefined, beforeDate?: string) =>
  useQuery({
    queryKey: ["latest-patient-consultation", patientId, beforeDate],
    queryFn: async (): Promise<LatestPatientConsultationData> => {
      if (!patientId) return { consultation: null, prescriptions: [] };

      const { data: consultation, error: consultationError } = await supabase
        .from("consultations")
        .select("id, updated_at, completed_at, motif, examen_clinique, diagnostic, plan")
        .eq("patient_id", patientId)
        .eq("status", "completed")
        .lt("completed_at", beforeDate || new Date().toISOString())
        .order("completed_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (consultationError) throw consultationError;

      const { data: prescriptions, error: prescriptionsError } = await supabase
        .from("prescriptions")
        .select("id, created_at, prescription_type, notes")
        .eq("patient_id", patientId)
        .lt("created_at", beforeDate || new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      if (prescriptionsError) throw prescriptionsError;

      const prescriptionIds = (prescriptions || []).map((prescription) => prescription.id);
      const { data: items, error: itemsError } = prescriptionIds.length
        ? await supabase
            .from("prescription_items")
            .select("prescription_id, nom_medicament, dosage, posologie, duree, request_type, request_details, ordre")
            .in("prescription_id", prescriptionIds)
            .order("ordre")
        : { data: [], error: null };

      if (itemsError) throw itemsError;

      return {
        consultation: consultation as LatestPatientConsultation | null,
        prescriptions: (prescriptions || []).map((prescription) => ({
          ...prescription,
          prescription_type: prescription.prescription_type as LatestPatientPrescription["prescription_type"],
          items: (items || [])
            .filter((item) => item.prescription_id === prescription.id)
            .map(({ nom_medicament, dosage, posologie, duree, request_type, request_details }) => ({
              nom_medicament,
              dosage,
              posologie,
              duree,
              request_type: request_type as LatestPatientPrescription["items"][number]["request_type"],
              request_details: request_details as LatestPatientPrescription["items"][number]["request_details"],
            })),
        })),
      };
    },
    enabled: !!patientId,
  });

export const useSaveConsultation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id?: string;
      queueId: string;
      patientId: string;
      userId: string;
      fields: ConsultationFields;
      status?: Consultation["status"];
      silent?: boolean;
    }) => {
      const now = new Date().toISOString();
      const values = {
        ...input.fields,
        status: input.status || "in_progress",
        updated_at: now,
        completed_at: input.status === "completed" ? now : null,
      };

      const query = input.id
        ? supabase
            .from("consultations")
            .update(values)
            .eq("id", input.id)
        : supabase.from("consultations").upsert(
            {
              queue_id: input.queueId,
              patient_id: input.patientId,
              created_by: input.userId,
              ...values,
            },
            { onConflict: "queue_id" },
          );

      const { data, error } = await query.select().single();
      if (error) throw error;
      return data as Consultation;
    },
    onSuccess: (consultation, variables) => {
      queryClient.setQueryData(["consultation", consultation.queue_id], consultation);
      if (!variables.silent) {
        toast.success(consultation.status === "completed" ? "Consultation terminée" : "Consultation enregistrée");
      }
    },
    onError: (error, variables) => {
      console.error("Error saving consultation:", error);
      if (!variables.silent) toast.error("Impossible d'enregistrer la consultation");
    },
  });
};

export const useCompleteConsultation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      consultationId: string;
      followUp?: {
        dueDate: string | null;
        kind: "control" | "exam" | "referral" | "surgery";
        instruction: string;
        destination: string | null;
        specialty: string | null;
        contactName: string | null;
      } | null;
      followUpNone: boolean;
    }) => {
      const { data, error } = await supabase.rpc("complete_consultation", {
        _consultation_id: input.consultationId,
        _follow_up_due_date: input.followUp?.dueDate ?? null,
        _follow_up_type: input.followUp?.kind ?? null,
        _follow_up_instruction: input.followUp?.instruction.trim() || null,
        _follow_up_destination: input.followUp?.kind === "surgery" ? input.followUp.destination?.trim() || null : null,
        _follow_up_specialty: input.followUp?.kind === "referral" ? input.followUp.specialty?.trim() || null : null,
        _follow_up_contact_name: input.followUp?.kind === "referral" ? input.followUp.contactName?.trim() || null : null,
        _follow_up_none: input.followUpNone,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (queueId) => {
      queryClient.invalidateQueries({ queryKey: ["consultation", queueId] });
      queryClient.invalidateQueries({ queryKey: ["latest-patient-consultation"] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["follow-up-tasks"] });
      toast.success("Consultation terminée");
    },
    onError: (error) => {
      console.error("Error completing consultation:", error);
      toast.error("Impossible de terminer la consultation");
    },
  });
};

export const useSaveConsultationPricing = () => {
  const queryClient = useQueryClient();
  const { sessionToken } = useAuth();

  return useMutation({
    mutationFn: async (pricing: {
      queueId: string;
      consultationAmount: number;
      discountType: "none" | "percentage" | "fixed";
      discountValue: number;
      settlementInstruction: "due_at_reception" | "deferred" | "free";
      items: ConsultationPricingItemInput[];
    }) => {
      if (!sessionToken) throw new Error("Votre session médecin a expiré. Reconnectez-vous pour enregistrer la tarification.");
      const { data, error } = await supabase.rpc("save_consultation_pricing", {
        _queue_id: pricing.queueId,
        _consultation_amount: pricing.consultationAmount,
        _discount_type: pricing.discountType,
        _discount_value: pricing.discountValue,
        _settlement_instruction: pricing.settlementInstruction,
        _actor_session_token: sessionToken,
        _items: pricing.items.map((item) => ({
          template_id: item.templateId,
          description: item.description,
          unit_price: item.unitPrice,
          quantity: item.quantity,
        })),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, pricing) => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["queue-entry"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["queue-encashment-summary"] });
      queryClient.invalidateQueries({ queryKey: ["consultation-pricing-items", pricing.queueId] });
      toast.success("Tarification et détail de facture enregistrés");
    },
    onError: (error) => {
      console.error("Error saving consultation pricing:", error);
      toast.error("Impossible d'enregistrer le tarif de consultation");
    },
  });
};
