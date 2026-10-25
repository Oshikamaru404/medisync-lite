import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileText,
  ReceiptText,
  Plus,
  UsersRound,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments, type Appointment } from "@/hooks/useAppointments";
import { compareQueueOrder, getQueueDateKey, getQueueDisplayStatus, getQueuePriorityRank, useQueue } from "@/hooks/useQueue";
import { useSettings } from "@/hooks/useSettings";
import { formatPatientName } from "@/lib/utils";
import logo from "@/assets/shifalyx-wordmark.png";

const getAppointmentDateTime = (appointment: Appointment) =>
  new Date(`${appointment.date}T${appointment.heure_debut}`);

const getGreeting = (hour: number) => {
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
};

const appointmentStatus: Record<Appointment["statut"], string> = {
  confirmed: "Confirmé",
  pending: "À confirmer",
  cancelled: "Annulé",
  completed: "Terminé",
};

const Index = () => {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const { getSettingValue, isLoading: settingsLoading } = useSettings();
  const { currentUser } = useAuth();
  const configuredDoctorName = getSettingValue("doctor_name");
  const doctorName = configuredDoctorName || [currentUser?.prenom, currentUser?.nom].filter(Boolean).join(" ");
  const doctorTitle = doctorName && /^dr\.?\s/i.test(doctorName) ? doctorName : `Dr ${doctorName}`;
  const specialty = getSettingValue("cabinet_specialty");
  const navigate = useNavigate();
  const todayKey = getQueueDateKey(currentTime);
  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    isError: appointmentsError,
    refetch: refetchAppointments,
  } = useAppointments(todayKey);
  const {
    data: queue = [],
    isLoading: queueLoading,
    isError: queueError,
    refetch: refetchQueue,
  } = useQueue(todayKey);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role !== "medecin") {
      navigate("/file-attente", { replace: true });
    }
  }, [currentUser, navigate]);

  const activeAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.statut !== "cancelled"),
    [appointments],
  );
  const activeQueue = useMemo(
    () => queue.filter((entry) => entry.status === "waiting" || entry.status === "in_consultation"),
    [queue],
  );
  const waitingQueue = activeQueue
    .filter((entry) => entry.status === "waiting")
    .sort((first, second) =>
      getQueuePriorityRank(first, todayKey) - getQueuePriorityRank(second, todayKey)
      || compareQueueOrder(first, second)
    );
  const inConsultationCount = activeQueue.filter((entry) => entry.status === "in_consultation").length;
  const inConsultationEntry = activeQueue.find((entry) => entry.status === "in_consultation");
  const nextQueueEntry =
    activeQueue.find((entry) => entry.status === "waiting" && entry.called_at) ||
    waitingQueue[0] ||
    activeQueue.find((entry) => entry.status === "in_consultation");

  const nextAppointment = activeAppointments.find(
    (appointment) => getAppointmentDateTime(appointment) >= currentTime,
  );
  if (currentUser && currentUser.role !== "medecin") return null;

  const isLoading = appointmentsLoading || queueLoading;
  const hasError = appointmentsError || queueError;

  return (
    <div className="min-h-screen bg-[#f7f9fa] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <img src={logo} alt="Shifalyx — ERP médical intelligent" className="block h-9 w-[150px] shrink-0 object-contain sm:h-10 sm:w-[168px] lg:group-data-[nav-collapsed=false]/app-shell:hidden" />
            <div className="hidden h-9 w-px bg-slate-200 sm:block lg:group-data-[nav-collapsed=false]/app-shell:hidden" />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-base font-bold leading-tight text-slate-900 sm:text-lg">
                {settingsLoading ? "Chargement…" : doctorTitle || "Cabinet médical"}
              </p>
              <p className="mt-1 truncate text-xs font-medium text-teal-700">
                {specialty || "Cabinet médical"}
              </p>
            </div>
          </div>
          <div className="mr-3 flex shrink-0 items-center gap-2 sm:mr-5 sm:gap-4">
            <div className="text-right">
              <p className="font-mono text-lg font-semibold tabular-nums tracking-tight text-slate-800 sm:text-xl">
                {format(currentTime, "HH:mm")}
              </p>
              <p className="hidden text-xs font-medium capitalize text-slate-500 sm:block">
                {format(currentTime, "EEEE d MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-7 px-5 py-7 sm:px-8 sm:py-9">
        <section className="relative isolate overflow-hidden rounded-[28px] border border-[#173b49] bg-[#102c3a] px-6 py-7 text-white shadow-[0_22px_60px_-28px_rgba(16,44,58,0.6)] sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute -right-16 -top-36 -z-10 h-96 w-96 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-2 -top-24 -z-10 h-72 w-72 rounded-full bg-teal-300/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-120px] right-[26%] -z-10 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-teal-100">
                <span className="h-2 w-2 rounded-full bg-teal-300 shadow-[0_0_12px_rgba(94,234,212,0.8)]" />
                VOTRE JOURNÉE · {format(currentTime, "EEEE d MMMM", { locale: fr })}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {getGreeting(currentTime.getHours())}
                {currentUser?.prenom ? `, Dr ${currentUser.prenom}` : ""}
                <span className="text-teal-300">.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                Retrouvez vos priorités, vos patients et les prochaines étapes du cabinet en un regard.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate("/agenda?new=1")}
                className="h-11 rounded-xl bg-teal-300 px-5 font-semibold text-[#102c3a] shadow-lg shadow-teal-950/20 hover:bg-teal-200"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouveau rendez-vous
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/file-attente")}
                className="h-11 rounded-xl border-white/20 bg-white/[0.06] px-5 text-white hover:bg-white/10 hover:text-white"
              >
                Ouvrir la file
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {hasError && (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
              <p className="text-sm font-medium text-rose-800">
                Certaines données du jour n’ont pas pu être chargées. Vérifiez la connexion puis réessayez.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-rose-300 bg-white text-rose-800 hover:bg-rose-100"
                onClick={() => {
                  if (appointmentsError) void refetchAppointments();
                  if (queueError) void refetchQueue();
                }}
              >
                Réessayer
              </Button>
            </CardContent>
          </Card>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Résumé de la journée">
          <MetricCard
            icon={CalendarDays}
            label="Rendez-vous aujourd’hui"
            value={isLoading ? "—" : activeAppointments.length}
            caption="hors rendez-vous annulés"
            accent="blue"
          />
          <MetricCard
            icon={Clock3}
            label="En salle d’attente"
            value={isLoading ? "—" : waitingQueue.length}
            caption="patients à prendre en charge"
            accent="amber"
          />
          <MetricCard
            icon={Activity}
            label="Consultations en cours"
            value={isLoading ? "—" : inConsultationCount}
            caption="dossiers ouverts aujourd’hui"
            accent="teal"
          />
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.85fr)]">
          <section className="space-y-6">
            <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-[0_8px_26px_-22px_rgba(15,23,42,0.35)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Priorité immédiate</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">Prochain patient</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/agenda")} className="text-slate-600">
                  Voir l’agenda <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
              <CardContent className="p-5 sm:p-6">
                {appointmentsLoading || queueLoading ? (
                  <LoadingMessage label="Chargement des prochaines prises en charge…" />
                ) : nextQueueEntry ? (
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex min-w-[112px] items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50/80 px-4 py-3 text-teal-900">
                      <UsersRound className="h-5 w-5 text-teal-700" />
                      <span className="text-2xl font-semibold tabular-nums">#{nextQueueEntry.numero_ordre}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-xl font-semibold text-slate-900">
                          {formatPatientName(nextQueueEntry.patients?.nom, nextQueueEntry.patients?.prenom)}
                        </h3>
                        <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-800">
                          {nextQueueEntry.status === "in_consultation"
                            ? "En consultation"
                            : getQueueDisplayStatus(nextQueueEntry) === "called"
                              ? "Appelé"
                              : "En attente"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{nextQueueEntry.motif || "Consultation"}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(
                          nextQueueEntry.status === "in_consultation"
                            ? `/consultations/${nextQueueEntry.id}`
                            : "/file-attente",
                        )
                      }
                      className="shrink-0 rounded-xl"
                    >
                      {nextQueueEntry.status === "in_consultation" ? "Reprendre" : "Ouvrir la file"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : nextAppointment ? (
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex min-w-[112px] items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-blue-900">
                      <Clock3 className="h-5 w-5 text-blue-700" />
                      <span className="text-2xl font-semibold tabular-nums">
                        {nextAppointment.heure_debut.slice(0, 5)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-xl font-semibold text-slate-900">
                          {formatPatientName(nextAppointment.patient?.nom, nextAppointment.patient?.prenom)}
                        </h3>
                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                          {appointmentStatus[nextAppointment.statut]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {nextAppointment.type}
                        {nextAppointment.heure_fin && ` · jusqu’à ${nextAppointment.heure_fin.slice(0, 5)}`}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => navigate("/agenda")} className="shrink-0 rounded-xl">
                      Ouvrir l’agenda <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <EmptyMessage
                    icon={CalendarDays}
                    title="Aucun patient à recevoir ensuite"
                    description={
                      activeAppointments.length > 0
                        ? "Les rendez-vous et prises en charge du jour sont terminés."
                        : "Aucun rendez-vous ni patient en file pour le moment."
                    }
                    action="Consulter l’agenda"
                    onClick={() => navigate("/agenda")}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-[0_8px_26px_-22px_rgba(15,23,42,0.35)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Flux du cabinet</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">À prendre en charge</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/file-attente")} className="text-slate-600">
                  Toute la file <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
              <CardContent className="p-5 sm:p-6">
                {queueLoading ? (
                  <LoadingMessage label="Chargement de la file…" />
                ) : activeQueue.length === 0 ? (
                  <EmptyMessage
                    icon={UsersRound}
                    title="Aucun patient en attente"
                    description="Les patients ajoutés à la file apparaîtront ici."
                    action="Ouvrir la file d’attente"
                    onClick={() => navigate("/file-attente")}
                  />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {activeQueue.slice(0, 5).map((entry) => {
                      const status = getQueueDisplayStatus(entry);
                      const isInConsultation = entry.status === "in_consultation";
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => navigate(isInConsultation ? `/consultations/${entry.id}` : "/file-attente")}
                          className="group flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0"
                        >
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
                              isInConsultation
                                ? "bg-blue-50 text-blue-700"
                                : status === "called"
                                  ? "bg-violet-50 text-violet-700"
                                  : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            #{entry.numero_ordre}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-slate-800 group-hover:text-teal-800">
                              {formatPatientName(entry.patients?.nom, entry.patients?.prenom)}
                            </span>
                            <span className="mt-0.5 block truncate text-sm text-slate-500">
                              {entry.motif || "Consultation"}
                            </span>
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              isInConsultation
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : status === "called"
                                  ? "border-violet-200 bg-violet-50 text-violet-700"
                                  : "border-amber-200 bg-amber-50 text-amber-800"
                            }
                          >
                            {isInConsultation ? "En consultation" : status === "called" ? "Appelé" : "En attente"}
                          </Badge>
                          <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-700" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-6">
            <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-[0_8px_26px_-22px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Aujourd’hui</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">Programme</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {isLoading ? "—" : activeAppointments.length} RDV
                </span>
              </div>
              <CardContent className="p-5">
                {appointmentsLoading ? (
                  <LoadingMessage label="Chargement du programme…" />
                ) : activeAppointments.length === 0 ? (
                  <p className="py-5 text-center text-sm text-slate-500">Aucun rendez-vous programmé aujourd’hui.</p>
                ) : (
                  <div className="relative space-y-0 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-slate-200">
                    {activeAppointments.slice(0, 6).map((appointment, index) => {
                      const isNext = appointment.id === nextAppointment?.id;
                      return (
                        <div key={appointment.id} className="relative flex gap-3 py-3 first:pt-0 last:pb-0">
                          <span
                            className={`relative z-10 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white ${
                              isNext ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {isNext ? <Clock3 className="h-4 w-4" /> : <span className="text-[10px] font-bold">{index + 1}</span>}
                          </span>
                          <div className="min-w-0 flex-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-mono text-sm font-semibold text-slate-800">
                                {appointment.heure_debut.slice(0, 5)}
                              </p>
                              <span className={`text-[11px] font-medium ${isNext ? "text-teal-700" : "text-slate-500"}`}>
                                {appointmentStatus[appointment.statut]}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-sm font-medium text-slate-800">
                              {formatPatientName(appointment.patient?.nom, appointment.patient?.prenom)}
                            </p>
                            <p className="truncate text-xs capitalize text-slate-500">{appointment.type}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Button
                  variant="outline"
                  className="mt-5 w-full rounded-xl border-slate-200"
                  onClick={() => navigate("/agenda")}
                >
                  Voir tous les rendez-vous
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-[0_8px_26px_-22px_rgba(15,23,42,0.35)]">
              <CardContent className="p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Accès rapide</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">Vos outils</h2>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <QuickLink icon={UsersRound} label="Patients" onClick={() => navigate("/patients")} accent="teal" />
                  <QuickLink icon={CalendarClock} label="Suivis à organiser" onClick={() => navigate("/suivis")} accent="amber" />
                  <QuickLink
                    icon={ClipboardList}
                    label="Modèles de prescription"
                    onClick={() => navigate("/modeles-prescription")}
                    accent="violet"
                  />
                  <QuickLink
                    icon={ReceiptText}
                    label="Actes & tarifs"
                    onClick={() => navigate("/actes-medicaux")}
                    accent="teal"
                  />
                  <QuickLink
                    icon={Activity}
                    label={inConsultationEntry ? "Reprendre la consultation" : "Ouvrir la file d’attente"}
                    onClick={() => navigate(inConsultationEntry ? `/consultations/${inConsultationEntry.id}` : "/file-attente")}
                    accent="blue"
                  />
                </div>
                <details className="group mt-3 border-t border-slate-100 pt-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 [&::-webkit-details-marker]:hidden">
                    Gestion et suivi
                    <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <QuickLink icon={CalendarDays} label="Agenda" onClick={() => navigate("/agenda")} accent="blue" />
                    <QuickLink icon={FileText} label="Comptabilité" onClick={() => navigate("/comptabilite")} accent="amber" />
                    <QuickLink icon={BarChart3} label="Statistiques" onClick={() => navigate("/statistiques")} accent="slate" />
                  </div>
                </details>
              </CardContent>
            </Card>

            <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Check className="h-4 w-4" />
              </span>
              <p className="text-sm leading-5 text-slate-600">
                Les compteurs et listes se mettent à jour à partir des données du cabinet. Les arrivées à confirmer sont des repères opérationnels, pas des absences confirmées.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

function MetricCard({
  icon: Icon,
  label,
  value,
  caption,
  accent,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string | number;
  caption: string;
  accent: "blue" | "amber" | "teal" | "rose" | "slate";
}) {
  const accents = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    teal: "bg-teal-50 text-teal-700 ring-teal-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-4 p-5">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${accents[accent]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{caption}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingMessage({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-6 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
      {label}
    </div>
  );
}

function EmptyMessage({
  icon: Icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: typeof CalendarDays;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-4 py-2 sm:flex-row sm:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="font-medium text-slate-800">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onClick} className="rounded-xl">
        {action} <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function QuickLink({
  icon: Icon,
  label,
  onClick,
  accent,
}: {
  icon: typeof CalendarDays;
  label: string;
  onClick: () => void;
  accent: "teal" | "blue" | "violet" | "amber" | "slate";
}) {
  const accents = {
    teal: "bg-teal-50 text-teal-700 group-hover:bg-white group-hover:text-teal-800",
    blue: "bg-blue-50 text-blue-700 group-hover:bg-white group-hover:text-blue-800",
    violet: "bg-violet-50 text-violet-700 group-hover:bg-white group-hover:text-violet-800",
    amber: "bg-amber-50 text-amber-700 group-hover:bg-white group-hover:text-amber-800",
    slate: "bg-slate-100 text-slate-600 group-hover:bg-white group-hover:text-slate-800",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-12 items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-2.5 text-left transition hover:border-teal-200 hover:bg-teal-50/40"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${accents[accent]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sm font-medium leading-5 text-slate-700 group-hover:text-slate-900">{label}</span>
    </button>
  );
}

export default Index;
