import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isStructuredMedicationList, type StructuredMedication } from "@/lib/structuredMedications";

export type QueueIntake = {
  id: string;
  queue_id: string;
  weight_kg: number | null;
  height_cm: number | null;
  temperature_c: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  pulse_bpm: number | null;
  respiratory_rate: number | null;
  oxygen_saturation: number | null;
  pain_score: number | null;
  allergies_reported: string | null;
  antecedents_reported: string | null;
  treatments_reported: string | null;
  reason_for_visit: string | null;
  nursing_note: string | null;
  measured_by: string | null;
  created_at: string;
  updated_at: string;
};

type IntakePatient = {
  id: string;
  nom: string;
  prenom: string;
  cin: string | null;
  date_naissance: string | null;
  telephone: string | null;
  mutuelle: string | null;
  numero_mutuelle: string | null;
  sexe: string | null;
  poids: number | null;
  taille: number | null;
};

type MedicalRecordSummary = {
  antecedents: string | null;
  allergies: string | null;
  traitements: string | null;
  traitements_structures: StructuredMedication[];
  notes: string | null;
};

export type QueueIntakeContext = {
  patient: IntakePatient;
  medical_record: MedicalRecordSummary | null;
  current_intake: QueueIntake | null;
  recent_intakes: QueueIntake[];
  previous_visit_count: number;
  last_visit_at: string | null;
};

export type QueueIntakeInput = {
  queueId: string;
  weightKg: number | null;
  heightCm: number | null;
  temperatureC: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  pulseBpm: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  painScore: number | null;
  allergiesReported: string;
  antecedentsReported: string;
  treatmentsReported: string;
  reasonForVisit: string;
  nursingNote: string;
};

export const useQueueIntakeContext = (queueId: string | undefined) => {
  const { sessionToken } = useAuth();

  return useQuery({
    queryKey: ["queue-intake-context", queueId],
    enabled: Boolean(queueId && sessionToken),
    queryFn: async (): Promise<QueueIntakeContext> => {
      if (!queueId || !sessionToken) throw new Error("Une session active est nécessaire pour ouvrir la pré-consultation.");

      const { data, error } = await supabase.rpc("get_queue_intake_context", {
        _queue_id: queueId,
        _actor_session_token: sessionToken,
      });
      if (error) throw error;

      const context = data as unknown as QueueIntakeContext;
      if (
        !context?.patient?.id
        || !Array.isArray(context.recent_intakes)
        || !Number.isFinite(context.previous_visit_count)
        || (context.medical_record !== null && !isStructuredMedicationList(context.medical_record.traitements_structures))
      ) {
        throw new Error("Les informations de pré-consultation reçues sont incomplètes.");
      }
      return context;
    },
  });
};

export const useSaveQueueIntake = () => {
  const queryClient = useQueryClient();
  const { sessionToken } = useAuth();

  return useMutation({
    mutationFn: async (input: QueueIntakeInput) => {
      if (!sessionToken) throw new Error("Votre session a expiré. Reconnectez-vous pour enregistrer la pré-consultation.");

      const { data, error } = await supabase.rpc("save_queue_intake", {
        _queue_id: input.queueId,
        _actor_session_token: sessionToken,
        _weight_kg: input.weightKg,
        _height_cm: input.heightCm,
        _temperature_c: input.temperatureC,
        _systolic_bp: input.systolicBp,
        _diastolic_bp: input.diastolicBp,
        _pulse_bpm: input.pulseBpm,
        _respiratory_rate: input.respiratoryRate,
        _oxygen_saturation: input.oxygenSaturation,
        _pain_score: input.painScore,
        _allergies_reported: input.allergiesReported,
        _antecedents_reported: input.antecedentsReported,
        _treatments_reported: input.treatmentsReported,
        _reason_for_visit: input.reasonForVisit,
        _nursing_note: input.nursingNote,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["queue-intake-context", input.queueId] });
      queryClient.invalidateQueries({ queryKey: ["queue-entry", input.queueId] });
      queryClient.invalidateQueries({ queryKey: ["patient"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast({ title: "Pré-consultation enregistrée", description: "Les constantes et informations recueillies sont transmises au médecin." });
    },
    onError: (error) => {
      toast({ title: "Enregistrement impossible", description: error.message, variant: "destructive" });
    },
  });
};
