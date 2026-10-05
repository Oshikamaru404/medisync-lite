import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { differenceInYears, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { format } from "date-fns";
import { Activity, AlertTriangle, ArrowLeft, Check, ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, CreditCard, ExternalLink, FileBadge, FileHeart, FileText, HeartPulse, Plus, Printer, Save, Search, Sparkles, Stethoscope, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PrescriptionDialog } from "@/components/PrescriptionDialog";
import { CertificateDialog } from "@/components/CertificateDialog";
import { CertificatePrintDialog } from "@/components/CertificatePrintDialog";
import { PrescriptionPreview } from "@/components/PrescriptionPreview";
import type { Certificate } from "@/hooks/useCertificates";
import { useAuth } from "@/contexts/AuthContext";
import { useMedicalRecord } from "@/hooks/useMedicalRecords";
import { ConsultationFields, useCompleteConsultation, useConsultation, useSaveConsultation, useSaveConsultationPricing } from "@/hooks/useConsultations";
import { useQueueEntry } from "@/hooks/useQueue";
import { useSettings } from "@/hooks/useSettings";
import { useImportedConsultationMotifs } from "@/hooks/useImportedConsultationMotifs";
import { CONSULTATION_CATEGORIES, CONSULTATION_MOTIFS, getConsultationCategoryLabel, getConsultationDocumentationGuide, normalizeConsultationTerm, searchConsultationMotifs, type ConsultationMotifEntry } from "@/data/consultationDictionary";

const EMPTY_FIELDS: ConsultationFields = {
  motif: "",
  histoire: "",
  examen_clinique: "",
  diagnostic: "",
  plan: "",
};

interface SelectedMotif {
  id: string | null;
  label: string;
  entry?: ConsultationMotifEntry;
}

const getConsultationLoadErrorMessage = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return "Le serveur n’a pas renvoyé de détail sur l’erreur.";
  }

  const errorCode = "code" in error ? String(error.code) : "";

  if (errorCode === "PGRST205" || errorCode === "42P01") {
    return "La table consultations n’est pas disponible dans Supabase. Appliquez la migration 20261003160535_create_consultations.sql, puis rechargez cette page.";
  }

  if (errorCode === "42501" || errorCode === "PGRST301") {
    return "Supabase a refusé l’accès à cette consultation. Vérifiez les droits et la politique RLS de la table consultations.";
  }

  return `Erreur Supabase${errorCode ? ` (${errorCode})` : ""}. Vérifiez la connexion et la configuration de la table consultations.`;
};

const Consultation = () => {
  const { queueId } = useParams<{ queueId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { data: entry, isLoading: queueLoading, isError: queueError } = useQueueEntry(queueId);
  const patientId = entry?.patient_id;
  const {
    data: medicalRecord,
    isLoading: recordLoading,
    isError: recordError,
    refetch: refetchMedicalRecord,
  } = useMedicalRecord(patientId);
  const {
    data: consultation,
    isLoading: consultationLoading,
    isError: consultationError,
    error: consultationLoadError,
    refetch: refetchConsultation,
  } = useConsultation(queueId);
  const saveConsultation = useSaveConsultation();
  const completeConsultation = useCompleteConsultation();
  const savePricing = useSaveConsultationPricing();
  const { settings, updateSetting } = useSettings();
  const [fields, setFields] = useState<ConsultationFields>(EMPTY_FIELDS);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [prescriptionCreated, setPrescriptionCreated] = useState(false);
  const [certificateCreated, setCertificateCreated] = useState(false);
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [certificatePreviewOpen, setCertificatePreviewOpen] = useState(false);
  const [createdPrescriptionId, setCreatedPrescriptionId] = useState<string | null>(null);
  const [prescriptionPreviewId, setPrescriptionPreviewId] = useState<string | null>(null);
  const [createdCertificate, setCreatedCertificate] = useState<Certificate | null>(null);
  const [grossAmount, setGrossAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  const [discountType, setDiscountType] = useState<"none" | "percentage" | "fixed">("none");
  const [discountInput, setDiscountInput] = useState("");
  const [selectedMotifs, setSelectedMotifs] = useState<SelectedMotif[]>([]);
  const [motifQuery, setMotifQuery] = useState("");
  const [activeMotifId, setActiveMotifId] = useState<string | null>(null);
  const [motifCategory, setMotifCategory] = useState("all");
  const {
    data: importedMotifs = [],
    isFetching: importedMotifsLoading,
    isError: importedMotifsError,
  } = useImportedConsultationMotifs(motifQuery, motifCategory);

  useEffect(() => {
    if (consultation) {
      setFields({
        motif: consultation.motif || "",
        histoire: consultation.histoire || "",
        examen_clinique: consultation.examen_clinique || "",
        diagnostic: consultation.diagnostic || "",
        plan: consultation.plan || "",
      });
      const savedMotifs = (consultation.motif || "")
        .split("\n")
        .map((label) => label.trim())
        .filter(Boolean)
        .map((label) => {
          const normalizedLabel = normalizeConsultationTerm(label);
          const entry = CONSULTATION_MOTIFS.find((motif) =>
            [motif.label, ...motif.synonyms].some((term) => normalizeConsultationTerm(term) === normalizedLabel),
          );
          return { id: entry?.id || null, label, entry };
        });
      setSelectedMotifs(savedMotifs);
      const activeMotif = [...savedMotifs].reverse().find((motif) => motif.id);
      setActiveMotifId(activeMotif?.id || null);
      const activeEntry = activeMotif?.entry || CONSULTATION_MOTIFS.find((motif) => motif.id === activeMotif?.id);
      setMotifCategory(activeEntry?.categoryId || "all");
      setHasStarted(true);
    }
  }, [consultation]);

  const patient = entry?.patients;
  const patientName = [patient?.prenom, patient?.nom].filter(Boolean).join(" ");
  const age = useMemo(() => {
    if (!patient?.date_naissance) return null;
    try {
      return differenceInYears(new Date(), parseISO(patient.date_naissance));
    } catch {
      return null;
    }
  }, [patient?.date_naissance]);
  const savedCustomPrices = useMemo(() => {
    const value = settings?.find((setting) => setting.key === "consultation_custom_prices")?.value;
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? [...new Set(parsed.filter((amount): amount is number => typeof amount === "number" && Number.isFinite(amount) && amount > 0))]
        : [];
    } catch (error) {
      console.error("Invalid saved consultation price list:", error);
      return [];
    }
  }, [settings]);
  const standardPrices = [100, 200, 300, 400, 500, 600, 800, 1000];
  const priceOptions = [...new Set([...standardPrices, ...savedCustomPrices])].sort((a, b) => a - b);
  const discountValue = Number(discountInput) || 0;
  const discountAmount = discountType === "percentage"
    ? Math.round(grossAmount * Math.min(discountValue, 100)) / 100
    : discountType === "fixed"
      ? Math.min(discountValue, grossAmount)
      : 0;
  const finalAmount = Math.max(0, grossAmount - discountAmount);
  const formatMoney = (amount: number) => `${amount.toLocaleString("fr-MA", { maximumFractionDigits: 2 })} DH`;

  useEffect(() => {
    const existingGrossAmount = entry?.invoices?.montant_brut || entry?.montant_consultation || 0;
    if (entry && grossAmount === 0 && existingGrossAmount > 0) {
      setGrossAmount(existingGrossAmount);
      if (entry.invoices?.reduction_type === "percentage" || entry.invoices?.reduction_type === "fixed") {
        setDiscountType(entry.invoices.reduction_type);
        setDiscountInput(String(entry.invoices.reduction_valeur || 0));
      }
    }
  }, [entry, grossAmount]);

  const synthesisSections = [
    { title: "Motif", value: fields.motif, icon: ClipboardList, color: "blue" },
    { title: "Interrogatoire", value: fields.histoire, icon: HeartPulse, color: "teal" },
    { title: "Examen clinique", value: fields.examen_clinique, icon: Activity, color: "emerald" },
    { title: "Diagnostic", value: fields.diagnostic, icon: FileHeart, color: "amber" },
    { title: "Conduite à tenir", value: fields.plan, icon: ClipboardCheck, color: "violet" },
  ];
  const selectedMotif = selectedMotifs.find((entry) => entry.id === activeMotifId)?.entry
    || CONSULTATION_MOTIFS.find((entry) => entry.id === activeMotifId)
    || null;
  const documentationGuide = selectedMotif ? getConsultationDocumentationGuide(selectedMotif) : null;
  const staticMotifs = searchConsultationMotifs(motifQuery, motifCategory);
  const staticMotifLabels = new Set(staticMotifs.map((entry) => normalizeConsultationTerm(entry.label)));
  const uniqueImportedMotifs = importedMotifs.filter((entry) => !staticMotifLabels.has(normalizeConsultationTerm(entry.label)));
  const visibleStaticMotifs = uniqueImportedMotifs.length > 0 ? staticMotifs.slice(0, 3) : staticMotifs;
  const motifSuggestions = [
    ...visibleStaticMotifs,
    ...uniqueImportedMotifs,
  ].filter((entry) => !selectedMotifs.some((selected) => selected.id === entry.id));

  const commitMotifs = (nextMotifs: SelectedMotif[]) => {
    setSelectedMotifs(nextMotifs);
    setFields((currentFields) => ({ ...currentFields, motif: nextMotifs.map((motif) => motif.label).join("\n") }));
  };

  const addMotif = (entry: ConsultationMotifEntry) => {
    if (selectedMotifs.some((motif) => motif.id === entry.id)) return;
    commitMotifs([...selectedMotifs, { id: entry.id, label: entry.label, entry }]);
    setActiveMotifId(entry.id);
    setMotifCategory(entry.categoryId);
    setMotifQuery("");
  };

  const addCustomMotif = () => {
    const label = motifQuery.trim();
    if (!label || selectedMotifs.some((motif) => normalizeConsultationTerm(motif.label) === normalizeConsultationTerm(label))) return;
    commitMotifs([...selectedMotifs, { id: null, label }]);
    setActiveMotifId(null);
    setMotifQuery("");
  };

  const addDocumentationPrompt = (field: "histoire" | "examen_clinique", prompt: string) => {
    setFields((currentFields) => {
      const currentText = currentFields[field] || "";
      const alreadyAdded = currentText
        .split("\n")
        .some((line) => normalizeConsultationTerm(line.split(":")[0]) === normalizeConsultationTerm(prompt));
      if (alreadyAdded) return currentFields;
      const nextLine = `${prompt} : `;
      return { ...currentFields, [field]: [currentText.trimEnd(), nextLine].filter(Boolean).join("\n") };
    });
  };

  const addMotifAsDiagnosisProposal = () => {
    if (!selectedMotif) return;
    const proposal = `Proposition CIM-11 à valider : ${selectedMotif.label}${selectedMotif.code ? ` (${selectedMotif.code})` : ""}`;
    if ((fields.diagnostic || "").includes(proposal)) return;
    setFields((currentFields) => ({
      ...currentFields,
      diagnostic: [currentFields.diagnostic, proposal].filter(Boolean).join("\n"),
    }));
  };

  const removeMotif = (label: string) => {
    const nextMotifs = selectedMotifs.filter((motif) => motif.label !== label);
    commitMotifs(nextMotifs);
    if (!nextMotifs.some((motif) => motif.id === activeMotifId)) setActiveMotifId(null);
  };

  const addSuggestedSymptom = (symptom: string) => {
    const history = fields.histoire.trim();
    const marker = "Symptômes associés : ";
    const markerMatch = history.match(/(?:^|\n)Symptômes associés : ([^\n]*)/);
    const existingSymptoms = markerMatch?.[1]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean) || [];

    if (existingSymptoms.includes(symptom)) return;

    if (markerMatch) {
      const updatedSymptoms = [...existingSymptoms, symptom].join(", ");
      setFields({
        ...fields,
        histoire: history.replace(markerMatch[0], `${marker}${updatedSymptoms}`),
      });
      return;
    }

    setFields({
      ...fields,
      histoire: [history, `${marker}${symptom}`].filter(Boolean).join("\n"),
    });
  };

  const save = async (status: "in_progress" | "completed" = "in_progress") => {
    if (!entry || !currentUser) return null;
    const result = await saveConsultation.mutateAsync({
      id: consultation?.id,
      queueId: entry.id,
      patientId: entry.patient_id,
      userId: currentUser.id,
      fields,
      status,
    });
    setHasStarted(true);
    return result;
  };

  const handleComplete = async () => {
    if (!entry) return;
    if (grossAmount <= 0 || discountValue < 0 || (discountType === "percentage" && discountValue > 100) || (discountType === "fixed" && discountValue > grossAmount)) {
      return;
    }
    try {
      const savedConsultation = await save();
      if (!savedConsultation) return;
      await savePricing.mutateAsync({
        queueId: entry.id,
        grossAmount,
        discountType,
        discountValue: discountType === "none" ? 0 : discountValue,
      });
      await completeConsultation.mutateAsync(savedConsultation.id);
      navigate("/file-attente");
    } catch (error) {
      console.error("Unable to complete consultation:", error);
    }
  };

  const continueFromConsultation = async (): Promise<boolean> => {
    if (isCompleted) {
      setActiveStep(2);
      return true;
    }
    try {
      const saved = await save();
      if (!saved) return false;
      setActiveStep(2);
      return true;
    } catch (error) {
      console.error("Unable to save consultation before continuing:", error);
      return false;
    }
  };

  const addCustomPrice = async () => {
    const amount = Number(customAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return;
    const nextPrices = [...new Set([...savedCustomPrices, amount])].sort((a, b) => a - b);
    try {
      await updateSetting.mutateAsync({
        key: "consultation_custom_prices",
        value: JSON.stringify(nextPrices),
      });
      setGrossAmount(amount);
      setCustomAmount("");
    } catch (error) {
      console.error("Unable to save custom consultation price:", error);
    }
  };

  const handleStepNavigation = async (nextStep: 1 | 2 | 3) => {
    if (nextStep <= activeStep) {
      setActiveStep(nextStep);
      return;
    }
    if (activeStep === 1 && nextStep >= 2) {
      const saved = await continueFromConsultation();
      if (saved && nextStep === 3) setActiveStep(3);
      return;
    }
    setActiveStep(nextStep);
  };

  if (queueLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-6xl animate-pulse space-y-5">
          <div className="h-16 rounded-xl bg-white" />
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="h-56 rounded-xl bg-white" />
            <div className="h-72 rounded-xl bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (queueError || !entry || !patient) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-lg">
          <CardContent className="space-y-4 p-8 text-center">
            <p className="font-medium">Cette entrée de file est introuvable.</p>
            <Button variant="outline" onClick={() => navigate("/file-attente")}>Retour à la file</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const isCompleted = consultation?.status === "completed";

  return (
    <div className="min-h-screen bg-slate-50/70">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/file-attente")} aria-label="Retour à la file d'attente">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold text-slate-900">Consultation</h1>
                <Badge variant={isCompleted ? "secondary" : "outline"}>
                  {isCompleted ? "Terminée" : hasStarted ? "En cours" : "À démarrer"}
                </Badge>
              </div>
              <p className="truncate text-sm text-muted-foreground">{format(new Date(entry.created_at), "EEEE d MMMM · HH:mm", { locale: fr })}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasStarted && !isCompleted && !consultationLoading && !consultationError && (
              <Button variant="outline" onClick={() => void save()} disabled={saveConsultation.isPending}>
                <Save className="mr-2 h-4 w-4" />Enregistrer
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px] md:px-8">
        <section className="space-y-5">
          <Card className="overflow-hidden border-blue-200 shadow-sm">
            <div className="flex flex-col gap-4 bg-gradient-to-r from-blue-50 via-white to-cyan-50/70 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-600/20">
                  {`${patient.prenom.charAt(0)}${patient.nom.charAt(0)}`.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase text-blue-700">Patient appelé · N° {entry.numero_ordre}</p>
                    <Badge className="border border-violet-200 bg-violet-100 text-violet-800">Consultation du jour</Badge>
                  </div>
                  <h2 className="truncate text-2xl font-bold text-slate-900">{patientName}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {age !== null && <Badge className="border border-blue-100 bg-white text-blue-800">{age} ans</Badge>}
                    {patient.sexe && <Badge className="border border-teal-100 bg-teal-50 text-teal-800">{patient.sexe === "F" ? "Femme" : patient.sexe === "M" ? "Homme" : patient.sexe}</Badge>}
                    {patient.telephone && <span className="self-center text-sm text-slate-600">{patient.telephone}</span>}
                    {patient.poids != null && <Badge className="border border-violet-100 bg-violet-50 text-violet-800">{patient.poids} kg</Badge>}
                    {patient.taille != null && <Badge className="border border-cyan-100 bg-cyan-50 text-cyan-800">{patient.taille} cm</Badge>}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {hasStarted && (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="space-y-3 p-3 sm:p-4" aria-label="Étapes du parcours de consultation">
                <div className="flex items-center justify-between gap-3 px-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parcours de consultation</p>
                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">Étape {activeStep} sur 3</Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { step: 1 as const, title: "Consultation", description: "Motif et compte rendu", icon: Stethoscope, activeClass: "border-blue-300 bg-blue-50 text-blue-950", iconClass: "bg-blue-600 text-white", completeClass: "border-blue-200 bg-blue-50 text-blue-800" },
                  { step: 2 as const, title: "Ordonnance", description: "Prescription facultative", icon: FileText, activeClass: "border-violet-300 bg-violet-50 text-violet-950", iconClass: "bg-violet-600 text-white", completeClass: "border-violet-200 bg-violet-50 text-violet-800" },
                  { step: 3 as const, title: "Tarification", description: "Réduction et facture", icon: CreditCard, activeClass: "border-emerald-300 bg-emerald-50 text-emerald-950", iconClass: "bg-emerald-600 text-white", completeClass: "border-emerald-200 bg-emerald-50 text-emerald-800" },
                ].map(({ step, title, description, icon: StepIcon, activeClass, iconClass, completeClass }) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => void handleStepNavigation(step)}
                    disabled={isCompleted && step > 1}
                    aria-current={activeStep === step ? "step" : undefined}
                    className={`group flex min-h-[76px] items-center gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 ${activeStep === step ? `${activeClass} shadow-sm` : step < activeStep ? `${completeClass} hover:shadow-sm` : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${activeStep === step ? iconClass : step < activeStep ? "bg-white text-emerald-700" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"}`}>
                      {step < activeStep ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-70">Étape {step}</span>
                      <span className="mt-0.5 block text-sm font-semibold">{title}</span>
                      <span className="mt-0.5 block text-xs opacity-75">{description}</span>
                    </span>
                    {activeStep === step && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-current" aria-hidden="true" />}
                  </button>
                ))}
                </div>
              </CardContent>
            </Card>
          )}

          {medicalRecord?.allergies?.trim() && (
            <Card className="border-amber-300 bg-amber-50 shadow-none">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <p className="font-semibold text-amber-900">Allergies déclarées</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">{medicalRecord.allergies}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {consultationLoading ? (
            <Card className="overflow-hidden border-blue-100">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-blue-100" />
                <div className="flex-1 space-y-2"><div className="h-4 w-48 animate-pulse rounded bg-slate-100" /><div className="h-3 w-72 max-w-full animate-pulse rounded bg-slate-100" /></div>
                <span className="text-sm text-muted-foreground">Vérification de la consultation…</span>
              </CardContent>
            </Card>
          ) : consultationError ? (
            <Card className="border-rose-200 bg-rose-50/70">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div><h3 className="font-semibold text-rose-950">Consultation indisponible</h3><p className="mt-1 text-sm text-rose-800">{getConsultationLoadErrorMessage(consultationLoadError)}</p><p className="mt-2 text-xs text-rose-800/80">Aucune nouvelle saisie n’est activée tant que la consultation existante n’a pas été chargée.</p></div>
                <Button variant="outline" className="border-rose-200 bg-white text-rose-900 hover:bg-rose-100" onClick={() => void refetchConsultation()}>Réessayer</Button>
              </CardContent>
            </Card>
          ) : !hasStarted ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600"><HeartPulse className="h-6 w-6" /></div>
                <div>
                  <h3 className="font-semibold">Prêt à commencer</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Le compte rendu sera enregistré comme une nouvelle consultation, sans remplacer les antécédents du patient.</p>
                </div>
                <Button onClick={() => void save()} disabled={saveConsultation.isPending}>
                  <Stethoscope className="mr-2 h-4 w-4" />Démarrer la consultation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="border-b bg-white">
                <CardTitle className="flex items-center gap-2 text-base">
                  {activeStep === 1 && <><ClipboardList className="h-4 w-4 text-blue-600" />Compte rendu clinique</>}
                  {activeStep === 2 && <><FileText className="h-4 w-4 text-indigo-600" />Ordonnance</>}
                  {activeStep === 3 && <><CreditCard className="h-4 w-4 text-emerald-600" />Tarif de la consultation</>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-5 md:p-6">
                {activeStep === 1 && <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="visit-motif">Motif de consultation</Label>
                    <Select value={motifCategory} onValueChange={(value) => { setMotifCategory(value); setActiveMotifId(null); }} disabled={isCompleted}>
                      <SelectTrigger className="h-8 w-full border-blue-200 bg-white text-xs sm:w-[230px]">
                        <SelectValue placeholder="Toutes les familles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les familles</SelectItem>
                        {CONSULTATION_CATEGORIES.map((category) => (
                          <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="visit-motif"
                      value={motifQuery}
                      onChange={(event) => {
                        setMotifQuery(event.target.value);
                        setActiveMotifId(null);
                      }}
                      placeholder="Ajouter un ou plusieurs motifs : acouphènes, céphalées..."
                      className="h-11 border-blue-200 bg-white pl-10 focus-visible:ring-blue-300"
                      disabled={isCompleted}
                    />
                  </div>
                  {selectedMotifs.length > 0 && (
                    <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/60 p-3" aria-label="Motifs sélectionnés">
                      <p className="text-xs font-semibold uppercase text-blue-800">Motifs retenus · {selectedMotifs.length}</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMotifs.map((motif) => {
                          const active = motif.id === activeMotifId;
                          return (
                            <div key={`${motif.id || "custom"}-${motif.label}`} className={`inline-flex max-w-full items-center rounded-full border ${active ? "border-blue-300 bg-blue-100" : "border-blue-100 bg-white"}`}>
                              <button type="button" className="truncate px-3 py-1.5 text-left text-sm font-medium text-blue-900" onClick={() => {
                                setActiveMotifId(motif.id);
                                const matchingEntry = motif.entry || CONSULTATION_MOTIFS.find((entry) => entry.id === motif.id);
                                if (matchingEntry) setMotifCategory(matchingEntry.categoryId);
                              }} title="Afficher les suggestions liées à ce motif">
                                {motif.label}
                              </button>
                              {!isCompleted && <Button type="button" variant="ghost" size="icon" className="mr-1 h-6 w-6 shrink-0 rounded-full text-blue-700 hover:bg-blue-200 hover:text-blue-950" aria-label={`Retirer ${motif.label}`} onClick={() => removeMotif(motif.label)}><X className="h-3.5 w-3.5" /></Button>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {!selectedMotif && !isCompleted && motifSuggestions.length > 0 && (
                    <div className="grid gap-2 pt-1 sm:grid-cols-2" aria-label="Suggestions de motifs">
                      {motifSuggestions.slice(0, 4).map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => addMotif(entry)}
                          className="group flex min-h-12 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-slate-800">{entry.label}</span>
                            <span className="block truncate text-xs text-blue-700">{getConsultationCategoryLabel(entry.categoryId)}</span>
                            <span className="block truncate text-xs text-slate-500">{entry.synonyms.slice(0, 2).join(" · ")}</span>
                          </span>
                          <Plus className="h-4 w-4 shrink-0 text-blue-600 transition-transform group-hover:scale-110" />
                        </button>
                      ))}
                    </div>
                  )}
                  {importedMotifsError && motifQuery.trim().length > 1 && (
                    <p className="text-xs text-destructive">Le catalogue CIM-11 n’a pas pu être interrogé. Le motif libre reste disponible.</p>
                  )}
                  {importedMotifsLoading && motifQuery.trim().length > 1 && (
                    <p className="text-xs text-muted-foreground">Recherche dans le catalogue CIM-11…</p>
                  )}
                  {!isCompleted && motifQuery.trim().length > 1 && !selectedMotifs.some((motif) => normalizeConsultationTerm(motif.label) === normalizeConsultationTerm(motifQuery)) && (
                    <Button type="button" variant="outline" size="sm" className="border-slate-200 bg-white" onClick={addCustomMotif}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />Ajouter « {motifQuery.trim()} » comme motif libre
                    </Button>
                  )}
                  {!selectedMotif && motifQuery.trim().length > 1 && motifSuggestions.length === 0 && !importedMotifsLoading && !importedMotifsError && (
                    <p className="text-xs text-muted-foreground">Aucune suggestion exacte ; le motif libre restera dans la synthèse.</p>
                  )}

                  {selectedMotif && !isCompleted && (
                    <div className="space-y-4 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50/80 to-white p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700"><Sparkles className="h-4 w-4" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-teal-950">Pistes pour {selectedMotif.label.toLocaleLowerCase("fr")}</p>
                          <p className="text-xs text-teal-900/70">À adapter selon l’interrogatoire réel ; aucune réponse ni conclusion n’est ajoutée automatiquement.</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 text-teal-800" onClick={() => setActiveMotifId(null)}>Changer</Button>
                      </div>

                      {(selectedMotif.code || selectedMotif.sourceUrl) && (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-teal-100 bg-white/80 p-3 text-xs">
                          {selectedMotif.code && <Badge variant="secondary">Code CIM-11 : {selectedMotif.code}</Badge>}
                          <span className="text-muted-foreground">Référence de classification OMS — à confirmer par le professionnel.</span>
                          {selectedMotif.sourceUrl && (
                            <a href={selectedMotif.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-teal-800 underline underline-offset-2">
                              Ouvrir la fiche OMS <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          <Button type="button" size="sm" variant="outline" className="h-7 border-teal-200" onClick={addMotifAsDiagnosisProposal}>
                            <Plus className="mr-1 h-3 w-3" />Proposer dans le diagnostic
                          </Button>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase text-slate-600">Interrogatoire — éléments à documenter</p>
                          <span className="text-xs text-muted-foreground">Cliquer ajoute un intitulé vide, jamais une réponse.</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {documentationGuide?.history.map((prompt) => {
                            const alreadyAdded = (fields.histoire || "").split("\n").some(
                              (line) => normalizeConsultationTerm(line.split(":")[0]) === normalizeConsultationTerm(prompt),
                            );
                            return (
                              <Button
                                key={prompt}
                                type="button"
                                variant="outline"
                                className="h-auto min-h-10 justify-start whitespace-normal border-white bg-white/80 px-3 py-2 text-left text-xs leading-5 text-slate-700"
                                disabled={isCompleted || alreadyAdded}
                                onClick={() => addDocumentationPrompt("histoire", prompt)}
                              >
                                {!alreadyAdded && <Plus className="mr-2 h-3 w-3 shrink-0 text-teal-600" />}
                                {prompt}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase text-slate-600">Examen — constatations à consigner</p>
                          <span className="text-xs text-muted-foreground">À adapter à l’examen effectivement réalisé.</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {documentationGuide?.examination.map((prompt) => {
                            const alreadyAdded = (fields.examen_clinique || "").split("\n").some(
                              (line) => normalizeConsultationTerm(line.split(":")[0]) === normalizeConsultationTerm(prompt),
                            );
                            return (
                              <Button
                                key={prompt}
                                type="button"
                                variant="outline"
                                className="h-auto min-h-10 justify-start whitespace-normal border-white bg-white/80 px-3 py-2 text-left text-xs leading-5 text-slate-700"
                                disabled={isCompleted || alreadyAdded}
                                onClick={() => addDocumentationPrompt("examen_clinique", prompt)}
                              >
                                {!alreadyAdded && <Plus className="mr-2 h-3 w-3 shrink-0 text-teal-600" />}
                                {prompt}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase text-slate-600">Symptômes associés à préciser</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedMotif.symptomSuggestions.map((symptom) => {
                            const alreadyAdded = (fields.histoire || "").includes(symptom);
                            return (
                              <Button
                                key={symptom}
                                type="button"
                                size="sm"
                                variant={alreadyAdded ? "secondary" : "outline"}
                                className={alreadyAdded ? "h-8 border-teal-200 bg-teal-100 text-teal-900" : "h-8 border-teal-200 bg-white text-teal-900 hover:bg-teal-50"}
                                disabled={alreadyAdded}
                                onClick={() => addSuggestedSymptom(symptom)}
                              >
                                {!alreadyAdded && <Plus className="mr-1 h-3 w-3" />}
                                {symptom}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visit-history">Interrogatoire et symptômes</Label>
                  <Textarea id="visit-history" rows={6} value={fields.histoire || ""} onChange={(event) => setFields({ ...fields, histoire: event.target.value })} placeholder="Documenter les éléments rapportés par le patient ; les pistes ci-dessus ajoutent seulement des intitulés à compléter." disabled={isCompleted} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visit-exam">Examen clinique et résultats</Label>
                  <Textarea id="visit-exam" rows={6} value={fields.examen_clinique || ""} onChange={(event) => setFields({ ...fields, examen_clinique: event.target.value })} placeholder="Consigner uniquement les constatations et résultats effectivement observés." disabled={isCompleted} />
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="visit-diagnosis">Diagnostic retenu</Label>
                    <Textarea id="visit-diagnosis" rows={4} value={fields.diagnostic || ""} onChange={(event) => setFields({ ...fields, diagnostic: event.target.value })} placeholder="Diagnostic retenu par le professionnel. Une proposition CIM-11 éventuelle reste à confirmer." disabled={isCompleted} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visit-plan">Conduite à tenir</Label>
                    <Textarea id="visit-plan" rows={3} value={fields.plan || ""} onChange={(event) => setFields({ ...fields, plan: event.target.value })} placeholder="Traitement, examens, suivi..." disabled={isCompleted} />
                  </div>
                </div>
                {isCompleted && <p className="text-sm text-muted-foreground">Cette consultation est clôturée et n'est plus modifiable.</p>}
                {!isCompleted && (
                  <div className="flex justify-end border-t pt-4">
                    <Button onClick={() => void continueFromConsultation()} disabled={saveConsultation.isPending}>
                      {saveConsultation.isPending ? "Enregistrement..." : "Enregistrer et continuer"}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
                </div>}

                {activeStep === 2 && <div className="space-y-5">
                  <Card className="border-indigo-100 bg-indigo-50/40 shadow-none">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><FileText className="h-5 w-5" /></div>
                        <div>
                          <h3 className="font-semibold text-indigo-950">Documents médicaux</h3>
                          <p className="mt-1 text-sm text-indigo-900/80">Selon le besoin, créez un certificat médical, une ordonnance, ou les deux. Chaque document est facultatif et sera enregistré dans le dossier du patient.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {medicalRecord?.allergies?.trim() ? (
                    <Card className="border-amber-400 bg-amber-50 shadow-none" role="alert">
                      <CardContent className="flex items-start gap-3 p-4">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <div>
                          <p className="font-semibold text-amber-950">Attention — allergies déclarées</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-amber-900">{medicalRecord.allergies}</p>
                          <p className="mt-2 text-xs text-amber-800">Toute prescription doit être vérifiée par le professionnel ; les alertes automatiques ne remplacent pas cette vérification.</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-slate-200 bg-slate-50 shadow-none">
                      <CardContent className="flex items-center gap-3 p-4 text-sm text-slate-600">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-slate-500" />
                        Aucune allergie n’est enregistrée dans le dossier. Vérifier le statut allergique avec le patient.
                      </CardContent>
                    </Card>
                  )}
                  {(prescriptionCreated || certificateCreated) && (
                    <div className="flex flex-wrap gap-2" aria-label="Documents créés pendant cette consultation">
                      {certificateCreated && (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
                          <span className="flex items-center gap-2"><Check className="h-4 w-4" />Certificat enregistré.</span>
                          <Button type="button" size="sm" variant="outline" className="border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100" onClick={() => setCertificatePreviewOpen(true)}>
                            <Printer className="mr-2 h-4 w-4" />Aperçu / imprimer
                          </Button>
                        </div>
                      )}
                      {prescriptionCreated && (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
                          <span className="flex items-center gap-2"><Check className="h-4 w-4" />Ordonnance enregistrée.</span>
                          <Button type="button" size="sm" variant="outline" className="border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100" onClick={() => setPrescriptionPreviewId(createdPrescriptionId)}>
                            <Printer className="mr-2 h-4 w-4" />Aperçu / imprimer
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {!isCompleted && (
                    <div className="space-y-4 border-t pt-4">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setActiveStep(1)} className="text-slate-600 hover:text-slate-900">
                        <ChevronLeft className="mr-2 h-4 w-4" />Retour à la consultation
                      </Button>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Button type="button" variant="outline" onClick={() => setCertificateDialogOpen(true)} className="relative h-12 w-full justify-center border-violet-200 bg-violet-50 px-10 text-center text-violet-800 hover:border-violet-300 hover:bg-violet-100">
                          <FileBadge className="absolute left-4 h-4 w-4" />
                          <span className="leading-tight">{certificateCreated ? "Créer un autre certificat" : "Créer un certificat"}</span>
                        </Button>
                        <PrescriptionDialog
                          patientId={entry.patient_id}
                          patientName={patientName}
                          patientAllergies={medicalRecord?.allergies}
                          patientContext={{
                            antecedents: medicalRecord?.antecedents,
                            allergies: medicalRecord?.allergies,
                            traitements: medicalRecord?.traitements,
                          }}
                          onCreated={(prescriptionId) => {
                            setPrescriptionCreated(true);
                            setCreatedPrescriptionId(prescriptionId);
                            setPrescriptionPreviewId(prescriptionId);
                          }}
                        >
                          <Button type="button" className="relative h-12 w-full justify-center bg-blue-600 px-10 text-center text-white hover:bg-blue-700">
                            <FileText className="absolute left-4 h-4 w-4" />
                            <span className="leading-tight">{prescriptionCreated ? "Créer une autre ordonnance" : "Créer l’ordonnance"}</span>
                          </Button>
                        </PrescriptionDialog>
                        <Button
                          type="button"
                          onClick={() => setActiveStep(3)}
                          className={`relative h-12 w-full justify-center px-10 text-center ${prescriptionCreated || certificateCreated
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-200 hover:bg-emerald-700"
                            : ""}`}
                          variant={prescriptionCreated || certificateCreated ? "default" : "outline"}
                        >
                          <span className="leading-tight">{(prescriptionCreated || certificateCreated) ? "Suivant — Tarification" : "Continuer sans autre document"}</span>
                          {(prescriptionCreated || certificateCreated) && <ChevronRight className="absolute right-4 h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                  {!isCompleted && (
                    <CertificateDialog
                      open={certificateDialogOpen}
                      onOpenChange={setCertificateDialogOpen}
                      patientId={entry.patient_id}
                      patientName={patientName}
                      onCreated={(certificate) => {
                        setCertificateCreated(true);
                        setCreatedCertificate(certificate);
                        setCertificatePreviewOpen(true);
                      }}
                    />
                  )}
                  <CertificatePrintDialog
                    open={certificatePreviewOpen}
                    certificate={createdCertificate}
                    onOpenChange={setCertificatePreviewOpen}
                  />
                  {prescriptionPreviewId && (
                    <PrescriptionPreview
                      prescriptionId={prescriptionPreviewId}
                      patientName={patientName}
                      onClose={() => setPrescriptionPreviewId(null)}
                    />
                  )}
                </div>}

                {activeStep === 3 && <div className="space-y-5">
                  <Card className="border-emerald-100 bg-emerald-50/40 shadow-none">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-emerald-950">Choisir le tarif de consultation</h3>
                      <p className="mt-1 text-sm text-emerald-900/80">Le montant net sera enregistré sur la facture du patient. Les réductions restent visibles séparément.</p>
                    </CardContent>
                  </Card>
                  <div className="space-y-3">
                    <Label>Tarifs du cabinet</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {priceOptions.map((amount) => (
                        <Button
                          key={amount}
                          type="button"
                          variant={grossAmount === amount ? "default" : "outline"}
                          className={`h-14 text-base ${grossAmount === amount ? "bg-emerald-600 hover:bg-emerald-700" : "bg-white"}`}
                          onClick={() => setGrossAmount(amount)}
                        >
                          {formatMoney(amount)}
                        </Button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        type="number"
                        min="0.01"
                        max="1000000"
                        step="0.01"
                        value={customAmount}
                        onChange={(event) => setCustomAmount(event.target.value)}
                        placeholder="Ajouter un tarif personnalisé (DH)"
                        aria-label="Nouveau tarif personnalisé en dirhams"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!Number.isFinite(Number(customAmount)) || Number(customAmount) <= 0 || Number(customAmount) > 1000000 || updateSetting.isPending}
                        onClick={() => void addCustomPrice()}
                      >
                        <Plus className="mr-2 h-4 w-4" />Ajouter à la liste
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Les tarifs personnalisés enregistrés ici seront proposés pour les prochaines consultations du cabinet.</p>
                  </div>

                  <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                    <Label>Réduction</Label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {([
                        ["none", "Aucune"],
                        ["percentage", "Pourcentage"],
                        ["fixed", "Montant fixe"],
                      ] as const).map(([type, label]) => (
                        <Button
                          key={type}
                          type="button"
                          variant={discountType === type ? "secondary" : "outline"}
                          className={discountType === type ? "border-emerald-200 bg-emerald-50 text-emerald-900" : ""}
                          onClick={() => {
                            setDiscountType(type);
                            if (type === "none") setDiscountInput("");
                          }}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                    {discountType !== "none" && (
                      <div className="max-w-xs space-y-2">
                        <Label htmlFor="consultation-discount">
                          {discountType === "percentage" ? "Pourcentage de réduction (0 à 100 %)" : "Montant de la réduction (DH)"}
                        </Label>
                        <Input
                          id="consultation-discount"
                          type="number"
                          min="0"
                          max={discountType === "percentage" ? "100" : String(grossAmount)}
                          step={discountType === "percentage" ? "1" : "0.01"}
                          value={discountInput}
                          onChange={(event) => setDiscountInput(event.target.value)}
                          placeholder={discountType === "percentage" ? "Ex. 10" : "Ex. 50"}
                        />
                        {discountType === "fixed" && discountValue > grossAmount && (
                          <p className="text-xs text-destructive">La réduction ne peut pas dépasser le tarif choisi.</p>
                        )}
                        {discountType === "percentage" && discountValue > 100 && (
                          <p className="text-xs text-destructive">Le pourcentage ne peut pas dépasser 100 %.</p>
                        )}
                      </div>
                    )}
                  </div>

                  <Card className="border-emerald-200 bg-gradient-to-r from-white to-emerald-50 shadow-none">
                    <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Tarif</p><p className="mt-1 text-lg font-semibold">{formatMoney(grossAmount)}</p></div>
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Réduction</p><p className="mt-1 text-lg font-semibold text-amber-700">− {formatMoney(discountAmount)}</p></div>
                      <div><p className="text-xs font-medium uppercase text-emerald-800">Net à facturer</p><p className="mt-1 text-2xl font-bold text-emerald-800">{formatMoney(finalAmount)}</p></div>
                    </CardContent>
                  </Card>
                  {!isCompleted && (
                    <div className="flex flex-wrap justify-between gap-3 border-t pt-4">
                      <Button type="button" variant="outline" onClick={() => setActiveStep(2)}>
                        <ChevronLeft className="mr-2 h-4 w-4" />Retour à l’ordonnance
                      </Button>
                      <Button
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => void handleComplete()}
                        disabled={grossAmount <= 0 || (discountType === "fixed" && discountValue > grossAmount) || (discountType === "percentage" && discountValue > 100) || savePricing.isPending || saveConsultation.isPending || completeConsultation.isPending}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        {savePricing.isPending || saveConsultation.isPending || completeConsultation.isPending ? "Finalisation..." : `Enregistrer ${formatMoney(finalAmount)} et terminer`}
                      </Button>
                    </div>
                  )}
                  {isCompleted && entry.invoices && (
                    <p className="rounded-lg bg-slate-50 p-3 text-sm text-muted-foreground">
                      Facture {entry.invoices.numero} · {formatMoney(entry.invoices.montant)}
                    </p>
                  )}
                </div>}
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="space-y-5">
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <CardHeader className="border-b bg-gradient-to-r from-teal-50 to-white pb-3"><CardTitle className="flex items-center gap-2 text-base"><UserRound className="h-4 w-4 text-teal-700" />Contexte médical</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              {recordError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900">
                  <p className="font-medium">Historique médical indisponible</p>
                  <Button variant="link" className="h-auto px-0 text-rose-800" onClick={() => void refetchMedicalRecord()}>Réessayer le chargement</Button>
                </div>
              ) : recordLoading ? (
                <div className="space-y-4" aria-label="Chargement du contexte médical">
                  {[1, 2, 3].map((section) => <div key={section} className="space-y-2"><div className="h-3 w-24 animate-pulse rounded bg-slate-100" /><div className="h-8 animate-pulse rounded bg-slate-50" /></div>)}
                </div>
              ) : (
                <>
                  <div><p className="mb-1 font-medium text-slate-700">Antécédents</p><p className="whitespace-pre-wrap text-muted-foreground">{medicalRecord?.antecedents || "Aucun antécédent renseigné"}</p></div>
                  <div className="border-t pt-3"><p className="mb-1 font-medium text-slate-700">Traitements connus</p><p className="whitespace-pre-wrap text-muted-foreground">{medicalRecord?.traitements || "Aucun traitement renseigné"}</p></div>
                  <div className="border-t pt-3"><p className="mb-1 font-medium text-slate-700">Allergies</p><p className="whitespace-pre-wrap text-muted-foreground">{medicalRecord?.allergies || "Aucune allergie enregistrée"}</p></div>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-indigo-100 shadow-sm">
            <CardHeader className="border-b bg-gradient-to-r from-indigo-50 via-white to-blue-50 pb-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-indigo-700" />Synthèse de consultation</CardTitle>
                <Badge className="border border-indigo-100 bg-white text-indigo-700">En direct</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Prévisualisation des informations saisies, sans diagnostic automatique.</p>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
                  {`${patient.prenom.charAt(0)}${patient.nom.charAt(0)}`.toUpperCase()}
                </div>
                <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{patientName}</p><p className="text-xs text-slate-600">{[age !== null ? `${age} ans` : null, patient.sexe === "F" ? "Femme" : patient.sexe === "M" ? "Homme" : patient.sexe].filter(Boolean).join(" · ") || "Identité patient"}</p></div>
              </div>
              <div className="divide-y divide-slate-100">
                {synthesisSections.map((section) => {
                  const SectionIcon = section.icon;
                  const colorClass = {
                    blue: "bg-blue-100 text-blue-700",
                    teal: "bg-teal-100 text-teal-700",
                    emerald: "bg-emerald-100 text-emerald-700",
                    amber: "bg-amber-100 text-amber-800",
                    violet: "bg-violet-100 text-violet-700",
                  }[section.color];

                  return (
                    <div key={section.title} className="flex gap-3 py-3 first:pt-1 last:pb-1">
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colorClass}`}><SectionIcon className="h-3.5 w-3.5" /></span>
                      <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase text-slate-500">{section.title}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-800">{section.value.trim() || <span className="italic text-slate-400">À compléter</span>}</p></div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Synthèse construite uniquement à partir des données du patient et de la saisie du médecin.</div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
};

export default Consultation;
