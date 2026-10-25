import { useEffect, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit,
  ListFilter,
  Phone,
  Plus,
  Search,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAppointments,
  Appointment,
  useAppointmentAttendanceEvents,
  useRecordAppointmentAttendance,
} from "@/hooks/useAppointments";
import { getQueueDateKey, getQueueDisplayStatus, QueueEntry, useCheckInAppointment, useQueue } from "@/hooks/useQueue";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { cn, formatPatientName, formatPhoneNumber } from "@/lib/utils";
import { addDays, addWeeks, format, isSameDay, startOfWeek, subDays, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigationViewState } from "@/hooks/useNavigationViewState";

type AgendaView = "day" | "week";
type AgendaFilter = "all" | "pending" | "confirmed" | "arrived";

const parseLocalDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getCasablancaMinutes = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Casablanca",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return Number(values.hour) * 60 + Number(values.minute);
};

const ATTENDANCE_EVENT_LABEL: Record<string, string> = {
  expected: "En attente",
  late_contacted: "Tentative d’appel",
  late_expected: "Retard annoncé",
  no_show: "Absence confirmée",
  arrived: "Arrivée enregistrée",
  cancelled: "Rendez-vous annulé",
  reset_after_reschedule: "Présence réinitialisée après reprogrammation",
};

const APPOINTMENT_STATUS: Record<Appointment["statut"], { label: string; className: string }> = {
  pending: { label: "À confirmer", className: "border-amber-200 bg-amber-50 text-amber-800" },
  confirmed: { label: "Confirmé", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  cancelled: { label: "Annulé", className: "border-rose-200 bg-rose-50 text-rose-800" },
  completed: { label: "Terminé", className: "border-slate-200 bg-slate-100 text-slate-600" },
};

const TYPE_TONE: Record<string, string> = {
  urgence: "border-rose-200 bg-rose-50 text-rose-800",
  controle: "border-sky-200 bg-sky-50 text-sky-800",
  suivi: "border-violet-200 bg-violet-50 text-violet-800",
};

const getTypeTone = (type: string) => {
  const normalized = type.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  return Object.entries(TYPE_TONE).find(([key]) => normalized.includes(key))?.[1]
    ?? "border-slate-200 bg-slate-50 text-slate-700";
};

const findScheduleConflicts = (dayAppointments: Appointment[]) => {
  const planned = dayAppointments.filter((appointment) =>
    appointment.statut === "pending" || appointment.statut === "confirmed"
  );
  const conflicts = new Set<string>();
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  for (let first = 0; first < planned.length; first += 1) {
    const firstStart = toMinutes(planned[first].heure_debut);
    const firstEnd = toMinutes(planned[first].heure_fin);
    if (firstEnd <= firstStart) continue;

    for (let second = first + 1; second < planned.length; second += 1) {
      const secondStart = toMinutes(planned[second].heure_debut);
      const secondEnd = toMinutes(planned[second].heure_fin);
      if (secondEnd <= secondStart) continue;
      if (firstStart < secondEnd && secondStart < firstEnd) {
        conflicts.add(planned[first].id);
        conflicts.add(planned[second].id);
      }
    }
  }

  return conflicts;
};

const Agenda = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const stateScope = currentUser?.id ?? "anonymous";
  const [currentDate, setCurrentDate] = useNavigationViewState(`${stateScope}.agenda.date`, () => new Date());
  const [view, setView] = useNavigationViewState<AgendaView>(`${stateScope}.agenda.view`, "day");
  const [filter, setFilter] = useNavigationViewState<AgendaFilter>(`${stateScope}.agenda.filter`, "all");
  const [search, setSearch] = useNavigationViewState(`${stateScope}.agenda.search`, "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [defaultDialogDate, setDefaultDialogDate] = useState<Date | undefined>();
  const [defaultDialogTime, setDefaultDialogTime] = useState<string | undefined>();
  const [attendanceDecision, setAttendanceDecision] = useState<{
    appointment: Appointment;
    status: "late_expected" | "no_show" | "cancelled";
  } | null>(null);
  const [attendanceNote, setAttendanceNote] = useState("");
  const [clockNow, setClockNow] = useState(() => new Date());

  const todayKey = getQueueDateKey(new Date());
  const { data: appointments = [], isLoading, isError, refetch } = useAppointments();
  const { data: queue = [] } = useQueue(todayKey);
  const checkInAppointment = useCheckInAppointment();
  const recordAttendance = useRecordAppointmentAttendance();
  const activeQueue = queue.filter((entry) =>
    ["waiting", "called", "in_consultation"].includes(getQueueDisplayStatus(entry))
  );

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setSelectedAppointment(null);
    setDefaultDialogDate(undefined);
    setDefaultDialogTime(undefined);
    setDialogOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const currentDayKey = format(currentDate, "yyyy-MM-dd");
  const isToday = currentDayKey === todayKey;
  const getQueueEntry = (appointment: Appointment): QueueEntry | undefined => {
    if (appointment.date !== todayKey) return undefined;
    return queue.find((entry) => entry.appointment_id === appointment.id)
      ?? activeQueue.find((entry) => entry.patient_id === appointment.patient_id);
  };

  const dayAppointments = appointments
    .filter((appointment) => appointment.date === currentDayKey)
    .sort((first, second) => first.heure_debut.localeCompare(second.heure_debut));
  const { data: attendanceEvents = [] } = useAppointmentAttendanceEvents(
    dayAppointments.map((appointment) => appointment.id),
  );
  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  const lateAppointmentsCount = dayAppointments.filter((appointment) => {
    const startMinutes = appointment.heure_debut.split(":").slice(0, 2).map(Number);
    const scheduledMinutes = startMinutes[0] * 60 + startMinutes[1];
    return currentDayKey === todayKey
      && appointment.statut === "confirmed"
      && !getQueueEntry(appointment)
      && !["no_show", "arrived", "cancelled"].includes(appointment.attendance_status ?? "expected")
      && getCasablancaMinutes(clockNow) >= scheduledMinutes + 15;
  }).length;
  const dayConflicts = findScheduleConflicts(dayAppointments);
  const visibleDayAppointments = dayAppointments.filter((appointment) => {
    const query = search.trim().toLocaleLowerCase();
    const patientQueueEntry = getQueueEntry(appointment);
    const patientIsInActiveQueue = patientQueueEntry
      && ["waiting", "called", "in_consultation"].includes(getQueueDisplayStatus(patientQueueEntry));
    const matchesSearch = !query || [
      appointment.patient?.nom,
      appointment.patient?.prenom,
      appointment.patient?.telephone,
      appointment.type,
      appointment.notes,
    ].some((value) => value?.toLocaleLowerCase().includes(query));
    const matchesFilter = filter === "all"
      || (filter === "pending" && appointment.statut === "pending" && !patientQueueEntry)
      || (filter === "confirmed" && appointment.statut === "confirmed" && !patientQueueEntry)
      || (filter === "arrived" && !!patientIsInActiveQueue);
    return matchesSearch && matchesFilter;
  });

  const weekAppointments = appointments.filter((appointment) => {
    const day = parseLocalDate(appointment.date);
    return day >= weekStart && day <= addDays(weekStart, 6);
  });
  const selectedPeriodAppointments = view === "day" ? dayAppointments : weekAppointments;
  const pendingCount = selectedPeriodAppointments.filter((appointment) =>
    appointment.statut === "pending"
    && !getQueueEntry(appointment)
  ).length;
  const arrivedCount = selectedPeriodAppointments.filter((appointment) =>
    activeQueue.some((entry) =>
      appointment.date === todayKey
      && (entry.appointment_id === appointment.id || entry.patient_id === appointment.patient_id)
    )
  ).length;

  const openNewAppointment = (date?: Date, time?: string) => {
    setSelectedAppointment(null);
    setDefaultDialogDate(date);
    setDefaultDialogTime(time);
    setDialogOpen(true);
  };

  const openEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDefaultDialogDate(undefined);
    setDefaultDialogTime(undefined);
    setDialogOpen(true);
  };

  const movePeriod = (direction: -1 | 1) => {
    setCurrentDate((date) =>
      view === "week"
        ? direction < 0 ? subWeeks(date, 1) : addWeeks(date, 1)
        : direction < 0 ? subDays(date, 1) : addDays(date, 1)
    );
  };

  const appointmentStatus = (appointment: Appointment) => {
    const queueEntry = getQueueEntry(appointment);
    if (queueEntry) {
      const queueStatus = getQueueDisplayStatus(queueEntry);
      if (queueStatus === "completed") {
        return { label: "Visite terminée", className: "border-slate-200 bg-slate-100 text-slate-600" };
      }
      if (queueStatus === "cancelled") {
        return { label: "Passage annulé", className: "border-rose-200 bg-rose-50 text-rose-800" };
      }
      return {
        label: queueStatus === "in_consultation"
          ? "En consultation"
          : queueStatus === "called"
            ? `Appelé · n°${queueEntry.numero_ordre}`
            : `Arrivé · n°${queueEntry.numero_ordre}`,
        className: "border-teal-200 bg-teal-50 text-teal-800",
      };
    }
    if (appointment.attendance_status === "no_show") {
      return { label: "Absent confirmé", className: "border-rose-200 bg-rose-50 text-rose-800" };
    }
    if (appointment.attendance_status === "late_expected") {
      return { label: "Retard annoncé", className: "border-sky-200 bg-sky-50 text-sky-800" };
    }
    return APPOINTMENT_STATUS[appointment.statut];
  };

  const renderAppointmentCard = (appointment: Appointment, compact = false, hasConflict = false) => {
    const queueEntry = getQueueEntry(appointment);
    const status = appointmentStatus(appointment);
    const name = formatPatientName(appointment.patient?.nom, appointment.patient?.prenom);
    const startMinutesParts = appointment.heure_debut.split(":").slice(0, 2).map(Number);
    const isLate = currentDayKey === todayKey
      && appointment.statut === "confirmed"
      && !queueEntry
      && !["no_show", "arrived", "cancelled"].includes(appointment.attendance_status ?? "expected")
      && getCasablancaMinutes(clockNow) >= startMinutesParts[0] * 60 + startMinutesParts[1] + 15;
    const appointmentAttendanceEvents = attendanceEvents
      .filter((event) => event.appointment_id === appointment.id)
      .slice(0, 3);
    const canCheckIn = isToday && !queueEntry
      && appointment.statut !== "cancelled"
      && appointment.statut !== "completed";

    return (
      <article
        key={appointment.id}
        className={cn(
          "group min-w-0 rounded-xl border border-slate-200 bg-white transition-all hover:border-teal-200 hover:shadow-sm",
          compact ? "p-2.5" : "p-3 sm:p-4",
        )}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="w-[58px] shrink-0 rounded-lg bg-slate-50 px-1.5 py-2 text-center">
            <p className="text-sm font-bold tabular-nums text-slate-900">{appointment.heure_debut.slice(0, 5)}</p>
            {!compact && <p className="mt-0.5 text-[10px] tabular-nums text-slate-500">{appointment.heure_fin.slice(0, 5)}</p>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => openEditAppointment(appointment)}
                className="min-w-0 truncate text-left text-sm font-semibold text-slate-900 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                {name}
              </button>
              <Badge variant="outline" className={cn("h-5 shrink-0 px-1.5 text-[10px] font-medium", status.className)}>
                {status.label}
              </Badge>
              <Badge variant="outline" className={cn("h-5 shrink-0 px-1.5 text-[10px] font-medium", getTypeTone(appointment.type))}>
                {appointment.type}
              </Badge>
              {hasConflict && (
                <Badge variant="outline" className="h-5 shrink-0 gap-1 border-rose-200 bg-rose-50 px-1.5 text-[10px] font-medium text-rose-800">
                  <TriangleAlert className="h-3 w-3" /> Chevauchement
                </Badge>
              )}
              {isLate && (
                <Badge variant="outline" className="h-5 shrink-0 gap-1 border-orange-200 bg-orange-50 px-1.5 text-[10px] font-semibold text-orange-800">
                  <Clock3 className="h-3 w-3" />
                  {appointment.attendance_status === "late_expected" ? "Retard annoncé · suivi" : "Retard · décision requise"}
                </Badge>
              )}
            </div>
            {!compact && appointment.notes && (
              <p className="mt-1 line-clamp-1 text-xs text-slate-500">{appointment.notes}</p>
            )}
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              {appointment.patient?.telephone ? (
                <a
                  href={`tel:${appointment.patient.telephone.replace(/[^\d+]/g, "")}`}
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-emerald-800 px-2.5 text-[11px] font-semibold tabular-nums text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-1"
                  aria-label={`Appeler ${name} au ${formatPhoneNumber(appointment.patient.telephone)}`}
                >
                  <Phone className="h-3.5 w-3.5" />
                  {formatPhoneNumber(appointment.patient.telephone)}
                </a>
              ) : (
                <span className="text-[11px] text-slate-400">Téléphone absent</span>
              )}
              {queueEntry && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800">
                  <Users className="h-3.5 w-3.5" /> Passage n°{queueEntry.numero_ordre}
                </span>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => openEditAppointment(appointment)}
            className="h-8 w-8 shrink-0 text-slate-400 opacity-100 hover:text-teal-800 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={`Modifier le rendez-vous de ${name}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
        {appointmentAttendanceEvents.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
            {appointmentAttendanceEvents.map((event) => (
              <p key={event.id} className="text-[10px] text-slate-500">
                <span className="font-semibold text-slate-700">
                  {ATTENDANCE_EVENT_LABEL[event.event_type] ?? event.event_type}
                </span>
                {event.actor_name && <> · {event.actor_name}</>}
                {" · "}{format(new Date(event.created_at), "d MMM, HH:mm", { locale: fr })}
                {event.note && <> · {event.note}</>}
              </p>
            ))}
          </div>
        )}
        {isLate && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-orange-100 pt-2">
            <span className="mr-auto text-[10px] font-medium text-orange-800">
              Aucune absence automatique : l’équipe décide.
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={recordAttendance.isPending}
              onClick={() => currentUser && recordAttendance.mutate({
                appointmentId: appointment.id,
                status: "late_contacted",
              })}
              className="h-7 rounded-lg border-slate-200 px-2 text-[10px]"
            >
              Appel tenté
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setAttendanceNote("");
                setAttendanceDecision({ appointment, status: "late_expected" });
              }}
              className="h-7 rounded-lg border-sky-200 px-2 text-[10px] text-sky-800 hover:bg-sky-50"
            >
              Retard annoncé
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setAttendanceNote("");
                setAttendanceDecision({ appointment, status: "no_show" });
              }}
              className="h-7 rounded-lg border-rose-200 px-2 text-[10px] text-rose-800 hover:bg-rose-50"
            >
              Confirmer absent
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setAttendanceNote("");
                setAttendanceDecision({ appointment, status: "cancelled" });
              }}
              className="h-7 rounded-lg px-2 text-[10px] text-slate-600"
            >
              Annuler le RDV
            </Button>
          </div>
        )}
        {canCheckIn && (
          <div className="mt-2 flex justify-end border-t border-slate-100 pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={checkInAppointment.isPending}
              onClick={() => checkInAppointment.mutate(appointment.id)}
              className="h-8 rounded-lg border-teal-200 px-2.5 text-[11px] font-semibold text-teal-800 hover:bg-teal-50"
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              {checkInAppointment.isPending ? "Ajout…" : "Confirmer l’arrivée · ajouter à la file"}
            </Button>
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-[#f6f8f8]">
      <header className="sticky top-11 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-3 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700">Organisation du cabinet</p>
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-950 sm:text-xl">Agenda</h1>
          </div>
          <Button
            onClick={() => openNewAppointment(currentDate)}
            className="h-9 shrink-0 rounded-xl bg-teal-800 px-3 text-xs font-semibold text-white hover:bg-teal-900 sm:h-10 sm:px-4 sm:text-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Nouveau rendez-vous</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-5 px-3 py-4 sm:px-6 sm:py-6">
        <section className="rounded-2xl bg-[linear-gradient(115deg,#123f3b,#1c6259_58%,#31776d)] p-4 text-white shadow-[0_18px_45px_-32px_rgba(15,62,57,0.75)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium capitalize text-white/65">
                {view === "day"
                  ? format(currentDate, "EEEE d MMMM yyyy", { locale: fr })
                  : `Semaine du ${format(weekStart, "d MMMM", { locale: fr })} au ${format(addDays(weekStart, 6), "d MMMM yyyy", { locale: fr })}`}
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                {view === "day" ? (isToday ? "La journée au cabinet" : "Planning de la journée") : "La semaine en un coup d’œil"}
              </h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/70 sm:text-sm">
                {view === "day"
                  ? "Suivez les rendez-vous, les arrivées et les prochains patients depuis une seule vue."
                  : "Repérez les journées chargées et ouvrez un jour pour gérer les rendez-vous."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-[440px] sm:grid-cols-4">
              {[
                { label: view === "day" ? "Rendez-vous" : "Rendez-vous semaine", value: selectedPeriodAppointments.length, icon: CalendarDays },
                { label: view === "day" ? "À confirmer" : "À confirmer semaine", value: pendingCount, icon: Clock3 },
                { label: view === "day" ? "Dans la file" : "En file aujourd’hui", value: arrivedCount, icon: Users },
                { label: view === "day" ? "Retards à traiter" : "Retards aujourd’hui", value: lateAppointmentsCount, icon: Clock3 },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.08] px-2.5 py-2 sm:px-3 sm:py-2.5">
                  <Icon className="h-3.5 w-3.5 text-white/70" />
                  <p className="mt-1 text-lg font-bold tabular-nums sm:text-xl">{value}</p>
                  <p className="text-[10px] text-white/65 sm:text-[11px]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-3">
              <Tabs value={view} onValueChange={(value) => setView(value as AgendaView)}>
                <TabsList className="h-10 rounded-xl border border-slate-200 bg-slate-100 p-1">
                  <TabsTrigger
                    value="day"
                    className="h-8 rounded-lg px-3 text-xs font-semibold text-slate-600 transition-colors data-[state=active]:bg-teal-800 data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    Jour
                  </TabsTrigger>
                  <TabsTrigger
                    value="week"
                    className="h-8 rounded-lg px-3 text-xs font-semibold text-slate-600 transition-colors data-[state=active]:bg-teal-800 data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    Semaine
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={() => movePeriod(-1)} aria-label="Période précédente">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={() => movePeriod(1)} aria-label="Période suivante">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-9 rounded-lg px-3 text-xs font-semibold"
                  onClick={() => setCurrentDate(new Date())}
                  disabled={view === "day" ? isToday : weekDays.some((day) => isSameDay(day, new Date()))}
                >
                  Aujourd’hui
                </Button>
              </div>
            </div>
            {view === "day" && <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Patient, téléphone, motif…"
                  aria-label="Rechercher un rendez-vous"
                  className="h-9 rounded-lg border-slate-200 pl-9 text-xs"
                />
              </div>
              <div className="flex items-center gap-1 overflow-x-auto">
                <ListFilter className="mr-1 h-4 w-4 shrink-0 text-slate-400" />
                {([
                  ["all", "Tous"],
                  ["pending", "À confirmer"],
                  ["confirmed", "Confirmés"],
                  ["arrived", "Arrivés"],
                ] as const).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={filter === value ? "secondary" : "ghost"}
                    onClick={() => setFilter(value)}
                    className={cn(
                      "h-8 shrink-0 rounded-lg px-2.5 text-[11px]",
                      filter === value && "bg-teal-50 font-semibold text-teal-900 hover:bg-teal-100",
                    )}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>}
          </div>
        </section>

        {isError ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
            <p className="text-sm font-semibold text-rose-900">L’agenda n’a pas pu être chargé.</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()} className="mt-3 border-rose-200 bg-white text-rose-900">
              Réessayer
            </Button>
          </section>
        ) : isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Chargement de l’agenda">
            {Array.from({ length: view === "week" ? 7 : 3 }, (_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-2xl bg-slate-200/70" />
            ))}
          </div>
        ) : view === "day" ? (
          <section className="space-y-3" aria-label="Rendez-vous de la journée">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div>
                <h3 className="text-base font-bold text-slate-950">Rendez-vous du jour</h3>
                <p className="text-xs text-slate-500">
                  {visibleDayAppointments.length} affiché{visibleDayAppointments.length === 1 ? "" : "s"}
                  {dayAppointments.length !== visibleDayAppointments.length ? ` sur ${dayAppointments.length}` : ""}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/file-attente")}
                className="h-8 rounded-lg border-teal-200 text-xs font-semibold text-teal-800 hover:bg-teal-50"
              >
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Ouvrir la file
              </Button>
            </div>
            {visibleDayAppointments.length ? (
              <div className="space-y-2">
                {visibleDayAppointments.map((appointment) =>
                  renderAppointmentCard(appointment, false, dayConflicts.has(appointment.id))
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
                <CalendarDays className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-800">
                  {dayAppointments.length ? "Aucun rendez-vous ne correspond à ces filtres" : "Cette journée est libre"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {dayAppointments.length ? "Essayez une autre recherche ou réinitialisez le filtre." : "Ajoutez un rendez-vous pour organiser le planning."}
                </p>
                {!dayAppointments.length && (
                  <Button onClick={() => openNewAppointment(currentDate)} className="mt-4 h-9 rounded-lg bg-teal-800 text-xs hover:bg-teal-900">
                    <CalendarPlus className="mr-1.5 h-4 w-4" /> Ajouter un rendez-vous
                  </Button>
                )}
              </div>
            )}
          </section>
        ) : (
          <section aria-label="Planning de la semaine">
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <h3 className="text-base font-bold text-slate-950">Semaine du {format(weekStart, "d MMMM", { locale: fr })}</h3>
                <p className="text-xs text-slate-500">{weekAppointments.length} rendez-vous planifié{weekAppointments.length === 1 ? "" : "s"}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openNewAppointment(currentDate)} className="h-8 rounded-lg text-xs">
                <Plus className="mr-1 h-3.5 w-3.5" /> Planifier
              </Button>
            </div>
            <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {weekDays.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const appointmentsForDay = appointments
                  .filter((appointment) => appointment.date === dayKey)
                  .sort((first, second) => first.heure_debut.localeCompare(second.heure_debut));
                const dayConflictIds = findScheduleConflicts(appointmentsForDay);
                const today = isSameDay(day, new Date());
                return (
                  <article
                    key={dayKey}
                    className={cn(
                      "min-w-0 rounded-2xl border bg-white p-3 shadow-sm",
                      today ? "border-teal-300 ring-1 ring-teal-100" : "border-slate-200/80",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentDate(day);
                        setView("day");
                      }}
                      className="flex w-full items-center justify-between rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    >
                      <span>
                        <span className={cn("block text-xs font-semibold capitalize", today ? "text-teal-800" : "text-slate-500")}>
                          {format(day, "EEEE", { locale: fr })}
                        </span>
                        <span className="mt-0.5 block text-lg font-bold tabular-nums text-slate-950">
                          {format(day, "d MMM", { locale: fr })}
                        </span>
                      </span>
                      <span className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                        appointmentsForDay.length ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-500",
                      )}>
                        {appointmentsForDay.length} RDV
                      </span>
                    </button>
                    {dayConflictIds.size > 0 && (
                      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-800">
                        <TriangleAlert className="h-3 w-3" />
                        {dayConflictIds.size} rendez-vous en chevauchement
                      </p>
                    )}
                    <div className="mt-3 space-y-2">
                      {appointmentsForDay.length ? (
                        <>
                          {appointmentsForDay.slice(0, 4).map((appointment) => {
                            const queueEntry = getQueueEntry(appointment);
                            const status = appointmentStatus(appointment);
                            const dotClassName = queueEntry
                              ? queueEntry.status === "in_consultation"
                                ? "bg-blue-500"
                                : queueEntry.status === "completed"
                                  ? "bg-slate-400"
                                  : queueEntry.status === "cancelled"
                                    ? "bg-rose-400"
                                    : getQueueDisplayStatus(queueEntry) === "called"
                                      ? "bg-violet-500"
                                      : "bg-teal-500"
                              : appointment.statut === "pending"
                                ? "bg-amber-400"
                                : appointment.statut === "confirmed"
                                  ? "bg-emerald-500"
                                  : appointment.statut === "cancelled"
                                    ? "bg-rose-400"
                                    : "bg-slate-400";
                            return (
                              <button
                                key={appointment.id}
                                type="button"
                                onClick={() => openEditAppointment(appointment)}
                                className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-left transition-colors hover:border-teal-200 hover:bg-teal-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                              >
                                <span className="w-10 shrink-0 text-xs font-bold tabular-nums text-slate-700">
                                  {appointment.heure_debut.slice(0, 5)}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800">
                                  {formatPatientName(appointment.patient?.nom, appointment.patient?.prenom)}
                                </span>
                                <span className={cn("h-2 w-2 shrink-0 rounded-full", dotClassName)} aria-label={status.label} />
                              </button>
                            );
                          })}
                          {appointmentsForDay.length > 4 && (
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentDate(day);
                                setView("day");
                              }}
                              className="w-full px-2 py-1 text-left text-[11px] font-semibold text-teal-800 hover:underline"
                            >
                              Voir les {appointmentsForDay.length - 4} autres rendez-vous
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="rounded-lg border border-dashed border-slate-200 px-2 py-3 text-center text-[11px] text-slate-400">
                          Aucun rendez-vous
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openNewAppointment(day)}
                      className="mt-2 h-8 w-full rounded-lg text-xs text-slate-600 hover:bg-teal-50 hover:text-teal-800"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter
                    </Button>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointment={selectedAppointment}
        defaultDate={defaultDialogDate}
        defaultTime={defaultDialogTime}
      />
      <AlertDialog
        open={!!attendanceDecision}
        onOpenChange={(open) => {
          if (!open) setAttendanceDecision(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {attendanceDecision?.status === "no_show"
                ? "Confirmer l’absence du patient ?"
                : attendanceDecision?.status === "late_expected"
                  ? "Enregistrer le retard annoncé ?"
                  : "Annuler ce rendez-vous ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {attendanceDecision?.status === "no_show"
                ? "Cette décision sera horodatée et attribuée au membre de l’équipe connecté. Le rendez-vous restera visible dans l’agenda et ne sera pas ajouté à la file."
                : attendanceDecision?.status === "late_expected"
                  ? "Le patient a prévenu qu’il arriverait en retard. Ajoutez si possible une heure estimée d’arrivée pour aider l’équipe à organiser la file."
                  : "Le rendez-vous sera marqué comme annulé et restera consultable dans l’agenda et son historique."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={attendanceNote}
            onChange={(event) => setAttendanceNote(event.target.value)}
            placeholder="Note facultative (ex. patient injoignable)"
            maxLength={120}
            aria-label="Note de présence"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Revenir</AlertDialogCancel>
            <AlertDialogAction
              disabled={!currentUser || recordAttendance.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (!attendanceDecision || !currentUser) return;
                recordAttendance.mutate({
                  appointmentId: attendanceDecision.appointment.id,
                  status: attendanceDecision.status,
                  note: attendanceNote.trim() || undefined,
                }, {
                  onSuccess: () => setAttendanceDecision(null),
                });
              }}
            >
              {recordAttendance.isPending
                ? "Enregistrement…"
                : attendanceDecision?.status === "late_expected"
                  ? "Enregistrer le retard"
                  : "Confirmer la décision"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Agenda;
