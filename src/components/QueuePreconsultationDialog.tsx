import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ClipboardCheck,
  HeartPulse,
  History,
  LoaderCircle,
  Save,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { QueueEntry } from "@/hooks/useQueue";
import { QueueIntake, QueueIntakeInput, useQueueIntakeContext, useSaveQueueIntake } from "@/hooks/useQueueIntake";
import type { StructuredMedication } from "@/lib/structuredMedications";
import { formatPatientName, formatPhoneNumber } from "@/lib/utils";
import { differenceInYears, format } from "date-fns";
import { fr } from "date-fns/locale";

type Props = {
  queueEntry: QueueEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormState = {
  weightKg: string;
  heightCm: string;
  temperatureC: string;
  systolicBp: string;
  diastolicBp: string;
  pulseBpm: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  painScore: string;
  allergiesReported: string;
  antecedentsReported: string;
  treatmentsReported: string;
  reasonForVisit: string;
  nursingNote: string;
};

const emptyForm: FormState = {
  weightKg: "",
  heightCm: "",
  temperatureC: "",
  systolicBp: "",
  diastolicBp: "",
  pulseBpm: "",
  respiratoryRate: "",
  oxygenSaturation: "",
  painScore: "",
  allergiesReported: "",
  antecedentsReported: "",
  treatmentsReported: "",
  reasonForVisit: "",
  nursingNote: "",
};

const fromIntake = (intake: QueueIntake | null): FormState => intake ? {
  weightKg: intake.weight_kg?.toString() ?? "",
  heightCm: intake.height_cm?.toString() ?? "",
  temperatureC: intake.temperature_c?.toString() ?? "",
  systolicBp: intake.systolic_bp?.toString() ?? "",
  diastolicBp: intake.diastolic_bp?.toString() ?? "",
  pulseBpm: intake.pulse_bpm?.toString() ?? "",
  respiratoryRate: intake.respiratory_rate?.toString() ?? "",
  oxygenSaturation: intake.oxygen_saturation?.toString() ?? "",
  painScore: intake.pain_score?.toString() ?? "",
  allergiesReported: intake.allergies_reported ?? "",
  antecedentsReported: intake.antecedents_reported ?? "",
  treatmentsReported: intake.treatments_reported ?? "",
  reasonForVisit: intake.reason_for_visit ?? "",
  nursingNote: intake.nursing_note ?? "",
} : emptyForm;

const parseNumber = (value: string) => value.trim() === "" ? null : Number(value);

const formatIntakeDate = (date: string) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "Date inconnue" : format(parsed, "d MMM yyyy · HH:mm", { locale: fr });
};

const ReadOnlyHistoryField = ({ title, value }: { title: string; value: string | null }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{title}</p>
    <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-700">{value?.trim() || "Non renseigné dans le dossier"}</p>
  </div>
);

const formatMedicationSummary = (medications: StructuredMedication[] | undefined) => {
  if (!medications?.length) return "Aucun traitement structuré au dossier";
  const statusLabels = {
    needs_confirmation: "À confirmer",
    active: "Confirmé actuel",
    suspended: "Suspendu",
    stopped: "Arrêté",
  } as const;
  return medications.map((medication) =>
    `${medication.name}${medication.dose ? ` · ${medication.dose}` : ""} — ${statusLabels[medication.status]}`
  ).join("\n");
};

export const QueuePreconsultationDialog = ({ queueEntry, open, onOpenChange }: Props) => {
  const queueId = queueEntry?.id;
  const { data, isLoading, isError, error, refetch } = useQueueIntakeContext(open ? queueId : undefined);
  const saveIntake = useSaveQueueIntake();
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (data) setForm(fromIntake(data.current_intake));
  }, [data]);

  const setValue = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = () => {
    if (!queueId) return;
    const input: QueueIntakeInput = {
      queueId,
      weightKg: parseNumber(form.weightKg),
      heightCm: parseNumber(form.heightCm),
      temperatureC: parseNumber(form.temperatureC),
      systolicBp: parseNumber(form.systolicBp),
      diastolicBp: parseNumber(form.diastolicBp),
      pulseBpm: parseNumber(form.pulseBpm),
      respiratoryRate: parseNumber(form.respiratoryRate),
      oxygenSaturation: parseNumber(form.oxygenSaturation),
      painScore: parseNumber(form.painScore),
      allergiesReported: form.allergiesReported,
      antecedentsReported: form.antecedentsReported,
      treatmentsReported: form.treatmentsReported,
      reasonForVisit: form.reasonForVisit,
      nursingNote: form.nursingNote,
    };
    saveIntake.mutate(input);
  };

  const patient = data?.patient;
  const medicalRecord = data?.medical_record;
  const patientAge = patient?.date_naissance
    ? differenceInYears(new Date(), new Date(`${patient.date_naissance}T12:00:00`))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] max-w-5xl overflow-y-auto border-slate-200 p-0">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-left text-lg">Pré-consultation infirmière</DialogTitle>
                <DialogDescription className="mt-1 text-left">
                  Recueillir les mesures et informations déclarées, sans modifier les notes médicales du médecin.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Chargement du dossier utile…
          </div>
        ) : isError ? (
          <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 sm:m-7">
            <p className="font-semibold">La fiche de pré-consultation n’a pas pu être chargée.</p>
            <p className="mt-1">{error.message}</p>
            <Button type="button" variant="outline" className="mt-3" onClick={() => void refetch()}>Réessayer</Button>
          </div>
        ) : patient ? (
          <div className="space-y-5 px-5 py-5 sm:px-7">
            <section className="rounded-2xl border border-teal-100 bg-[linear-gradient(115deg,#f0f8f6,#ffffff)] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-teal-800 shadow-sm ring-1 ring-teal-100">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-slate-950">{formatPatientName(patient.nom, patient.prenom)}</h3>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {[patientAge !== null ? `${patientAge} ans` : null, patient.sexe === "M" ? "Homme" : patient.sexe === "F" ? "Femme" : null, patient.cin ? `CIN ${patient.cin}` : null]
                        .filter(Boolean).join(" · ") || "Identité à compléter au besoin"}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-teal-800">
                      {data.previous_visit_count > 0
                        ? `Patient déjà suivi · ${data.previous_visit_count} passage${data.previous_visit_count > 1 ? "s" : ""}${data.last_visit_at ? ` · dernière visite ${format(new Date(data.last_visit_at), "d MMM yyyy", { locale: fr })}` : ""}`
                        : "Premier passage enregistré au cabinet"}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-teal-200 bg-white text-teal-900">
                  Passage n°{queueEntry?.numero_ordre}
                </Badge>
              </div>
              <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
                <div className="rounded-lg bg-white/80 px-3 py-2"><span className="text-slate-500">Téléphone</span><p className="mt-0.5 font-semibold text-slate-800">{patient.telephone ? formatPhoneNumber(patient.telephone) : "Non renseigné"}</p></div>
                <div className="rounded-lg bg-white/80 px-3 py-2"><span className="text-slate-500">Couverture connue</span><p className="mt-0.5 font-semibold text-slate-800">{patient.mutuelle || "À confirmer"}</p></div>
                <div className="rounded-lg bg-white/80 px-3 py-2"><span className="text-slate-500">N° adhérent</span><p className="mt-0.5 font-semibold text-slate-800">{patient.numero_mutuelle || "Non renseigné"}</p></div>
              </div>
            </section>

            <section aria-label="Informations médicales déjà au dossier">
              <div className="mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Repères déjà au dossier</h3>
                  <p className="text-[11px] text-slate-500">Lecture seule · les déclarations recueillies aujourd’hui restent séparées.</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <ReadOnlyHistoryField title="Antécédents" value={medicalRecord?.antecedents ?? null} />
                <ReadOnlyHistoryField title="Allergies consignées" value={medicalRecord?.allergies ?? null} />
                <ReadOnlyHistoryField title="Traitements structurés · statut" value={formatMedicationSummary(medicalRecord?.traitements_structures)} />
                <ReadOnlyHistoryField title="Ancien texte libre · à confirmer" value={medicalRecord?.traitements ?? null} />
                <ReadOnlyHistoryField title="Dernières constantes au dossier" value={patient.poids || patient.taille ? `${patient.poids ? `${patient.poids} kg` : "Poids non renseigné"} · ${patient.taille ? `${patient.taille} cm` : "Taille non renseignée"}` : null} />
              </div>
            </section>

            {medicalRecord?.allergies?.trim() ? (
              <div className="flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-rose-950" role="alert">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div><p className="text-xs font-bold">Allergies déjà consignées — à vérifier avec le patient</p><p className="mt-0.5 whitespace-pre-wrap text-xs">{medicalRecord.allergies}</p></div>
              </div>
            ) : (
              <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-amber-950">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-xs"><span className="font-bold">Aucune allergie consignée.</span> Questionner le patient avant de transmettre au médecin.</p>
              </div>
            )}

            {data.recent_intakes.length > 0 && (
              <section className="rounded-xl border border-slate-200 p-3.5">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700"><History className="h-3.5 w-3.5" /> Derniers repères de pré-consultation</div>
                <div className="flex flex-wrap gap-2">
                  {data.recent_intakes.slice(0, 3).map((intake) => (
                    <div key={intake.id} className="rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] text-slate-600">
                      <p className="font-semibold text-slate-700">{formatIntakeDate(intake.created_at)}</p>
                      <p className="mt-0.5">{[
                        intake.weight_kg ? `${intake.weight_kg} kg` : null,
                        intake.height_cm ? `${intake.height_cm} cm` : null,
                        intake.systolic_bp && intake.diastolic_bp ? `${intake.systolic_bp}/${intake.diastolic_bp} mmHg` : null,
                        intake.pulse_bpm ? `${intake.pulse_bpm} bpm` : null,
                      ].filter(Boolean).join(" · ") || "Aucune constante archivée"}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="mb-3 flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-rose-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Mesures du passage actuel</h3>
                  <p className="text-[11px] text-slate-500">Saisir uniquement les mesures réellement prises. Aucune valeur n’est obligatoire.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {([
                  ["weightKg", "Poids", "kg", "0.1", "500", "0.1"],
                  ["heightCm", "Taille", "cm", "20", "250", "0.1"],
                  ["temperatureC", "Température", "°C", "25", "45", "0.1"],
                  ["systolicBp", "TA systolique", "mmHg", "30", "300", "1"],
                  ["diastolicBp", "TA diastolique", "mmHg", "20", "200", "1"],
                  ["pulseBpm", "Pouls", "bpm", "10", "300", "1"],
                  ["respiratoryRate", "Fréquence respiratoire", "/min", "1", "100", "1"],
                  ["oxygenSaturation", "SpO₂", "%", "0", "100", "0.1"],
                  ["painScore", "Douleur", "/10", "0", "10", "1"],
                ] as const).map(([key, label, unit, min, max, step]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`intake-${key}`} className="text-[11px] font-semibold text-slate-600">{label} <span className="font-normal text-slate-400">({unit})</span></Label>
                    <Input id={`intake-${key}`} type="number" min={min} max={max} step={step} value={form[key]} onChange={(event) => setValue(key, event.target.value)} className="h-10 rounded-lg tabular-nums" />
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-teal-800" /><h3 className="text-sm font-bold text-slate-900">Déclarations recueillies aujourd’hui</h3></div>
                {([
                  ["allergiesReported", "Allergies déclarées / vérifiées", "Préciser substance et réaction si rapportées."],
                  ["antecedentsReported", "Antécédents rapportés", "Antécédents pertinents ou « aucun rapporté »."],
                  ["treatmentsReported", "Traitements actuels rapportés", "Nom, dose si connue ; ne pas interpréter."],
                ] as const).map(([key, label, placeholder]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`intake-${key}`} className="text-xs font-semibold text-slate-700">{label}</Label>
                    <Textarea id={`intake-${key}`} value={form[key]} onChange={(event) => setValue(key, event.target.value)} placeholder={placeholder} maxLength={2000} className="min-h-[72px] resize-y rounded-xl" />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="intake-reason" className="text-xs font-semibold text-slate-700">Motif selon le patient</Label>
                  <Textarea id="intake-reason" value={form.reasonForVisit} onChange={(event) => setValue("reasonForVisit", event.target.value)} placeholder="Symptôme principal, début, évolution, attente du patient…" maxLength={2000} className="min-h-[116px] resize-y rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="intake-note" className="text-xs font-semibold text-slate-700">Note de transmission à l’équipe médicale</Label>
                  <Textarea id="intake-note" value={form.nursingNote} onChange={(event) => setValue("nursingNote", event.target.value)} placeholder="Éléments utiles à signaler, sans diagnostic ni prescription." maxLength={2000} className="min-h-[116px] resize-y rounded-xl" />
                </div>
              </div>
            </section>

            <footer className="sticky bottom-0 -mx-5 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur sm:-mx-7 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <p className="text-[11px] leading-4 text-slate-500">Transmis au médecin comme données de pré-consultation, jamais comme diagnostic.</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
                <Button type="button" disabled={saveIntake.isPending} onClick={submit} className="bg-teal-800 text-white hover:bg-teal-900">
                  {saveIntake.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {saveIntake.isPending ? "Enregistrement…" : data?.current_intake ? "Mettre à jour la transmission" : "Enregistrer la pré-consultation"}
                </Button>
              </div>
            </footer>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
