import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { NomenclatureReference } from "@/lib/prescriptionRequestCatalogs";
import { isStructuredMedicationList, type StructuredMedication } from "@/lib/structuredMedications";

const getDatabaseErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error !== "object" || error === null) return "";

  const databaseError = error as { message?: unknown; details?: unknown; hint?: unknown };
  return [databaseError.message, databaseError.details, databaseError.hint]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" — ");
};

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
  request_type: "medication" | "laboratory" | "imaging";
  request_details: {
    indication?: string;
    priority?: "routine" | "urgent" | "very_urgent";
    specimen?: string;
    preparation?: string;
    modality?: string;
    region?: string;
    laterality?: string;
    contrast?: string;
    catalogReferences?: NomenclatureReference[];
    doseQuantity?: string;
    customDoseQuantity?: string;
    doseUnit?: string;
    frequencyPerDay?: string;
    intakeTiming?: string;
    timesOfDay?: string[];
    customPosology?: boolean;
    customDoseUnit?: string;
    customFrequency?: string;
  } | null;
}

export type PrescriptionType = "medication" | "laboratory" | "imaging";

export interface Prescription {
  id: string;
  patient_id: string;
  date: string;
  notes: string | null;
  prescription_type: PrescriptionType;
  created_at: string;
  items?: PrescriptionItem[];
}

type PrescriptionMutationResult = Prescription & { medicationSyncWarning?: boolean };

const getPrescriptionMedicationDuration = (duration: string | null): StructuredMedication["duration"] => {
  if (!duration) return "unknown";
  if (/traitement continu/i.test(duration)) return "long_term";
  if (/^\s*\d+\s+(jours?|mois)\s*$/i.test(duration)) return "short_term";
  return "unknown";
};

const normalizeMedicationIdentity = (value: string | null | undefined) =>
  (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase();

const syncPrescriptionMedications = async (
  patientId: string,
  prescription: Prescription,
  items: PrescriptionItem[],
  sessionToken: string | null,
) => {
  const medicationItems = items.filter((item) => item.request_type === "medication");
  if (!medicationItems.length) return;
  if (!sessionToken) throw new Error("Votre session a expiré. Reconnectez-vous pour synchroniser les traitements.");

  const { data: record, error: recordError } = await supabase
    .from("medical_records")
    .select("id, traitements_structures")
    .eq("patient_id", patientId)
    .maybeSingle();

  if (recordError) throw recordError;
  const storedMedications = record?.traitements_structures;
  const medications: StructuredMedication[] = [];
  if (storedMedications !== null && storedMedications !== undefined) {
    if (!isStructuredMedicationList(storedMedications)) {
      throw new Error("Le dossier contient une liste de traitements structurés invalide.");
    }
    medications.push(...storedMedications);
  }

  const recordedAt = prescription.created_at || new Date().toISOString();

  for (const [index, item] of medicationItems.entries()) {
    const linkedMedication = medications.find((medication) =>
      (item.id && medication.prescription_item_id === item.id)
      || (
        medication.prescription_id === prescription.id
        && medication.prescription_item_order === item.ordre
        && normalizeMedicationIdentity(medication.name) === normalizeMedicationIdentity(item.nom_medicament)
      ),
    );
    const existingTherapy = linkedMedication ?? medications.find((medication) => {
      const sameIdentity = normalizeMedicationIdentity(medication.name) === normalizeMedicationIdentity(item.nom_medicament)
        && normalizeMedicationIdentity(medication.dose) === normalizeMedicationIdentity(item.dosage);
      const sameRegimen = !medication.frequency
        || normalizeMedicationIdentity(medication.frequency) === normalizeMedicationIdentity(item.posologie);
      const current = medication.status === "active"
        || medication.status === "needs_confirmation"
        || medication.status === "prescribed";
      return sameIdentity && sameRegimen && current;
    });
    if (existingTherapy) {
      const linkedIndex = medications.findIndex((medication) => medication.id === existingTherapy.id);
      const references = existingTherapy.prescription_refs ?? [];
      const alreadyLinked = references.some((reference) =>
        reference.prescription_id === prescription.id
        && (!item.id || reference.prescription_item_id === item.id),
      );
      medications[linkedIndex] = {
        ...existingTherapy,
        ...(linkedMedication ? {
          name: item.nom_medicament,
          dose: item.dosage,
          frequency: item.posologie || null,
          indication: item.request_details?.indication ?? linkedMedication.indication,
          duration: getPrescriptionMedicationDuration(item.duree),
          prescribed_duration_text: item.duree,
          prescribed_regimen: item.posologie || null,
          prescription_item_id: item.id ?? linkedMedication.prescription_item_id,
          prescription_item_order: item.ordre ?? linkedMedication.prescription_item_order,
        } : {
          prescribed_duration_text: item.duree,
          prescribed_regimen: item.posologie || null,
        }),
        prescription_refs: alreadyLinked
          ? references
          : [...references, {
              prescription_id: prescription.id,
              ...(item.id ? { prescription_item_id: item.id } : {}),
            }],
        updated_at: new Date().toISOString(),
      };
      continue;
    }

    const prescriptionItemId = item.id;
    if (prescriptionItemId && medications.some((medication) => medication.prescription_item_id === prescriptionItemId)) continue;

    medications.push({
      id: crypto.randomUUID(),
      name: item.nom_medicament,
      dose: item.dosage,
      route: null,
      frequency: item.posologie || null,
      indication: item.request_details?.indication ?? null,
      duration: getPrescriptionMedicationDuration(item.duree),
      status: "prescribed",
      source: "clinic_prescription",
      origin: "clinic_prescription",
      started_on: null,
      planned_end_on: null,
      confirmed_at: null,
      ended_on: null,
      status_history: [{ status: "prescribed", changed_at: recordedAt }],
      prescription_id: prescription.id,
      ...(prescriptionItemId ? { prescription_item_id: prescriptionItemId } : {}),
      prescription_item_order: item.ordre ?? index,
      prescribed_duration_text: item.duree,
      prescribed_regimen: item.posologie || null,
      prescription_refs: [{
        prescription_id: prescription.id,
        ...(prescriptionItemId ? { prescription_item_id: prescriptionItemId } : {}),
      }],
      created_at: recordedAt,
      updated_at: recordedAt,
    });
  }

  const { error } = await supabase.rpc("save_structured_patient_medications", {
    _patient_id: patientId,
    _medications: medications,
    _actor_session_token: sessionToken,
  });
  if (error) throw error;
};

export const useMedications = (searchQuery: string) => {
  return useQuery({
    queryKey: ["medications", searchQuery.toLocaleLowerCase()],
    queryFn: async () => {
      const searchTerm = searchQuery.trim().replace(/[\\%_]/g, "\\$&").replace(/[(),."]/g, " ");
      if (searchTerm.length < 2) return [];

      const columns = "id, nom, dci, forme, dosage_defaut, unite";
      const pattern = `%${searchTerm}%`;
      const { data, error } = await supabase
        .from("medications")
        .select(columns)
        .or(`nom.ilike.${pattern},dci.ilike.${pattern}`)
        .order("nom")
        .limit(20);

      if (error) throw error;
      return (data || []) as Medication[];
    },
    enabled: searchQuery.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
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
  const { sessionToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      patientId,
      items,
      notes,
      prescriptionType,
    }: {
      patientId: string;
      items: Omit<PrescriptionItem, "id" | "prescription_id">[];
      notes?: string;
      prescriptionType: PrescriptionType;
    }) => {
      const { data: prescription, error: prescError } = await supabase
        .from("prescriptions")
        .insert({ id: crypto.randomUUID(), patient_id: patientId, notes, prescription_type: prescriptionType })
        .select()
        .single();

      if (prescError) throw prescError;

      // Create items
      let savedItems: PrescriptionItem[] = [];
      if (items.length > 0) {
        const itemsWithPrescriptionId = items.map((item, index) => ({
          ...item,
          id: crypto.randomUUID(),
          prescription_id: prescription.id,
          ordre: index,
        }));

        const { error: itemsError } = await supabase
          .from("prescription_items")
          .insert(itemsWithPrescriptionId);

        if (itemsError) {
          const { error: cleanupError } = await supabase
            .from("prescriptions")
            .delete()
            .eq("id", prescription.id);
          if (cleanupError) {
            console.error("Failed to remove incomplete prescription:", cleanupError);
          }
          throw itemsError;
        }

        savedItems = itemsWithPrescriptionId as PrescriptionItem[];
      }

      let medicationSyncWarning = false;
      if (prescriptionType === "medication") {
        try {
          await syncPrescriptionMedications(patientId, prescription as Prescription, savedItems, sessionToken);
          await queryClient.invalidateQueries({ queryKey: ["medical-record", patientId] });
        } catch (error) {
          medicationSyncWarning = true;
          console.error("Prescription created but treatment dossier synchronization failed:", error);
        }
      }

      return { ...prescription, medicationSyncWarning } as PrescriptionMutationResult;
    },
    onSuccess: (prescription, variables) => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions", variables.patientId] });
      if (prescription.medicationSyncWarning) {
        toast.error("Ordonnance créée, mais ses médicaments n’ont pas pu être ajoutés au dossier traitements. Vérifiez le dossier avant de poursuivre.");
      } else if (variables.prescriptionType === "medication") {
        toast.success("Ordonnance créée. Les médicaments sont ajoutés au dossier comme prescrits, sans présumer du début de la prise.");
      } else {
        toast.success("Document médical créé avec succès");
      }
    },
    onError: (error) => {
      console.error("Error creating prescription:", error);
      const message = getDatabaseErrorMessage(error);
      if (/request_type|request_details|prescription_type|schema cache|column .* does not exist/i.test(message)) {
        toast.error("La base de données doit être mise à jour. Appliquez les migrations Supabase avant de créer ce document.");
        return;
      }
      toast.error(`Échec de la création du document${message ? ` : ${message}` : ""}`);
    },
  });
};

export const useUpdatePrescription = () => {
  const queryClient = useQueryClient();
  const { sessionToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      prescription,
      items,
      notes,
      prescriptionType,
    }: {
      prescription: Prescription;
      items: PrescriptionItem[];
      notes?: string;
      prescriptionType: PrescriptionType;
    }) => {
      const { error: prescriptionError } = await supabase
        .from("prescriptions")
        .update({ notes: notes || null, prescription_type: prescriptionType })
        .eq("id", prescription.id);
      if (prescriptionError) throw prescriptionError;

      const retainedIds = items.flatMap((item) => item.id ? [item.id] : []);
      let deleteQuery = supabase
        .from("prescription_items")
        .delete()
        .eq("prescription_id", prescription.id);
      if (retainedIds.length > 0) {
        deleteQuery = deleteQuery.not("id", "in", `(${retainedIds.join(",")})`);
      }
      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      const savedItems: PrescriptionItem[] = [];
      for (const [index, item] of items.entries()) {
        const itemData = {
          medication_id: item.medication_id || null,
          nom_medicament: item.nom_medicament,
          dosage: item.dosage,
          posologie: item.posologie,
          duree: item.duree,
          instructions: item.instructions,
          ordre: index,
          request_type: item.request_type,
          request_details: item.request_details || {},
        };
        const result = item.id
          ? await supabase
            .from("prescription_items")
            .update(itemData)
            .eq("id", item.id)
            .eq("prescription_id", prescription.id)
            .select("id")
            .single()
          : await supabase
            .from("prescription_items")
            .insert({ ...itemData, id: crypto.randomUUID(), prescription_id: prescription.id })
            .select("id")
            .single();
        if (result.error) throw result.error;
        savedItems.push({ ...item, id: result.data.id, prescription_id: prescription.id, ordre: index });
      }

      let medicationSyncWarning = false;
      if (prescriptionType === "medication") {
        try {
          await syncPrescriptionMedications(prescription.patient_id, prescription as Prescription, savedItems, sessionToken);
          await queryClient.invalidateQueries({ queryKey: ["medical-record", prescription.patient_id] });
        } catch (error) {
          medicationSyncWarning = true;
          console.error("Prescription updated but treatment dossier synchronization failed:", error);
        }
      }

      return { ...prescription, medicationSyncWarning } as PrescriptionMutationResult;
    },
    onSuccess: (prescription) => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions", prescription.patient_id] });
      queryClient.invalidateQueries({ queryKey: ["prescription", prescription.id] });
      if (prescription.medicationSyncWarning) {
        toast.error("Ordonnance mise à jour, mais le dossier traitements n’a pas pu être synchronisé. Vérifiez-le avant de poursuivre.");
      } else {
        toast.success("Document médical mis à jour");
      }
    },
    onError: (error) => {
      console.error("Error updating prescription:", error);
      toast.error(`Échec de la modification${getDatabaseErrorMessage(error) ? ` : ${getDatabaseErrorMessage(error)}` : ""}`);
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
