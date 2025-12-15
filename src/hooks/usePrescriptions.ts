import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Medication {
  id: string;
  nom: string;
  dci: string | null;
  forme: string | null;
  dosage_defaut: string | null;
  unite: string | null;
}

export interface PrescriptionItem {
  id?: string;
  prescription_id?: string;
  medication_id?: string | null;
  nom_medicament: string;
  dosage: string | null;
  posologie: string;
  duree: string | null;
  instructions: string | null;
  ordre: number;
}

export interface Prescription {
  id: string;
  patient_id: string;
  date: string;
  notes: string | null;
  created_at: string;
  items?: PrescriptionItem[];
}

export const useMedications = () => {
  return useQuery({
    queryKey: ["medications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .order("nom");

      if (error) throw error;
      return data as Medication[];
    },
  });
};

export const usePrescriptions = (patientId: string | undefined) => {
  return useQuery({
    queryKey: ["prescriptions", patientId],
    queryFn: async () => {
      if (!patientId) return [];

      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Prescription[];
    },
    enabled: !!patientId,
  });
};

export const usePrescription = (prescriptionId: string | undefined) => {
  return useQuery({
    queryKey: ["prescription", prescriptionId],
    queryFn: async () => {
      if (!prescriptionId) return null;

      const { data: prescription, error: prescError } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("id", prescriptionId)
        .single();

      if (prescError) throw prescError;

      const { data: items, error: itemsError } = await supabase
        .from("prescription_items")
        .select("*")
        .eq("prescription_id", prescriptionId)
        .order("ordre");

      if (itemsError) throw itemsError;

      return { ...prescription, items } as Prescription;
    },
    enabled: !!prescriptionId,
  });
};

export const useCreatePrescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      items,
      notes,
    }: {
      patientId: string;
      items: Omit<PrescriptionItem, "id" | "prescription_id">[];
      notes?: string;
    }) => {
      // Create prescription
      const { data: prescription, error: prescError } = await supabase
        .from("prescriptions")
        .insert({ patient_id: patientId, notes })
        .select()
        .single();

      if (prescError) throw prescError;

      // Create items
      if (items.length > 0) {
        const itemsWithPrescriptionId = items.map((item, index) => ({
          ...item,
          prescription_id: prescription.id,
          ordre: index,
        }));

        const { error: itemsError } = await supabase
          .from("prescription_items")
          .insert(itemsWithPrescriptionId);

        if (itemsError) throw itemsError;
      }

      return prescription;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions", variables.patientId] });
      toast.success("Ordonnance créée avec succès");
    },
    onError: (error) => {
      console.error("Error creating prescription:", error);
      toast.error("Erreur lors de la création de l'ordonnance");
    },
  });
};

export const useDeletePrescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string }) => {
      const { error } = await supabase
        .from("prescriptions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { patientId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions", data.patientId] });
      toast.success("Ordonnance supprimée");
    },
    onError: (error) => {
      console.error("Error deleting prescription:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
};
