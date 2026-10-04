import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { differenceInYears, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { format } from "date-fns";
import { Activity, AlertTriangle, ArrowLeft, Check, ClipboardCheck, ClipboardList, FileHeart, FileText, HeartPulse, Save, Stethoscope, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PrescriptionDialog } from "@/components/PrescriptionDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useMedicalRecord } from "@/hooks/useMedicalRecords";
import { ConsultationFields, useCompleteConsultation, useConsultation, useSaveConsultation } from "@/hooks/useConsultations";
import { useQueueEntry } from "@/hooks/useQueue";

const EMPTY_FIELDS: ConsultationFields = {
  motif: "",
  histoire: "",
  examen_clinique: "",
  diagnostic: "",
  plan: "",
};

const getConsultationLoadErrorMessage = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return "Le serveur n’a pas renvoyé de détail sur l’erreur.";
  }

  const errorCode = "code" in error ? String(error.code) : "";

  if (errorCode === "PGRST205" || errorCode === "42P01") {
    return "La table consultations n’est pas disponible dans Supabase. Appliquez la migration 20261003090000_create_consultations.sql, puis rechargez cette page.";
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
  const [fields, setFields] = useState<ConsultationFields>(EMPTY_FIELDS);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (consultation) {
      setFields({
        motif: consultation.motif || "",
        histoire: consultation.histoire || "",
        examen_clinique: consultation.examen_clinique || "",
        diagnostic: consultation.diagnostic || "",
        plan: consultation.plan || "",
      });
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

  const synthesisSections = [
    { title: "Motif", value: fields.motif, icon: ClipboardList, color: "blue" },
    { title: "Interrogatoire", value: fields.histoire, icon: HeartPulse, color: "teal" },
    { title: "Examen clinique", value: fields.examen_clinique, icon: Activity, color: "emerald" },
    { title: "Diagnostic", value: fields.diagnostic, icon: FileHeart, color: "amber" },
    { title: "Conduite à tenir", value: fields.plan, icon: ClipboardCheck, color: "violet" },
  ];

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
    try {
      const savedConsultation = await save();
      if (!savedConsultation) return;
      await completeConsultation.mutateAsync(savedConsultation.id);
      navigate("/file-attente");
    } catch (error) {
      console.error("Unable to complete consultation:", error);
    }
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
              <>
                <Button variant="outline" onClick={() => void save()} disabled={saveConsultation.isPending}>
                  <Save className="mr-2 h-4 w-4" />Enregistrer
                </Button>
                <Button onClick={() => void handleComplete()} disabled={saveConsultation.isPending || completeConsultation.isPending}>
                  <Check className="mr-2 h-4 w-4" />Terminer
                </Button>
              </>
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
              {hasStarted && !isCompleted && (
                <PrescriptionDialog patientId={entry.patient_id} patientName={patientName} patientAllergies={medicalRecord?.allergies}>
                  <Button variant="outline" className="shrink-0"><FileText className="mr-2 h-4 w-4" />Nouvelle ordonnance</Button>
                </PrescriptionDialog>
              )}
            </div>
          </Card>

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
                <CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4 text-blue-600" />Compte rendu clinique</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-5 md:p-6">
                <div className="space-y-2">
                  <Label htmlFor="visit-motif">Motif de consultation</Label>
                  <Input id="visit-motif" value={fields.motif || ""} onChange={(event) => setFields({ ...fields, motif: event.target.value })} placeholder="Ex. céphalées depuis hier..." disabled={isCompleted} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visit-history">Interrogatoire et symptômes</Label>
                  <Textarea id="visit-history" rows={4} value={fields.histoire || ""} onChange={(event) => setFields({ ...fields, histoire: event.target.value })} placeholder="Début, durée, intensité, évolution, symptômes associés..." disabled={isCompleted} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visit-exam">Examen clinique et résultats</Label>
                  <Textarea id="visit-exam" rows={4} value={fields.examen_clinique || ""} onChange={(event) => setFields({ ...fields, examen_clinique: event.target.value })} placeholder="Constatations et résultats observés..." disabled={isCompleted} />
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="visit-diagnosis">Diagnostic retenu</Label>
                    <Textarea id="visit-diagnosis" rows={3} value={fields.diagnostic || ""} onChange={(event) => setFields({ ...fields, diagnostic: event.target.value })} placeholder="À renseigner et valider par le médecin" disabled={isCompleted} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visit-plan">Conduite à tenir</Label>
                    <Textarea id="visit-plan" rows={3} value={fields.plan || ""} onChange={(event) => setFields({ ...fields, plan: event.target.value })} placeholder="Traitement, examens, suivi..." disabled={isCompleted} />
                  </div>
                </div>
                {isCompleted && <p className="text-sm text-muted-foreground">Cette consultation est clôturée et n'est plus modifiable.</p>}
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
