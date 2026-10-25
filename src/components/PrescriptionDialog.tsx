import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Pill, Search, AlertTriangle, FlaskConical, ScanLine, ChevronDown, Pencil, Sunrise, Sun, Sunset, Moon, Utensils, UtensilsCrossed, Soup, Coffee, Clock3, BookmarkPlus, Trash2, ListPlus, BookOpenCheck, Settings2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMedications, useCreatePrescription, useUpdatePrescription, usePrescription, Medication, PrescriptionItem, PrescriptionType, Prescription } from "@/hooks/usePrescriptions";
import { useMedicalRecord } from "@/hooks/useMedicalRecords";
import { useAuth } from "@/contexts/AuthContext";
import { LocalPrescriptionTemplate, readPrescriptionTemplates, writePrescriptionTemplates } from "@/lib/prescriptionTemplates";
import {
  IMAGING_REQUEST_CATALOG,
  LAB_REQUEST_CATALOG,
  MOROCCAN_ORDER_BASKETS,
  type NomenclatureReference,
} from "@/lib/prescriptionRequestCatalogs";
import { allergyAlertService } from "@/services/allergyAlertData";

interface PrescriptionDialogProps {
  patientId: string;
  patientName: string;
  patientAllergies?: string | null;
  patientContext?: {
    antecedents?: string | null;
    allergies?: string | null;
    traitements?: string | null;
  };
  initialPrescription?: Prescription;
  onCreated?: (prescriptionId: string, prescriptionType: PrescriptionType, itemNames: string[]) => void;
  children?: React.ReactNode;
}

const normalizeClinicalTerm = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const cleanExamRequestDetails = (
  details: NonNullable<PrescriptionItem["request_details"]> | null | undefined,
): NonNullable<PrescriptionItem["request_details"]> => {
  const cleaned = { ...(details || {}) };
  if (!cleaned.specimen || /^à préciser/i.test(cleaned.specimen)) delete cleaned.specimen;
  if (!cleaned.modality || cleaned.modality.toLocaleLowerCase() === "autre") delete cleaned.modality;
  if (!cleaned.laterality || cleaned.laterality === "Non précisé") delete cleaned.laterality;
  if (!cleaned.contrast || cleaned.contrast === "À préciser") delete cleaned.contrast;
  return cleaned;
};

const createReferenceBasketTemplate = (basket: (typeof MOROCCAN_ORDER_BASKETS)[number]): LocalPrescriptionTemplate => ({
  id: `reference-${basket.id}`,
  name: basket.name,
  tags: ["Bilan de référence"],
  prescriptionType: basket.type,
  createdAt: new Date(0).toISOString(),
  items: basket.items.map((item, index) => ({
    medication_id: null,
    nom_medicament: item.name,
    dosage: null,
    posologie: "",
    duree: null,
    instructions: null,
    ordre: index,
    request_type: basket.type,
    request_details: {
      ...(basket.type === "laboratory" ? { priority: "routine" as const } : {}),
      ...(basket.type === "imaging" && item.modality && item.modality.toLocaleLowerCase() !== "autre" ? { modality: item.modality } : {}),
      ...(item.references?.length ? { catalogReferences: item.references } : {}),
    },
  })),
});

const ALLERGY_LEVEL_LABELS = {
  CRITICAL: "Critique",
  HIGH: "Élevé",
  MODERATE: "Modéré",
  LOW: "Faible",
  CONTEXT_DEPENDENT: "À évaluer",
  NONE: "Aucun",
} as const;

const POSOLOGY_UNITS = [
  "comprimé",
  "gélule",
  "sachet",
  "cuillère à café",
  "cuillère à soupe",
  "mL",
  "goutte",
  "bouffée",
  "injection",
  "ampoule",
  "suppositoire",
  "application",
  "dose",
  "patch",
];

const TIME_OF_DAY = [
  { value: "morning", label: "Matin", Icon: Sunrise, color: "text-amber-700" },
  { value: "noon", label: "Midi", Icon: Sun, color: "text-orange-600" },
  { value: "evening", label: "Soir", Icon: Sunset, color: "text-indigo-600" },
  { value: "bedtime", label: "Coucher", Icon: Moon, color: "text-violet-700" },
];

const INTAKE_TIMINGS = [
  { value: "before_meal", label: "Avant le repas", Icon: Clock3 },
  { value: "with_meal", label: "Pendant le repas", Icon: Utensils },
  { value: "after_meal", label: "Après le repas", Icon: Soup },
  { value: "empty_stomach", label: "À jeun", Icon: Coffee },
  { value: "any_time", label: "Indifférent", Icon: Sun },
];

type PosologyDetails = NonNullable<PrescriptionItem["request_details"]>;
type PosologyFields = Pick<PosologyDetails, "doseQuantity" | "customDoseQuantity" | "doseUnit" | "customDoseUnit" | "frequencyPerDay" | "customFrequency" | "intakeTiming" | "timesOfDay" | "customPosology">;

const getPosologyFields = (item: PrescriptionItem): PosologyFields => {
  const details = item.request_details || {};
  const fields: PosologyFields = {
    doseQuantity: details.doseQuantity || "",
    customDoseQuantity: details.customDoseQuantity || "",
    doseUnit: details.doseUnit || "",
    customDoseUnit: details.customDoseUnit || "",
    frequencyPerDay: details.frequencyPerDay || "",
    customFrequency: details.customFrequency || "",
    intakeTiming: details.intakeTiming || "",
    timesOfDay: details.timesOfDay || [],
    customPosology: details.customPosology || false,
  };

  if (fields.customPosology || fields.doseQuantity || fields.doseUnit || fields.frequencyPerDay || fields.timesOfDay?.length || fields.intakeTiming) {
    return fields;
  }

  const units = [...POSOLOGY_UNITS].sort((a, b) => b.length - a.length);
  const unitPattern = units.map((unit) => unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const match = item.posologie.match(new RegExp(`^\\s*(\\d+(?:[.,]\\d+)?)\\s+(${unitPattern})(?:s)?(?:\\s+(.*))?$`, "i"));
  if (!match) return { ...fields, customPosology: Boolean(item.posologie) };

  const tail = (match[3] || "").toLocaleLowerCase();
  const timesOfDay = TIME_OF_DAY
    .filter(({ value }) => value === "morning" ? /matin/.test(tail)
      : value === "noon" ? /midi/.test(tail)
        : value === "evening" ? /soir/.test(tail)
          : /coucher|nuit/.test(tail))
    .map(({ value }) => value);
  const frequencyMatch = tail.match(/(\d+)\s*fois?\s*(?:par|\/)\s*jour/);
  const intakeTiming = /avant/.test(tail) ? "before_meal"
    : /pendant|avec le repas/.test(tail) ? "with_meal"
      : /apr[eè]s/.test(tail) ? "after_meal"
        : /jeun/.test(tail) ? "empty_stomach"
          : "";
  const unparsedTail = tail
    .replace(/(\d+)\s*fois?\s*(?:par|\/)\s*jour/g, "")
    .replace(/matin|midi|soir|au coucher|coucher|nuit|avant(?: le)? repas|pendant(?: le)? repas|avec le repas|apr[eè]s(?: le)? repas|[àa] jeun/g, "")
    .replace(/\bet\b|[,;]/g, "")
    .trim();
  if (unparsedTail) return { ...fields, customPosology: Boolean(item.posologie) };

  return {
    ...fields,
    doseQuantity: match[1],
    doseUnit: POSOLOGY_UNITS.find((unit) => unit.toLocaleLowerCase() === match[2].toLocaleLowerCase()) || "",
    frequencyPerDay: frequencyMatch?.[1] || (timesOfDay.length ? String(timesOfDay.length) : ""),
    timesOfDay,
    intakeTiming,
  };
};

const formatPosology = (fields: PosologyFields) => {
  const quantity = fields.doseQuantity === "other" ? fields.customDoseQuantity : fields.doseQuantity;
  const amount = [quantity, fields.doseUnit === "other" ? fields.customDoseUnit : fields.doseUnit].filter(Boolean).join(" ");
  const frequency = fields.frequencyPerDay === "other"
    ? fields.customFrequency
    : fields.frequencyPerDay === "as_needed"
      ? "selon besoin"
      : fields.frequencyPerDay
        ? `${fields.frequencyPerDay} fois par jour`
        : "";
  const times = TIME_OF_DAY
    .filter(({ value }) => fields.timesOfDay?.includes(value))
    .map(({ label }) => label.toLocaleLowerCase())
    .join(", ");
  const timing = INTAKE_TIMINGS.find(({ value }) => value === fields.intakeTiming)?.label.toLocaleLowerCase() || "";
  return [amount, frequency, times, timing].filter(Boolean).join(" · ");
};

const getDailyFrequencyLimit = (fields: PosologyFields) => {
  const frequency = fields.frequencyPerDay === "other" ? fields.customFrequency : fields.frequencyPerDay;
  if (!frequency || frequency === "as_needed") return null;
  const count = Number(frequency);
  return Number.isInteger(count) && count > 0 ? count : null;
};

type TreatmentDurationUnit = "jours" | "mois" | "continuous" | "custom";

const parseTreatmentDuration = (duration: string | null) => {
  if (duration === "Traitement continu") return { amount: "", unit: "continuous" as const };
  const match = duration?.match(/^\s*(\d+)\s+(jours?|mois)\s*$/i);
  return match
    ? { amount: match[1], unit: match[2].toLowerCase().startsWith("jour") ? "jours" as const : "mois" as const }
    : duration
      ? { amount: duration, unit: "custom" as const }
      : { amount: "", unit: "jours" as const };
};

const formatTreatmentDuration = (amount: string, unit: TreatmentDurationUnit) => {
  if (unit === "continuous") return "Traitement continu";
  if (unit === "custom") return amount.trim() || null;
  const count = Number(amount);
  if (!Number.isInteger(count) || count < 1) return null;
  return `${count} ${unit === "jours" ? count === 1 ? "jour" : "jours" : "mois"}`;
};

const PRIORITY_LABELS: Record<NonNullable<PrescriptionItem["request_details"]>["priority"] & string, string> = {
  routine: "Programmée",
  urgent: "Urgente",
  very_urgent: "Très urgente",
};

export const PrescriptionDialog = ({
  patientId,
  patientName,
  patientAllergies,
  initialPrescription,
  onCreated,
  children,
}: PrescriptionDialogProps) => {
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id;
  const [open, setOpen] = useState(false);
  const dialogBodyRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [expandedItemIndex, setExpandedItemIndex] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [medicationPopoverOpen, setMedicationPopoverOpen] = useState(false);
  const medicationSearchInputRef = useRef<HTMLInputElement>(null);
  const medicationResultsRef = useRef<HTMLDivElement>(null);
  const [templatesPopoverOpen, setTemplatesPopoverOpen] = useState(false);
  const [prescriptionTemplates, setPrescriptionTemplates] = useState<LocalPrescriptionTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateTags, setTemplateTags] = useState("");
  const [acknowledgedAllergyReview, setAcknowledgedAllergyReview] = useState<string | null>(null);
  const [pendingAllergyMedication, setPendingAllergyMedication] = useState<Medication | null>(null);
  const [mode, setMode] = useState<PrescriptionType>("medication");
  const [requestSearch, setRequestSearch] = useState("");
  const [showNomenclatureReferences, setShowNomenclatureReferences] = useState(false);
  const [quickTemplateSearch, setQuickTemplateSearch] = useState("");
  const canUseAdvancedBilling = currentUser?.role === "secretaire" || currentUser?.role === "assistant";
  const [requestDetails, setRequestDetails] = useState<NonNullable<PrescriptionItem["request_details"]>>({ priority: "routine" });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 100);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const {
    data: medications = [],
    isFetching: medicationsLoading,
    isError: medicationsError,
  } = useMedications(debouncedSearchQuery);

  useEffect(() => {
    if (!open) return;
    const frameId = window.requestAnimationFrame(() => {
      if (dialogBodyRef.current) dialogBodyRef.current.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [open]);
  const {
    data: medicalRecord,
    isLoading: medicalRecordLoading,
    isError: medicalRecordError,
  } = useMedicalRecord(patientId);
  const resolvedPatientAllergies = patientAllergies ?? medicalRecord?.allergies ?? "";
  const structuredPatientAllergies = useMemo(
    () => allergyAlertService.parsePatientAllergies(resolvedPatientAllergies),
    [resolvedPatientAllergies],
  );
  const createPrescription = useCreatePrescription();
  const updatePrescription = useUpdatePrescription();

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const normalizedDebouncedSearch = debouncedSearchQuery.toLocaleLowerCase();
  const medicationSearchDebouncing = normalizedSearch !== normalizedDebouncedSearch;
  const filteredMedications = medications;
  const isExamination = mode !== "medication";
  const isSaving = createPrescription.isPending || updatePrescription.isPending;
  const allergyChecks = useMemo(
    () => items
      .filter((item) => item.request_type === "medication")
      .map((item) => ({
        item,
        ...allergyAlertService.checkMedication(structuredPatientAllergies, {
          id: item.medication_id || null,
          name: item.nom_medicament,
        }),
      })),
    [items, structuredPatientAllergies],
  );
  const allergyAlerts = allergyChecks.flatMap((check) => check.alerts);
  const unverifiedMedicationNames = structuredPatientAllergies.length > 0
    ? allergyChecks.filter((check) => !check.referenceFound).map(({ item }) => item.nom_medicament)
    : [];
  const allergyTextNeedsReview = Boolean(resolvedPatientAllergies.trim()) && structuredPatientAllergies.length === 0;
  const allergyReviewRequired = allergyAlerts.some((alert) => alert.requiresConfirmation)
    || unverifiedMedicationNames.length > 0
    || allergyTextNeedsReview;
  const allergyReviewSignature = JSON.stringify({
    alerts: allergyAlerts.map(({ allergenCode, drugId, level }) => [allergenCode, drugId, level]),
    unverifiedMedicationNames,
    allergyTextNeedsReview,
  });
  const allergyReviewIsAcknowledged = acknowledgedAllergyReview === allergyReviewSignature;
  const allergyDataReady = patientAllergies !== undefined || (!medicalRecordLoading && !medicalRecordError);
  const templatesForMode = useMemo(() => [
    ...prescriptionTemplates.filter((template) => template.prescriptionType === mode),
    ...MOROCCAN_ORDER_BASKETS
      .filter((basket) => basket.type === mode)
      .map(createReferenceBasketTemplate),
  ], [mode, prescriptionTemplates]);
  const visibleQuickTemplates = templatesForMode.filter((template) =>
    normalizeClinicalTerm(`${template.name} ${template.tags.join(" ")}`).includes(normalizeClinicalTerm(quickTemplateSearch)),
  );

  useEffect(() => {
    if (!currentUserId) {
      setPrescriptionTemplates([]);
      return;
    }
    try {
      setPrescriptionTemplates(readPrescriptionTemplates(currentUserId));
    } catch (error) {
      console.error("Unable to load local prescription templates:", error);
      toast.error("Impossible de lire les modèles locaux de prescriptions.");
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!open || !initialPrescription) return;
    setItems(initialPrescription.items || []);
    setExpandedItemIndex(initialPrescription.items?.length ? 0 : null);
    setNotes(initialPrescription.notes || "");
    setMode(initialPrescription.prescription_type);
    setRequestDetails(cleanExamRequestDetails(initialPrescription.items?.[0]?.request_details || { priority: "routine" }));
    setRequestSearch("");
    setShowNomenclatureReferences(false);
    setQuickTemplateSearch("");
    setSearchQuery("");
  }, [open, initialPrescription]);

  const changeMode = (nextMode: PrescriptionType) => {
    if (items.length > 0 || nextMode === mode) return;
    setMode(nextMode);
    setRequestDetails({
      priority: "routine",
    });
    setRequestSearch("");
    setShowNomenclatureReferences(false);
    setQuickTemplateSearch("");
    setSearchQuery("");
  };

  const addMedication = (medication: typeof medications[0]) => {
    setAcknowledgedAllergyReview(null);
    const newItem: PrescriptionItem = {
      medication_id: medication.id,
      nom_medicament: medication.nom,
      dosage: medication.dosage_defaut ? `${medication.dosage_defaut} ${medication.unite || ""}`.trim() : null,
      posologie: "1 comprimé matin et soir",
      duree: "7 jours",
      instructions: null,
      ordre: items.length,
      request_type: "medication",
      request_details: {},
    };
    setExpandedItemIndex(items.length);
    setItems([...items, newItem]);
    setSearchQuery("");
    setRequestSearch("");
    setShowNomenclatureReferences(false);
    setRequestDetails({ priority: "routine" });
    setMedicationPopoverOpen(false);
  };

  const selectMedication = (medication: Medication) => {
    const check = allergyAlertService.checkMedication(structuredPatientAllergies, {
      id: medication.id,
      name: medication.nom,
      dci: medication.dci,
    });
    const highRiskAlert = check.alerts.find((alert) =>
      alert.level === "CRITICAL" || alert.level === "HIGH" || alert.requiresConfirmation,
    );
    if (highRiskAlert) {
      setPendingAllergyMedication(medication);
      setMedicationPopoverOpen(false);
      return;
    }
    addMedication(medication);
  };

  const addCustomMedication = () => {
    if (!searchQuery.trim()) return;
    setAcknowledgedAllergyReview(null);
    const newItem: PrescriptionItem = {
      medication_id: null,
      nom_medicament: searchQuery,
      dosage: null,
      posologie: "Selon prescription",
      duree: null,
      instructions: null,
      ordre: items.length,
      request_type: "medication",
      request_details: {},
    };
    setExpandedItemIndex(items.length);
    setItems([...items, newItem]);
    setSearchQuery("");
    setMedicationPopoverOpen(false);
  };

  const savePrescriptionTemplate = (useAutomaticName = false) => {
    const templateItems = items.filter((item) => item.request_type === mode);
    if (!currentUser || templateItems.length === 0) return;
    const baseName = useAutomaticName
      ? `${mode === "medication" ? "Ordonnance" : mode === "laboratory" ? "Biologie" : "Imagerie"} - ${templateItems[0].nom_medicament}${templateItems.length > 1 ? ` + ${templateItems.length - 1}` : ""}`
      : templateName.trim();
    if (!baseName) return;
    const existingNames = new Set(prescriptionTemplates.map((template) => template.name.toLocaleLowerCase()));
    let name = baseName;
    let duplicateIndex = 2;
    while (existingNames.has(name.toLocaleLowerCase())) {
      name = `${baseName} (${duplicateIndex})`;
      duplicateIndex += 1;
    }
    const template: LocalPrescriptionTemplate = {
      id: crypto.randomUUID(),
      name,
      tags: useAutomaticName ? [] : [...new Set(templateTags.split(",").map((tag) => tag.trim()).filter(Boolean))],
      prescriptionType: mode,
      items: templateItems.map(({ id, prescription_id, ...item }, index) => ({ ...item, ordre: index })),
      createdAt: new Date().toISOString(),
    };
    const nextTemplates = [template, ...prescriptionTemplates];
    try {
      writePrescriptionTemplates(currentUser.id, nextTemplates);
      setPrescriptionTemplates(nextTemplates);
      setTemplateName("");
      setTemplateTags("");
      setTemplatesPopoverOpen(false);
      toast.success(`Ordonnance enregistrée comme modèle « ${name} »`);
    } catch (error) {
      console.error("Unable to save local prescription template:", error);
      toast.error("Impossible d’enregistrer le modèle sur cet appareil.");
    }
  };

  const addPrescriptionTemplate = (template: LocalPrescriptionTemplate) => {
    if (items.length > 0 && (mode !== template.prescriptionType || items.some((item) => item.request_type !== template.prescriptionType))) {
      toast.error("Videz le brouillon actuel avant de changer de type de modèle.");
      return;
    }
    const isReferenceBasket = template.id.startsWith("reference-");
    const existingNames = new Set(items.map((item) => normalizeClinicalTerm(item.nom_medicament)));
    const templateItems = isReferenceBasket
      ? template.items.filter((item) => {
        const name = normalizeClinicalTerm(item.nom_medicament);
        if (existingNames.has(name)) return false;
        existingNames.add(name);
        return true;
      })
      : template.items;
    if (templateItems.length === 0) {
      toast.info("Ce bilan contient uniquement des examens déjà présents dans le brouillon.");
      return;
    }
    const newItems = templateItems.map((item, index) => ({
      ...item,
      id: undefined,
      prescription_id: undefined,
      request_details: item.request_type === "medication" ? item.request_details : cleanExamRequestDetails(item.request_details),
      ordre: items.length + index,
    }));
    setItems((currentItems) => [...currentItems, ...newItems.map((item, index) => ({
      ...item,
      ordre: currentItems.length + index,
    }))]);
    setExpandedItemIndex(isReferenceBasket ? null : items.length);
    setMode(template.prescriptionType);
    setMedicationPopoverOpen(false);
    setTemplatesPopoverOpen(false);
    toast.success(`${template.name} ajouté au brouillon. Vérifie chaque ligne avant l’enregistrement.`);
  };

  const deletePrescriptionTemplate = (templateId: string) => {
    if (!currentUser) return;
    const nextTemplates = prescriptionTemplates.filter((template) => template.id !== templateId);
    try {
      writePrescriptionTemplates(currentUser.id, nextTemplates);
      setPrescriptionTemplates(nextTemplates);
      toast.success("Modèle supprimé");
    } catch (error) {
      console.error("Unable to delete local prescription template:", error);
      toast.error("Impossible de supprimer le modèle de cet appareil.");
    }
  };

  const updateItem = (index: number, updates: Partial<PrescriptionItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  const updatePosology = (index: number, updates: Partial<PosologyFields>) => {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const updatedFields = { ...getPosologyFields(item), ...updates, customPosology: false };
      const dailyLimit = getDailyFrequencyLimit(updatedFields);
      const fields = dailyLimit === null
        ? updatedFields
        : { ...updatedFields, timesOfDay: updatedFields.timesOfDay?.slice(0, dailyLimit) };
      return {
        ...item,
        posologie: formatPosology(fields),
        request_details: { ...(item.request_details || {}), ...fields },
      };
    }));
  };

  const updateCustomPosology = (index: number, posologie: string) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index
      ? {
        ...item,
        posologie,
        request_details: { ...(item.request_details || {}), customPosology: true },
      }
      : item));
  };

  const togglePosologyMode = (index: number, customPosology: boolean) => {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const fields = { ...getPosologyFields(item), customPosology };
      return {
        ...item,
        posologie: customPosology ? item.posologie : formatPosology(fields),
        request_details: { ...(item.request_details || {}), ...fields },
      };
    }));
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    setExpandedItemIndex((current) => current === null
      ? null
      : current === index
        ? (items.length > 1 ? Math.min(index, items.length - 2) : null)
        : current > index ? current - 1 : current);
  };

  const addExaminationRequest = (
    requestType: "laboratory" | "imaging",
    name: string,
    modality?: string,
    references?: NomenclatureReference[],
  ) => {
    const sharedDetails = cleanExamRequestDetails(requestDetails);
    const details = {
      ...sharedDetails,
      ...(modality && modality.toLocaleLowerCase() !== "autre" ? { modality } : {}),
      ...(requestType === "laboratory" && sharedDetails.specimen ? { specimen: sharedDetails.specimen } : {}),
      ...(references?.length ? { catalogReferences: references } : {}),
    };
    const normalizedName = normalizeClinicalTerm(name);
    const exists = items.some((item) =>
      item.request_type === requestType && normalizeClinicalTerm(item.nom_medicament) === normalizedName,
    );
    if (exists) return;
    setExpandedItemIndex(null);
    setItems((current) => [...current, {
      medication_id: null,
      nom_medicament: name,
      dosage: null,
      posologie: "",
      duree: null,
      instructions: null,
      ordre: current.length,
      request_type: requestType,
      request_details: details,
    }]);
  };

  const updateSharedRequestDetails = (
    updates: Partial<NonNullable<PrescriptionItem["request_details"]>>,
  ) => {
    setRequestDetails((current) => ({ ...current, ...updates }));
    setItems((current) => current.map((item) => ({
      ...item,
      request_details: { ...(item.request_details || {}), ...updates },
    })));
  };

  const handleSubmit = () => {
    if (items.length === 0) return;
    if (mode === "medication" && !allergyDataReady) {
      toast.error("Impossible de vérifier les allergies du patient. Réessaie après le chargement du dossier.");
      return;
    }
    if (mode === "medication" && allergyReviewRequired && !allergyReviewIsAcknowledged) {
      toast.error("Vérifie et confirme les alertes allergologiques avant de continuer.");
      return;
    }

    const onSuccess = (prescription: { id: string }) => {
      setOpen(false);
      setItems([]);
      setExpandedItemIndex(null);
      setNotes("");
      setRequestDetails({
        priority: "routine",
      });
      onCreated?.(prescription.id, mode, items.map((item) => item.nom_medicament));
    };

    if (initialPrescription) {
      updatePrescription.mutate(
        { prescription: initialPrescription, items, notes, prescriptionType: mode },
        { onSuccess },
      );
    } else {
      createPrescription.mutate(
        { patientId, items, notes: notes || undefined, prescriptionType: mode },
        { onSuccess },
      );
    }
  };

  const resetForm = () => {
    setItems([]);
    setAcknowledgedAllergyReview(null);
    setExpandedItemIndex(null);
    setNotes("");
    setSearchQuery("");
    setRequestSearch("");
    setQuickTemplateSearch("");
    setMode("medication");
    setRequestDetails({
      priority: "routine",
    });
  };

  const submitDisabled = items.length === 0
    || isSaving
    || (mode === "medication" && !allergyDataReady)
    || (mode === "medication" && allergyReviewRequired && !allergyReviewIsAcknowledged);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle prescription
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="!top-[2.5dvh] !translate-y-0 flex max-h-[95dvh] max-w-7xl flex-col overflow-hidden rounded-3xl border-[#dce9e2] bg-[#f8fbf9] p-0 text-slate-900 shadow-2xl">
        <DialogHeader className="border-b border-[#d9e8df] bg-[linear-gradient(115deg,#e9f5ed_0%,#f8fbf8_58%,#eef5f2_100%)] px-4 py-3.5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white bg-white/80 text-[#23634f] shadow-sm">
                {mode === "medication" ? <Pill className="h-5 w-5" /> : mode === "laboratory" ? <FlaskConical className="h-5 w-5" /> : <ScanLine className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#638372]">{initialPrescription ? "Mise à jour de la prescription" : "Nouvelle prescription"}</p>
                <DialogTitle className="mt-0.5 truncate text-base font-bold text-[#194d40] sm:text-lg">
                  {mode === "medication" ? "Ordonnance" : mode === "laboratory" ? "Prescription biologique" : "Prescription d’imagerie"}
                </DialogTitle>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-full border border-white/90 bg-white/75 px-3 py-1.5 shadow-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e7f3eb] text-[10px] font-bold text-[#23634f]">
                {patientName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase()}
              </span>
              <span className="max-w-[min(50vw,18rem)] truncate text-xs font-semibold text-slate-800">{patientName}</span>
            </div>
          </div>
        </DialogHeader>

        <div ref={dialogBodyRef} className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,0.85fr)]">
          <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[#dfeae4] bg-white/80 p-1.5 shadow-sm" role="tablist" aria-label="Type de prescription">
            {([
              ["medication", "Ordonnance", "Médicaments", Pill],
              ["laboratory", "Biologie", "Analyses", FlaskConical],
              ["imaging", "Imagerie", "Prescription", ScanLine],
            ] as const).map(([value, label, subtitle, Icon]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                aria-label={`${label} · ${subtitle}`}
                disabled={items.length > 0 && mode !== value}
                className={`flex min-h-[3.6rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#69a184] disabled:cursor-not-allowed disabled:opacity-45 sm:flex-row sm:gap-2 sm:px-3 ${mode === value
                  ? value === "medication" ? "border-sky-200 bg-sky-50 text-sky-950 shadow-sm"
                    : value === "laboratory" ? "border-emerald-200 bg-emerald-50 text-emerald-950 shadow-sm"
                      : "border-violet-200 bg-violet-50 text-violet-950 shadow-sm"
                  : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50"}`}
                onClick={() => changeMode(value)}
              >
                <Icon className={`h-4 w-4 shrink-0 ${mode === value ? value === "medication" ? "text-sky-700" : value === "laboratory" ? "text-emerald-700" : "text-violet-700" : "text-slate-500"}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-bold sm:text-xs">{label}</span>
                  <span className="hidden text-[9px] font-medium opacity-70 sm:block">{subtitle}</span>
                </span>
              </button>
            ))}
          </div>

          {mode === "medication" && (
          <>
          <section
            className={`flex items-start gap-3 rounded-2xl border p-3.5 shadow-sm ${
              !allergyDataReady
                ? "border-amber-200 bg-amber-50/80 text-amber-950"
                : resolvedPatientAllergies.trim()
                  ? "border-amber-200 bg-amber-50/80 text-amber-950"
                  : "border-emerald-200 bg-emerald-50/65 text-emerald-950"
            }`}
            aria-label="Allergies du patient"
            role={!allergyDataReady || resolvedPatientAllergies.trim() ? "alert" : "status"}
          >
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${resolvedPatientAllergies.trim() || !allergyDataReady ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold">
                {!allergyDataReady
                  ? "Vérification allergologique indisponible"
                  : resolvedPatientAllergies.trim()
                    ? "Allergies déclarées au dossier"
                    : "Aucune allergie enregistrée"}
              </p>
              {!allergyDataReady ? (
                <p className="mt-0.5 text-xs">
                  {medicalRecordLoading
                    ? "Chargement du dossier allergologique…"
                    : "Impossible de charger le dossier. L’enregistrement de l’ordonnance est désactivé jusqu’au rétablissement du contrôle."}
                </p>
              ) : resolvedPatientAllergies.trim() ? (
                <>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5">{resolvedPatientAllergies}</p>
                  {allergyTextNeedsReview && (
                    <p className="mt-1 text-xs font-semibold">
                      Texte allergologique non reconnu automatiquement : vérification manuelle obligatoire avant de poursuivre.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-0.5 text-xs">Vérifier le statut allergique avec le patient avant de prescrire.</p>
              )}
            </div>
          </section>
          {/* Medication Search */}
          <div className="space-y-2.5 rounded-2xl border border-sky-100 bg-[linear-gradient(140deg,#f0f8fc_0%,#f8fbfd_100%)] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="text-xs font-bold text-slate-900">Ajouter un médicament</Label>
                <p className="mt-0.5 text-[10px] text-slate-500">Catalogue thérapeutique · recherche par nom ou DCI</p>
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-sky-800 shadow-sm">
                <Search className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <Popover open={medicationPopoverOpen} onOpenChange={setMedicationPopoverOpen}>
              <PopoverAnchor asChild>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={medicationSearchInputRef}
                    placeholder="Rechercher un médicament (nom ou DCI)..."
                    value={searchQuery}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown" && medicationPopoverOpen) {
                        const firstResult = medicationResultsRef.current?.querySelector<HTMLButtonElement>('[role="listitem"]');
                        if (firstResult) {
                          event.preventDefault();
                          firstResult.focus();
                        }
                      }
                    }}
                    onChange={(e) => {
                      const nextQuery = e.target.value;
                      setSearchQuery(nextQuery);
                      setMedicationPopoverOpen(nextQuery.trim().length >= 2);
                    }}
                    className="h-11 rounded-xl border-sky-200 bg-white pl-10 shadow-sm focus-visible:ring-sky-200"
                  />
                </div>
              </PopoverAnchor>
              <PopoverContent
                portalled={false}
                side="bottom"
                className="max-h-[var(--radix-popover-content-available-height)] w-[min(34rem,calc(100vw-3rem))] max-w-[calc(100vw-3rem)] overflow-hidden p-0"
                align="start"
                onOpenAutoFocus={(event) => event.preventDefault()}
              >
                <ScrollArea className={filteredMedications.length > 0 && normalizedSearch.length >= 2
                  ? "h-[min(420px,var(--radix-popover-content-available-height))]"
                  : "h-auto max-h-24"}>
                  {normalizedSearch.length < 2 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground" role="status" aria-live="polite">
                      Saisissez au moins 2 caractères pour rechercher
                    </div>
                  ) : medicationSearchDebouncing || medicationsLoading ? (
                    <div className="p-3 text-center text-sm text-muted-foreground" role="status">
                      Recherche en cours…
                    </div>
                  ) : medicationsError ? (
                    <div className="p-3 text-center text-sm text-destructive" role="status">
                      La recherche est momentanément indisponible
                    </div>
                  ) : filteredMedications.length > 0 ? (
                    <div ref={medicationResultsRef} className="grid min-w-0 grid-cols-1 gap-2 p-3 sm:grid-cols-2" role="list" aria-label="Résultats médicaments">
                      {filteredMedications.map((med) => (
                        (() => {
                          const allergyCheck = allergyAlertService.checkMedication(structuredPatientAllergies, {
                            id: med.id,
                            name: med.nom,
                            dci: med.dci,
                          });
                          const primaryAlert = allergyCheck.alerts[0];
                          return (
                            <button
                              key={med.id}
                              type="button"
                              role="listitem"
                              onKeyDown={(event) => {
                                const results = medicationResultsRef.current?.querySelectorAll<HTMLButtonElement>('[role="listitem"]');
                                if (!results) return;

                                const currentIndex = Array.from(results).indexOf(event.currentTarget);
                                if (event.key === "ArrowDown" && currentIndex < results.length - 1) {
                                  event.preventDefault();
                                  results[currentIndex + 1].focus();
                                } else if (event.key === "ArrowUp") {
                                  event.preventDefault();
                                  if (currentIndex > 0) {
                                    results[currentIndex - 1].focus();
                                  } else {
                                    medicationSearchInputRef.current?.focus();
                                  }
                                }
                              }}
                              onClick={() => selectMedication(med)}
                              className={`min-w-0 w-full overflow-hidden rounded-lg border border-l-4 px-2.5 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                primaryAlert && (primaryAlert.level === "CRITICAL" || primaryAlert.level === "HIGH")
                                  ? "border-red-300 border-l-red-700 bg-red-50/70 hover:border-red-400 hover:bg-red-100/70"
                                  : "border-transparent bg-background hover:border-border hover:bg-accent"
                              }`}
                            >
                              <div className="flex min-w-0 items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="line-clamp-2 break-words text-sm font-medium leading-5">{med.nom}</div>
                                  {med.dci && (
                                    <div className="mt-1 line-clamp-2 break-words text-xs leading-4 text-muted-foreground">
                                      {med.dci}
                                    </div>
                                  )}
                                </div>
                                {med.dosage_defaut && (
                                  <Badge variant="secondary" className="max-w-[40%] shrink-0 whitespace-normal break-words text-right text-[11px] leading-4">
                                    {[med.dosage_defaut, med.unite].filter(Boolean).join(" ")}
                                  </Badge>
                                )}
                              </div>
                              {med.forme && (
                                <div className="mt-1.5 line-clamp-1 break-words text-xs leading-4 text-muted-foreground">
                                  {med.forme}
                                </div>
                              )}
                              {primaryAlert ? (
                                <div className={`mt-1.5 flex min-w-0 items-center gap-1.5 rounded px-1.5 py-1 text-left text-[11px] font-semibold leading-4 break-words ${
                                  primaryAlert.level === "CRITICAL" || primaryAlert.level === "HIGH"
                                    ? "bg-red-700 text-white"
                                    : "bg-amber-100 text-amber-950"
                                }`} role="alert">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                  <span className="min-w-0 flex-1 truncate">
                                    {primaryAlert.level === "CRITICAL" || primaryAlert.level === "HIGH" ? "RISQUE ALLERGIQUE" : "Allergie"}
                                    {" · "}{ALLERGY_LEVEL_LABELS[primaryAlert.level]}
                                  </span>
                                  {allergyCheck.alerts.length > 1 && <span className="shrink-0">+{allergyCheck.alerts.length - 1}</span>}
                                  {(primaryAlert.level === "CRITICAL" || primaryAlert.level === "HIGH") && (
                                    <span className="shrink-0 rounded bg-white/15 px-1">Voir</span>
                                  )}
                                </div>
                              ) : structuredPatientAllergies.length > 0 && !allergyCheck.referenceFound ? (
                                <div className="mt-1.5 flex min-w-0 items-center gap-1.5 rounded bg-slate-100 px-1.5 py-1 text-left text-[11px] font-medium leading-4 text-slate-700" role="status">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                                  <span className="truncate">Allergies à vérifier · non référencé</span>
                                </div>
                              ) : null}
                            </button>
                          );
                        })()
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="mb-3 text-sm text-muted-foreground">
                        Aucun médicament trouvé
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addCustomMedication}
                      >
                        Ajouter "{searchQuery}"
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
            <AlertDialog
              open={pendingAllergyMedication !== null}
              onOpenChange={(isOpen) => {
                if (!isOpen) setPendingAllergyMedication(null);
              }}
            >
              <AlertDialogContent className="border-red-300">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-900">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    Alerte allergologique — vérification requise
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-left text-slate-700">
                    {pendingAllergyMedication && (() => {
                      const check = allergyAlertService.checkMedication(structuredPatientAllergies, {
                        id: pendingAllergyMedication.id,
                        name: pendingAllergyMedication.nom,
                        dci: pendingAllergyMedication.dci,
                      });
                      const alert = check.alerts.find((item) =>
                        item.level === "CRITICAL" || item.level === "HIGH" || item.requiresConfirmation,
                      );
                      return (
                        <span className="block space-y-1.5">
                          <span className="block font-semibold text-slate-900">{pendingAllergyMedication.nom}</span>
                          <span className="block">
                            {alert?.type === "CROSS" ? "Risque d’allergie croisée" : "Correspondance avec une allergie déclarée"}
                            {" · "}{alert ? ALLERGY_LEVEL_LABELS[alert.level] : ""}
                          </span>
                          {alert?.message && <span className="block">{alert.message}</span>}
                          <span className="block font-semibold text-red-800">Le médicament n’a pas été ajouté. Vérifiez l’allergie et la décision médicale avant de continuer.</span>
                        </span>
                      );
                    })()}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setPendingAllergyMedication(null)}>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-700 text-white hover:bg-red-800"
                    onClick={() => {
                      if (pendingAllergyMedication) addMedication(pendingAllergyMedication);
                      setPendingAllergyMedication(null);
                    }}
                  >
                    Ajouter malgré l’alerte
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {normalizedSearch.length < 2 && (
              <p className="px-1 text-[10px] text-slate-500" role="status" aria-live="polite">
                Tape au moins deux lettres pour rechercher un médicament.
              </p>
            )}
          </div>
          </>
          )}

          {mode !== "medication" && (
            <section className="space-y-3 rounded-2xl border border-sky-100 bg-[linear-gradient(140deg,#f0f8fc_0%,#f8fbfd_100%)] p-3.5" aria-label={mode === "laboratory" ? "Demande d’analyses biologiques" : "Demande d’imagerie"}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{mode === "laboratory" ? "Catalogue des analyses" : "Catalogue d’imagerie"}</p>
                {canUseAdvancedBilling && (
                  <button
                    type="button"
                    aria-pressed={showNomenclatureReferences}
                    onClick={() => setShowNomenclatureReferences((value) => !value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${showNomenclatureReferences ? "border-sky-300 bg-sky-100 text-sky-900" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    {showNomenclatureReferences ? "Masquer les références" : "Facturation avancée"}
                  </button>
                )}
              </div>
              {canUseAdvancedBilling && showNomenclatureReferences && (
                <p className="rounded-lg border border-sky-100 bg-white px-2.5 py-2 text-[11px] leading-4 text-slate-600">
                  Codes et coefficients indicatifs issus du référentiel fourni. Un coefficient n’est pas un montant en DH ; aucun tarif n’est calculé.
                </p>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="h-10 pl-9" value={requestSearch} onChange={(event) => setRequestSearch(event.target.value)} placeholder={mode === "laboratory" ? "Rechercher une analyse…" : "Rechercher un examen d’imagerie…"} />
              </div>
              <>
                <div className="max-h-48 space-y-3 overflow-y-auto rounded-xl border border-sky-100 bg-white p-3 shadow-inner shadow-slate-900/[0.02]">
                  {(mode === "laboratory" ? LAB_REQUEST_CATALOG : IMAGING_REQUEST_CATALOG)
                      .filter((request) => normalizeClinicalTerm(`${request.category} ${request.name}`).includes(normalizeClinicalTerm(requestSearch)))
                      .reduce((groups, request) => {
                        const group = groups.find((item) => item.category === request.category);
                        if (group) group.requests.push(request);
                        else groups.push({ category: request.category, requests: [request] });
                        return groups;
                      }, [] as { category: string; requests: (typeof LAB_REQUEST_CATALOG[number] | typeof IMAGING_REQUEST_CATALOG[number])[] }[])
                      .map((group) => (
                        <div key={group.category} className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{group.category}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {group.requests.map((request) => {
                              const isAdded = items.some((item) => item.request_type === mode && normalizeClinicalTerm(item.nom_medicament) === normalizeClinicalTerm(request.name));
                              return (
                                <Button
                                  key={request.name}
                                  type="button"
                                  size="sm"
                                  variant={isAdded ? "secondary" : "outline"}
                                  className="h-auto min-h-8 rounded-full whitespace-normal border-sky-100 bg-white text-left text-xs hover:border-sky-300 hover:bg-sky-50"
                                  disabled={isAdded}
                                  onClick={() => addExaminationRequest(mode, request.name, request.modality, request.references)}
                                >
                                  {isAdded ? "✓ " : "+ "}{request.name}
                                  {canUseAdvancedBilling && showNomenclatureReferences && request.references?.[0] && (
                                    <span className="ml-1 text-[10px] text-slate-500">{request.references.map((reference) => reference.code).join(" · ")}</span>
                                  )}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={requestSearch}
                    onChange={(event) => setRequestSearch(event.target.value)}
                    className="h-10 rounded-xl border-sky-200 bg-white"
                    placeholder={mode === "laboratory" ? "Autre analyse à préciser…" : "Autre examen à préciser…"}
                    aria-label="Nom d’un examen à ajouter"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 shrink-0 rounded-xl bg-sky-100 text-sky-900 hover:bg-sky-200"
                    disabled={!requestSearch.trim()}
                    onClick={() => addExaminationRequest(mode, requestSearch.trim())}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />Ajouter
                  </Button>
                </div>
              </>
              <details className="rounded-lg border border-sky-200 bg-white px-2.5 py-1.5">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">Précisions facultatives</summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    Indication clinique
                    <Input value={requestDetails.indication || ""} placeholder="Question clinique" onChange={(event) => updateSharedRequestDetails({ indication: event.target.value })} />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    Priorité
                    <Select value={requestDetails.priority || "routine"} onValueChange={(value: NonNullable<PrescriptionItem["request_details"]>["priority"]) => updateSharedRequestDetails({ priority: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="routine">Programmée</SelectItem><SelectItem value="urgent">Urgente</SelectItem><SelectItem value="very_urgent">Très urgente</SelectItem></SelectContent>
                    </Select>
                  </label>
                  {mode === "laboratory" ? (
                    <>
                      <label className="space-y-1 text-xs font-medium text-slate-700">
                        Prélèvement
                        <Select value={requestDetails.specimen || "not_set"} onValueChange={(value) => updateSharedRequestDetails({ specimen: value === "not_set" ? undefined : value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="not_set">Non précisé</SelectItem>{["Sang veineux", "Sang capillaire", "Urines", "Selles", "Écouvillon / prélèvement local"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                        </Select>
                      </label>
                      <label className="space-y-1 text-xs font-medium text-slate-700">
                        Préparation
                        <Input value={requestDetails.preparation || ""} placeholder="Ex. jeûne si indiqué" onChange={(event) => updateSharedRequestDetails({ preparation: event.target.value })} />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="space-y-1 text-xs font-medium text-slate-700">
                        Latéralité
                        <Select value={requestDetails.laterality || "not_set"} onValueChange={(value) => updateSharedRequestDetails({ laterality: value === "not_set" ? undefined : value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="not_set">Non précisée</SelectItem>{["Droite", "Gauche", "Bilatérale", "Sans objet"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                        </Select>
                      </label>
                      <label className="space-y-1 text-xs font-medium text-slate-700">
                        Produit de contraste
                        <Select value={requestDetails.contrast || "not_set"} onValueChange={(value) => updateSharedRequestDetails({ contrast: value === "not_set" ? undefined : value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="not_set">Non précisé</SelectItem>{["Sans contraste demandé", "Avec contraste si indiqué et compatible"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                        </Select>
                      </label>
                    </>
                  )}
                </div>
              </details>
            </section>
          )}

          {/* Selected items */}
          {items.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label className="text-sm font-bold text-slate-900">{isExamination ? `Examens sélectionnés` : `Traitement prescrit`}</Label>
                  <p className="mt-0.5 text-[10px] text-slate-500">{items.length} élément{items.length === 1 ? "" : "s"} · sélectionnez une ligne pour modifier ses détails</p>
                </div>
                {items.some((item) => item.request_type === mode) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 border-indigo-300 bg-indigo-50 px-2.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-100"
                    title={`Enregistrer ${mode === "medication" ? "les médicaments et leurs posologies" : mode === "laboratory" ? "les examens biologiques" : "les examens d’imagerie"} comme modèle`}
                    onClick={() => savePrescriptionTemplate(true)}
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" />
                    Enregistrer comme modèle
                  </Button>
                )}
              </div>
              {mode === "medication" && (allergyAlerts.length > 0 || unverifiedMedicationNames.length > 0 || allergyTextNeedsReview) && (
                <section
                  className={`space-y-1.5 rounded-lg border p-2.5 ${allergyAlerts.some((alert) => alert.level === "CRITICAL" || alert.level === "HIGH")
                    ? "border-red-300 bg-red-50 text-red-950"
                    : "border-amber-300 bg-amber-50 text-amber-950"}`}
                  aria-label="Vérification des allergies médicamenteuses"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-bold">Vérification des allergies</p>
                      {allergyAlerts.map((alert) => (
                        <p key={`${alert.drugId}-${alert.allergenCode}`} className="text-sm">
                          <span className="font-semibold">{alert.drugName}</span>
                          {" — "}{alert.message}
                          {alert.requiresConfirmation && <span className="font-bold"> Confirmation médicale requise.</span>}
                        </p>
                      ))}
                      {unverifiedMedicationNames.length > 0 && (
                        <p className="text-sm">
                          Vérification automatique indisponible pour : <span className="font-semibold">{unverifiedMedicationNames.join(", ")}</span>. Vérifie manuellement les composants et les allergies du patient.
                        </p>
                      )}
                      {allergyTextNeedsReview && (
                        <p className="text-sm">
                          Le texte libre des allergies n’a pas pu être rapproché du référentiel. Vérifie-le manuellement avant de poursuivre.
                        </p>
                      )}
                    </div>
                  </div>
                  {allergyReviewRequired && (
                    <label className="flex cursor-pointer items-start gap-2 border-t border-current/15 pt-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-red-700"
                        checked={allergyReviewIsAcknowledged}
                        onChange={(event) => setAcknowledgedAllergyReview(
                          event.target.checked ? allergyReviewSignature : null,
                        )}
                      />
                      <span>J’ai vérifié cette alerte et confirme la prescription malgré le risque signalé.</span>
                    </label>
                  )}
                </section>
              )}
              {items.map((item, index) => {
                const posology = getPosologyFields(item);
                const examDetails = cleanExamRequestDetails(item.request_details);
                const dailyLimit = getDailyFrequencyLimit(posology);
                const selectedTimesCount = posology.timesOfDay?.length || 0;
                const reachedDailyLimit = dailyLimit !== null && selectedTimesCount >= dailyLimit;
                return (
                <div key={`${item.id || "new"}-${item.request_type}-${index}`} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${item.request_type === "medication" ? "border-sky-200" : item.request_type === "laboratory" ? "border-emerald-200" : "border-violet-200"}`}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#75a98d]"
                      aria-expanded={expandedItemIndex === index}
                      onClick={() => setExpandedItemIndex((current) => current === index ? null : index)}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${item.request_type === "medication" ? "bg-sky-100 text-sky-800" : item.request_type === "laboratory" ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-800"}`}>{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">{item.nom_medicament}</span>
                        {item.request_type === "medication" ? (
                          <span className="block truncate text-xs font-medium text-sky-800">
                            {[item.dosage, item.posologie, item.duree].filter(Boolean).join(" · ") || "Dose et posologie à compléter"}
                          </span>
                        ) : (
                          <>
                            <span className="block truncate text-xs text-slate-600">
                              {[examDetails.modality, examDetails.specimen, examDetails.indication].filter(Boolean).join(" · ") || "Examen à préciser si besoin"}
                            </span>
                            {canUseAdvancedBilling && showNomenclatureReferences && item.request_details?.catalogReferences?.length ? (
                              <span className="block truncate text-[10px] text-sky-800">
                                Réf. {item.request_details.catalogReferences.map((reference) => `${reference.code}${reference.coefficient ? ` · ${reference.coefficient} ${reference.unit || ""}` : ""}`).join(" / ")}
                              </span>
                            ) : null}
                          </>
                        )}
                      </span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expandedItemIndex === index ? "rotate-180" : ""}`} />
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mr-2 h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                      aria-label={`Retirer ${item.nom_medicament}`}
                      onClick={() => removeItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className={expandedItemIndex === index ? `space-y-3 border-t p-3 ${item.request_type === "medication" ? "border-sky-100 bg-sky-50/45" : item.request_type === "laboratory" ? "border-emerald-100 bg-emerald-50/40" : "border-violet-100 bg-violet-50/40"}` : "hidden"}>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          {item.request_type === "medication" ? (
                            <Input
                              value={item.nom_medicament}
                              onChange={(event) => updateItem(index, { nom_medicament: event.target.value })}
                              aria-label="Nom du médicament"
                              className="h-9 max-w-xl font-medium"
                            />
                          ) : (
                            <Input
                              value={item.nom_medicament}
                              onChange={(event) => updateItem(index, { nom_medicament: event.target.value })}
                              aria-label="Nom de l’examen"
                              className="h-9 max-w-xl font-medium"
                            />
                          )}
                        </div>
                      </div>

                      {item.request_type === "medication" ? (
                      <>
                      <div className="space-y-2 rounded-lg border border-blue-200 bg-white p-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-blue-950">Posologie</p>
                            <p className="text-xs text-slate-600">Compose les consignes avec des choix séparés.</p>
                          </div>
                          <div className="flex rounded-lg bg-slate-100 p-1" aria-label="Mode de saisie de la posologie">
                            <button type="button" onClick={() => togglePosologyMode(index, false)} aria-pressed={!posology.customPosology} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${!posology.customPosology ? "bg-blue-700 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}>Guidée</button>
                            <button type="button" onClick={() => togglePosologyMode(index, true)} aria-pressed={Boolean(posology.customPosology)} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${posology.customPosology ? "bg-blue-700 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}>Libre</button>
                          </div>
                        </div>

                        {!posology.customPosology ? (
                          <>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                              <label className="space-y-1 text-xs font-semibold text-slate-700">
                                Quantité par prise
                                <Select value={posology.doseQuantity || "not_set"} onValueChange={(value) => updatePosology(index, { doseQuantity: value === "not_set" ? "" : value })}>
                                  <SelectTrigger className="h-9 border-slate-300 bg-white text-sm"><SelectValue placeholder="Choisir une quantité" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not_set">À préciser</SelectItem>
                                    {["¼", "½", "¾", "1", "1½", "2", "2½", "3", "4", "5", "10"].map((quantity) => <SelectItem key={quantity} value={quantity}>{quantity}</SelectItem>)}
                                    <SelectItem value="other">Autre quantité…</SelectItem>
                                  </SelectContent>
                                </Select>
                                {posology.doseQuantity === "other" && (
                                  <Input
                                    value={posology.customDoseQuantity || ""}
                                    onChange={(event) => updatePosology(index, { customDoseQuantity: event.target.value })}
                                    inputMode="decimal"
                                    placeholder="Saisir la quantité"
                                    className="h-9 border-slate-300 bg-white text-sm"
                                    aria-label="Quantité personnalisée par prise"
                                  />
                                )}
                              </label>
                              <label className="space-y-1 text-xs font-semibold text-slate-700">
                                Forme / unité
                                <Select value={posology.doseUnit || "not_set"} onValueChange={(value) => updatePosology(index, { doseUnit: value === "not_set" ? "" : value })}>
                                  <SelectTrigger className="h-9 border-slate-300 bg-white text-sm"><SelectValue placeholder="Choisir une unité" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not_set">À préciser</SelectItem>
                                    {POSOLOGY_UNITS.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                                    <SelectItem value="other">Autre unité…</SelectItem>
                                  </SelectContent>
                                </Select>
                              </label>
                              {posology.doseUnit === "other" && (
                                <label className="space-y-1 text-xs font-semibold text-slate-700">
                                  Préciser l’unité
                                  <Input value={posology.customDoseUnit || ""} onChange={(event) => updatePosology(index, { customDoseUnit: event.target.value })} placeholder="Ex. dose mesurée" className="h-9 border-slate-300 bg-white text-sm" />
                                </label>
                              )}
                              <label className="space-y-1 text-xs font-semibold text-slate-700">
                                <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-sky-700" />Fréquence quotidienne</span>
                                <Select value={posology.frequencyPerDay || "not_set"} onValueChange={(value) => updatePosology(index, { frequencyPerDay: value === "not_set" ? "" : value })}>
                                  <SelectTrigger className="h-9 border-slate-300 bg-white text-sm"><SelectValue placeholder="Choisir la fréquence" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not_set">À préciser</SelectItem>
                                    {[1, 2, 3, 4, 5, 6].map((count) => <SelectItem key={count} value={String(count)}>{count} fois par jour</SelectItem>)}
                                    <SelectItem value="as_needed">Selon besoin</SelectItem>
                                    <SelectItem value="other">Autre fréquence…</SelectItem>
                                  </SelectContent>
                                </Select>
                              </label>
                              {posology.frequencyPerDay === "other" && (
                                <label className="space-y-1 text-xs font-semibold text-slate-700">
                                  Nombre de prises par jour
                                  <Input type="number" min="1" step="1" value={posology.customFrequency || ""} onChange={(event) => updatePosology(index, { customFrequency: event.target.value })} placeholder="Ex. 8" className="h-9 border-slate-300 bg-white text-sm" />
                                </label>
                              )}
                              <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-2 sm:col-span-2 xl:col-span-4">
                                <div className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
                                  <div className="space-y-1">
                                    <Label className="text-xs font-bold text-slate-800">Moments de prise</Label>
                                    <div className="flex flex-wrap gap-1.5">
                                      {TIME_OF_DAY.map(({ value, label, Icon, color }) => {
                                        const selected = posology.timesOfDay?.includes(value) || false;
                                        const exceedsFrequency = !selected && reachedDailyLimit;
                                        return (
                                          <button
                                            key={value}
                                            type="button"
                                            aria-pressed={selected}
                                            aria-disabled={exceedsFrequency}
                                            title={exceedsFrequency ? `La fréquence est limitée à ${dailyLimit} prise${dailyLimit === 1 ? "" : "s"} par jour` : undefined}
                                            onClick={() => updatePosology(index, { timesOfDay: selected ? posology.timesOfDay?.filter((time) => time !== value) : [...(posology.timesOfDay || []), value] })}
                                            disabled={exceedsFrequency}
                                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 ${selected ? "border-[#28664f] bg-[#e4f1e8] text-[#174d3c] shadow-sm ring-1 ring-[#a8cdb5]" : exceedsFrequency ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400" : "border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"}`}
                                          >
                                            <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />
                                            {label}
                                            {selected && <Check className="h-3.5 w-3.5 text-[#28664f]" aria-hidden="true" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <p className="text-[11px] text-slate-600" aria-live="polite">
                                      {dailyLimit === null
                                        ? "Les moments sont facultatifs. Choisis une fréquence pour les limiter au nombre de prises."
                                        : `${selectedTimesCount} / ${dailyLimit} moment${dailyLimit === 1 ? "" : "s"} sélectionné${dailyLimit === 1 ? "" : "s"} selon la fréquence quotidienne.`}
                                    </p>
                                  </div>
                                  <label className="space-y-1 text-xs font-bold text-slate-800">
                                    <span className="flex items-center gap-1.5"><UtensilsCrossed className="h-4 w-4 text-teal-700" />Par rapport au repas</span>
                                    <Select value={posology.intakeTiming || "not_set"} onValueChange={(value) => updatePosology(index, { intakeTiming: value === "not_set" ? "" : value })}>
                                      <SelectTrigger className="h-8 border-teal-300 bg-white text-sm"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="not_set">À préciser</SelectItem>
                                        {INTAKE_TIMINGS.map(({ value, label, Icon }) => <SelectItem key={value} value={value}><span className="flex items-center gap-2"><Icon className="h-4 w-4 text-teal-700" />{label}</span></SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <label className="block space-y-1 text-xs font-semibold text-slate-700">
                            Consigne de prise personnalisée
                            <Input
                              value={item.posologie}
                              onChange={(event) => updateCustomPosology(index, event.target.value)}
                              placeholder="Saisir librement la posologie"
                              className="h-9 border-slate-300 bg-white text-sm"
                            />
                          </label>
                        )}

                        <div className="grid gap-2 border-t border-slate-100 pt-2 sm:grid-cols-2">
                          <label className="space-y-1 text-xs font-semibold text-slate-700">
                            Dosage du médicament
                            <Input
                              value={item.dosage || ""}
                              onChange={(event) => updateItem(index, { dosage: event.target.value || null })}
                              placeholder="Ex. 500 mg"
                              className="h-9 border-slate-300 bg-white text-sm"
                            />
                          </label>
                          <label className="space-y-1 text-xs font-semibold text-slate-700">
                            Durée du traitement
                            <div className="flex gap-2">
                              {parseTreatmentDuration(item.duree).unit === "custom" ? (
                                <Input
                                  value={item.duree || ""}
                                  onChange={(event) => updateItem(index, { duree: event.target.value || null })}
                                  placeholder="Saisir la durée"
                                  aria-label="Durée personnalisée du traitement"
                                  className="h-10 min-w-0 border-slate-300 bg-white text-sm"
                                />
                              ) : parseTreatmentDuration(item.duree).unit !== "continuous" && (
                                <Input
                                  type="number"
                                  min="1"
                                  step="1"
                                  inputMode="numeric"
                                  value={parseTreatmentDuration(item.duree).amount}
                                  onChange={(event) => {
                                    const duration = parseTreatmentDuration(item.duree);
                                    updateItem(index, { duree: formatTreatmentDuration(event.target.value, duration.unit) });
                                  }}
                                  placeholder="Durée"
                                  aria-label="Nombre pour la durée du traitement"
                                  className="h-10 min-w-0 border-slate-300 bg-white text-sm"
                                />
                              )}
                              <Select
                                value={parseTreatmentDuration(item.duree).unit}
                                onValueChange={(value: TreatmentDurationUnit) => {
                                  const duration = parseTreatmentDuration(item.duree);
                                  updateItem(index, { duree: formatTreatmentDuration(duration.amount, value) });
                                }}
                              >
                                <SelectTrigger className="h-10 min-w-[7.5rem] border-slate-300 bg-white text-sm" aria-label="Unité de durée du traitement">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="jours">Jour(s)</SelectItem>
                                  <SelectItem value="mois">Mois</SelectItem>
                                  <SelectItem value="continuous">Traitement continu</SelectItem>
                                  <SelectItem value="custom">Saisie libre</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </label>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-950" aria-live="polite">
                        <Pill className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                        <span><span className="font-semibold">Consigne composée : </span>{formatPosology(posology) || <span className="text-blue-700/70">complète les champs ci-dessus</span>}</span>
                      </div>

                      <Input
                        placeholder="Instruction particulière (facultatif)"
                        value={item.instructions || ""}
                        onChange={(e) => updateItem(index, { instructions: e.target.value })}
                      className="h-9 border-slate-300 bg-white text-sm"
                      />
                      </>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {item.request_type === "imaging" && (
                            <>
                              <label className="space-y-1 text-xs text-slate-600">
                                Modalité
                                <Select
                                    value={item.request_details?.modality || "not_set"}
                                    onValueChange={(value) => updateItem(index, { request_details: { ...(item.request_details || {}), modality: value === "not_set" ? undefined : value } })}
                                >
                                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="not_set">Non précisée</SelectItem>{["Radiographie", "Échographie", "Doppler", "Scanner (TDM)", "IRM", "Mammographie", "Ostéodensitométrie", "Autre"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                                </Select>
                              </label>
                              <label className="space-y-1 text-xs text-slate-600">
                                Région / organe
                                <Input
                                  value={item.request_details?.region || ""}
                                  onChange={(event) => updateItem(index, { request_details: { ...(item.request_details || {}), region: event.target.value } })}
                                  className="h-9"
                                />
                              </label>
                            </>
                          )}
                          {item.request_details?.priority && item.request_details.priority !== "routine" && <Badge variant="outline">{PRIORITY_LABELS[item.request_details.priority]}</Badge>}
                          {examDetails.specimen && <Badge variant="outline">{examDetails.specimen}</Badge>}
                          {examDetails.indication && <span className="text-xs text-slate-600">Indication : {examDetails.indication}</span>}
                          {examDetails.preparation && <span className="text-xs text-slate-600">Préparation : {examDetails.preparation}</span>}
                        </div>
                      )}
                    </div>
                </div>
                );
              })}
            </div>
          )}
          {items.length === 0 && (
            <p className={`rounded-2xl border border-dashed p-4 text-sm ${isExamination ? "border-sky-200 bg-sky-50/50 text-sky-900" : "border-slate-200 bg-white text-slate-600"}`}>
              {isExamination ? "Choisissez les examens à demander dans la liste ci-dessus." : "Recherchez un médicament pour commencer votre ordonnance."}
            </p>
          )}

          {/* Notes and extra instructions */}
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
            <div>
              <Label className="text-sm font-semibold text-slate-800">{isExamination ? "Consigne au centre" : "Conseils au patient"}</Label>
              <p className="mt-0.5 text-[11px] text-slate-500">Facultatif · apparaîtra sur le document remis au patient</p>
            </div>
            <Textarea
              className="min-h-[4.5rem] resize-y rounded-xl border-slate-200 bg-slate-50/50"
              placeholder={isExamination ? "Précision utile au laboratoire ou au centre d’imagerie…" : "Conseil, régime alimentaire ou recommandation de suivi…"}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          </div>
          <aside className="space-y-3 xl:sticky xl:top-0" aria-label="Modèles et aperçu instantané du document">
            <details className="group overflow-hidden rounded-xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                <BookOpenCheck className="h-4 w-4 shrink-0 text-indigo-600" />
                <span className="min-w-0 flex-1 truncate font-medium">Modèles rapides</span>
                <span className="text-[11px] text-slate-500">{templatesForMode.length} disponibles</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <section className="space-y-2 border-t border-slate-100 bg-slate-50/50 p-2.5" aria-label="Modèles de prescription">
                <p className="px-1 text-[11px] leading-4 text-slate-500">
                  {mode === "medication" ? "Modèles de médicaments enregistrés" : mode === "laboratory" ? "Paniers de biologie prêts à adapter" : "Paniers d’imagerie prêts à adapter"}
                </p>
                <div className="flex items-center justify-end">
                <Popover open={templatesPopoverOpen} onOpenChange={setTemplatesPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 gap-1.5 border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800">
                      <Settings2 className="h-3.5 w-3.5 text-slate-500" />
                      Gérer
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    portalled={false}
                    align="end"
                    sideOffset={8}
                    className="w-[min(26rem,calc(100vw-2rem))] space-y-3 p-3"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-slate-900">Gérer mes modèles</p>
                      <p className="text-xs text-slate-600">Disponibles sur cet appareil, séparés par compte.</p>
                    </div>
                    {prescriptionTemplates.length > 0 ? (
                      <div className="max-h-52 space-y-1.5 overflow-y-auto">
                        {prescriptionTemplates.map((template) => (
                          <div key={template.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-900">{template.name}</span>
                              <span className="block text-xs text-slate-600">
                                {template.items.length} médicament{template.items.length === 1 ? "" : "s"}
                                {template.tags.length > 0 ? ` · ${template.tags.join(", ")}` : ""}
                              </span>
                            </div>
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-slate-500 hover:text-red-700" aria-label={`Supprimer le modèle ${template.name}`} onClick={() => deletePrescriptionTemplate(template.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-600">
                        Aucun modèle enregistré. Crée une ordonnance, puis utilise « Enregistrer comme modèle » dans sa liste.
                      </p>
                    )}
                    <div className="space-y-2 border-t pt-3">
                      <p className="text-xs font-semibold text-slate-700">Créer un modèle nommé</p>
                      <Input
                        value={templateName}
                        onChange={(event) => setTemplateName(event.target.value)}
                        placeholder="Nom, ex. Rhume saisonnier"
                        aria-label="Nom du modèle d’ordonnance"
                        className="h-9 border-slate-300 bg-white text-sm"
                      />
                      <Input
                        value={templateTags}
                        onChange={(event) => setTemplateTags(event.target.value)}
                        placeholder="Motifs / tags facultatifs"
                        aria-label="Motifs ou tags du modèle"
                        className="h-9 border-slate-300 bg-white text-sm"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="w-full bg-indigo-700 text-white hover:bg-indigo-800"
                        disabled={!templateName.trim() || !items.some((item) => item.request_type === mode)}
                        onClick={savePrescriptionTemplate}
                      >
                        <BookmarkPlus className="mr-1.5 h-4 w-4" />Enregistrer comme modèle
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={quickTemplateSearch}
                    onChange={(event) => setQuickTemplateSearch(event.target.value)}
                    placeholder="Rechercher un modèle ou un bilan…"
                    aria-label="Rechercher dans les modèles de prescription"
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {visibleQuickTemplates.length > 0 ? visibleQuickTemplates.map((template) => (
                  <Button
                    key={template.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      addPrescriptionTemplate(template);
                    }}
                    title={`Ajouter ${template.name} au brouillon`}
                    aria-label={`Ajouter le modèle ${template.name} au brouillon`}
                    className="h-auto min-h-11 w-full justify-start gap-2 border-slate-200 bg-white px-2.5 py-2 text-left text-slate-800 shadow-none hover:border-indigo-200 hover:bg-indigo-50/60"
                  >
                    <ListPlus className="h-4 w-4 shrink-0 text-indigo-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block whitespace-normal text-xs font-semibold leading-4">{template.name}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">
                        {template.tags.includes("Bilan de référence") ? "Panier de référence" : "Mon modèle"}
                        {" · "}{template.items.length} {mode === "medication" ? "médicament" : "examen"}{template.items.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-800">Utiliser</span>
                  </Button>
                )) : (
                  <p className="px-2 py-1.5 text-[11px] text-slate-500">
                    Aucun modèle ne correspond à la recherche.
                  </p>
                )}
              </div>
              </section>
            </details>
            <div className="hidden xl:block">
            <div className={`overflow-hidden rounded-xl border shadow-sm ${mode === "medication" ? "border-blue-200 bg-blue-50/60" : mode === "laboratory" ? "border-emerald-200 bg-emerald-50/60" : "border-violet-200 bg-violet-50/60"}`}>
              <div className="border-b border-inherit bg-white/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aperçu instantané</p>
                <p className="mt-1 font-semibold text-slate-900">{patientName}</p>
                <p className="text-sm text-slate-700">{mode === "medication" ? "Ordonnance" : mode === "laboratory" ? "Bon de demande d’analyses" : "Bon de demande d’imagerie"}</p>
              </div>
              <div className="max-h-[55vh] space-y-2 overflow-y-auto p-3">
                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-3 text-sm text-slate-500">Les éléments ajoutés apparaîtront ici avec leur posologie.</p>
                ) : items.map((item, index) => {
                  const examDetails = cleanExamRequestDetails(item.request_details);
                  return (
                  <div key={`${item.id || "preview"}-${item.nom_medicament}-${index}`} className="rounded-lg border border-white bg-white p-3 shadow-sm">
                    <div className="flex gap-2 text-sm font-semibold text-slate-900">
                      <span className="text-slate-400">{index + 1}.</span>
                      <span className="min-w-0 break-words">{item.nom_medicament}{item.dosage ? ` — ${item.dosage}` : ""}</span>
                    </div>
                    {item.request_type === "medication" ? (
                      <div className="ml-5 mt-1 space-y-0.5 text-sm text-slate-700">
                        <p className="font-medium">{item.posologie || "Posologie à compléter"}</p>
                        {item.duree && <p>Durée : {item.duree}</p>}
                        {item.instructions && <p>Instruction : {item.instructions}</p>}
                      </div>
                    ) : (
                      <div className="ml-5 mt-1 space-y-0.5 text-xs text-slate-700">
                        {examDetails.modality && <p>Modalité : {examDetails.modality}</p>}
                        {examDetails.specimen && <p>Prélèvement : {examDetails.specimen}</p>}
                        {examDetails.indication && <p>Indication : {examDetails.indication}</p>}
                      </div>
                    )}
                  </div>
                  );
                })}
                {notes.trim() && <p className="rounded-lg bg-white/80 p-3 text-xs text-slate-700">{notes}</p>}
              </div>
              <div className="border-t border-white/70 px-3 py-2 text-xs text-slate-600">
                {items.length} élément{items.length === 1 ? "" : "s"} · Vérifie les doses et posologies avant l’enregistrement.
              </div>
            </div>
            </div>
          </aside>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#dce8e1] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-slate-500" aria-live="polite">
            {isSaving
              ? "Enregistrement sécurisé du document…"
              : items.length === 0
                ? "Ajoutez au moins un élément pour continuer."
                : mode === "medication" && !allergyDataReady
                  ? "Vérification des allergies en cours avant validation."
                  : mode === "medication" && allergyReviewRequired && !allergyReviewIsAcknowledged
                    ? "Confirmez la vérification des allergies pour poursuivre."
                    : `${items.length} élément${items.length === 1 ? "" : "s"} prêt${items.length === 1 ? "" : "s"} à enregistrer.`}
          </p>
          <div className="ml-auto flex shrink-0 gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="min-w-40 rounded-xl bg-[#174d3c] text-white shadow-sm hover:bg-[#103d30]"
          >
            {isSaving
              ? initialPrescription ? "Enregistrement..." : "Création..."
              : initialPrescription
                ? "Enregistrer les modifications"
              : mode === "medication"
                ? "Créer l’ordonnance"
                : mode === "laboratory"
                  ? "Créer le bon d’analyses"
                  : "Créer le bon d’imagerie"}
          </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface EditPrescriptionButtonProps {
  prescriptionId: string;
  patientId: string;
  patientName: string;
  patientAllergies?: string | null;
  onUpdated?: (prescriptionId: string, prescriptionType: PrescriptionType, itemNames: string[]) => void;
}

export const EditPrescriptionButton = ({
  prescriptionId,
  patientId,
  patientName,
  patientAllergies,
  onUpdated,
}: EditPrescriptionButtonProps) => {
  const { data: prescription, isLoading } = usePrescription(prescriptionId);

  return (
    <PrescriptionDialog
      patientId={patientId}
      patientName={patientName}
      patientAllergies={patientAllergies}
      initialPrescription={prescription || undefined}
      onCreated={onUpdated}
    >
      <Button type="button" size="sm" variant="outline" disabled={isLoading || !prescription}>
        <Pencil className="mr-1.5 h-4 w-4" />
        Modifier
      </Button>
    </PrescriptionDialog>
  );
};
