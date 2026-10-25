import { useEffect, useState } from "react";
import { addDays, addMonths, format, formatDistanceToNow, isValid, parseISO, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, CalendarClock, CalendarDays, Check, CircleCheck, CircleHelp, CircleMinus, CircleStop, ClipboardList, Clock3, History, Infinity as InfinityIcon, MapPin, MessageSquareText, PauseCircle, Pill, Plus, RotateCcw, Route, Search, Shield, Slash, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMedications, type Medication } from "@/hooks/usePrescriptions";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { getRouteFromPharmaceuticalForm, MEDICATION_ROUTES } from "@/lib/medicationRoutes";
import type {
  MedicationDuration,
  MedicationOrigin,
  MedicationSource,
  MedicationStatus,
  StructuredMedication,
} from "@/lib/structuredMedications";

interface StructuredMedicationManagerProps {
  medications: StructuredMedication[];
  legacyText: string;
  onSave: (medications: StructuredMedication[]) => Promise<unknown>;
  onSaveLegacy: (value: string) => void;
  saving: boolean;
}

interface MedicationForm {
  name: string;
  dose: string;
  unitsPerIntake: string;
  intakeUnit: "comprimé" | "gélule";
  route: string;
  frequency: string;
  customFrequency: string;
  indication: string;
  duration: MedicationDuration;
  status: MedicationStatus;
  source: MedicationSource;
  origin: MedicationOrigin;
  startedOn: string;
  plannedEndOn: string;
  endedOn: string;
}

const EMPTY_FORM: MedicationForm = {
  name: "",
  dose: "",
  unitsPerIntake: "",
  intakeUnit: "comprimé",
  route: "",
  frequency: "",
  customFrequency: "",
  indication: "",
  duration: "unknown",
  status: "needs_confirmation",
  source: "patient_report",
  origin: "unknown",
  startedOn: "",
  plannedEndOn: "",
  endedOn: "",
};

const STATUS_LABELS: Record<MedicationStatus, string> = {
  prescribed: "Prescrit",
  needs_confirmation: "À confirmer",
  active: "Actif",
  suspended: "Suspendu",
  stopped: "Arrêté",
  completed: "Terminé",
  not_started: "Non commencé",
};

const STATUS_STYLES: Record<MedicationStatus, string> = {
  prescribed: "border-sky-100 bg-sky-50/60 text-sky-800",
  needs_confirmation: "border-amber-100 bg-amber-50/50 text-amber-800",
  active: "border-emerald-100 bg-emerald-50/60 text-emerald-800",
  suspended: "border-slate-200 bg-slate-50 text-slate-700",
  stopped: "border-rose-100 bg-rose-50/50 text-rose-800",
  completed: "border-teal-100 bg-teal-50/60 text-teal-800",
  not_started: "border-violet-100 bg-violet-50/50 text-violet-800",
};

const STATUS_SELECTED_STYLES: Record<MedicationStatus, string> = {
  prescribed: "border-sky-500 bg-sky-100 text-sky-950 shadow-sm ring-2 ring-sky-200",
  needs_confirmation: "border-amber-500 bg-amber-100 text-amber-950 shadow-sm ring-2 ring-amber-200",
  active: "border-emerald-600 bg-emerald-100 text-emerald-950 shadow-sm ring-2 ring-emerald-300",
  suspended: "border-slate-500 bg-slate-200 text-slate-950 shadow-sm ring-2 ring-slate-300",
  stopped: "border-rose-500 bg-rose-100 text-rose-950 shadow-sm ring-2 ring-rose-200",
  completed: "border-teal-600 bg-teal-100 text-teal-950 shadow-sm ring-2 ring-teal-300",
  not_started: "border-violet-500 bg-violet-100 text-violet-950 shadow-sm ring-2 ring-violet-200",
};

const STATUS_ICONS: Record<MedicationStatus, typeof CircleCheck> = {
  prescribed: ClipboardList,
  needs_confirmation: CircleHelp,
  active: CircleCheck,
  suspended: PauseCircle,
  stopped: CircleStop,
  completed: CircleCheck,
  not_started: CircleMinus,
};

const SOURCE_LABELS: Record<MedicationSource, string> = {
  patient_report: "Déclaré par le patient",
  clinician_verified: "Vérifié par le médecin",
  clinic_prescription: "Prescrit au cabinet",
};

const ORIGIN_LABELS: Record<MedicationOrigin, string> = {
  unknown: "Origine non précisée",
  clinic_prescription: "Prescrit dans ce cabinet",
  external_prescription: "Prescrit par un autre professionnel",
  self_medication: "Automédication",
  other: "Autre origine",
};

const ORIGIN_CHIP_LABELS: Record<MedicationOrigin, string> = {
  unknown: "À préciser",
  clinic_prescription: "Cabinet",
  external_prescription: "Autre médecin",
  self_medication: "Automédication",
  other: "Autre",
};

const FREQUENCY_OPTIONS = [
  "",
  "1 fois par jour",
  "2 fois par jour",
  "3 fois par jour",
  "4 fois par jour",
  "Toutes les 4 heures",
  "Toutes les 6 heures",
  "Toutes les 8 heures",
  "Toutes les 12 heures",
  "Si besoin",
];

const STOP_REASONS = [
  { code: "EI", label: "Effets indésirables / Intolérance", category: "Médicale" },
  { code: "ALLERGIE", label: "Allergie / Hypersensibilité", category: "Médicale" },
  { code: "INEFFICACE", label: "Inefficacité du traitement", category: "Médicale" },
  { code: "GUERISON", label: "Guérison / Amélioration significative", category: "Médicale" },
  { code: "FIN_PREVUE", label: "Fin de la durée de traitement prévue", category: "Médicale" },
  { code: "INTERACTION", label: "Interaction médicamenteuse", category: "Médicale" },
  { code: "CONTRE_IND", label: "Contre-indication apparue", category: "Médicale" },
  { code: "CHANGEMENT", label: "Changement / Remplacement de traitement", category: "Médicale" },
  { code: "RESISTANCE", label: "Résistance au traitement", category: "Médicale" },
  { code: "SURDOSAGE", label: "Suspicion de surdosage", category: "Médicale" },
  { code: "REFUS", label: "Refus du patient", category: "Patient" },
  { code: "NON_OBSERV", label: "Non-observance / Oubli", category: "Patient" },
  { code: "COUT", label: "Problème de coût / Non remboursé", category: "Patient" },
  { code: "DIFFICULTE", label: "Difficulté de prise (forme, goût…)", category: "Patient" },
  { code: "GROSSESSE", label: "Grossesse / Allaitement", category: "Patient" },
  { code: "AUTOMED", label: "Arrêt spontané / Automédication", category: "Patient" },
  { code: "CONTRAINTES", label: "Contraintes de vie (voyage, travail…)", category: "Patient" },
  { code: "RUPTURE", label: "Rupture de stock", category: "Administrative" },
  { code: "HOSPITALIS", label: "Hospitalisation", category: "Administrative" },
  { code: "ERR_PRESCR", label: "Erreur de prescription", category: "Administrative" },
  { code: "FIN_ORDO", label: "Fin de validité de l’ordonnance", category: "Administrative" },
  { code: "CHG_MEDECIN", label: "Changement de médecin", category: "Administrative" },
  { code: "NON_COMMENCE", label: "Traitement non commencé / non délivré", category: "Administrative" },
  { code: "AUTRE", label: "Autre (à préciser)", category: "Autre" },
] as const;

type StopReasonCode = typeof STOP_REASONS[number]["code"];
type DecisionMaker = "clinician" | "patient" | "both";

const formatDate = (value: string | null) => {
  if (!value) return null;
  const dateOnly = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [year, month, day] = dateOnly.split("-");
    return `${day}/${month}/${year}`;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("fr-MA");
};

const formatDateTime = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value) ?? "Date inconnue";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date inconnue"
    : new Intl.DateTimeFormat("fr-MA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
};

const elapsedSince = (value: string | null | undefined) => {
  if (!value) return null;
  const date = parseISO(value.slice(0, 10));
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
};

const lifecycleDate = (medication: StructuredMedication) =>
  medication.ended_on
  ?? medication.status_history?.slice().reverse().find((entry) => entry.status === medication.status)?.changed_at
  ?? null;

const medicationEventLabel = (status: MedicationStatus) =>
  status === "suspended" ? "Suspendu" :
  status === "stopped" ? "Arrêté" :
  status === "completed" ? "Terminé" :
  status === "not_started" ? "Non commencé" : "Mis à jour";

const formatUnitsPerIntake = (value: number | null | undefined, unit: "comprimé" | "gélule" = "comprimé") => {
  if (!value) return null;
  const quantity = value === 0.5 ? "½" : String(value);
  const unitLabel = unit === "gélule"
    ? value === 0.5 || value === 1 ? "gélule" : "gélules"
    : value === 0.5 || value === 1 ? "comprimé" : "comprimés";
  return `${quantity} ${unitLabel} / prise`;
};

const HISTORY_EVENT_LABELS: Record<MedicationStatus, string> = {
  prescribed: "Médicament prescrit · début non confirmé",
  needs_confirmation: "Prise à confirmer",
  active: "Prise confirmée",
  suspended: "Traitement suspendu",
  stopped: "Traitement arrêté",
  completed: "Traitement terminé",
  not_started: "Traitement non commencé",
};

const DECISION_MAKER_LABELS: Record<DecisionMaker, string> = {
  clinician: "Décision du médecin",
  patient: "Décision du patient",
  both: "Décision partagée",
};

const toMoroccanDate = (isoDate: string | null) => {
  if (!isoDate) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
};

const parseMoroccanDate = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (parsed.getFullYear() !== Number(year) || parsed.getMonth() !== Number(month) - 1 || parsed.getDate() !== Number(day)) return null;
  return `${year}-${month}-${day}`;
};

const getCalendarDate = (value: string) => {
  const isoDate = parseMoroccanDate(value);
  if (!isoDate) return undefined;
  const date = parseISO(isoDate);
  return isValid(date) ? date : undefined;
};

const calculatePlannedEndDate = (startedOn: string, duration: string | null) => {
  const match = duration?.match(/^\s*(\d+)\s+(jours?|mois)\s*$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isInteger(amount) || amount < 1) return null;
  const start = parseISO(startedOn);
  const end = match[2].toLowerCase().startsWith("jour")
    ? addDays(start, amount - 1)
    : subDays(addMonths(start, amount), 1);
  return format(end, "yyyy-MM-dd");
};

const maskMoroccanDate = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const buildForm = (medication: StructuredMedication): MedicationForm => ({
  name: medication.name,
  dose: medication.dose ?? "",
  unitsPerIntake: medication.units_per_intake ? String(medication.units_per_intake) : "",
  intakeUnit: medication.intake_unit ?? "comprimé",
  route: medication.route ?? "",
  frequency: medication.frequency && !FREQUENCY_OPTIONS.includes(medication.frequency) ? "custom" : medication.frequency ?? "",
  customFrequency: medication.frequency && !FREQUENCY_OPTIONS.includes(medication.frequency) ? medication.frequency : "",
  indication: medication.indication ?? "",
  duration: medication.duration,
  status: medication.status === "needs_confirmation" && medication.source === "clinic_prescription"
    ? "prescribed"
    : medication.status,
  source: medication.source,
  origin: medication.origin ?? (medication.source === "clinic_prescription" ? "clinic_prescription" : "unknown"),
  startedOn: toMoroccanDate(medication.started_on),
  plannedEndOn: toMoroccanDate(medication.planned_end_on),
  endedOn: toMoroccanDate(medication.ended_on ?? null),
});

export const StructuredMedicationManager = ({
  medications,
  legacyText,
  onSave,
  onSaveLegacy,
  saving,
}: StructuredMedicationManagerProps) => {
  const { currentUser } = useAuth();
  const isDoctor = currentUser?.role === "medecin";
  const isSecretary = currentUser?.role === "secretaire";
  const canEditTreatments = isDoctor || isSecretary;
  const [form, setForm] = useState<MedicationForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [legacyEditing, setLegacyEditing] = useState(false);
  const [legacyDraft, setLegacyDraft] = useState(legacyText);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [debouncedCatalogSearch, setDebouncedCatalogSearch] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState<"startedOn" | "endOn" | null>(null);
  const [transitionTarget, setTransitionTarget] = useState<{ medication: StructuredMedication; status: "suspended" | "stopped" | "completed" | "not_started" } | null>(null);
  const [transitionReason, setTransitionReason] = useState<StopReasonCode | "">("");
  const [transitionComment, setTransitionComment] = useState("");
  const [decisionMaker, setDecisionMaker] = useState<DecisionMaker>("clinician");
  const [transitionEventDate, setTransitionEventDate] = useState("");
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [confirmationTarget, setConfirmationTarget] = useState<StructuredMedication | null>(null);
  const [confirmationStartDate, setConfirmationStartDate] = useState("");
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [manualReason, setManualReason] = useState<StopReasonCode | "">("");
  const [manualReasonComment, setManualReasonComment] = useState("");
  const [manualDecisionMaker, setManualDecisionMaker] = useState<DecisionMaker>("patient");
  const {
    data: catalogMedications = [],
    isFetching: catalogLoading,
    isError: catalogError,
  } = useMedications(debouncedCatalogSearch);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedCatalogSearch(catalogSearch.trim()), 150);
    return () => window.clearTimeout(timeout);
  }, [catalogSearch]);

  const currentMedication = medications.find((medication) => medication.id === editingId);
  const isHistoricalFormStatus = ["suspended", "stopped", "completed", "not_started"].includes(form.status);
  const requiresManualReason = ["suspended", "stopped", "completed", "not_started"].includes(form.status)
    && (!currentMedication || currentMedication.status !== form.status);
  const activeCount = medications.filter((medication) => medication.status === "active").length;
  const prescribedCount = medications.filter((medication) =>
    medication.status === "prescribed"
    || (medication.status === "needs_confirmation" && medication.source === "clinic_prescription"),
  ).length;
  const unconfirmedCount = medications.filter((medication) =>
    medication.status === "needs_confirmation" && medication.source !== "clinic_prescription",
  ).length;
  const historyCount = medications.filter((medication) =>
    medication.status === "suspended"
    || medication.status === "stopped"
    || medication.status === "completed"
    || medication.status === "not_started"
  ).length;
  const [medicationView, setMedicationView] = useState<"current" | "history">("current");
  const currentMedications = medications
    .filter((medication) =>
      medication.status === "active"
      || medication.status === "needs_confirmation"
      || medication.status === "prescribed",
    )
    .sort((left, right) => {
      const rank = (medication: StructuredMedication) =>
        medication.status === "prescribed"
        || (medication.status === "needs_confirmation" && medication.source === "clinic_prescription")
          ? 0
          : medication.status === "needs_confirmation" ? 1 : 2;
      return rank(left) - rank(right);
    });
  const historicalMedications = medications
    .filter((medication) => medication.status === "suspended" || medication.status === "stopped" || medication.status === "completed" || medication.status === "not_started")
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  const displayedMedications = medicationView === "current" ? currentMedications : historicalMedications;
  const confirmationStartDateIso = confirmationStartDate ? parseMoroccanDate(confirmationStartDate) : null;
  const confirmationPlannedEndPreview = confirmationTarget && confirmationStartDateIso && confirmationTarget.prescribed_duration_text
    ? calculatePlannedEndDate(confirmationStartDateIso, confirmationTarget.prescribed_duration_text)
    : confirmationTarget?.planned_end_on ?? null;

  const startCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setCatalogSearch("");
    setManualReason("");
    setManualReasonComment("");
    setManualDecisionMaker("patient");
    setIsFormOpen(true);
  };

  const startEdit = (medication: StructuredMedication) => {
    setForm(buildForm(medication));
    setEditingId(medication.id);
    setFormError(null);
    setCatalogSearch(medication.name);
    setManualReason("");
    setManualReasonComment("");
    setManualDecisionMaker("clinician");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setIsFormOpen(false);
    setCatalogSearch("");
    setCatalogOpen(false);
  };

  const requestTransition = (
    medication: StructuredMedication,
    status: "suspended" | "stopped" | "completed" | "not_started",
  ) => {
    setTransitionTarget({ medication, status });
    setTransitionReason(status === "completed" ? "FIN_PREVUE" : status === "not_started" ? "NON_COMMENCE" : "");
    setTransitionComment("");
    setDecisionMaker("clinician");
    setTransitionEventDate(toMoroccanDate(new Date().toISOString().slice(0, 10)));
    setTransitionError(null);
  };

  const saveForm = async () => {
    if (!canEditTreatments) {
      setFormError("Votre rôle permet de consulter les traitements, mais pas de les modifier.");
      return;
    }
    if (!isDoctor && (form.status === "active" || form.status === "prescribed" || form.source !== "patient_report")) {
      setFormError("Seul le médecin peut valider un traitement ou enregistrer une prescription.");
      return;
    }

    const name = form.name.trim();
    if (!name) {
      setFormError("Indiquez le nom du médicament.");
      return;
    }
    const startedOn = form.startedOn ? parseMoroccanDate(form.startedOn) : null;
    const plannedEndOn = form.plannedEndOn ? parseMoroccanDate(form.plannedEndOn) : null;
    const endedOn = form.endedOn ? parseMoroccanDate(form.endedOn) : null;
    if (form.startedOn && !startedOn) {
      setFormError("Date de début invalide. Utilisez le format jj/mm/aaaa.");
      return;
    }
    if (form.plannedEndOn && !plannedEndOn) {
      setFormError("Fin prévue invalide. Utilisez le format jj/mm/aaaa.");
      return;
    }
    if (form.endedOn && !endedOn) {
      setFormError("Date d’arrêt ou de fin invalide. Utilisez le format jj/mm/aaaa.");
      return;
    }
    if (startedOn && endedOn && endedOn < startedOn) {
      setFormError("La date d’arrêt ou de fin ne peut pas précéder la date de début.");
      return;
    }
    if (plannedEndOn && startedOn && plannedEndOn < startedOn) {
      setFormError("La date de fin prévue doit être postérieure à la date de début.");
      return;
    }

    const now = new Date().toISOString();
    const status = form.status;
    const requiresReason = ["suspended", "stopped", "completed", "not_started"].includes(status)
      && (!currentMedication || currentMedication.status !== status);
    const reason = STOP_REASONS.find((item) => item.code === manualReason);
    if (requiresReason && !reason) {
      setFormError("Sélectionnez le motif du statut historique.");
      return;
    }
    if (requiresReason && !endedOn) {
      setFormError("Indiquez la date de l’événement (exacte ou approximative).");
      return;
    }
    if (requiresReason && manualReason === "AUTRE" && !manualReasonComment.trim()) {
      setFormError("Précisez le motif choisi « Autre ».");
      return;
    }
    const frequency = form.frequency === "custom" ? form.customFrequency.trim() : form.frequency;
    if (form.frequency === "custom" && !frequency) {
      setFormError("Précisez la fréquence personnalisée.");
      return;
    }
    const previousHistory = currentMedication?.status_history?.length
      ? currentMedication.status_history
      : currentMedication
        ? [{ status: currentMedication.status, changed_at: currentMedication.updated_at }]
        : [];
    const previousLifecycleEvent = currentMedication?.status_history?.slice().reverse().find((entry) =>
      ["suspended", "stopped", "completed", "not_started"].includes(entry.status),
    );
    const eventDate = endedOn ?? new Date().toISOString().slice(0, 10);
    const lifecycleEventDate = endedOn ?? (status === currentMedication?.status ? currentMedication?.ended_on : null) ?? eventDate;
    const historyEntry = {
      status,
      changed_at: requiresReason ? lifecycleEventDate : now,
      ...(requiresReason && reason ? {
        reason_code: reason.code,
        reason_label: reason.label,
        reason_comment: manualReasonComment.trim() || null,
        decided_by: manualDecisionMaker,
      } : !requiresReason && currentMedication?.status === status && previousLifecycleEvent ? {
        ...(previousLifecycleEvent.reason_code ? { reason_code: previousLifecycleEvent.reason_code } : {}),
        ...(previousLifecycleEvent.reason_label ? { reason_label: previousLifecycleEvent.reason_label } : {}),
        ...(previousLifecycleEvent.reason_comment !== undefined ? { reason_comment: previousLifecycleEvent.reason_comment } : {}),
        ...(previousLifecycleEvent.decided_by ? { decided_by: previousLifecycleEvent.decided_by } : {}),
      } : {}),
    };
    const medication: StructuredMedication = {
      id: editingId ?? crypto.randomUUID(),
      name,
      dose: form.dose.trim() || null,
      units_per_intake: form.unitsPerIntake ? Number(form.unitsPerIntake) : null,
      intake_unit: form.unitsPerIntake ? form.intakeUnit : null,
      route: form.route.trim() || null,
      frequency: frequency.trim() || null,
      indication: form.indication.trim() || null,
      duration: form.duration,
      status,
      source: form.source,
      origin: form.source === "clinic_prescription" ? "clinic_prescription" : form.origin,
      validated_by_user_id: currentMedication?.validated_by_user_id ?? null,
      validated_by_name: currentMedication?.validated_by_name ?? null,
      validated_at: currentMedication?.validated_at ?? null,
      started_on: startedOn,
      planned_end_on: plannedEndOn,
      ended_on: ["stopped", "completed", "not_started"].includes(status)
        ? endedOn ?? currentMedication?.ended_on ?? null
        : null,
      prescribed_duration_text: currentMedication?.prescribed_duration_text ?? null,
      prescribed_regimen: currentMedication?.prescribed_regimen ?? null,
      prescription_refs: currentMedication?.prescription_refs ?? [],
      confirmed_at: status === "active"
        ? currentMedication?.status === "active" ? currentMedication.confirmed_at : now
        : currentMedication?.confirmed_at ?? null,
      status_history: currentMedication && status === currentMedication.status
        ? currentMedication.status_history?.length
          ? previousHistory.map((entry, index) => index === previousHistory.length - 1 ? historyEntry : entry)
          : [historyEntry]
        : [...previousHistory, historyEntry],
      ...(currentMedication?.prescription_id ? { prescription_id: currentMedication.prescription_id } : {}),
      ...(currentMedication?.prescription_item_id ? { prescription_item_id: currentMedication.prescription_item_id } : {}),
      ...(currentMedication?.prescription_item_order !== undefined ? { prescription_item_order: currentMedication.prescription_item_order } : {}),
      created_at: currentMedication?.created_at ?? now,
      updated_at: now,
    };
    const next = currentMedication
      ? medications.map((item) => item.id === currentMedication.id ? medication : item)
      : [...medications, medication];

    setFormError(null);
    try {
      await onSave(next);
      closeForm();
    } catch {
      setFormError("Enregistrement impossible. Réessayez sans fermer cette fiche.");
    }
  };

  const updateStatus = async (
    medication: StructuredMedication,
    status: MedicationStatus,
    reason?: {
      code: StopReasonCode;
      label: string;
      comment: string | null;
      decidedBy: DecisionMaker;
      eventDate: string;
    },
    lifecycle?: { startedOn: string | null; plannedEndOn: string | null },
  ) => {
    const now = new Date().toISOString();
    const next = medications.map((item) => item.id === medication.id
      ? {
          ...item,
          status,
          confirmed_at: status === "active" ? now : item.confirmed_at,
          started_on: lifecycle?.startedOn ?? item.started_on,
          planned_end_on: lifecycle?.plannedEndOn ?? item.planned_end_on,
          ended_on: ["stopped", "completed", "not_started"].includes(status)
            ? reason?.eventDate ?? now.slice(0, 10)
            : status === "active" ? null : item.ended_on ?? null,
          status_history: [
            ...(item.status_history?.length
              ? item.status_history
              : [{ status: item.status, changed_at: item.updated_at }]),
            {
              status,
              changed_at: reason?.eventDate ?? now,
              ...(reason ? {
                reason_code: reason.code,
                reason_label: reason.label,
                reason_comment: reason.comment,
                decided_by: reason.decidedBy,
              } : {}),
            },
          ],
          updated_at: now,
        }
      : item
    );
    setActionError(null);
    try {
      await onSave(next);
      setTransitionTarget(null);
      return true;
    } catch {
      setActionError("La mise à jour du statut a échoué. Réessayez.");
      return false;
    }
  };

  const confirmMedicationIntake = async () => {
    if (!confirmationTarget) return;
    const startedOn = confirmationStartDate ? parseMoroccanDate(confirmationStartDate) : null;
    if (confirmationStartDate && !startedOn) {
      setConfirmationError("Date de début invalide. Utilisez le format jj/mm/aaaa.");
      return;
    }
    setConfirmationError(null);
    const plannedEndOn = startedOn && confirmationTarget.prescribed_duration_text
      ? calculatePlannedEndDate(startedOn, confirmationTarget.prescribed_duration_text)
      : confirmationTarget.planned_end_on;
    const saved = await updateStatus(confirmationTarget, "active", undefined, {
      startedOn,
      plannedEndOn,
    });
    if (saved) setConfirmationTarget(null);
  };

  const confirmTransition = async () => {
    if (!transitionTarget || !transitionReason) {
      setTransitionError("Sélectionnez le motif de la décision.");
      return;
    }
    const reason = STOP_REASONS.find((item) => item.code === transitionReason);
    if (!reason) {
      setTransitionError("Le motif sélectionné est invalide.");
      return;
    }
    if (transitionReason === "AUTRE" && !transitionComment.trim()) {
      setTransitionError("Précisez le motif choisi « Autre ».");
      return;
    }
    const eventDate = parseMoroccanDate(transitionEventDate);
    if (!eventDate) {
      setTransitionError("Date d’événement invalide. Utilisez le format jj/mm/aaaa.");
      return;
    }
    setTransitionError(null);
    await updateStatus(transitionTarget.medication, transitionTarget.status, {
      code: reason.code,
      label: reason.label,
      comment: transitionComment.trim() || null,
      decidedBy: decisionMaker,
      eventDate,
    });
  };

  const selectCatalogMedication = (medication: Medication) => {
    setForm((current) => ({
      ...current,
      name: medication.nom,
      dose: medication.dosage_defaut ? `${medication.dosage_defaut} ${medication.unite ?? ""}`.trim() : "",
      route: getRouteFromPharmaceuticalForm(medication.forme) ?? "",
    }));
    setCatalogSearch("");
    setCatalogOpen(false);
  };

  const saveLegacy = () => {
    if (!isDoctor) return;
    onSaveLegacy(legacyDraft);
    setLegacyEditing(false);
  };

  const setRelativeDate = (field: "startedOn" | "plannedEndOn" | "endedOn", daysFromToday: number) => {
    setForm((current) => ({
      ...current,
      [field]: format(addDays(new Date(), daysFromToday), "dd/MM/yyyy"),
    }));
    setFormError(null);
  };

  return (
    <Card className="relative isolate overflow-hidden rounded-[1.4rem] border border-emerald-200/80 bg-white shadow-[0_14px_38px_-30px_rgba(21,94,72,0.48)] md:col-span-2">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_top_left,rgba(167,243,208,0.34),transparent_68%)]" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-emerald-100/80 bg-gradient-to-r from-[#f3faf6] via-white to-[#f8fbf9] px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2e8067] to-[#164f40] text-white shadow-md shadow-emerald-900/15">
            <Pill className="h-5 w-5" aria-hidden="true" />
            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#b8e4cf]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-700/80">Parcours thérapeutique</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold tracking-tight text-[#183c35]">Traitements du patient</h3>
              <Badge variant="outline" className="rounded-full border-emerald-200 bg-white/90 px-2.5 text-[10px] font-semibold text-emerald-800">
                {activeCount} actif{activeCount === 1 ? "" : "s"}
              </Badge>
              {unconfirmedCount > 0 && (
                <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-2.5 text-[10px] font-semibold text-amber-800">
                  {unconfirmedCount} à confirmer
                </Badge>
              )}
              {prescribedCount > 0 && (
                <Badge variant="outline" className="rounded-full border-sky-200 bg-sky-50 px-2.5 text-[10px] font-semibold text-sky-800">
                  {prescribedCount} prescrit{prescribedCount === 1 ? "" : "s"}
                </Badge>
              )}
              {historyCount > 0 && (
                <Badge variant="outline" className="rounded-full border-violet-200 bg-violet-50 px-2.5 text-[10px] font-semibold text-violet-800">
                  {historyCount} historique{historyCount === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-[#6b8177]">Prescription, prise déclarée et validation médicale : chaque étape reste distincte.</p>
          </div>
        </div>
        {canEditTreatments && (
          <Button type="button" onClick={startCreate} className="h-10 rounded-xl bg-[#23634f] px-4 text-xs font-semibold text-white shadow-sm shadow-emerald-900/15 transition-all hover:-translate-y-0.5 hover:bg-[#194d40] hover:shadow-md">
            <Plus className="mr-1.5 h-4 w-4" />{isSecretary ? "Déclarer un traitement" : "Ajouter un traitement"}
          </Button>
        )}
      </div>

      <div className="relative space-y-4 bg-[linear-gradient(180deg,#fbfdfc_0%,#ffffff_42%)] p-4 sm:p-5">
        {actionError && <p role="alert" className="text-xs font-medium text-rose-700">{actionError}</p>}
        <div className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-1.5 transition-colors",
          medicationView === "current" ? "border-emerald-100 bg-[#f1f8f4]" : "border-violet-100 bg-[#f7f5fc]",
        )}>
          <div className="flex gap-1.5" aria-label="Filtrer les traitements">
            <button
              type="button"
              aria-pressed={medicationView === "current"}
              onClick={() => setMedicationView("current")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all",
                medicationView === "current"
                  ? "border-emerald-200 bg-white text-emerald-950 shadow-sm"
                  : "border-transparent bg-transparent text-emerald-800 hover:bg-white/70",
              )}
            >
              <Pill className="h-3.5 w-3.5" /> En cours
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                medicationView === "current" ? "bg-white text-emerald-800" : "bg-emerald-100 text-emerald-800",
              )}>{activeCount + unconfirmedCount + prescribedCount}</span>
            </button>
            <button
              type="button"
              aria-pressed={medicationView === "history"}
              onClick={() => setMedicationView("history")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all",
                medicationView === "history"
                  ? "border-violet-200 bg-white text-violet-950 shadow-sm"
                  : "border-transparent bg-transparent text-violet-800 hover:bg-white/70",
              )}
            >
              <History className="h-3.5 w-3.5" /> Historique
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                medicationView === "history" ? "bg-white text-violet-800" : "bg-violet-100 text-violet-800",
              )}>{historyCount}</span>
            </button>
          </div>
          {medicationView === "current" && (
            <span className="px-2 text-[10px] text-slate-500">Déclaré ne signifie pas vérifié médicalement.</span>
          )}
        </div>
        <div className={cn(
          "rounded-2xl border px-4 py-3.5",
          medicationView === "history" ? "border-violet-100 bg-gradient-to-r from-violet-50/80 to-white" : "border-emerald-100 bg-gradient-to-r from-emerald-50/70 to-white",
        )}>
          <h4 className={cn("text-sm font-bold", medicationView === "history" ? "text-violet-950" : "text-emerald-950")}>
            {medicationView === "history" ? "Historique des traitements" : "Traitements en cours"}
          </h4>
          <p className="mt-0.5 text-xs text-slate-600">
            {medicationView === "history"
              ? "Les suspensions et arrêts restent tracés avec leur date, leur motif et le décideur."
              : "Les prescriptions, prises à confirmer et traitements actifs sont distingués ici."}
          </p>
        </div>
        <div className={cn(
          "flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5",
          isSecretary ? "border-amber-200 bg-amber-50/70 text-amber-950" : "border-slate-200 bg-white text-slate-600",
        )}>
          <Shield className={cn("mt-0.5 h-4 w-4 shrink-0", isSecretary ? "text-amber-700" : "text-emerald-700")} aria-hidden="true" />
          <p className="text-xs leading-5">
            {isDoctor
              ? "Vous pouvez valider une prise et tracer votre validation."
              : isSecretary
                ? "Vous pouvez consigner ce que le patient rapporte. La validation et le passage au statut actif sont réservés au médecin."
                : "Consultation seule : la saisie et la validation des traitements sont réservées au médecin et au secrétariat."}
          </p>
        </div>

        {displayedMedications.length === 0 && !isFormOpen && (
          <div className={cn(
            "flex flex-col gap-3 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center",
            medicationView === "history" ? "border-violet-100 bg-gradient-to-r from-violet-50/70 to-white" : "border-dashed border-emerald-200 bg-gradient-to-r from-[#f4faf6] to-white",
          )}>
            <span className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
              medicationView === "history" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-800",
            )}>
              {medicationView === "history" ? <History className="h-4 w-4" aria-hidden="true" /> : <Pill className="h-4 w-4" aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">
                {medicationView === "history" ? "L’historique est vide pour le moment" : "Aucun traitement consigné pour l’instant"}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {medicationView === "history"
                  ? "Les traitements suspendus, arrêtés ou terminés apparaîtront ici."
                  : "Cela ne confirme pas l’absence de traitement. Interrogez le patient puis consignez sa déclaration ou sa prescription."}
              </p>
            </div>
            {medicationView === "current" && canEditTreatments && (
              <Button type="button" size="sm" onClick={startCreate} className="h-9 shrink-0 rounded-xl bg-white px-3 text-xs font-semibold text-emerald-800 shadow-sm ring-1 ring-emerald-200 hover:bg-emerald-50">
                <Plus className="mr-1.5 h-3.5 w-3.5" />{isSecretary ? "Déclarer" : "Ajouter"}
              </Button>
            )}
          </div>
        )}

        {displayedMedications.map((medication) => {
          const displayStatus = medication.status === "needs_confirmation" && medication.source === "clinic_prescription"
            ? "prescribed"
            : medication.status;
          const isPrescribedOrUnconfirmed = displayStatus === "prescribed" || displayStatus === "needs_confirmation";
          const isExpired = displayStatus === "active" && medication.planned_end_on &&
            medication.planned_end_on < new Date().toISOString().slice(0, 10);
          const statusHistory = (medication.status_history ?? [{ status: medication.status, changed_at: medication.updated_at }])
            .map((change) => medication.source === "clinic_prescription" && change.status === "needs_confirmation"
              ? { ...change, status: "prescribed" as const }
              : change);
          const sourceLabel = medication.source === "patient_report"
            ? medication.status === "active" ? "Déclaré par le patient" : "Rapporté par le patient"
            : SOURCE_LABELS[medication.source];
          return (
            <div key={medication.id} className={cn(
              "relative overflow-hidden rounded-xl border p-3.5 pl-4.5",
              displayStatus === "active" ? "border-emerald-200 bg-white" : displayStatus === "prescribed" ? "border-sky-200 bg-sky-50/40" : displayStatus === "needs_confirmation" ? "border-amber-200 bg-amber-50/35" : displayStatus === "stopped" ? "border-rose-200 bg-rose-50/45" : displayStatus === "completed" ? "border-teal-200 bg-teal-50/45" : displayStatus === "not_started" ? "border-violet-200 bg-violet-50/45" : "border-indigo-200 bg-indigo-50/40",
            )}>
              <span className={cn(
                "absolute inset-y-0 left-0 w-1",
                displayStatus === "active" ? "bg-emerald-500" : displayStatus === "prescribed" ? "bg-sky-400" : displayStatus === "needs_confirmation" ? "bg-amber-400" : displayStatus === "stopped" ? "bg-rose-400" : displayStatus === "completed" ? "bg-teal-400" : displayStatus === "not_started" ? "bg-violet-400" : "bg-indigo-400",
              )} aria-hidden="true" />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-[#183c35]">{medication.name}</h4>
                    <Badge variant="outline" className={cn("gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold", STATUS_STYLES[displayStatus])}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", displayStatus === "active" ? "bg-emerald-500" : displayStatus === "prescribed" ? "bg-sky-500" : displayStatus === "needs_confirmation" ? "bg-amber-500" : displayStatus === "stopped" ? "bg-rose-500" : displayStatus === "completed" ? "bg-teal-500" : displayStatus === "not_started" ? "bg-violet-500" : "bg-slate-500")} aria-hidden="true" />
                      {STATUS_LABELS[displayStatus]}
                    </Badge>
                    {isExpired && (
                      <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-[10px] text-amber-800">
                        Fin prévue dépassée · à réévaluer
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {[medication.dose, formatUnitsPerIntake(medication.units_per_intake, medication.intake_unit ?? "comprimé"), medication.route, medication.frequency].filter(Boolean).join(" · ") || "Posologie non précisée"}
                    {medication.indication ? ` · Motif : ${medication.indication}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                    <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-slate-600">{medication.duration === "short_term" ? "Temporaire" : medication.duration === "long_term" ? "Au long cours" : "Durée à préciser"}</span>
                    <span className="rounded-full border border-sky-100 bg-sky-50/80 px-2.5 py-1 text-sky-800">{sourceLabel}</span>
                    {medication.origin && medication.origin !== "unknown" && <span className="rounded-full border border-indigo-100 bg-indigo-50/80 px-2.5 py-1 text-indigo-800">{ORIGIN_LABELS[medication.origin]}</span>}
                    {medication.prescription_refs?.length && medication.source !== "clinic_prescription" ? (
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 font-medium text-blue-800">Également prescrit au cabinet</span>
                    ) : null}
                    {medication.confirmed_at && <span className="rounded-full border border-emerald-100 bg-emerald-50/80 px-2.5 py-1 text-emerald-800">{medication.validated_by_name ? "Validé le" : "Prise confirmée le"} {formatDate(medication.confirmed_at)}</span>}
                    {displayStatus === "prescribed" && (
                      <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 font-medium text-sky-800">Ordonnance enregistrée · aucune prise déclarée</span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-stretch gap-2">
                    {medication.started_on && (
                      <div className="inline-flex min-w-[130px] items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/65 px-2.5 py-2 text-[10px] text-emerald-900">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
                        <span><span className="block font-semibold">Début · {elapsedSince(medication.started_on)}</span><span className="block text-emerald-800/75">{formatDate(medication.started_on)}</span></span>
                      </div>
                    )}
                    {medication.planned_end_on && (
                      <div className="inline-flex min-w-[130px] items-center gap-2 rounded-xl border border-sky-100 bg-sky-50/65 px-2.5 py-2 text-[10px] text-sky-900">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-sky-700" aria-hidden="true" />
                        <span><span className="block font-semibold">Fin prévue</span><span className="block text-sky-800/75">{formatDate(medication.planned_end_on)}</span></span>
                      </div>
                    )}
                    {["suspended", "stopped", "completed", "not_started"].includes(medication.status) && lifecycleDate(medication) && (
                      <div className="inline-flex min-w-[140px] items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/70 px-2.5 py-2 text-[10px] text-violet-950">
                        <Clock3 className="h-3.5 w-3.5 shrink-0 text-violet-700" aria-hidden="true" />
                        <span>
                          <span className="block font-semibold">{medicationEventLabel(medication.status)} {elapsedSince(lifecycleDate(medication))}</span>
                          <span className="block text-violet-800/75">{formatDate(lifecycleDate(medication))}</span>
                        </span>
                      </div>
                    )}
                    {medication.ended_on && !["stopped", "completed", "not_started"].includes(medication.status) && (
                      <div className="inline-flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/70 px-2.5 py-2 text-[10px] text-violet-950">
                        <Clock3 className="h-3.5 w-3.5 shrink-0 text-violet-700" aria-hidden="true" />
                        <span><span className="block font-semibold">Événement {elapsedSince(medication.ended_on)}</span><span className="block text-violet-800/75">{formatDate(medication.ended_on)}</span></span>
                      </div>
                    )}
                  </div>
                  {medication.validated_by_name ? (
                    <p className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-900">
                      <Shield className="h-3 w-3" aria-hidden="true" />
                      Validé par {medication.validated_by_name}
                      {medication.validated_at ? ` · ${formatDateTime(medication.validated_at)}` : ""}
                    </p>
                  ) : medication.status === "active" ? (
                    <p className="mt-1 text-[11px] text-amber-800">
                      Validation antérieure enregistrée sans identité nominative.
                    </p>
                  ) : medication.status === "needs_confirmation" && medication.source === "patient_report" ? (
                    <p className="mt-1 text-[11px] text-amber-800">Déclaration du patient · en attente de validation médicale</p>
                  ) : null}
                  {medication.prescribed_regimen && medication.prescribed_regimen !== medication.frequency && (
                    <p className="mt-1 text-[11px] text-blue-800">
                      Posologie de l’ordonnance liée : {medication.prescribed_regimen}
                    </p>
                  )}
                  <details className="group mt-2 max-w-xl">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-800 transition-colors hover:border-indigo-300 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [&::-webkit-details-marker]:hidden">
                      <History className="h-3 w-3" />
                      Historique du traitement
                      <span className="rounded-full bg-white px-1.5 tabular-nums text-indigo-800">{statusHistory.length}</span>
                    </summary>
                    <ol className="ml-1 mt-2 space-y-2.5 border-l border-indigo-200 pl-3" aria-label={`Historique de ${medication.name}`}>
                      {statusHistory
                        .map((change, index) => ({ change, index }))
                        .sort((left, right) => {
                          const timeDifference = Date.parse(right.change.changed_at) - Date.parse(left.change.changed_at);
                          return (Number.isNaN(timeDifference) ? 0 : timeDifference) || right.index - left.index;
                        })
                        .map(({ change, index }) => {
                          const isStopEvent = ["suspended", "stopped", "completed", "not_started"].includes(change.status);
                          return (
                        <li key={`${change.changed_at}-${index}`} className="relative rounded-lg bg-white/80 px-2.5 py-2 text-[11px] text-slate-600">
                          <span className={cn(
                            "absolute -left-[17px] top-3 h-2 w-2 rounded-full border border-white shadow-sm",
                            change.status === "stopped" ? "bg-rose-400" : change.status === "completed" ? "bg-teal-400" : change.status === "not_started" ? "bg-violet-400" : change.status === "suspended" ? "bg-indigo-400" : "bg-emerald-400",
                          )} aria-hidden="true" />
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                            <span className="font-semibold text-slate-800">{HISTORY_EVENT_LABELS[change.status]}</span>
                            <time className="text-slate-500">{formatDateTime(change.changed_at)}</time>
                          </div>
                          {isStopEvent && (
                            <div className="mt-1.5 space-y-0.5 border-t border-slate-100 pt-1.5">
                              <p className="text-slate-700">
                                <span className="font-medium">Motif : </span>
                                {change.reason_label ?? (change.reason_code
                                  ? STOP_REASONS.find((reason) => reason.code === change.reason_code)?.label ?? change.reason_code
                                  : "Motif non consigné")}
                              </p>
                              {change.decided_by && <p className="text-slate-500">{DECISION_MAKER_LABELS[change.decided_by]}</p>}
                              {change.reason_comment && <p className="whitespace-pre-wrap text-slate-600">{change.reason_comment}</p>}
                            </div>
                          )}
                        </li>
                          );
                        })}
                    </ol>
                  </details>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {isPrescribedOrUnconfirmed && isDoctor && (
                    <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => {
                      setConfirmationTarget(medication);
                      setConfirmationStartDate(toMoroccanDate(medication.started_on));
                      setConfirmationError(null);
                    }} className="h-7 rounded-lg border-emerald-200 bg-white px-2 text-[11px] text-emerald-800">
                      <Check className="mr-1 h-3 w-3" />{medication.source === "clinic_prescription" ? "Confirmer la prise" : "Confirmer"}
                    </Button>
                  )}
                  {displayStatus === "prescribed" && isDoctor && (
                    <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => requestTransition(medication, "not_started")} className="h-7 rounded-lg border-violet-200 bg-white px-2 text-[11px] text-violet-800">
                      <X className="mr-1 h-3 w-3" />Non commencé
                    </Button>
                  )}
                  {medication.status === "active" && isDoctor && (
                    <>
                      <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => requestTransition(medication, "suspended")} className="h-7 rounded-lg px-2 text-[11px]">
                        <Slash className="mr-1 h-3 w-3" /> Suspendre
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => requestTransition(medication, "stopped")} className="h-7 rounded-lg border-rose-200 px-2 text-[11px] text-rose-800">
                        <X className="mr-1 h-3 w-3" /> Arrêter
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => requestTransition(medication, "completed")} className="h-7 rounded-lg border-teal-200 px-2 text-[11px] text-teal-800">
                        Terminer
                      </Button>
                    </>
                  )}
                  {medication.status === "suspended" && medicationView === "history" && isDoctor && (
                    <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void updateStatus(medication, "active")} className="h-7 rounded-lg border-emerald-200 bg-white px-2 text-[11px] text-emerald-800">
                      <RotateCcw className="mr-1 h-3 w-3" /> Confirmer la reprise
                    </Button>
                  )}
                  {canEditTreatments && (isDoctor || (medication.source === "patient_report" && medication.status !== "active")) && (
                    <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => startEdit(medication)} className="h-7 rounded-lg px-2 text-[11px] text-[#28624f]">
                      Modifier
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isFormOpen && (
          <Dialog
            open={isFormOpen}
            onOpenChange={(open) => {
              if (!open && !saving) closeForm();
            }}
          >
            <DialogContent className="max-h-[92dvh] max-w-3xl gap-0 overflow-hidden rounded-[1.5rem] border-emerald-100 bg-[#fbfdfc] p-0 shadow-2xl sm:max-w-3xl">
              <DialogHeader className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-r from-[#edf8f1] via-white to-[#f2f8f5] px-5 py-5 pr-12 text-left sm:px-7">
                <span className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-emerald-100/60 blur-2xl" aria-hidden="true" />
                <div className="relative flex items-start gap-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2e8067] to-[#164f40] text-white shadow-md shadow-emerald-900/15">
                    <Pill className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-700/80">
                      {editingId ? "Mise à jour du dossier" : isSecretary ? "Déclaration patient" : "Nouveau traitement"}
                    </p>
                    <DialogTitle className="mt-1 text-lg font-bold tracking-tight text-[#183c35]">
                      {editingId ? "Modifier le traitement" : isSecretary ? "Consigner un traitement" : "Ajouter un traitement"}
                    </DialogTitle>
                    <DialogDescription className="mt-1 max-w-xl text-xs leading-5 text-slate-600">
                      {isSecretary
                        ? "Consignez les mots du patient. Le médecin pourra ensuite confirmer la prise."
                        : "La prescription et la prise réelle sont distinctes. Les détails complémentaires restent facultatifs."}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="max-h-[calc(92dvh-11rem)] overflow-y-auto px-5 py-5 sm:px-7">
                <div className="space-y-4">
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1 text-xs font-medium text-slate-700 lg:col-span-3">
                <span className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-emerald-900">
                  Médicament <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-rose-700">Obligatoire</span>
                </span>
                <span className="mb-1 block text-[11px] font-normal normal-case tracking-normal text-slate-500">Rechercher dans le catalogue ou saisir librement</span>
                <Popover open={catalogOpen} onOpenChange={setCatalogOpen}>
                  <PopoverAnchor asChild>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700" />
                      <Input
                        value={form.name}
                        onChange={(event) => {
                          const value = event.target.value;
                          setForm({ ...form, name: value });
                          setCatalogSearch(value);
                          setCatalogOpen(value.trim().length >= 2);
                        }}
                        placeholder="Nom commercial ou DCI…"
                        className="h-11 rounded-xl border-emerald-200 bg-white pl-10 text-sm shadow-sm focus-visible:ring-emerald-500"
                        aria-label="Rechercher ou saisir un médicament"
                      />
                    </div>
                  </PopoverAnchor>
                  <PopoverContent
                    align="start"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                    className="z-[70] w-[min(34rem,calc(100vw-3rem))] rounded-xl border-emerald-100 p-0 shadow-xl"
                  >
                    <ScrollArea className="h-[min(16rem,40vh)]">
                      {catalogSearch.trim().length < 2 ? (
                        <p className="p-3 text-center text-xs text-slate-500">Saisissez au moins 2 caractères.</p>
                      ) : catalogLoading ? (
                        <p className="p-3 text-center text-xs text-slate-500" role="status">Recherche en cours…</p>
                      ) : catalogError ? (
                        <p className="p-3 text-center text-xs text-rose-700" role="alert">Catalogue indisponible. Vous pouvez saisir le médicament manuellement.</p>
                      ) : catalogMedications.length ? (
                        <div className="space-y-1 p-1.5">
                          {catalogMedications.map((medication) => (
                            <button
                              key={medication.id}
                              type="button"
                              onClick={() => selectCatalogMedication(medication)}
                              className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-emerald-50 focus-visible:bg-emerald-50 focus-visible:outline-none"
                            >
                              <span className="block text-sm font-medium text-slate-800">{medication.nom}</span>
                              <span className="mt-0.5 block text-xs text-slate-500">
                                {[medication.dci, medication.forme, medication.dosage_defaut && `${medication.dosage_defaut} ${medication.unite ?? ""}`.trim()].filter(Boolean).join(" · ") || "Détails non renseignés"}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="p-3 text-center text-xs text-slate-500">Aucun médicament trouvé. Vous pouvez le saisir ci-dessous.</p>
                      )}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </label>
              <div className="lg:col-span-3 order-2">
              <details
                open={requiresManualReason || (Boolean(currentMedication) && ["suspended", "stopped", "completed", "not_started"].includes(form.status))}
                className="group rounded-2xl border border-[#dcece2] bg-gradient-to-br from-[#f3faf5] via-white to-[#f8fbf9] shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-xs font-bold text-emerald-950">Dates du traitement</span>
                      <span className="block text-[10px] font-normal text-slate-500">Repères facultatifs · saisir une date ou un raccourci</span>
                    </span>
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-800 group-open:hidden">Ajouter</span>
                  <span className="hidden text-[11px] font-semibold text-slate-500 group-open:inline">Réduire</span>
                </summary>
                <div className="space-y-3 border-t border-emerald-100 p-3.5 sm:p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 text-xs font-semibold text-slate-700">
                    <label htmlFor="medication-started-on" className="inline-flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-800"><CalendarDays className="h-3 w-3" aria-hidden="true" /></span>
                      Début du traitement
                    </label>
                    <div className="relative">
                      <Input id="medication-started-on" inputMode="numeric" maxLength={10} value={form.startedOn} onChange={(event) => setForm({ ...form, startedOn: maskMoroccanDate(event.target.value) })} placeholder="jj/mm/aaaa" className="h-10 rounded-xl border-emerald-100 bg-white pr-11 shadow-sm focus-visible:ring-emerald-200" />
                      <Popover open={datePickerOpen === "startedOn"} onOpenChange={(open) => setDatePickerOpen(open ? "startedOn" : null)}>
                        <PopoverTrigger asChild>
                          <button type="button" aria-label="Choisir la date de début dans le calendrier" className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                            <CalendarDays className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-auto rounded-2xl border-emerald-100 bg-white p-2 shadow-xl">
                          <div className="px-3 pb-1 pt-2 text-xs font-semibold text-emerald-950">Date de début</div>
                          <Calendar
                            mode="single"
                            selected={getCalendarDate(form.startedOn)}
                            defaultMonth={getCalendarDate(form.startedOn) ?? new Date()}
                            onSelect={(date) => {
                              if (date) setForm({ ...form, startedOn: format(date, "dd/MM/yyyy") });
                              setDatePickerOpen(null);
                            }}
                            locale={fr}
                            initialFocus
                            classNames={{
                              day_selected: "bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white focus:bg-emerald-700 focus:text-white",
                              day_today: "bg-emerald-50 text-emerald-900 font-semibold",
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <span className="flex flex-wrap gap-1.5 pt-0.5">
                      {[
                        { label: "Aujourd’hui", days: 0 },
                        { label: "Il y a 3 j", days: -3 },
                        { label: "Il y a 1 sem.", days: -7 },
                      ].map((preset) => (
                        <button key={preset.label} type="button" onClick={() => setRelativeDate("startedOn", preset.days)} className="rounded-full border border-emerald-100 bg-white px-2.5 py-1 text-[10px] font-semibold text-emerald-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50">
                          {preset.label}
                        </button>
                      ))}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs font-semibold text-slate-700">
                    <label htmlFor="medication-end-on" className="inline-flex items-center gap-1.5">
                      <span className={cn("flex h-5 w-5 items-center justify-center rounded-md", isHistoricalFormStatus ? "bg-violet-100 text-violet-800" : "bg-sky-100 text-sky-800")}><CalendarDays className="h-3 w-3" aria-hidden="true" /></span>
                      {isHistoricalFormStatus ? "Date d’arrêt / fin effective" : "Fin prévue"}
                      {requiresManualReason && <span className="text-rose-600">*</span>}
                    </label>
                    <div className="relative">
                      <Input
                        id="medication-end-on"
                        inputMode="numeric"
                        maxLength={10}
                        value={isHistoricalFormStatus ? form.endedOn : form.plannedEndOn}
                        onChange={(event) => setForm({
                          ...form,
                          [isHistoricalFormStatus ? "endedOn" : "plannedEndOn"]: maskMoroccanDate(event.target.value),
                        })}
                        placeholder="jj/mm/aaaa"
                        className={cn("h-10 rounded-xl bg-white pr-11 shadow-sm", isHistoricalFormStatus ? "border-violet-100 focus-visible:ring-violet-200" : "border-sky-100 focus-visible:ring-sky-200")}
                      />
                      <Popover open={datePickerOpen === "endOn"} onOpenChange={(open) => setDatePickerOpen(open ? "endOn" : null)}>
                        <PopoverTrigger asChild>
                          <button type="button" aria-label="Choisir la date de fin dans le calendrier" className={cn("absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2", isHistoricalFormStatus ? "text-violet-700 hover:bg-violet-50 focus-visible:ring-violet-300" : "text-sky-700 hover:bg-sky-50 focus-visible:ring-sky-300")}>
                            <CalendarDays className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className={cn("w-auto rounded-2xl bg-white p-2 shadow-xl", isHistoricalFormStatus ? "border-violet-100" : "border-sky-100")}>
                          <div className={cn("px-3 pb-1 pt-2 text-xs font-semibold", isHistoricalFormStatus ? "text-violet-950" : "text-sky-950")}>
                            {isHistoricalFormStatus ? "Date d’arrêt / fin effective" : "Fin prévue"}
                          </div>
                          <Calendar
                            mode="single"
                            selected={getCalendarDate(isHistoricalFormStatus ? form.endedOn : form.plannedEndOn)}
                            defaultMonth={getCalendarDate(isHistoricalFormStatus ? form.endedOn : form.plannedEndOn) ?? new Date()}
                            onSelect={(date) => {
                              if (date) {
                                const field = isHistoricalFormStatus ? "endedOn" : "plannedEndOn";
                                setForm({ ...form, [field]: format(date, "dd/MM/yyyy") });
                              }
                              setDatePickerOpen(null);
                            }}
                            locale={fr}
                            initialFocus
                            classNames={{
                              day_selected: isHistoricalFormStatus
                                ? "bg-violet-600 text-white hover:bg-violet-700 hover:text-white focus:bg-violet-700 focus:text-white"
                                : "bg-sky-600 text-white hover:bg-sky-700 hover:text-white focus:bg-sky-700 focus:text-white",
                              day_today: isHistoricalFormStatus
                                ? "bg-violet-50 text-violet-900 font-semibold"
                                : "bg-sky-50 text-sky-900 font-semibold",
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <span className="flex flex-wrap gap-1.5 pt-0.5">
                      {(isHistoricalFormStatus
                        ? [
                            { label: "Aujourd’hui", days: 0 },
                            { label: "Il y a 3 j", days: -3 },
                            { label: "Il y a 1 sem.", days: -7 },
                          ]
                        : [
                            { label: "Dans 3 j", days: 3 },
                            { label: "Dans 1 sem.", days: 7 },
                            { label: "Dans 15 j", days: 15 },
                          ]
                      ).map((preset) => (
                        <button key={preset.label} type="button" onClick={() => setRelativeDate(isHistoricalFormStatus ? "endedOn" : "plannedEndOn", preset.days)} className={cn(
                          "rounded-full border bg-white px-2.5 py-1 text-[10px] font-semibold transition-colors",
                          isHistoricalFormStatus ? "border-violet-100 text-violet-800 hover:border-violet-300 hover:bg-violet-50" : "border-sky-100 text-sky-800 hover:border-sky-300 hover:bg-sky-50",
                        )}>
                          {preset.label}
                        </button>
                      ))}
                    </span>
                  </div>
                </div>
              </div>
              </details>
              </div>
              <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                <span className="inline-flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-800"><Pill className="h-3 w-3" aria-hidden="true" /></span>Dose</span>
                <Input value={form.dose} onChange={(event) => setForm({ ...form, dose: event.target.value })} placeholder="Ex. 500 mg" className="h-10 rounded-xl border-emerald-100 bg-white shadow-sm focus-visible:border-emerald-300 focus-visible:ring-emerald-100" />
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                <span className="inline-flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-100 text-sky-800"><Route className="h-3 w-3" aria-hidden="true" /></span>Voie</span>
                <select value={form.route} onChange={(event) => setForm({ ...form, route: event.target.value })} className="h-10 w-full rounded-xl border border-sky-100 bg-white px-3 text-sm shadow-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100">
                  <option value="">À vérifier / non précisée</option>
                  {MEDICATION_ROUTES.map((route) => <option key={route} value={route}>{route}</option>)}
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                <span className="inline-flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-100 text-violet-800"><Clock3 className="h-3 w-3" aria-hidden="true" /></span>Fréquence / posologie</span>
                <select
                  value={form.frequency}
                  onChange={(event) => setForm({ ...form, frequency: event.target.value, customFrequency: event.target.value === "custom" ? form.customFrequency : "" })}
                  className="h-10 w-full rounded-xl border border-violet-100 bg-white px-3 text-sm shadow-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                >
                  <option value="">À préciser</option>
                  <option value="1 fois par jour">1 fois par jour</option>
                  <option value="2 fois par jour">2 fois par jour</option>
                  <option value="3 fois par jour">3 fois par jour</option>
                  <option value="4 fois par jour">4 fois par jour</option>
                  <option value="Toutes les 4 heures">Toutes les 4 heures</option>
                  <option value="Toutes les 6 heures">Toutes les 6 heures</option>
                  <option value="Toutes les 8 heures">Toutes les 8 heures</option>
                  <option value="Toutes les 12 heures">Toutes les 12 heures</option>
                  <option value="Si besoin">Si besoin</option>
                  <option value="custom">Personnalisée…</option>
                </select>
                {form.frequency === "custom" && (
                  <Input value={form.customFrequency} onChange={(event) => setForm({ ...form, customFrequency: event.target.value })} placeholder="Précisez la fréquence" className="mt-2 h-10 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:border-emerald-300 focus-visible:ring-emerald-100" />
                )}
                <div className="flex flex-wrap gap-1.5 pt-1" aria-label="Fréquences courantes">
                  {[
                    { value: "1 fois par jour", label: "1× / jour", tone: "emerald" },
                    { value: "2 fois par jour", label: "2× / jour", tone: "violet" },
                    { value: "3 fois par jour", label: "3× / jour", tone: "amber" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={form.frequency === option.value}
                      onClick={() => setForm({ ...form, frequency: option.value, customFrequency: "" })}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors",
                        option.tone === "emerald" && (form.frequency === option.value ? "border-emerald-300 bg-emerald-100 text-emerald-900" : "border-emerald-100 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100"),
                        option.tone === "violet" && (form.frequency === option.value ? "border-violet-300 bg-violet-100 text-violet-900" : "border-violet-100 bg-violet-50/70 text-violet-800 hover:bg-violet-100"),
                        option.tone === "amber" && (form.frequency === option.value ? "border-amber-300 bg-amber-100 text-amber-900" : "border-amber-100 bg-amber-50/70 text-amber-800 hover:bg-amber-100"),
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </label>
              <div className="space-y-1.5 text-xs font-semibold text-slate-700 lg:col-span-3">
                <span className="inline-flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-amber-800"><Pill className="h-3 w-3" aria-hidden="true" /></span>Comprimés / gélules par prise <span className="font-normal text-slate-400">· facultatif</span></span>
                <div className="flex flex-wrap gap-2" aria-label="Quantité de comprimés ou gélules par prise">
                  {[
                    { value: "", label: "À préciser" },
                    { value: "0.5", label: "½" },
                    { value: "1", label: "1" },
                    { value: "2", label: "2" },
                    { value: "3", label: "3" },
                  ].map((option) => {
                    const selected = form.unitsPerIntake === option.value;
                    return (
                      <button
                        key={option.value || "unknown"}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setForm({ ...form, unitsPerIntake: option.value })}
                        className={cn(
                          "inline-flex h-9 min-w-10 items-center justify-center rounded-full border px-3 text-xs font-bold transition-all",
                          selected ? "border-amber-300 bg-amber-100 text-amber-950 shadow-sm ring-2 ring-amber-100" : "border-amber-100 bg-white text-amber-900 hover:border-amber-200 hover:bg-amber-50",
                          option.value === "" && "text-[10px] font-medium",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                  <span className="mx-1 hidden h-8 w-px bg-amber-100 sm:block" aria-hidden="true" />
                  {(["comprimé", "gélule"] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      aria-pressed={form.intakeUnit === unit}
                      onClick={() => setForm({ ...form, intakeUnit: unit })}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[10px] font-semibold transition-colors",
                        form.intakeUnit === unit ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-100 bg-white text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {unit === "comprimé" ? "Comprimé" : "Gélule"}
                    </button>
                  ))}
                  <span className="self-center text-[10px] font-normal text-slate-500">Ex. ½ comprimé le matin · 1 gélule par prise.</span>
                </div>
              </div>
              <div className="space-y-2 text-xs font-semibold text-slate-700">
                <span className="inline-flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-teal-100 text-teal-800"><CalendarDays className="h-3 w-3" aria-hidden="true" /></span>
                  Durée
                </span>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Durée du traitement">
                  {([
                    { value: "unknown", label: "À préciser", icon: CircleHelp, tone: "slate" },
                    { value: "short_term", label: "Temporaire", icon: CalendarClock, tone: "teal" },
                    { value: "long_term", label: "Au long cours", icon: InfinityIcon, tone: "indigo" },
                  ] as const).map((option) => {
                    const selected = form.duration === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setForm({ ...form, duration: option.value as MedicationDuration })}
                        className={cn(
                          "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                          option.tone === "slate" && (selected ? "border-slate-300 bg-slate-100 text-slate-900 ring-2 ring-slate-100" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"),
                          option.tone === "teal" && (selected ? "border-teal-300 bg-teal-100 text-teal-950 ring-2 ring-teal-100" : "border-teal-100 bg-teal-50/70 text-teal-800 hover:bg-teal-100"),
                          option.tone === "indigo" && (selected ? "border-indigo-300 bg-indigo-100 text-indigo-950 ring-2 ring-indigo-100" : "border-indigo-100 bg-indigo-50/70 text-indigo-800 hover:bg-indigo-100"),
                        )}
                      >
                        <option.icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2 text-xs font-semibold text-slate-700 lg:col-span-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-amber-800"><Check className="h-3 w-3" aria-hidden="true" /></span>
                  Statut du traitement
                </span>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Statut du traitement">
                  {(Object.keys(STATUS_LABELS) as MedicationStatus[])
                    .filter((status) =>
                      (status !== "prescribed" || currentMedication?.source === "clinic_prescription")
                      && (status !== "active" || isDoctor),
                    )
                    .map((status) => {
                      const Icon = STATUS_ICONS[status];
                      const selected = form.status === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setForm({ ...form, status });
                            setManualReason("");
                            setManualReasonComment("");
                          }}
                          className={cn(
                            "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                            STATUS_STYLES[status],
                            selected ? STATUS_SELECTED_STYLES[status] : "hover:brightness-[0.98]",
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          {STATUS_LABELS[status]}
                          {selected && <Check className="ml-0.5 h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />}
                        </button>
                      );
                    })}
                </div>
              </div>
              <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                <span className="inline-flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 text-indigo-800"><Shield className="h-3 w-3" aria-hidden="true" /></span>Source de l’information</span>
                <select value={form.source} disabled={!isDoctor} onChange={(event) => setForm({ ...form, source: event.target.value as MedicationSource })} className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50">
                  <option value="patient_report">Déclaré par le patient · y compris prescrit ailleurs</option>
                  {isDoctor && <option value="clinician_verified">Vérifié par le médecin</option>}
                  {isDoctor && currentMedication?.source === "clinic_prescription" && (
                    <option value="clinic_prescription">Prescription de ce cabinet</option>
                  )}
                </select>
              </label>
              <div className="lg:col-span-3 flex items-center gap-2 border-t border-emerald-100 pt-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Situation et source</p>
                  <p className="text-[11px] text-slate-500">Une déclaration du patient ne vaut pas confirmation médicale.</p>
                </div>
              </div>
              <div className={cn(
                "flex items-start gap-2 rounded-xl border p-3 text-xs leading-5 sm:col-span-2",
                form.status === "active"
                  ? "border-emerald-200 bg-emerald-50/75 text-emerald-950"
                  : form.status === "prescribed"
                    ? "border-sky-200 bg-sky-50/75 text-sky-950"
                    : "border-amber-200 bg-amber-50/65 text-amber-950",
              )}>
                <Shield className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {form.status === "active"
                    ? "Statut réservé au médecin : la confirmation sera horodatée et associée à son nom."
                    : form.status === "prescribed"
                      ? "Une ordonnance indique ce qui a été prescrit, pas ce que le patient a effectivement commencé."
                      : "La source « Déclaré par le patient » conserve son récit sans le présenter comme une validation médicale."}
                </span>
              </div>
              <details
                open={requiresManualReason || (Boolean(currentMedication) && ["suspended", "stopped", "completed", "not_started"].includes(form.status))}
                className="group order-3 sm:col-span-2 lg:col-span-3 rounded-2xl border border-emerald-100 bg-white/85 shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-emerald-950 [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                    Repères & contexte
                  </span>
                  <span className="text-[11px] font-normal text-slate-500 group-open:hidden">Facultatif</span>
                  <span className="hidden text-[11px] font-normal text-slate-500 group-open:inline">Réduire</span>
                </summary>
                <div className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-2">
              <div className="space-y-2 text-xs font-semibold text-slate-700">
                <span className="inline-flex items-center gap-1.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  Origine du traitement
                </span>
                <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Choisir l’origine du traitement">
                  {(Object.entries(ORIGIN_LABELS) as [MedicationOrigin, string][]).map(([value, label]) => {
                    const selected = (form.source === "clinic_prescription" ? "clinic_prescription" : form.origin) === value;
                    const tone = value === "clinic_prescription"
                      ? "sky"
                      : value === "external_prescription"
                        ? "indigo"
                        : value === "self_medication"
                          ? "amber"
                          : value === "other"
                            ? "violet"
                            : "slate";
                    return (
                      <button
                        key={value}
                        type="button"
                        title={label}
                        aria-label={label}
                        aria-pressed={selected}
                        disabled={form.source === "clinic_prescription"}
                        onClick={() => setForm({ ...form, origin: value })}
                        className={cn(
                          "shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[10px] font-semibold leading-tight transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70",
                          tone === "sky" && (selected ? "border-sky-300 bg-sky-100 text-sky-950 shadow-sm ring-2 ring-sky-100" : "border-sky-100 bg-sky-50/70 text-sky-800 hover:border-sky-200 hover:bg-sky-100"),
                          tone === "indigo" && (selected ? "border-indigo-300 bg-indigo-100 text-indigo-950 shadow-sm ring-2 ring-indigo-100" : "border-indigo-100 bg-indigo-50/70 text-indigo-800 hover:border-indigo-200 hover:bg-indigo-100"),
                          tone === "amber" && (selected ? "border-amber-300 bg-amber-100 text-amber-950 shadow-sm ring-2 ring-amber-100" : "border-amber-100 bg-amber-50/70 text-amber-800 hover:border-amber-200 hover:bg-amber-100"),
                          tone === "violet" && (selected ? "border-violet-300 bg-violet-100 text-violet-950 shadow-sm ring-2 ring-violet-100" : "border-violet-100 bg-violet-50/70 text-violet-800 hover:border-violet-200 hover:bg-violet-100"),
                          tone === "slate" && (selected ? "border-slate-300 bg-slate-100 text-slate-900 shadow-sm ring-2 ring-slate-100" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"),
                        )}
                      >
                        {ORIGIN_CHIP_LABELS[value]}
                      </button>
                    );
                  })}
                </div>
                {form.source === "clinic_prescription" && (
                  <p className="text-[10px] font-normal text-slate-500">Origine définie par la prescription du cabinet.</p>
                )}
              </div>
              {form.source === "clinic_prescription" && form.status === "prescribed" && (
                <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900 sm:col-span-2">
                  L’ordonnance est enregistrée. Le traitement ne sera considéré comme commencé qu’après confirmation de la prise.
                </p>
              )}
              {["suspended", "stopped", "completed", "not_started"].includes(form.status) && requiresManualReason && (
                <>
                  <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-100 text-rose-800">
                        <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      Motif de l’événement *
                    </span>
                    <select
                      value={manualReason}
                      onChange={(event) => setManualReason(event.target.value as StopReasonCode | "")}
                      className="h-10 w-full rounded-xl border border-rose-100 bg-white px-3 text-sm shadow-sm focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                    >
                      <option value="">Sélectionner un motif</option>
                      {(["Médicale", "Patient", "Administrative", "Autre"] as const).map((category) => (
                        <optgroup key={category} label={category}>
                          {STOP_REASONS.filter((reason) => reason.category === category).map((reason) => (
                            <option key={reason.code} value={reason.code}>{reason.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {form.status === "stopped" && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          { code: "AUTOMED", label: "Arrêt spontané" },
                          { code: "GUERISON", label: "Amélioration" },
                          { code: "EI", label: "Effet indésirable" },
                        ].map((reason) => (
                          <button
                            key={reason.code}
                            type="button"
                            aria-pressed={manualReason === reason.code}
                            onClick={() => setManualReason(reason.code as StopReasonCode)}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors",
                              manualReason === reason.code
                                ? "border-rose-300 bg-rose-100 text-rose-900"
                                : "border-rose-100 bg-white text-rose-800 hover:bg-rose-50",
                            )}
                          >
                            {reason.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    Décision prise par
                    <select value={manualDecisionMaker} onChange={(event) => setManualDecisionMaker(event.target.value as DecisionMaker)} className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm">
                      <option value="patient">Patient</option>
                      {isDoctor && <option value="clinician">Médecin</option>}
                      {isDoctor && <option value="both">Médecin et patient</option>}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    Précision {manualReason === "AUTRE" && <span className="text-rose-600">*</span>}
                    <Textarea value={manualReasonComment} onChange={(event) => setManualReasonComment(event.target.value)} placeholder={manualReason === "AUTRE" ? "Précisez le motif « Autre »" : "Contexte clinique (facultatif)"} rows={2} className="min-h-16 bg-white" />
                  </label>
                </>
              )}
              <label className="space-y-1.5 text-xs font-semibold text-slate-700 sm:col-span-2">
                <span className="inline-flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-violet-800">
                <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              Motif / indication <span className="font-normal text-slate-400">· facultatif</span>
                </span>
                <Textarea value={form.indication} onChange={(event) => setForm({ ...form, indication: event.target.value })} placeholder="Pourquoi ce traitement ?" rows={2} className="min-h-16 rounded-xl border-violet-100 bg-white shadow-sm focus-visible:ring-violet-100" />
              </label>
                </div>
              </details>
            </div>
            <p className="flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-white px-3.5 py-3 text-xs leading-5 text-slate-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
              <span>Prescription, déclaration de prise et validation médicale restent distinctes. Aucun traitement ne sera arrêté automatiquement.</span>
            </p>
            {formError && <p role="alert" className="text-xs font-medium text-rose-700">{formError}</p>}
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-emerald-100 bg-white/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <p className="hidden text-[10px] text-slate-500 sm:block">Les informations sont conservées dans l’historique du dossier.</p>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" disabled={saving} onClick={closeForm} className="h-10 rounded-xl border-slate-200 px-5 text-xs font-semibold text-slate-700">
                Annuler
              </Button>
              <Button type="button" disabled={saving} onClick={() => void saveForm()} className="h-10 rounded-xl bg-gradient-to-r from-[#28765f] to-[#185340] px-5 text-xs font-semibold text-white shadow-sm shadow-emerald-900/15 hover:from-[#21654f] hover:to-[#123f31]">
                {saving ? "Enregistrement…" : isSecretary ? "Enregistrer la déclaration" : "Enregistrer le traitement"}
              </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {legacyText.trim() && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">Ancien texte libre · à confirmer</p>
                  {!legacyEditing && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{legacyText}</p>}
                </div>
              </div>
              {!legacyEditing && isDoctor && <Button type="button" size="sm" variant="ghost" onClick={() => { setLegacyDraft(legacyText); setLegacyEditing(true); }} className="h-7 shrink-0 px-2 text-[11px]">Modifier</Button>}
            </div>
            {legacyEditing && (
              <div className="mt-3 space-y-2">
                <Textarea value={legacyDraft} onChange={(event) => setLegacyDraft(event.target.value)} rows={3} className="bg-white text-sm" aria-label="Ancien texte libre des traitements" />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={saveLegacy} className="rounded-lg bg-[#23634f] text-white hover:bg-[#194d40]">Enregistrer le texte</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setLegacyEditing(false)} className="rounded-lg">Annuler</Button>
                </div>
              </div>
            )}
          </div>
        )}
        {medications.length > 0 && (
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Clock3 className="h-3.5 w-3.5" />
            Les traitements arrêtés restent au dossier et ne sont pas effacés.
          </p>
        )}
      </div>
      <Dialog
        open={Boolean(transitionTarget)}
        onOpenChange={(open) => {
          if (!open) setTransitionTarget(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {transitionTarget?.status === "stopped"
                ? "Arrêter le traitement"
                : transitionTarget?.status === "completed"
                  ? "Terminer le traitement"
                  : transitionTarget?.status === "not_started"
                    ? "Classer comme non commencé"
                    : "Suspendre le traitement"}
            </DialogTitle>
            <DialogDescription>
              {transitionTarget?.medication.name} — la prescription et la prise sont distinctes. Cette décision sera conservée dans l’historique du traitement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              Motif de la décision <span className="text-rose-600">*</span>
              <select
                value={transitionReason}
                onChange={(event) => {
                  setTransitionReason(event.target.value as StopReasonCode | "");
                  setTransitionError(null);
                }}
                className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                aria-label="Motif de l’événement de traitement"
              >
                <option value="">Sélectionner un motif</option>
                {(["Médicale", "Patient", "Administrative", "Autre"] as const).map((category) => (
                  <optgroup key={category} label={category}>
                    {STOP_REASONS.filter((reason) => reason.category === category).map((reason) => (
                      <option key={reason.code} value={reason.code}>{reason.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              Décision prise par
              <select
                value={decisionMaker}
                onChange={(event) => setDecisionMaker(event.target.value as DecisionMaker)}
                className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
              >
                <option value="clinician">Médecin</option>
                <option value="patient">Patient</option>
                <option value="both">Médecin et patient</option>
              </select>
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              Date de l’événement <span className="text-rose-600">*</span>
              <Input
                inputMode="numeric"
                maxLength={10}
                value={transitionEventDate}
                onChange={(event) => {
                  setTransitionEventDate(maskMoroccanDate(event.target.value));
                  setTransitionError(null);
                }}
                placeholder="jj/mm/aaaa"
                aria-label="Date de suspension, arrêt ou fin du traitement"
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              Précision / commentaire {transitionReason === "AUTRE" && <span className="text-rose-600">*</span>}
              <Textarea
                value={transitionComment}
                onChange={(event) => {
                  setTransitionComment(event.target.value);
                  setTransitionError(null);
                }}
                placeholder={transitionReason === "AUTRE" ? "Précisez le motif « Autre »" : "Détail clinique ou contexte (facultatif)"}
                rows={3}
              />
            </label>
            <p className="text-xs leading-5 text-slate-500">
              La date enregistrée est celle de l’événement clinique, qui peut être antérieure à la saisie. La modification au dossier est horodatée séparément.
            </p>
            {transitionError && <p role="alert" className="text-xs font-medium text-rose-700">{transitionError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setTransitionTarget(null)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={saving || !transitionReason || !parseMoroccanDate(transitionEventDate) || (transitionReason === "AUTRE" && !transitionComment.trim())}
              onClick={() => void confirmTransition()}
              className={cn(
                "text-slate-900",
                transitionTarget?.status === "stopped" ? "border-rose-200 bg-rose-100 hover:bg-rose-200" : transitionTarget?.status === "completed" ? "border-teal-200 bg-teal-100 hover:bg-teal-200" : transitionTarget?.status === "not_started" ? "border-violet-200 bg-violet-100 hover:bg-violet-200" : "border-indigo-200 bg-indigo-100 hover:bg-indigo-200",
              )}
            >
              {saving
                ? "Enregistrement…"
                : transitionTarget?.status === "stopped"
                  ? "Confirmer l’arrêt"
                  : transitionTarget?.status === "completed"
                    ? "Confirmer la fin"
                    : transitionTarget?.status === "not_started"
                      ? "Confirmer non commencé"
                      : "Confirmer la suspension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(confirmationTarget)}
        onOpenChange={(open) => {
          if (!open) setConfirmationTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la prise du traitement</DialogTitle>
            <DialogDescription>
              {confirmationTarget?.name} — cette confirmation distingue la prescription de la prise réellement commencée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              Date réelle ou approximative de début
              <Input
                inputMode="numeric"
                maxLength={10}
                value={confirmationStartDate}
                onChange={(event) => {
                  setConfirmationStartDate(maskMoroccanDate(event.target.value));
                  setConfirmationError(null);
                }}
                placeholder="jj/mm/aaaa · facultative"
                aria-label="Date réelle ou approximative de début du traitement"
              />
            </label>
            {confirmationPlannedEndPreview && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                Fin prévue calculée à partir de la durée prescrite : <strong>{formatDate(confirmationPlannedEndPreview)}</strong>
              </p>
            )}
            {!confirmationStartDate && confirmationTarget?.prescribed_duration_text && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                La date de début n’est pas renseignée : la prise sera confirmée, mais aucune date de fin ne sera inventée.
              </p>
            )}
            {confirmationError && <p role="alert" className="text-xs font-medium text-rose-700">{confirmationError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setConfirmationTarget(null)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={saving || Boolean(confirmationStartDate && !confirmationStartDateIso)}
              onClick={() => void confirmMedicationIntake()}
              className="border border-emerald-200 bg-emerald-100 text-emerald-950 hover:bg-emerald-200"
            >
              {saving ? "Enregistrement…" : "Confirmer la prise"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
