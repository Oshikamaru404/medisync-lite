import { useState, useEffect, useCallback } from "react";
import { Activity, ArrowRight, BriefcaseMedical, Calendar, CalendarDays, FileText, Upload, Search, Pill, TestTube, Scan, ClipboardList, Award, Mail, MoreHorizontal, X, Eye, History, FileBadge, AlertTriangle, Phone, PhoneCall, HeartPulse, Stethoscope, UserRound, Scale, CreditCard, Hash, Shield } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { usePatient } from "@/hooks/usePatients";
import { useMedicalRecord, useCreateOrUpdateMedicalRecord } from "@/hooks/useMedicalRecords";
import { useDocuments, useDeleteDocument, type Document } from "@/hooks/useDocuments";
import { usePatientHistory } from "@/hooks/usePatientHistory";
import { useNavigationViewState } from "@/hooks/useNavigationViewState";
import { useAuth } from "@/contexts/AuthContext";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { useCertificates } from "@/hooks/useCertificates";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentUploadDialog } from "@/components/DocumentUploadDialog";
import { PatientIdentityTab } from "@/components/PatientIdentityTab";
import { MedicalRecordAccordion } from "@/components/MedicalRecordAccordion";
import { PatientHistoryTab } from "@/components/PatientHistoryTab";
import { PatientDocumentPreviewDialog } from "@/components/PatientDocumentPreviewDialog";
import { PrescriptionsList } from "@/components/PrescriptionsList";
import { PrescriptionDialog } from "@/components/PrescriptionDialog";
import { CertificatesList } from "@/components/CertificatesList";
import { CertificateDialog } from "@/components/CertificateDialog";
import { cn, formatPatientName, formatPhoneNumber } from "@/lib/utils";
import { differenceInYears, format, formatDistanceToNow, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const DOCUMENT_TYPE_STYLES: Record<string, { icon: typeof FileText; barColor: string; iconColor: string; badgeClass: string }> = {
  "Ordonnance": { icon: Pill, barColor: "bg-blue-500", iconColor: "text-blue-600", badgeClass: "bg-blue-100 text-blue-700" },
  "Analyse": { icon: TestTube, barColor: "bg-green-500", iconColor: "text-green-600", badgeClass: "bg-green-100 text-green-700" },
  "Radiologie": { icon: Scan, barColor: "bg-purple-500", iconColor: "text-purple-600", badgeClass: "bg-purple-100 text-purple-700" },
  "Compte rendu": { icon: ClipboardList, barColor: "bg-orange-500", iconColor: "text-orange-600", badgeClass: "bg-orange-100 text-orange-700" },
  "Certificat": { icon: Award, barColor: "bg-yellow-500", iconColor: "text-yellow-600", badgeClass: "bg-yellow-100 text-yellow-700" },
  "Courrier": { icon: Mail, barColor: "bg-cyan-500", iconColor: "text-cyan-600", badgeClass: "bg-cyan-100 text-cyan-700" },
  "Autre": { icon: MoreHorizontal, barColor: "bg-gray-500", iconColor: "text-gray-600", badgeClass: "bg-gray-100 text-gray-700" },
};

const getDocumentStyle = (type: string) => {
  return DOCUMENT_TYPE_STYLES[type] || DOCUMENT_TYPE_STYLES["Autre"];
};

const countRecordEntries = (value: string | null | undefined) =>
  value?.split(/[\n,•]/).map((item) => item.trim()).filter(Boolean).length ?? 0;

const medicationSourceLabel = (source: string, status: string) => {
  if (status === "prescribed" || source === "clinic_prescription") return "Ordonnance du cabinet";
  if (source === "clinician_verified") return "Vérifié par le médecin";
  return "Déclaré par le patient";
};

const medicationStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    active: "Actif",
    prescribed: "Prescrit",
    needs_confirmation: "À confirmer",
    suspended: "Suspendu",
    stopped: "Arrêté",
    completed: "Terminé",
    not_started: "Non commencé",
  };
  return labels[status] ?? status;
};

const medicationStatusClass = (status: string) => {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "prescribed") return "border-sky-200 bg-sky-50 text-sky-800";
  if (status === "needs_confirmation") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "stopped") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "completed") return "border-teal-200 bg-teal-50 text-teal-800";
  if (status === "not_started") return "border-violet-200 bg-violet-50 text-violet-800";
  return "border-slate-200 bg-slate-100 text-slate-700";
};

const getMedicationLifecycleDate = (medication: MedicalRecord["traitements_structures"][number]) =>
  medication.ended_on
  ?? medication.status_history?.slice().reverse().find((event) => event.status === medication.status)?.changed_at
  ?? null;

const formatMedicationEventDate = (value: string | null) => {
  if (!value) return null;
  const date = parseISO(value.slice(0, 10));
  return Number.isNaN(date.getTime()) ? null : format(date, "d MMMM yyyy", { locale: fr });
};

const getMedicationElapsedTime = (value: string | null) => {
  if (!value) return null;
  const date = parseISO(value.slice(0, 10));
  return Number.isNaN(date.getTime()) ? null : formatDistanceToNow(date, { addSuffix: true, locale: fr });
};

const PatientDetail = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { id } = useParams<{ id: string }>();
  const viewStateScope = currentUser?.id ?? "anonymous";
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedPrescriptionId = searchParams.get("prescription");
  const { data: patient, isLoading: patientLoading } = usePatient(id);
  const {
    data: medicalRecord,
    isLoading: recordLoading,
    isError: recordError,
    refetch: refetchMedicalRecord,
  } = useMedicalRecord(id);
  const {
    data: documents = [],
    isLoading: docsLoading,
    isError: docsError,
    refetch: refetchDocuments,
  } = useDocuments(id);
  const { data: patientHistory, isLoading: historyLoading, isError: historyError } = usePatientHistory(id);
  const { data: prescriptions = [], isLoading: prescriptionsLoading, isError: prescriptionsError } = usePrescriptions(id);
  const { data: certificates = [], isLoading: certificatesLoading, isError: certificatesError } = useCertificates(id);
  const updateMedicalRecord = useCreateOrUpdateMedicalRecord();
  const deleteDocument = useDeleteDocument();

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showIdentityEdit, setShowIdentityEdit] = useState(false);
  const [medicalData, setMedicalData] = useState({
    antecedents: "",
    allergies: "",
    traitements: "",
    notes: "",
  });

  const [searchQuery, setSearchQuery] = useNavigationViewState(`${viewStateScope}.patient.${id ?? "unknown"}.search`, "");
  const [selectedType, setSelectedType] = useNavigationViewState(`${viewStateScope}.patient.${id ?? "unknown"}.document-type`, "all");
  const [documentSort, setDocumentSort] = useNavigationViewState(`${viewStateScope}.patient.${id ?? "unknown"}.document-sort`, "recent");
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [analyzeUploadedDocument, setAnalyzeUploadedDocument] = useState(false);
  const [isCertificateDialogOpen, setIsCertificateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useNavigationViewState(`${viewStateScope}.patient.${id ?? "unknown"}.tab`, "overview");
  const [clinicalSection, setClinicalSection] = useNavigationViewState(`${viewStateScope}.patient.${id ?? "unknown"}.section`, "record");

  useEffect(() => {
    if (!linkedPrescriptionId) return;
    setActiveTab("care");
    setClinicalSection("prescriptions");
  }, [linkedPrescriptionId, setActiveTab, setClinicalSection]);

  const clearPrescriptionDeepLink = useCallback(() => {
    if (!searchParams.has("prescription")) return;
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("prescription");
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleDocumentUploaded = useCallback((uploadedDocument: Document, analyzeAfterUpload: boolean) => {
    setAnalyzeUploadedDocument(analyzeAfterUpload);
    setPreviewDocument(uploadedDocument);
    setActiveTab("documents");
  }, [setActiveTab]);

  // Load medical data when available
  useEffect(() => {
    if (medicalRecord) {
      setMedicalData({
        antecedents: medicalRecord.antecedents || "",
        allergies: medicalRecord.allergies || "",
        traitements: medicalRecord.traitements || "",
        notes: medicalRecord.notes || "",
      });
    }
  }, [medicalRecord]);

  const handleSaveSection = (section: keyof typeof medicalData, value: string) => {
    if (!id) return;
    updateMedicalRecord.mutate({
      patientId: id,
      data: { [section]: value },
    });
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || doc.type === selectedType;
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    if (documentSort === "oldest") return a.created_at.localeCompare(b.created_at);
    if (documentSort === "name") return a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
    return b.created_at.localeCompare(a.created_at);
  });

  const documentTypes = Array.from(new Set(documents.map(d => d.type))).sort((a, b) => a.localeCompare(b, "fr"));

  const calculateAge = (dateNaissance: string | null) => {
    if (!dateNaissance) return null;
    try {
      return differenceInYears(new Date(), parseISO(dateNaissance));
    } catch {
      return null;
    }
  };

  if (patientLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Patient non trouvé</p>
          <Button onClick={() => navigate("/patients")}>
            Retour à la liste
          </Button>
        </Card>
      </div>
    );
  }

  const age = calculateAge(patient.date_naissance);
  const sexe = patient.sexe;
  const patientName = formatPatientName(patient.nom, patient.prenom);
  const latestHistoryEntry = patientHistory?.history[0];
  const antecedentCount = countRecordEntries(medicalRecord?.antecedents);
  const confirmedTreatments = medicalRecord?.traitements_structures.filter((medication) => medication.status === "active") ?? [];
  const prescribedTreatments = medicalRecord?.traitements_structures.filter((medication) =>
    medication.status === "prescribed"
    || (medication.status === "needs_confirmation" && medication.source === "clinic_prescription"),
  ) ?? [];
  const pendingTreatments = medicalRecord?.traitements_structures.filter((medication) =>
    medication.status === "needs_confirmation" && medication.source !== "clinic_prescription",
  ) ?? [];
  const historicalTreatmentCount = medicalRecord?.traitements_structures.filter((medication) =>
    ["suspended", "stopped", "completed", "not_started"].includes(medication.status),
  ).length ?? 0;
  const treatmentCount = confirmedTreatments.length;
  const treatmentSummary = medicalRecord?.traitements_structures.filter((medication) =>
    ["active", "prescribed", "needs_confirmation"].includes(medication.status)
    || (medication.status === "needs_confirmation" && medication.source === "clinic_prescription"),
  ) ?? [];
  const overviewCount = (value: number, loading: boolean, error: boolean) => error ? "—" : loading ? "…" : value.toLocaleString("fr-MA");
  const bmi = patient.poids != null && patient.poids > 0 && patient.taille != null && patient.taille > 0
    ? patient.poids / ((patient.taille / 100) ** 2)
    : null;
  const bmiLabel = bmi === null
    ? null
    : bmi < 18.5
      ? "Insuffisance pondérale"
      : bmi < 25
        ? "Normal"
        : bmi < 30
          ? "Surpoids"
          : "Obésité";

  return (
    <div className="min-h-screen bg-[#f7faf8]">
      <header className="container mx-auto mt-5 px-6">
        <div className="overflow-hidden rounded-3xl border border-[#174d43] bg-[linear-gradient(115deg,#123b37_0%,#18564e_68%,#287267_100%)] text-white shadow-md shadow-[#184a43]/10">
        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-base font-bold tracking-wide sm:h-14 sm:w-14 sm:text-lg">
                {`${patient.prenom?.trim().charAt(0) || ""}${patient.nom?.trim().charAt(0) || ""}`.toLocaleUpperCase("fr")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c3e2d8]">Dossier patient</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{patientName}</h1>
                  <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-[#e1efe9]">
                    {sexe === "M" ? "Homme" : sexe === "F" ? "Femme" : "Sexe non renseigné"}
                    {age !== null ? ` · ${age} ans` : ""}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-2 self-start rounded-xl border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:self-auto"
                onClick={() => setShowIdentityEdit(true)}
              >
                <UserRound className="h-4 w-4" />
                <span className="hidden sm:inline">Modifier l’identité</span>
                <span className="sm:hidden">Modifier</span>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[440px]">
              {[
                { label: "Consultations", value: overviewCount(patientHistory?.stats.totalConsultations ?? 0, historyLoading, historyError), Icon: Stethoscope },
                { label: "Prescriptions", value: overviewCount(prescriptions.length, prescriptionsLoading, prescriptionsError), Icon: Pill },
                { label: "Certificats", value: overviewCount(certificates.length, certificatesLoading, certificatesError), Icon: FileBadge },
                { label: "Documents", value: overviewCount(documents.length, docsLoading, docsError), Icon: FileText },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.08] p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 text-[#c8e1d9]"><Icon className="h-3.5 w-3.5" /><span className="text-[10px] font-medium">{label}</span></div>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 w-full">
            <div className="overflow-x-auto rounded-full border border-[#dfece8] bg-white/95 text-[#214d43] shadow-sm shadow-[#1d4038]/5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max min-w-full flex-nowrap items-center justify-between gap-x-3 whitespace-nowrap px-4 py-1.5 sm:gap-x-5">
              <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5">
                {patient.cin ? <CreditCard className="h-3.5 w-3.5 shrink-0 text-sky-700" /> : <Hash className="h-3.5 w-3.5 shrink-0 text-sky-700" />}
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-sky-800">{patient.cin ? "CIN" : "Dossier"}</span>
                <span className="max-w-[11rem] truncate text-[11px] font-semibold text-[#183c35]">
                  {patient.cin || patient.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5">
                <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-emerald-800">Tél.</span>
                {patient.telephone ? (
                  <a href={`tel:${patient.telephone}`} className="text-[11px] font-semibold text-[#183c35] hover:underline">
                    {formatPhoneNumber(patient.telephone)}
                  </a>
                ) : (
                  <span className="text-[11px] font-semibold text-[#183c35]">Non renseigné</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5">
                <Shield className="h-3.5 w-3.5 shrink-0 text-violet-700" />
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-violet-800">Mutuelle</span>
                <span className="max-w-[11rem] truncate text-[11px] font-semibold text-[#183c35]">
                  {patient.mutuelle || "Non renseignée"}
                </span>
                {patient.numero_mutuelle && <span className="shrink-0 text-[10px] font-medium text-violet-800">N° {patient.numero_mutuelle}</span>}
              </div>
              </div>
            </div>
          <div className="mt-3 flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-nowrap">
            <section aria-label="Morphologie du patient" className="w-fit max-w-full shrink-0 rounded-2xl border-2 border-[#b8d2c5] bg-white p-3.5 text-[#24483d] shadow-sm">
              <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#59766b]">
                <Scale className="h-4 w-4 text-[#347764]" />
                Morphologie
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {patient.poids != null && (
                  <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    {patient.poids} kg
                  </span>
                )}
                {patient.taille != null && (
                  <span className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
                    {patient.taille} cm
                  </span>
                )}
                {bmi !== null && bmiLabel && (
                  <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-800">
                    IMC {bmi.toFixed(1)} · {bmiLabel}
                  </span>
                )}
                {patient.poids == null && patient.taille == null && (
                  <span className="text-xs text-slate-500">Mesures non renseignées</span>
                )}
              </div>
            </section>
            <section aria-label="Contact d’urgence et dernier passage" className="w-full min-w-0 rounded-2xl border-2 border-[#b8d2c5] bg-white p-3.5 text-[#24483d] shadow-sm sm:flex-1">
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#59766b]">
                    <PhoneCall className="h-4 w-4 text-[#347764]" />
                    Contact d’urgence
                  </h2>
                  {patient.personne_contact ? (
                    <div className="mt-2 space-y-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {patient.personne_contact}
                        {patient.lien_personne_contact && <span className="ml-1.5 text-xs font-normal text-slate-500">· {patient.lien_personne_contact}</span>}
                      </p>
                      {patient.telephone_personne_contact ? (
                        <a
                          href={`tel:${patient.telephone_personne_contact}`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#24644f] hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {formatPhoneNumber(patient.telephone_personne_contact)}
                        </a>
                      ) : (
                        <p className="text-[11px] text-slate-500">Téléphone non renseigné</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">Contact non renseigné</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-lg border-[#c7ddd2] px-2.5 text-[11px] text-[#24644f] hover:bg-[#f2f8f5]"
                        onClick={() => setShowIdentityEdit(true)}
                      >
                        Ajouter
                      </Button>
                    </div>
                  )}
                </div>
                <div className="min-w-0 border-t border-[#e6eee9] pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#59766b]">
                    <CalendarDays className="h-4 w-4 text-[#347764]" />
                    Dernier passage
                  </h2>
                  {historyLoading ? (
                    <p className="mt-2 text-xs text-slate-500">Chargement du parcours…</p>
                  ) : historyError ? (
                    <p className="mt-2 text-xs text-rose-700">Historique indisponible</p>
                  ) : latestHistoryEntry ? (
                    <div className="mt-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {latestHistoryEntry.motif || (latestHistoryEntry.type === "queue" ? "Consultation" : "Rendez-vous")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(latestHistoryEntry.date).toLocaleDateString("fr-MA", { day: "numeric", month: "long", year: "numeric" })}
                        {" · "}
                        {latestHistoryEntry.type === "queue" ? "Passage au cabinet" : "Rendez-vous confirmé"}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">Aucun passage enregistré</p>
                  )}
                </div>
              </div>
            </section>
          </div>
          <nav aria-label="Actions rapides du dossier patient" className="mt-5 flex w-full flex-wrap gap-2 border-t border-white/15 pt-4">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-xl bg-white text-[#174d43] hover:bg-[#edf7f2]"
              onClick={() => { setClinicalSection("record"); setActiveTab("care"); }}
            >
              <UserRound className="mr-2 h-4 w-4" />
              Dossier médical
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-xl border border-white/20 bg-white/[0.06] text-white hover:bg-white/15 hover:text-white"
              onClick={() => { setClinicalSection("prescriptions"); setActiveTab("care"); }}
            >
              <Pill className="mr-2 h-4 w-4" />
              Prescriptions
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-xl border border-white/20 bg-white/[0.06] text-white hover:bg-white/15 hover:text-white"
              onClick={() => setActiveTab("documents")}
            >
              <Upload className="mr-2 h-4 w-4" />
              Ajouter / consulter un document
            </Button>
          </nav>
          </div>
        </div>
        </div>
      </header>

      <section className="container mx-auto px-6 pt-3">
        <div
          aria-live="polite"
          role={medicalRecord?.allergies?.trim() ? "alert" : undefined}
          className={cn(
            "flex flex-col gap-2 rounded-xl border border-l-4 bg-white px-3.5 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between",
            medicalRecord?.allergies?.trim()
              ? "border-rose-200 border-l-rose-500 text-rose-900"
              : "border-[#e3eae5] border-l-[#a9b893] text-[#53613d]",
          )}
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <AlertTriangle className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              medicalRecord?.allergies?.trim() ? "text-rose-600" : "text-[#78814b]",
            )} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-semibold">
                {recordLoading
                  ? "Vérification des allergies…"
                  : recordError
                    ? "Allergies non vérifiées"
                    : medicalRecord?.allergies?.trim()
                      ? "Allergies à prendre en compte"
                      : "Aucune allergie renseignée"}
              </p>
              <p className="mt-0.5 break-words text-xs opacity-85">
                {recordLoading
                  ? "Chargement des informations du dossier médical."
                  : recordError
                    ? "Les informations ne sont pas disponibles. Réessayez avant toute prescription."
                    : medicalRecord?.allergies?.trim() || "À confirmer avec le patient avant toute prescription."}
              </p>
            </div>
          </div>
          {recordError && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 border-[#cbd8ba] bg-white text-[#53613d] hover:bg-[#f7faf4]"
              onClick={() => void refetchMedicalRecord()}
            >
              Réessayer
            </Button>
          )}
        </div>
      </section>

      <main className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList aria-label="Espaces du dossier patient" className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl border border-[#d8e7e1] bg-[#f0f6f3] p-2 shadow-sm sm:grid-cols-4">
            <TabsTrigger
              value="overview"
              className="rounded-xl border border-[#d4e9dd] bg-[#eaf5ee] py-2.5 text-[#35624c] transition-all hover:bg-[#dfefe5] data-[state=active]:border-[#9dc8ae] data-[state=active]:bg-[#d7eddf] data-[state=active]:font-bold data-[state=active]:text-[#174d38] data-[state=active]:shadow-sm sm:py-3"
            >
              <Activity className="mr-2 h-4 w-4" />
              Synthèse
            </TabsTrigger>
            <TabsTrigger
              value="care"
              className="rounded-xl border border-[#cce8df] bg-[#e6f4ef] py-2.5 text-[#32675b] transition-all hover:bg-[#d9eee7] data-[state=active]:border-[#8fc9b5] data-[state=active]:bg-[#d2ebe1] data-[state=active]:font-bold data-[state=active]:text-[#155747] data-[state=active]:shadow-sm sm:py-3"
            >
              <span className="inline-flex items-center gap-2">
                <HeartPulse className="h-4 w-4" />
                Dossier &amp; Ordonnances
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="rounded-xl border border-[#d5e7ec] bg-[#edf5f7] py-2.5 text-[#456a72] transition-all hover:bg-[#e1eff2] data-[state=active]:border-[#a6cbd3] data-[state=active]:bg-[#dcecf0] data-[state=active]:font-bold data-[state=active]:text-[#315f69] data-[state=active]:shadow-sm sm:py-3"
            >
              <FileText className="mr-2 h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-xl border border-[#e0e8d2] bg-[#f0f4e9] py-2.5 text-[#66734d] transition-all hover:bg-[#e8efdd] data-[state=active]:border-[#bdcda0] data-[state=active]:bg-[#e4edcf] data-[state=active]:font-bold data-[state=active]:text-[#556638] data-[state=active]:shadow-sm sm:py-3"
            >
              <History className="mr-2 h-4 w-4" />
              Parcours
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5 space-y-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><HeartPulse className="h-4 w-4 text-teal-700" />Repères cliniques</h3>
                    <p className="mt-1 text-xs text-slate-500">Synthèse du dossier · à confirmer avec le patient</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-xl" onClick={() => { setClinicalSection("record"); setActiveTab("care"); }}>
                    Ouvrir le dossier <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-3 p-4 sm:p-5">
                  {recordError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                      <p>Les repères cliniques sont indisponibles.</p>
                      <Button variant="link" className="h-auto px-0 text-rose-800" onClick={() => void refetchMedicalRecord()}>Réessayer</Button>
                    </div>
                  ) : recordLoading ? (
                    <div className="space-y-2" aria-label="Chargement des repères cliniques">
                      {[1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        { label: "Antécédents", value: medicalRecord?.antecedents, count: antecedentCount, Icon: Activity, iconClass: "text-blue-700", badgeClass: "border-blue-200 bg-blue-50 text-blue-800" },
                      ].map(({ label, value, count, Icon, iconClass, badgeClass }) => (
                        <div key={label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="flex items-center gap-2 text-xs font-bold text-slate-700"><Icon className={`h-4 w-4 ${iconClass}`} />{label}</h4>
                            <Badge variant="outline" className={badgeClass}>{count}</Badge>
                          </div>
                          <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{value?.trim() || "Aucune information consignée."}</p>
                        </div>
                      ))}
                      <section className="relative min-w-0 overflow-hidden rounded-2xl border border-emerald-200 bg-[linear-gradient(135deg,#f0faf4_0%,#ffffff_75%)] p-3.5 shadow-sm shadow-emerald-900/[0.03]" aria-label="Synthèse des traitements du patient">
                        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                        <div className="flex flex-wrap items-start justify-between gap-2 pl-1">
                          <h4 className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                            <Pill className="h-4 w-4 text-emerald-700" />
                            Traitements du patient
                          </h4>
                          <div className="flex flex-wrap justify-end gap-1">
                            <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-[10px] text-emerald-800">{treatmentCount} actuel{treatmentCount === 1 ? "" : "s"}</Badge>
                            {prescribedTreatments.length > 0 && <Badge variant="outline" className="rounded-full border-sky-200 bg-sky-50 text-[10px] text-sky-800">{prescribedTreatments.length} prescrit{prescribedTreatments.length === 1 ? "" : "s"}</Badge>}
                            {pendingTreatments.length > 0 && <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-[10px] text-amber-800">{pendingTreatments.length} à confirmer</Badge>}
                            {historicalTreatmentCount > 0 && <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-[10px] text-slate-700">{historicalTreatmentCount} historique{historicalTreatmentCount === 1 ? "" : "s"}</Badge>}
                          </div>
                        </div>
                        {treatmentSummary.length ? (
                          <ul className="mt-2 space-y-2 pl-1" aria-label="Traitements et provenance">
                            {treatmentSummary.slice(0, 4).map((medication) => {
                              const displayStatus = medication.status === "needs_confirmation" && medication.source === "clinic_prescription"
                                ? "prescribed"
                                : medication.status;
                              const lifecycleDate = ["suspended", "stopped", "completed", "not_started"].includes(medication.status)
                                ? getMedicationLifecycleDate(medication)
                                : null;
                              const lifecycleStatusLabel = medication.status === "suspended" ? "Suspendu" :
                                medication.status === "stopped" ? "Arrêté" :
                                medication.status === "completed" ? "Terminé" :
                                medication.status === "not_started" ? "Non commencé" : "";
                              return (
                                <li key={medication.id} className="rounded-xl border border-white/90 bg-white/85 px-3 py-2 shadow-sm">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="min-w-0 text-xs font-semibold text-slate-800">
                                      {medication.name}{medication.dose ? ` · ${medication.dose}` : ""}{medication.units_per_intake ? ` · ${medication.units_per_intake === 0.5 ? "½" : medication.units_per_intake} ${medication.intake_unit === "gélule" ? medication.units_per_intake === 0.5 || medication.units_per_intake === 1 ? "gélule / prise" : "gélules / prise" : medication.units_per_intake === 0.5 || medication.units_per_intake === 1 ? "comprimé / prise" : "comprimés / prise"}` : ""}
                                    </span>
                                    <Badge variant="outline" className={`gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${medicationStatusClass(displayStatus)}`}>
                                      <span className={`h-1.5 w-1.5 rounded-full ${displayStatus === "active" ? "bg-emerald-500" : displayStatus === "prescribed" ? "bg-sky-500" : displayStatus === "needs_confirmation" ? "bg-amber-500" : displayStatus === "stopped" ? "bg-rose-500" : displayStatus === "completed" ? "bg-teal-500" : displayStatus === "not_started" ? "bg-violet-500" : "bg-slate-500"}`} aria-hidden="true" />
                                      {medicationStatusLabel(displayStatus)}
                                    </Badge>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] leading-4 text-slate-600">
                                    <span className="inline-flex items-center gap-1">
                                      <Shield className="h-3 w-3 text-slate-500" aria-hidden="true" />
                                      {medicationSourceLabel(medication.source, displayStatus)}
                                    </span>
                                    {medication.validated_by_name ? (
                                      <span className="font-medium text-emerald-800">· Validé par {medication.validated_by_name}</span>
                                    ) : displayStatus === "active" ? (
                                      <span className="font-medium text-amber-800">· Validation antérieure sans identité nominative</span>
                                    ) : displayStatus === "prescribed" ? (
                                      <span className="text-sky-800">· Début de prise non déclaré</span>
                                    ) : (
                                      <span className="text-amber-800">· En attente de validation médicale</span>
                                    )}
                                  </div>
                                  {medication.started_on && (
                                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-2.5 py-2 text-[10px] text-emerald-950">
                                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
                                      <span>
                                        <span className="block font-semibold">Début {getMedicationElapsedTime(medication.started_on)}</span>
                                        <span className="block text-emerald-800/75">{formatMedicationEventDate(medication.started_on)}</span>
                                      </span>
                                    </div>
                                  )}
                                  {lifecycleDate && (
                                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50/65 px-2.5 py-2 text-[10px] text-violet-950">
                                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-violet-700" aria-hidden="true" />
                                      <span>
                                        <span className="block font-semibold">{lifecycleStatusLabel} {getMedicationElapsedTime(lifecycleDate)}</span>
                                        <span className="block text-violet-800/75">{formatMedicationEventDate(lifecycleDate)}</span>
                                      </span>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                            {treatmentSummary.length > 4 && (
                              <li className="px-2 text-[10px] font-medium text-slate-500">
                                + {treatmentSummary.length - 4} autre{treatmentSummary.length - 4 === 1 ? "" : "s"} traitement{treatmentSummary.length - 4 === 1 ? "" : "s"} · ouvrir le dossier pour voir le détail
                              </li>
                            )}
                          </ul>
                        ) : (
                          <p className="mt-2 pl-1 text-xs leading-5 text-slate-700">Aucun traitement structuré consigné.</p>
                        )}
                        {medicalRecord?.traitements?.trim() && (
                          <p className="mt-1 pl-1 text-[10px] leading-4 text-slate-500">
                            Ancien texte libre à confirmer : {medicalRecord.traitements}
                          </p>
                        )}
                        <p className="mt-1 pl-1 text-[10px] leading-4 text-slate-500">
                          Les traitements suspendus ou arrêtés restent consultables dans l’historique. Une rubrique vide ne confirme pas l’absence de traitement.
                        </p>
                        <Button type="button" variant="link" size="sm" className="mt-1 h-auto px-1 text-[11px] font-semibold text-emerald-800" onClick={() => { setClinicalSection("record"); setActiveTab("care"); }}>
                          Voir traitements et historique <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </section>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="flex h-full flex-col overflow-hidden rounded-2xl border-slate-200 shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarDays className="h-4 w-4 text-indigo-700" />Parcours récent</h3>
                    <p className="mt-1 text-xs text-slate-500">Dernières visites enregistrées</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="shrink-0 text-indigo-800 hover:bg-indigo-50" onClick={() => setActiveTab("history")}>
                    Tout voir <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  {historyLoading ? (
                    <div className="space-y-3" aria-label="Chargement de l’historique">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div>
                  ) : historyError ? (
                    <p role="status" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">L’historique récent n’a pas pu être chargé. Ouvrez l’onglet Historique pour réessayer.</p>
                  ) : patientHistory?.history.length ? (
                    <ol className="space-y-1">
                      {patientHistory.history.slice(0, 4).map((entry, index) => (
                        <li key={`${entry.type}-${entry.id}`} className="relative flex gap-3 py-2.5">
                          <div className="flex flex-col items-center">
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${index === 0 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>
                              {entry.type === "queue" ? <Stethoscope className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                            </span>
                            {index < Math.min(patientHistory.history.length, 4) - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                          </div>
                          <div className="min-w-0 flex-1 pb-1">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <p className="text-xs font-semibold text-slate-800">{entry.motif || (entry.type === "queue" ? "Consultation" : "Rendez-vous")}</p>
                              <time className="text-[10px] font-medium text-slate-500">{new Date(entry.date).toLocaleDateString("fr-MA", { day: "numeric", month: "short", year: "numeric" })}</time>
                            </div>
                            <p className="mt-1 text-[10px] text-slate-500">{entry.type === "queue" ? "Passage au cabinet" : "Rendez-vous confirmé"}{entry.montant !== null ? ` · ${entry.montant.toLocaleString("fr-MA")} DH` : ""}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                      <CalendarDays className="mx-auto h-7 w-7 text-slate-300" />
                      <p className="mt-2 text-xs font-semibold text-slate-700">Pas encore de visite enregistrée</p>
                      <p className="mt-1 text-[10px] text-slate-500">Les prochains passages apparaîtront ici.</p>
                    </div>
                  )}
                  {id && patient && (
                    <section className="mt-auto pt-4" aria-label="Accès rapides aux outils du dossier">
                      <div className="relative overflow-hidden rounded-2xl border border-[#dce9e1] bg-[linear-gradient(135deg,#f2f8f4_0%,#f9fbfa_58%,#eef6f2_100%)] p-3.5 sm:p-4">
                        <div aria-hidden="true" className="pointer-events-none absolute -right-7 -top-10 h-28 w-28 rounded-full bg-emerald-100/40 blur-2xl" />
                        <div className="relative mb-3 flex items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white bg-white text-[#23634f] shadow-sm">
                            <BriefcaseMedical className="h-[18px] w-[18px]" />
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-[13px] font-bold tracking-tight text-[#194d40]">Boîte à outils</h4>
                            <p className="mt-0.5 text-[10px] leading-tight text-slate-500">Les essentiels du dossier patient</p>
                          </div>
                        </div>
                        <div className="relative grid grid-cols-2 gap-2">
                        <PrescriptionDialog patientId={id} patientName={patientName}>
                          <Button type="button" variant="outline" title="Créer une ordonnance, une demande d’analyse ou d’imagerie" className="group h-auto min-h-[66px] w-full justify-start gap-2.5 rounded-xl border-white/90 bg-white/90 px-2.5 py-2 text-left shadow-sm shadow-emerald-950/[0.03] transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-md sm:px-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#e4f5e9,#d7eee0)] text-[#24704f] ring-1 ring-emerald-700/5 transition-transform group-hover:scale-105"><Pill className="h-[18px] w-[18px]" /></span>
                            <span className="min-w-0">
                              <span className="block text-[11px] font-bold leading-tight text-slate-800">Ordonnance</span>
                              <span className="mt-1 block text-[9px] font-normal leading-tight text-slate-500">Prescrire un soin</span>
                            </span>
                          </Button>
                        </PrescriptionDialog>
                        <Button type="button" variant="outline" title="Créer un certificat médical" onClick={() => setIsCertificateDialogOpen(true)} className="group h-auto min-h-[66px] w-full justify-start gap-2.5 rounded-xl border-white/90 bg-white/90 px-2.5 py-2 text-left shadow-sm shadow-amber-950/[0.03] transition-all hover:-translate-y-0.5 hover:border-amber-200 hover:bg-white hover:shadow-md sm:px-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#fff3d9,#ffebbd)] text-[#996719] ring-1 ring-amber-800/5 transition-transform group-hover:scale-105"><FileBadge className="h-[18px] w-[18px]" /></span>
                          <span className="min-w-0">
                            <span className="block text-[11px] font-bold leading-tight text-slate-800">Certificat</span>
                            <span className="mt-1 block text-[9px] font-normal leading-tight text-slate-500">Créer un justificatif</span>
                          </span>
                        </Button>
                        <DocumentUploadDialog patientId={id} patientName={patientName} onUploaded={handleDocumentUploaded}>
                          <Button type="button" variant="outline" title="Importer un document au dossier patient" className="group h-auto min-h-[66px] w-full justify-start gap-2.5 rounded-xl border-white/90 bg-white/90 px-2.5 py-2 text-left shadow-sm shadow-cyan-950/[0.03] transition-all hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-white hover:shadow-md sm:px-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#e3f5f6,#d4edef)] text-[#28727a] ring-1 ring-cyan-800/5 transition-transform group-hover:scale-105"><Upload className="h-[18px] w-[18px]" /></span>
                            <span className="min-w-0">
                              <span className="block text-[11px] font-bold leading-tight text-slate-800">Document</span>
                              <span className="mt-1 block text-[9px] font-normal leading-tight text-slate-500">Ajouter un fichier</span>
                            </span>
                          </Button>
                        </DocumentUploadDialog>
                        <Button type="button" variant="outline" title="Consulter le dossier médical et les traitements" onClick={() => { setClinicalSection("record"); setActiveTab("care"); }} className="group h-auto min-h-[66px] w-full justify-start gap-2.5 rounded-xl border-white/90 bg-white/90 px-2.5 py-2 text-left shadow-sm shadow-indigo-950/[0.03] transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md sm:px-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#eeeaff,#e3ddff)] text-[#6551a3] ring-1 ring-indigo-800/5 transition-transform group-hover:scale-105"><HeartPulse className="h-[18px] w-[18px]" /></span>
                          <span className="min-w-0">
                            <span className="block text-[11px] font-bold leading-tight text-slate-800">Dossier médical</span>
                            <span className="mt-1 block text-[9px] font-normal leading-tight text-slate-500">Traitements & antécédents</span>
                          </span>
                        </Button>
                      </div>
                      </div>
                    </section>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="care" className="mt-5">
            <Tabs value={clinicalSection} onValueChange={setClinicalSection}>
            <section className="mb-4 flex flex-col gap-3 overflow-hidden rounded-2xl border border-[#cfe3d9] bg-[linear-gradient(115deg,#eaf4ef_0%,#f4f8f4_68%,#e7f1ed_100%)] p-4 text-[#194d40] shadow-sm lg:flex-row lg:items-center lg:justify-between lg:px-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#54806d]">Espace de soins</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#194d40]">Clinique</h2>
                <p className="mt-0.5 text-xs text-[#557166]">Dossier médical, ordonnances et certificats réunis au même endroit.</p>
              </div>
                <TabsList aria-label="Contenu clinique" className="grid h-auto w-full grid-cols-3 gap-1.5 rounded-xl border border-[#d5e5dd] bg-white/70 p-1.5 lg:w-auto">
                  <TabsTrigger
                    value="record"
                    className="min-w-0 justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-2 py-2.5 text-xs text-emerald-800 transition-all hover:bg-emerald-100 data-[state=active]:border-emerald-400 data-[state=active]:bg-emerald-100 data-[state=active]:font-bold data-[state=active]:text-emerald-950 data-[state=active]:shadow-sm sm:px-4"
                  >
                    <HeartPulse className="h-4 w-4 shrink-0" />
                    <span>Dossier</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="prescriptions"
                    className="min-w-0 justify-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-2 py-2.5 text-xs text-blue-800 transition-all hover:bg-blue-100 data-[state=active]:border-blue-400 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:text-blue-950 data-[state=active]:shadow-sm sm:px-4"
                  >
                    <Pill className="h-4 w-4 shrink-0" />
                    <span className="truncate"><span className="hidden sm:inline">Ordonnances</span><span className="sm:hidden">Ordo.</span></span>
                    <span className={cn("inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums", clinicalSection === "prescriptions" ? "bg-blue-700 text-white" : "border border-blue-200 bg-white/80 text-blue-800")}>
                      {overviewCount(prescriptions.length, prescriptionsLoading, prescriptionsError)}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="certificates"
                    className="min-w-0 justify-center gap-2 rounded-full border border-amber-200 bg-amber-50/80 px-2 py-2.5 text-xs text-amber-800 transition-all hover:bg-amber-100 data-[state=active]:border-amber-400 data-[state=active]:bg-amber-100 data-[state=active]:font-bold data-[state=active]:text-amber-950 data-[state=active]:shadow-sm sm:px-4"
                  >
                    <FileBadge className="h-4 w-4 shrink-0" />
                    <span className="truncate"><span className="hidden sm:inline">Certificats</span><span className="sm:hidden">Certif.</span></span>
                    <span className={cn("inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums", clinicalSection === "certificates" ? "bg-amber-700 text-white" : "border border-amber-200 bg-white/80 text-amber-800")}>
                      {overviewCount(certificates.length, certificatesLoading, certificatesError)}
                    </span>
                  </TabsTrigger>
                </TabsList>
            </section>
          {/* Medical Record Tab - 2 Column Layout */}
          <TabsContent value="record" className="mt-0">
            <div className="space-y-3">
              {recordLoading ? (
                <Card className="space-y-3 rounded-2xl p-5" aria-label="Chargement du dossier médical">
                  {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
                </Card>
              ) : recordError ? (
                <Card className="flex flex-col gap-3 rounded-2xl border-rose-200 bg-rose-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-rose-950">Dossier médical indisponible</h3>
                    <p className="mt-1 text-xs text-rose-800">Les données cliniques n’ont pas pu être chargées. Réessayez avant de les interpréter.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="shrink-0 border-rose-200 bg-white text-rose-900" onClick={() => void refetchMedicalRecord()}>
                    Réessayer
                  </Button>
                </Card>
              ) : (
                <MedicalRecordAccordion
                  data={medicalData}
                  onSave={(section, value) => {
                    setMedicalData({ ...medicalData, [section]: value });
                    handleSaveSection(section as keyof typeof medicalData, value);
                  }}
                  medications={medicalRecord?.traitements_structures ?? []}
                  onSaveMedications={(medications) => {
                    if (!id) return Promise.reject(new Error("Patient introuvable."));
                    return updateMedicalRecord.mutateAsync({
                      patientId: id,
                      data: { traitements_structures: medications },
                    });
                  }}
                  savingMedications={updateMedicalRecord.isPending}
                  editingSection={editingSection}
                  onEditToggle={(section) => setEditingSection(section)}
                />
              )}
            </div>
          </TabsContent>

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions" className="mt-0">
            {id && patient && (
              <PrescriptionsList
                patientId={id}
                patientName={patientName}
                initialPrescriptionId={linkedPrescriptionId}
                onInitialPrescriptionOpened={clearPrescriptionDeepLink}
              />
            )}
          </TabsContent>
          <TabsContent value="certificates" className="mt-0 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setIsCertificateDialogOpen(true)} className="gap-2 rounded-xl bg-[#23634f] text-white shadow-sm hover:bg-[#194d40]">
                <FileBadge className="h-4 w-4" />
                Nouveau certificat
              </Button>
            </div>
            {id && patient && <CertificatesList patientId={id} />}
          </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="documents" className="mt-5">
            <section className="mb-4 overflow-hidden rounded-2xl border border-[#d3e1e5] bg-[linear-gradient(115deg,#edf4f4_0%,#f7f9f8_68%,#eaf2f2_100%)] p-4 text-[#365d60] shadow-sm sm:px-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#66888a]">Mémoire documentaire</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#365d60]">Pièces du dossier</h2>
                  <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-[#627b7c]">
                    Analyses, imagerie, courriers et documents reçus. Les ordonnances et certificats créés au cabinet restent dans l’espace Clinique.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-[#d3e1e5] bg-white/80 px-3 py-2 text-xs font-semibold text-[#365d60] sm:self-center">
                  <Shield className="h-4 w-4 text-emerald-700" />
                  Accès protégé
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#d3e1e5]/80 pt-3 text-xs text-[#627b7c]">
                <span className="font-semibold text-[#365d60]">
                  {overviewCount(documents.length, docsLoading, docsError)} pièce{documents.length === 1 ? "" : "s"}
                </span>
                {documents.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{documentTypes.length} catégorie{documentTypes.length === 1 ? "" : "s"}</span>
                    {documents[0] && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Dernière pièce le {format(parseISO(documents[0].created_at), "d MMM yyyy", { locale: fr })}</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </section>

          <div className="space-y-6">
            <Card className="rounded-2xl border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Rechercher par nom ou catégorie…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger aria-label="Filtrer par catégorie" className="w-full sm:w-[190px]">
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {documentTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={documentSort} onValueChange={setDocumentSort}>
                    <SelectTrigger aria-label="Trier les pièces" className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Trier par" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Plus récentes</SelectItem>
                      <SelectItem value="oldest">Plus anciennes</SelectItem>
                      <SelectItem value="name">Nom · A à Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {id && patient && (
                  <DocumentUploadDialog patientId={id} patientName={patientName} onUploaded={handleDocumentUploaded}>
                    <Button type="button" className="gap-2 rounded-xl bg-[#23634f] text-white shadow-sm hover:bg-[#194d40] xl:shrink-0">
                      <Upload className="h-4 w-4" />Ajouter une pièce
                    </Button>
                  </DocumentUploadDialog>
                )}
              </div>
              {!docsLoading && !docsError && documents.length > 0 && (
                <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-muted-foreground">
                  {filteredDocuments.length} résultat{filteredDocuments.length === 1 ? "" : "s"} sur {documents.length}
                </p>
              )}
            </Card>

            {docsLoading ? (
              <Card className="rounded-2xl border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
                <div className="mx-auto flex max-w-sm flex-col items-center">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f2ee]">
                    <Shield className="h-5 w-5 text-[#23634f]" />
                  </div>
                  <p className="font-medium text-foreground">Ouverture du dossier documentaire</p>
                  <p className="mt-1 text-sm text-muted-foreground">Vérification de l’accès sécurisé et chargement des pièces…</p>
                </div>
              </Card>
            ) : docsError ? (
              <Card className="flex flex-col gap-3 rounded-2xl border-rose-200 bg-rose-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-rose-950">Documents indisponibles</h3>
                  <p className="mt-1 text-xs text-rose-800">Les fichiers du dossier n’ont pas pu être chargés.</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="shrink-0 border-rose-200 bg-white text-rose-900" onClick={() => void refetchDocuments()}>
                  Réessayer
                </Button>
              </Card>
            ) : filteredDocuments.length === 0 ? (
              <Card className="rounded-2xl border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-full bg-tile-scanner/10 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-[hsl(var(--tile-scanner))]" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {documents.length ? "Aucune pièce correspondante" : "Le dossier est prêt à être complété"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {documents.length
                      ? "Essayez un autre terme de recherche ou une autre catégorie."
                      : "Ajoutez les comptes rendus, résultats et pièces utiles au suivi de ce patient."}
                  </p>
                  {documents.length > 0 ? (
                    <Button variant="outline" onClick={() => { setSearchQuery(""); setSelectedType("all"); }}>
                      Effacer les filtres
                    </Button>
                  ) : id && patient ? (
                    <DocumentUploadDialog patientId={id} patientName={patientName} onUploaded={handleDocumentUploaded}>
                      <Button className="gap-2 rounded-xl bg-[#23634f] text-white shadow-sm hover:bg-[#194d40]">
                        <Upload className="w-4 h-4" />Ajouter une pièce
                      </Button>
                    </DocumentUploadDialog>
                  ) : null}
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map((doc) => {
                  const style = getDocumentStyle(doc.type);
                  const Icon = style.icon;
                  return (
                    <Card 
                      key={doc.id} 
                      className="group cursor-pointer overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#b7d2c6] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23634f] focus-visible:ring-offset-2"
                      role="button"
                      tabIndex={0}
                      aria-label={`Ouvrir ${doc.nom}`}
                      onClick={() => setPreviewDocument(doc)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setPreviewDocument(doc);
                        }
                      }}
                    >
                      <div className="flex">
                        {/* Color indicator bar */}
                        <div className={cn("w-1.5 shrink-0", style.barColor)} />
                        
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="p-2 rounded-lg bg-muted">
                              <Icon className={cn("w-5 h-5", style.iconColor)} />
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={cn("text-xs", style.badgeClass)}>{doc.type}</Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label={`Supprimer ${doc.nom}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (id) deleteDocument.mutate({ id: doc.id, patientId: id });
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <h4 className="font-medium text-foreground text-sm leading-snug mb-2 line-clamp-2">
                            {doc.nom}
                          </h4>
                          
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString("fr-FR", { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric' 
                              })}
                            </p>
                            <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              Ouvrir <Eye className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            {id && <PatientHistoryTab patientId={id} />}
          </TabsContent>
        </Tabs>
        {id && (
          <PatientDocumentPreviewDialog
            key={previewDocument?.id ?? "closed"}
            document={previewDocument}
            patientId={id}
            autoAnalyze={analyzeUploadedDocument}
            onClose={() => { setPreviewDocument(null); setAnalyzeUploadedDocument(false); }}
          />
        )}
        {showIdentityEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">Dossier patient</p>
                  <h2 className="mt-1 text-lg font-semibold">Modifier l’identité</h2>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Fermer" onClick={() => setShowIdentityEdit(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <PatientIdentityTab patient={patient} />
            </Card>
          </div>
        )}
        {id && patient && (
          <CertificateDialog
            open={isCertificateDialogOpen}
            onOpenChange={setIsCertificateDialogOpen}
            patientId={id}
            patientName={patientName}
          />
        )}
      </main>
    </div>
  );
};

export default PatientDetail;
