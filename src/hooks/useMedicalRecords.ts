import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface MedicalRecord {
  id: string;
  patient_id: string;
  antecedents: string | null;
  allergies: string | null;
  traitements: string | null;
  notes: string | null;
  created_at: string;
}

export const useMedicalRecord = (patientId: string | undefined) => {
  return useQuery({
    queryKey: ["medical-record", patientId],
    queryFn: async () => {
      if (!patientId) return null;
      
      const { data, error } = await supabase
        .from("medical_records")
        .select("*")
        .eq("patient_id", patientId)
        .maybeSingle();

      if (error) throw error;
      return data as MedicalRecord | null;
    },
    enabled: !!patientId,
  });
};

export const useCreateOrUpdateMedicalRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, data }: { 
      patientId: string; 
      data: Partial<Omit<MedicalRecord, "id" | "patient_id" | "created_at">> 
    }) => {
      // Check if record exists
      const { data: existing } = await supabase
        .from("medical_records")
        .select("id")
        .eq("patient_id", patientId)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { data: updated, error } = await supabase
          .from("medical_records")
          .update(data)
          .eq("patient_id", patientId)
          .select()
          .single();

        if (error) throw error;
        return updated;
      } else {
        // Create new record
        const { data: created, error } = await supabase
          .from("medical_records")
          .insert({ patient_id: patientId, ...data })
          .select()
          .single();

        if (error) throw error;
        return created;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["medical-record", variables.patientId] });
      toast({
        title: "Succès",
        description: "Dossier médical mis à jour",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le dossier médical",
        variant: "destructive",
      });
      console.error("Error updating medical record:", error);
    },
  });
};
