import { differenceInYears, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Activity, AlertTriangle, ClipboardList, HeartPulse, History, LoaderCircle, ShieldAlert, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QueueEntry } from "@/hooks/useQueue";
import { QueueIntake, useQueueIntakeContext } from "@/hooks/useQueueIntake";
import type { StructuredMedication } from "@/lib/structuredMedications";
import { formatPatientName } from "@/lib/utils";

type Props = {
  queueEntry: QueueEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SummaryField = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-800">
      {value?.trim() || "Non renseigné"}
    </p>
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

const getIntakeMeasures = (intake: QueueIntake | null) => {
  if (!intake) return [];
  return [
    ["TA", intake.systolic_bp !== null && intake.diastolic_bp !== null ? `${intake.systolic_bp}/${intake.diastolic_bp} mmHg` : null],
    ["Température", intake.temperature_c !== null ? `${intake.temperature_c} °C` : null],
    ["Pouls", intake.pulse_bpm !== null ? `${intake.pulse_bpm} bpm` : null],
    ["SpO₂", intake.oxygen_saturation !== null ? `${intake.oxygen_saturation} %` : null],
    ["Fréq. respiratoire", intake.respiratory_rate !== null ? `${intake.respiratory_rate}/min` : null],
    ["Douleur", intake.pain_score !== null ? `${intake.pain_score}/10` : null],
    ["Poids", intake.weight_kg !== null ? `${intake.weight_kg} kg` : null],
    ["Taille", intake.height_cm !== null ? `${intake.height_cm} cm` : null],
  ].filter((measure): measure is [string, string] => measure[1] !== null);
};

export const QueueClinicalSummaryDialog = ({ queueEntry, open, onOpenChange }: Props) => {
  const { data, isLoading, isError, error, refetch } = useQueueIntakeContext(
    open ? queueEntry?.id : undefined,
  );
  const patient = data?.patient;
  const currentIntake = data?.current_intake ?? null;
  const measures = getIntakeMeasures(currentIntake);
  const age = patient?.date_naissance
    ? differenceInYears(new Date(), new Date(`${patient.date_naissance}T12:00:00`))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto border-slate-200 p-0">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-left text-lg">Synthèse avant consultation</DialogTitle>
                <DialogDescription className="mt-1 text-left">
                  Repères patient et données recueillies à l’accueil. Lecture seule ; le dossier médical complet reste dans la consultation.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Chargement de la synthèse…
          </div>
        ) : isError ? (
          <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 sm:m-6">
            <p className="font-semibold">La synthèse n’a pas pu être chargée.</p>
            <p className="mt-1">{error.message}</p>
            <Button type="button" variant="outline" className="mt-3" onClick={() => void refetch()}>
              Réessayer
            </Button>
          </div>
        ) : patient ? (
          <div className="space-y-5 p-5 sm:p-6">
            <section className="rounded-2xl border border-teal-100 bg-[linear-gradient(115deg,#f0f8f6,#ffffff)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-teal-800 shadow-sm ring-1 ring-teal-100">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-slate-950">
                      {formatPatientName(patient.nom, patient.prenom)}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {[
                        age !== null ? `${age} ans` : null,
                        patient.sexe === "M" ? "Homme" : patient.sexe === "F" ? "Femme" : null,
                        patient.cin ? `CIN ${patient.cin}` : null,
                      ].filter(Boolean).join(" · ") || "Identité à compléter au besoin"}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-teal-800">
                      {data.previous_visit_count > 0
                        ? `Déjà suivi · ${data.previous_visit_count} passage${data.previous_visit_count > 1 ? "s" : ""}${data.last_visit_at ? ` · dernière visite ${format(new Date(data.last_visit_at), "d MMM yyyy", { locale: fr })}` : ""}`
                        : "Premier passage enregistré au cabinet"}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-teal-200 bg-white text-teal-900">
                  Passage n°{queueEntry?.numero_ordre}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>{patient.telephone || "Téléphone non renseigné"}</span>
                <span>Couverture : {patient.mutuelle || "à confirmer"}</span>
                {patient.numero_mutuelle && <span>N° adhérent : {patient.numero_mutuelle}</span>}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-rose-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pré-consultation du jour</h3>
                  <p className="text-[11px] text-slate-500">Informations déclarées ou mesures prises par l’équipe d’accueil.</p>
                </div>
                <Badge
                  variant="outline"
                  className={currentIntake
                    ? "ml-auto border-teal-200 bg-teal-50 text-teal-800"
                    : "ml-auto border-amber-200 bg-amber-50 text-amber-800"}
                >
                  {currentIntake ? "Renseignée" : "À compléter"}
                </Badge>
              </div>
              {measures.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {measures.map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900">
                  Aucune constante n’a été enregistrée pour ce passage.
                </p>
              )}
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <SummaryField label="Motif de venue" value={currentIntake?.reason_for_visit ?? queueEntry?.motif} />
                <SummaryField label="Note de l’équipe" value={currentIntake?.nursing_note} />
                <SummaryField label="Allergies déclarées aujourd’hui" value={currentIntake?.allergies_reported} />
                <SummaryField label="Antécédents rapportés aujourd’hui" value={currentIntake?.antecedents_reported} />
                <SummaryField label="Traitements rapportés aujourd’hui" value={currentIntake?.treatments_reported} />
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-700" />
                <h3 className="text-sm font-bold text-slate-900">Repères déjà au dossier</h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <SummaryField label="Antécédents consignés" value={data.medical_record?.antecedents} />
                <SummaryField label="Allergies consignées" value={data.medical_record?.allergies} />
                <SummaryField label="Traitements structurés · statut" value={formatMedicationSummary(data.medical_record?.traitements_structures)} />
                <SummaryField label="Ancien texte libre · à confirmer" value={data.medical_record?.traitements} />
              </div>
              {data.medical_record?.allergies?.trim() ? (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-950" role="alert">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-xs"><span className="font-bold">Allergie au dossier à vérifier :</span> {data.medical_record.allergies}</p>
                </div>
              ) : (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-xs"><span className="font-bold">Aucune allergie consignée.</span> Cela ne confirme pas l’absence d’allergie.</p>
                </div>
              )}
            </section>

            {data.recent_intakes.length > 0 && (
              <section className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Activity className="h-3.5 w-3.5" /> Mesures précédentes
                </div>
                <div className="space-y-2">
                  {data.recent_intakes.slice(0, 3).map((intake) => (
                    <div key={intake.id} className="flex flex-wrap items-baseline justify-between gap-1 text-xs">
                      <span className="font-medium text-slate-700">
                        {format(new Date(intake.created_at), "d MMM yyyy", { locale: fr })}
                      </span>
                      <span className="text-slate-600">
                        {[
                          intake.systolic_bp !== null && intake.diastolic_bp !== null ? `TA ${intake.systolic_bp}/${intake.diastolic_bp}` : null,
                          intake.temperature_c !== null ? `${intake.temperature_c} °C` : null,
                          intake.weight_kg !== null ? `${intake.weight_kg} kg` : null,
                          intake.oxygen_saturation !== null ? `SpO₂ ${intake.oxygen_saturation}%` : null,
                        ].filter(Boolean).join(" · ") || "Aucune constante archivée"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-8 text-sm text-slate-600">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            Aucune synthèse patient n’est disponible pour ce passage.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
