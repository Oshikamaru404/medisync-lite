import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
}

export type ConsultationFields = Pick<
  Consultation,
  "motif" | "histoire" | "examen_clinique" | "diagnostic" | "plan"
>;

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
    onSuccess: (consultation) => {
      queryClient.setQueryData(["consultation", consultation.queue_id], consultation);
      toast.success(consultation.status === "completed" ? "Consultation terminée" : "Consultation enregistrée");
    },
    onError: (error) => {
      console.error("Error saving consultation:", error);
      toast.error("Impossible d'enregistrer la consultation");
    },
  });
};

export const useCompleteConsultation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (consultationId: string) => {
      const { data, error } = await supabase.rpc("complete_consultation", {
        _consultation_id: consultationId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (queueId) => {
      queryClient.invalidateQueries({ queryKey: ["consultation", queueId] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
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

  return useMutation({
    mutationFn: async (pricing: {
      queueId: string;
      grossAmount: number;
      discountType: "none" | "percentage" | "fixed";
      discountValue: number;
    }) => {
      const { data, error } = await supabase.rpc("save_consultation_pricing", {
        _queue_id: pricing.queueId,
        _gross_amount: pricing.grossAmount,
        _discount_type: pricing.discountType,
        _discount_value: pricing.discountValue,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["queue-entry"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Tarif et réduction enregistrés sur la facture");
    },
    onError: (error) => {
      console.error("Error saving consultation pricing:", error);
      toast.error("Impossible d'enregistrer le tarif de consultation");
    },
  });
};
