import { useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Plus, Clock, UserCheck, CheckCircle, XCircle, Phone, Search, Stethoscope, BellRing, CalendarDays, CalendarClock, UserRoundPlus, History, RefreshCw, Timer, Users, BadgeCheck, ChevronDown, ChevronUp, Rows3, Rows4, Columns2, ClipboardList, ReceiptText, WalletCards, Building2, CircleDollarSign, AlertTriangle, ShieldAlert, HeartPulse, Star, GripVertical, ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueue, useAddToQueue, useCallQueueEntry, useUpdateQueueStatus, useCheckInAppointment, useSetQueuePriority, useReorderQueuePriorityGroup, getQueueDateKey, getQueueDisplayStatus, getQueuePriorityRank, compareQueueOrder, QueueEntry, QueueStatus, QueueDisplayStatus, QueuePriority } from "@/hooks/useQueue";
import { useAppointments } from "@/hooks/useAppointments";
import { usePatientDirectory } from "@/hooks/usePatients";
import NewPatientDialog from "@/components/NewPatientDialog";
import { useAuth } from "@/contexts/AuthContext";
import { cn, formatPatientName, formatPhoneNumber } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { QueuePreconsultationDialog } from "@/components/QueuePreconsultationDialog";
import { QueueClinicalSummaryDialog } from "@/components/QueueClinicalSummaryDialog";
import { QueueEncashmentDialog } from "@/components/QueueEncashmentDialog";
import { useQueueEncashmentSummary } from "@/hooks/useInvoiceEncashment";
import { useNavigationViewState } from "@/hooks/useNavigationViewState";

const STATUS_CONFIG: Record<QueueDisplayStatus, { label: string; icon: typeof Clock; color: string; badgeClass: string }> = {
  waiting: { label: "En attente", icon: Clock, color: "text-amber-600", badgeClass: "bg-amber-100 text-amber-700" },
  called: { label: "Appelé", icon: BellRing, color: "text-violet-600", badgeClass: "bg-violet-100 text-violet-700" },
  in_consultation: { label: "En consultation", icon: UserCheck, color: "text-blue-600", badgeClass: "bg-blue-100 text-blue-700" },
  completed: { label: "Terminé", icon: CheckCircle, color: "text-green-600", badgeClass: "bg-green-100 text-green-700" },
  cancelled: { label: "Annulé", icon: XCircle, color: "text-red-600", badgeClass: "bg-red-100 text-red-700" },
};

const PRIORITY_CONFIG: Record<QueuePriority, {
  label: string;
  compactLabel: string;
  description: string;
  className: string;
  rank: number;
  icon: typeof AlertTriangle;
}> = {
  critical: {
    label: "Urgence vitale",
    compactLabel: "Urgent",
    description: "Alerter le médecin immédiatement. Ne remplace pas l’évaluation clinique ni l’appel aux secours.",
    className: "border-rose-200 bg-rose-50 text-rose-800",
    rank: 0,
    icon: ShieldAlert,
  },
  high: {
    label: "Très prioritaire",
    compactLabel: "Très prio.",
    description: "Risque d’aggravation rapide, à valider par l’équipe médicale.",
    className: "border-orange-200 bg-orange-50 text-orange-800",
    rank: 1,
    icon: AlertTriangle,
  },
  relative: {
    label: "Priorité relative",
    compactLabel: "Prioritaire",
    description: "Symptômes nécessitant une évaluation plus rapide.",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    rank: 2,
    icon: HeartPulse,
  },
  comfort: {
    label: "Priorité de confort",
    compactLabel: "Confort",
    description: "Attention particulière sans urgence clinique.",
    className: "border-violet-200 bg-violet-50 text-violet-800",
    rank: 4,
    icon: Star,
  },
  standard: {
    label: "Standard",
    compactLabel: "Standard",
    description: "Ordre habituel ; un rendez-vous arrivé à l’heure passe avant les passages libres.",
    className: "border-slate-200 bg-slate-50 text-slate-700",
    rank: 5,
    icon: Clock,
  },
};

const isQueuePriority = (value: string): value is QueuePriority =>
  Object.prototype.hasOwnProperty.call(PRIORITY_CONFIG, value);

const getAppointmentPriority = (type: string) => {
  const normalizedType = type.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

  if (normalizedType.includes("urgence")) {
    return { label: "Urgence", className: "border-rose-200 bg-rose-50 text-rose-800" };
  }
  if (normalizedType.includes("controle")) {
    return { label: "Contrôle", className: "border-sky-200 bg-sky-50 text-sky-800" };
  }
  if (normalizedType.includes("suivi")) {
    return { label: "Suivi", className: "border-violet-200 bg-violet-50 text-violet-800" };
  }
  if (normalizedType.includes("consult")) {
    return { label: "Normal", className: "border-slate-200 bg-slate-50 text-slate-700" };
  }
  return { label: "Programmé", className: "border-slate-200 bg-slate-50 text-slate-700" };
};

const FileAttente = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [motif, setMotif] = useState("");
  const [montant, setMontant] = useState("0");
  const viewStateScope = currentUser?.id ?? "anonymous";
  const [searchQuery, setSearchQuery] = useNavigationViewState(`${viewStateScope}.queue.patient-search`, "");
  const [queueSearchQuery, setQueueSearchQuery] = useNavigationViewState(`${viewStateScope}.queue.search`, "");
  const [queueView, setQueueView] = useNavigationViewState<"active" | "history">(`${viewStateScope}.queue.view`, "active");
  const [queueStatusFilter, setQueueStatusFilter] = useNavigationViewState<"all" | QueueDisplayStatus>(`${viewStateScope}.queue.status-filter`, "all");
  const [queueReorderingEnabled, setQueueReorderingEnabled] = useState(false);
  const [compactQueuePreference, setCompactQueuePreference] = useState<boolean | null>(null);
  const [queueColumnsPreference, setQueueColumnsPreference] = useState<1 | 2 | null>(null);
  const [draggedQueueEntryId, setDraggedQueueEntryId] = useState<string | null>(null);
  const [dragOverQueueEntryId, setDragOverQueueEntryId] = useState<string | null>(null);
  const [recentlyReorderedQueueEntryId, setRecentlyReorderedQueueEntryId] = useState<string | null>(null);
  const [appointmentsExpanded, setAppointmentsExpanded] = useNavigationViewState(`${viewStateScope}.queue.appointments-expanded`, false);
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [preconsultationEntry, setPreconsultationEntry] = useState<QueueEntry | null>(null);
  const [clinicalSummaryEntry, setClinicalSummaryEntry] = useState<QueueEntry | null>(null);
  const [encashmentInvoiceId, setEncashmentInvoiceId] = useState<string | null>(null);

  const { data: queue = [], isLoading, isError, refetch } = useQueue();
  const todayKey = getQueueDateKey(new Date());
  const {
    data: appointmentsToday = [],
    isLoading: appointmentsLoading,
    isError: appointmentsError,
    refetch: refetchAppointments,
  } = useAppointments(todayKey);
  const { data: patients = [] } = usePatientDirectory();
  const {
    data: encashmentSummary,
    isLoading: encashmentSummaryLoading,
    isError: encashmentSummaryError,
    refetch: refetchEncashmentSummary,
  } = useQueueEncashmentSummary(currentUser?.role === "secretaire" || currentUser?.role === "assistant");
  const addToQueue = useAddToQueue();
  const callQueueEntry = useCallQueueEntry();
  const setQueuePriority = useSetQueuePriority();
  const reorderQueuePriorityGroup = useReorderQueuePriorityGroup();
  const updateStatus = useUpdateQueueStatus();
  const checkInAppointment = useCheckInAppointment();
  const canRegisterPayment = currentUser?.role === "secretaire" || currentUser?.role === "assistant";
  const canSetQueuePriority = currentUser?.role === "secretaire";
  const canReorderQueue = queueReorderingEnabled
    && canSetQueuePriority
    && queueView === "active"
    && queueStatusFilter === "all"
    && !queueSearchQuery.trim();

  const filteredPatients = patients.filter(p => 
    `${p.nom} ${p.prenom} ${p.telephone || ""} ${p.cin || ""}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const waitingCount = queue.filter(q => getQueueDisplayStatus(q) === 'waiting').length;
  const calledCount = queue.filter(q => getQueueDisplayStatus(q) === 'called').length;
  const inConsultationCount = queue.filter(q => q.status === 'in_consultation').length;
  const completedCount = queue.filter(q => q.status === 'completed').length;
  const cancelledCount = queue.filter(q => q.status === 'cancelled').length;
  const activeQueue = queue.filter((entry) =>
    ["waiting", "called", "in_consultation"].includes(getQueueDisplayStatus(entry))
  );
  const compactQueue = compactQueuePreference ?? activeQueue.length >= 20;
  const queueColumns = queueColumnsPreference ?? (compactQueue ? 2 : 1);
  const historyQueue = queue.filter((entry) =>
    entry.status === "completed" || entry.status === "cancelled"
  );
  const schedulableAppointments = appointmentsToday.filter(
    (appointment) => appointment.statut !== "cancelled" && appointment.statut !== "completed"
  );
  const checkedInAppointmentCount = schedulableAppointments.filter((appointment) =>
    activeQueue.some((entry) =>
      entry.appointment_id === appointment.id || entry.patient_id === appointment.patient_id
    )
  ).length;
  const lateAppointmentCount = schedulableAppointments.filter((appointment) => {
    const alreadyInQueue = activeQueue.some((entry) =>
      entry.appointment_id === appointment.id || entry.patient_id === appointment.patient_id
    );
    const endTime = new Date(`${appointment.date}T${appointment.heure_fin}`);
    return !alreadyInQueue && endTime < new Date();
  }).length;
  const sortedAppointments = schedulableAppointments
    .filter((appointment) =>
      !activeQueue.some((entry) =>
        entry.appointment_id === appointment.id || entry.patient_id === appointment.patient_id
      )
    )
    .sort((first, second) =>
      first.heure_debut.localeCompare(second.heure_debut)
  );
  const visibleAppointments = appointmentsExpanded ? sortedAppointments : sortedAppointments.slice(0, 3);
  const filteredQueue = (queueView === "active" ? activeQueue : historyQueue).filter((entry) => {
    if (queueStatusFilter !== "all" && getQueueDisplayStatus(entry) !== queueStatusFilter) return false;
    const query = queueSearchQuery.trim().toLocaleLowerCase();
    if (!query) return true;
    return [
      entry.patients?.nom,
      entry.patients?.prenom,
      entry.patients?.telephone,
      entry.motif,
      String(entry.numero_ordre),
    ].some((value) => value?.toLocaleLowerCase().includes(query));
  });
  const visibleQueue = queueView === "active"
    ? filteredQueue.slice().sort((first, second) => {
        const firstStage = first.status === "in_consultation" ? 2 : getQueueDisplayStatus(first) === "called" ? 1 : 0;
        const secondStage = second.status === "in_consultation" ? 2 : getQueueDisplayStatus(second) === "called" ? 1 : 0;
        return firstStage - secondStage
          || getQueuePriorityRank(first, todayKey) - getQueuePriorityRank(second, todayKey)
          || compareQueueOrder(first, second);
      })
    : filteredQueue;
  const nextPatient = queue
    .filter((entry) => getQueueDisplayStatus(entry) === "waiting")
    .sort((first, second) =>
      getQueuePriorityRank(first, todayKey) - getQueuePriorityRank(second, todayKey)
      || compareQueueOrder(first, second)
    )[0];
  const queueFilters = queueView === "active"
    ? [
        { value: "all" as const, label: "Tous", count: activeQueue.length },
        { value: "waiting" as const, label: "En attente", count: waitingCount },
        { value: "called" as const, label: "Appelés", count: calledCount },
        { value: "in_consultation" as const, label: "En consultation", count: inConsultationCount },
      ]
    : [
        { value: "all" as const, label: "Tous", count: historyQueue.length },
        { value: "completed" as const, label: "Terminés", count: completedCount },
        { value: "cancelled" as const, label: "Annulés", count: cancelledCount },
      ];

  const handleAddToQueue = async () => {
    if (!selectedPatientId) return;

    try {
      await addToQueue.mutateAsync({
        patient_id: selectedPatientId,
        motif: motif || undefined,
        montant_consultation: parseFloat(montant) || 0,
      });

      setIsAddDialogOpen(false);
      setSelectedPatientId("");
      setMotif("");
      setMontant("0");
      setSearchQuery("");
    } catch {
      // The mutation displays the error toast and keeps the form available for retry.
    }
  };

  const handleStatusChange = async (entry: QueueEntry, newStatus: QueueStatus) => {
    try {
      await updateStatus.mutateAsync({ id: entry.id, status: newStatus });
      if (newStatus === "in_consultation" && currentUser?.role === "medecin") {
        navigate(`/consultations/${entry.id}`);
      }
    } catch {
      // The mutation displays the error toast.
    }
  };

  const handleCallPatient = async (entry: QueueEntry) => {
    try {
      await callQueueEntry.mutateAsync(entry.id);
    } catch {
      // The mutation displays the error toast and keeps the patient in the queue.
    }
  };

  const getReorderableGroup = (entry: QueueEntry) => queue
    .filter((candidate) =>
      candidate.status === "waiting"
      && !candidate.called_at
      && getQueuePriorityRank(candidate, todayKey) === getQueuePriorityRank(entry, todayKey)
    )
    .sort(compareQueueOrder);

  const reorderWithinGroup = (entry: QueueEntry, targetEntryId: string) => {
    const group = getReorderableGroup(entry);
    const sourceIndex = group.findIndex((candidate) => candidate.id === entry.id);
    const targetIndex = group.findIndex((candidate) => candidate.id === targetEntryId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

    const [movedEntry] = group.splice(sourceIndex, 1);
    group.splice(targetIndex, 0, movedEntry);
    reorderQueuePriorityGroup.mutate(group.map((candidate) => candidate.id), {
      onSuccess: () => {
        setRecentlyReorderedQueueEntryId(entry.id);
        window.setTimeout(() => {
          setRecentlyReorderedQueueEntryId((current) => current === entry.id ? null : current);
        }, 700);
      },
    });
  };

  const moveQueueEntry = (entry: QueueEntry, offset: -1 | 1) => {
    if (!canReorderQueue) return;
    const group = getReorderableGroup(entry);
    const index = group.findIndex((candidate) => candidate.id === entry.id);
    const targetEntry = group[index + offset];
    if (targetEntry) reorderWithinGroup(entry, targetEntry.id);
  };

  const handleQueueDrop = (event: DragEvent<HTMLDivElement>, targetEntry: QueueEntry) => {
    event.preventDefault();
    if (!canReorderQueue || !draggedQueueEntryId || draggedQueueEntryId === targetEntry.id) return;

    const sourceEntry = queue.find((candidate) => candidate.id === draggedQueueEntryId);
    if (sourceEntry) reorderWithinGroup(sourceEntry, targetEntry.id);
    setDraggedQueueEntryId(null);
    setDragOverQueueEntryId(null);
  };

  const openConsultation = (entry: QueueEntry) => navigate(`/consultations/${entry.id}`);

  const openEncashment = (invoiceId: string) => {
    setEncashmentInvoiceId(invoiceId);
  };

  const renderQueueCard = (entry: QueueEntry) => {
    const displayStatus = getQueueDisplayStatus(entry);
    const config = STATUS_CONFIG[displayStatus];
    const StatusIcon = config.icon;
    const patient = entry.patients;
    const priority = PRIORITY_CONFIG[entry.priority_level];
    const PriorityIcon = priority.icon;
    const punctualAppointment = entry.priority_level === "standard" && getQueuePriorityRank(entry, todayKey) === 3;

    const arrivedAt = new Date(entry.created_at);
    const waitingMinutes = Math.max(0, Math.floor((Date.now() - arrivedAt.getTime()) / 60_000));
    const reorderableGroup = getReorderableGroup(entry);
    const reorderIndex = reorderableGroup.findIndex((candidate) => candidate.id === entry.id);
    const canReorderEntry = canReorderQueue
      && displayStatus === "waiting"
      && reorderableGroup.length > 1;

    return (
      <Card key={entry.id} className={cn(
        "group relative overflow-hidden border-slate-200/80 bg-white transition-all hover:border-slate-300 hover:shadow-md",
        draggedQueueEntryId === entry.id && "scale-[0.985] opacity-45 blur-[1px] ring-2 ring-amber-400 shadow-xl",
        dragOverQueueEntryId === entry.id && draggedQueueEntryId !== entry.id && "scale-[1.015] -translate-y-0.5 ring-2 ring-teal-400 shadow-xl animate-pulse",
        draggedQueueEntryId && draggedQueueEntryId !== entry.id && dragOverQueueEntryId !== entry.id && "opacity-80 blur-[0.35px]",
        recentlyReorderedQueueEntryId === entry.id && "animate-bounce ring-2 ring-emerald-400 shadow-lg",
        compactQueue
          ? "rounded-xl shadow-none"
          : "rounded-2xl shadow-[0_4px_18px_-14px_rgba(15,23,42,0.35)]"
      )}
        onDragOver={(event) => {
          if (canReorderEntry && draggedQueueEntryId) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDragOverQueueEntryId(entry.id);
          }
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDragOverQueueEntryId((current) => current === entry.id ? null : current);
          }
        }}
        onDrop={(event) => handleQueueDrop(event, entry)}
      >
        <div className={cn("absolute inset-y-0 left-0 w-1",
          displayStatus === 'waiting' && "bg-amber-500",
          displayStatus === 'called' && "bg-violet-500",
          entry.status === 'in_consultation' && "bg-blue-500",
          entry.status === 'completed' && "bg-green-500",
          entry.status === 'cancelled' && "bg-red-500",
          entry.priority_level === "critical" && "bg-rose-600",
          entry.priority_level === "high" && "bg-orange-500",
          entry.priority_level === "relative" && "bg-amber-500",
          entry.priority_level === "comfort" && "bg-violet-500",
          entry.priority_level === "standard" && displayStatus === 'waiting' && "bg-slate-300"
        )} />
        <CardContent className={cn(
          "flex min-w-0 flex-col",
          compactQueue ? "gap-2 px-3 py-2.5 pl-4" : "gap-3 p-4 pl-5 sm:gap-4 sm:p-5 sm:pl-6"
        )}>
          <div className={cn("flex min-w-0 items-start", compactQueue ? "gap-2.5" : "gap-3 sm:gap-4")}>
            <div className={cn(
              "flex shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200/70",
              compactQueue ? "h-9 w-9" : "h-12 w-12"
            )}>
              <span className="text-[10px] font-semibold uppercase leading-none tracking-wide text-slate-500">N°</span>
              <span className={cn("font-bold leading-none tabular-nums", compactQueue ? "mt-0.5 text-sm" : "mt-1 text-base")}>{entry.numero_ordre}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={cn("truncate font-semibold tracking-tight text-slate-950", compactQueue ? "text-sm" : "text-base sm:text-[17px]")}>
                  {formatPatientName(patient?.nom, patient?.prenom)}
                </h3>
                <Badge className={cn("gap-1 border-0 font-semibold", compactQueue ? "px-1.5 py-0 text-[10px]" : "text-[11px]", config.badgeClass)}>
                  <StatusIcon className={compactQueue ? "h-2.5 w-2.5" : "h-3 w-3"} />
                  {config.label}
                </Badge>
                <Badge variant="outline" className={cn("gap-1 font-semibold", compactQueue ? "px-1.5 py-0 text-[10px]" : "text-[11px]", punctualAppointment ? "border-sky-200 bg-sky-50 text-sky-800" : priority.className)}>
                  {punctualAppointment ? <CalendarClock className="h-3 w-3" /> : <PriorityIcon className="h-3 w-3" />}
                  {punctualAppointment ? "RDV à l’heure" : compactQueue ? priority.compactLabel : priority.label}
                </Badge>
              </div>
              <div className={cn("flex flex-wrap items-center text-xs text-slate-500", compactQueue ? "mt-0.5 gap-x-3 gap-y-0" : "mt-1.5 gap-x-4 gap-y-1")}>
                {patient?.telephone && (
                  <a
                    href={`tel:${patient.telephone.replace(/[^\d+]/g, "")}`}
                    aria-label={`Appeler ${formatPatientName(patient.nom, patient.prenom)} au ${formatPhoneNumber(patient.telephone)}`}
                    title="Appeler le patient"
                    className={cn(
                      "inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 font-semibold tabular-nums text-emerald-900 transition-colors hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-1",
                      compactQueue ? "h-6 px-2 text-[10px]" : "h-7 px-2.5 text-[11px]"
                    )}
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{formatPhoneNumber(patient.telephone)}</span>
                  </a>
                )}
                {!patient?.telephone && !compactQueue && <span className="text-[11px] text-slate-400">Téléphone absent</span>}
                {!compactQueue && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Arrivé à {format(arrivedAt, "HH:mm", { locale: fr })}
                  </span>
                )}
                {displayStatus === "waiting" && (
                  <span className={cn(
                    "inline-flex items-center gap-1.5 font-semibold tabular-nums",
                    waitingMinutes >= 30 ? "text-amber-700" : "text-slate-500"
                  )}>
                    <Timer className={compactQueue ? "h-3 w-3" : "h-3.5 w-3.5"} />
                    {waitingMinutes < 1 ? "À l’instant" : compactQueue ? `${waitingMinutes} min` : `Attente ${waitingMinutes} min`}
                  </span>
                )}
                {entry.called_at && !compactQueue && (
                  <span className="inline-flex items-center gap-1.5">
                    <BellRing className="h-3.5 w-3.5" />
                    Appelé à {format(new Date(entry.called_at), "HH:mm", { locale: fr })}
                  </span>
                )}
              </div>
              {entry.motif && !compactQueue && (
                <p className="mt-2 truncate text-sm text-slate-600">
                  <span className="font-medium text-slate-500">Motif</span>
                  <span className="mx-1.5 text-slate-300">·</span>{entry.motif}
                </p>
              )}
              {entry.invoices && !compactQueue && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    {entry.invoices.numero} · {entry.invoices.montant.toLocaleString("fr-MA")} DH
                  </span>
                  <Badge className={cn("border-0 text-[11px]",
                    entry.invoices.statut === 'paid' || entry.invoices.statut === 'no_charge' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  )}>
                    {entry.invoices.statut === 'no_charge'
                      ? 'Gratuit'
                      : entry.invoices.statut === 'paid'
                        ? 'Payé'
                        : entry.invoices.consigne_reglement === 'deferred'
                          ? 'Différé · à régler'
                          : 'À encaisser'}
                  </Badge>
                </div>
              )}
            </div>
            {canReorderEntry && (
              <div className="flex shrink-0 items-center gap-0.5" aria-label={`Réordonner ${formatPatientName(patient?.nom, patient?.prenom)} dans sa priorité`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-800"
                  aria-label={`Monter ${formatPatientName(patient?.nom, patient?.prenom)} dans la file`}
                  title="Monter d’une place"
                  disabled={reorderIndex === 0 || reorderQueuePriorityGroup.isPending}
                  onClick={() => moveQueueEntry(entry, -1)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  draggable={!reorderQueuePriorityGroup.isPending}
                  className="h-8 w-8 cursor-grab rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-800 active:cursor-grabbing"
                  aria-label={`Glisser ${formatPatientName(patient?.nom, patient?.prenom)} pour réorganiser sa priorité`}
                  title="Glisser pour réorganiser les patients de même priorité"
                  disabled={reorderQueuePriorityGroup.isPending}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", entry.id);
                    setDraggedQueueEntryId(entry.id);
                  }}
                  onDragEnd={() => setDraggedQueueEntryId(null)}
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-800"
                  aria-label={`Descendre ${formatPatientName(patient?.nom, patient?.prenom)} dans la file`}
                  title="Descendre d’une place"
                  disabled={reorderIndex === reorderableGroup.length - 1 || reorderQueuePriorityGroup.isPending}
                  onClick={() => moveQueueEntry(entry, 1)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

            <div className={cn("flex min-w-0 flex-wrap items-center justify-start border-t border-slate-100 pt-2", compactQueue ? "gap-1.5" : "gap-2")}>
              {currentUser?.role === "medecin" && (displayStatus === "waiting" || displayStatus === "called") && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setClinicalSummaryEntry(entry)}
                  aria-label={`Ouvrir la synthèse patient de ${formatPatientName(patient?.nom, patient?.prenom)}`}
                  title="Synthèse avant consultation"
                  className={cn(
                    "rounded-lg border-teal-200 bg-teal-50 font-semibold text-teal-900 hover:bg-teal-100",
                    compactQueue ? "h-8 w-8 px-0" : "h-9 px-3"
                  )}
                >
                  <ClipboardList className={cn("h-4 w-4", !compactQueue && "mr-1.5")} />
                  {!compactQueue && "Synthèse"}
                </Button>
              )}
              {displayStatus === "waiting" && canSetQueuePriority && (
                <Select
                  value={entry.priority_level}
                  onValueChange={(value) => {
                    if (isQueuePriority(value)) {
                      setQueuePriority.mutate({ queueId: entry.id, priority: value });
                    }
                  }}
                  disabled={setQueuePriority.isPending}
                >
                  <SelectTrigger
                    aria-label={`Priorité ${priority.label} de ${formatPatientName(patient?.nom, patient?.prenom)}. Modifier`}
                    title="Modifier la priorité d’accueil"
                    className={cn(
                      "h-8 rounded-lg font-semibold shadow-sm transition-colors hover:brightness-[0.98]",
                      compactQueue ? "w-[138px] px-2 text-[10px]" : "w-[176px] text-[11px]",
                      punctualAppointment ? "border-sky-200 bg-sky-50 text-sky-800" : priority.className
                    )}
                  >
                    <SelectValue>
                      <span className="flex min-w-0 items-center gap-1.5">
                        {punctualAppointment
                          ? <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                          : <PriorityIcon className="h-3.5 w-3.5 shrink-0" />}
                        <span className="truncate">
                          {punctualAppointment ? "RDV à l’heure" : compactQueue ? priority.compactLabel : priority.label}
                        </span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start" className="max-w-[min(22rem,calc(100vw-2rem))]">
                    {(Object.keys(PRIORITY_CONFIG) as QueuePriority[]).map((level) => {
                      const option = PRIORITY_CONFIG[level];
                      return (
                        <SelectItem key={level} value={level} className="py-2.5">
                          <span className="flex flex-col gap-0.5">
                            <span className="font-semibold">{option.label}</span>
                            <span className="max-w-[18rem] whitespace-normal text-[11px] leading-4 text-slate-500">{option.description}</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              {displayStatus === 'waiting' && (
                <Button
                  size="sm"
                  onClick={() => handleCallPatient(entry)}
                  aria-label={`Appeler ${formatPatientName(patient?.nom, patient?.prenom)}`}
                  title="Appeler le patient"
                  className={cn("rounded-lg bg-violet-700 font-semibold text-white shadow-sm hover:bg-violet-800", compactQueue ? "h-8 w-8 px-0" : "h-9 px-3")}
                  disabled={callQueueEntry.isPending}
                >
                  <BellRing className={cn("h-4 w-4", !compactQueue && "mr-1.5")} />
                  {!compactQueue && "Appeler"}
                </Button>
              )}

              {displayStatus === "called" && currentUser?.role === "medecin" && (
                <Button size="sm" className="h-9 rounded-lg font-semibold" onClick={() => handleStatusChange(entry, "in_consultation")}>
                  <Stethoscope className="mr-1.5 h-4 w-4" />Démarrer
                </Button>
              )}

              {displayStatus === "called" && currentUser?.role !== "medecin" && (
                <Badge className={cn("border-0", STATUS_CONFIG.called.badgeClass)}>En attente du médecin</Badge>
              )}
              
              {entry.status === "waiting" && canRegisterPayment && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPreconsultationEntry(entry)}
                  aria-label="Ouvrir la pré-consultation"
                  title="Pré-consultation"
                  className={cn("rounded-lg border-teal-200 text-teal-900 hover:bg-teal-50", compactQueue ? "h-8 w-8 px-0" : "h-9")}
                >
                  <ClipboardList className={cn("h-4 w-4", !compactQueue && "mr-1.5")} />
                  {!compactQueue && "Pré-consultation"}
                </Button>
              )}
              {canRegisterPayment && entry.invoices && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openEncashment(entry.invoices!.id)}
                  aria-label="Ouvrir l’encaissement"
                  title="Encaissement & détail"
                  className={cn("rounded-lg border-emerald-800 bg-emerald-800 font-semibold text-white shadow-sm hover:border-emerald-900 hover:bg-emerald-900 hover:text-white", compactQueue ? "h-8 w-8 px-0" : "h-9 px-2.5 text-[11px]")}
                >
                  <ReceiptText className={cn("h-4 w-4", !compactQueue && "mr-1.5")} />
                  {!compactQueue && "Encaissement"}
                </Button>
              )}

              {entry.status === 'in_consultation' && (
                <>
                  {currentUser?.role === "medecin" && (
                    <Button size="sm" variant="outline" className="h-9 rounded-lg" onClick={() => openConsultation(entry)}>
                      <Stethoscope className="mr-1.5 h-4 w-4" />Ouvrir le dossier
                    </Button>
                  )}
                </>
              )}

              {(displayStatus === 'waiting' || displayStatus === 'called') && (
                <Button
                  size="sm" 
                  variant="ghost"
                  aria-label="Annuler ce passage"
                  title="Annuler"
                  className={cn("rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700", compactQueue ? "h-8 w-8 px-0" : "h-9")}
                  onClick={() => handleStatusChange(entry, 'cancelled')}
                >
                  <XCircle className={cn("h-4 w-4", !compactQueue && "mr-1")} />
                  {!compactQueue && "Annuler"}
                </Button>
              )}

            </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-slate-900">
      <header className="sticky top-11 z-20 border-b border-slate-200/80 bg-white/95 shadow-[0_4px_18px_-16px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e7f3f1] text-[#1e665f]">
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#34776e]">Accueil clinique</p>
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-950 sm:text-xl">File d’attente</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" className="h-9 rounded-xl border-slate-200 bg-white text-slate-700" onClick={() => navigate("/agenda")}>
                <CalendarDays className="mr-2 h-4 w-4" />Agenda
              </Button>

              <Button variant="outline" className="h-9 rounded-xl border-slate-200 bg-white text-slate-700" onClick={() => navigate("/suivis")}>
                <CalendarClock className="mr-2 h-4 w-4" />Suivis
              </Button>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-9 rounded-xl bg-[#1e665f] font-semibold text-white shadow-sm hover:bg-[#174f49]">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter patient
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un patient à la file</DialogTitle>
                  <DialogDescription>Retrouvez un patient existant ou créez son dossier avant de l’ajouter à la file.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Patient</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher un patient..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setSelectedPatientId("");
                        }}
                        className="pl-10"
                      />
                    </div>
                    {searchQuery && (
                      <div className="max-h-40 overflow-y-auto border rounded-md">
                        {filteredPatients.map(p => (
                          <button
                            key={p.id}
                            className={cn(
                              "w-full text-left px-3 py-2 hover:bg-muted transition-colors",
                              selectedPatientId === p.id && "bg-primary/10"
                            )}
                            onClick={() => {
                              setSelectedPatientId(p.id);
                              setSearchQuery(`${p.nom} ${p.prenom}`);
                            }}
                          >
                            <p className="font-medium">{formatPatientName(p.nom, p.prenom)}</p>
                            {p.telephone && <p className="text-base font-semibold tabular-nums tracking-wide text-muted-foreground">{formatPhoneNumber(p.telephone)}</p>}
                          </button>
                        ))}
                        {filteredPatients.length === 0 && (
                          <p className="p-3 text-sm text-muted-foreground">Aucun patient trouvé</p>
                        )}
                      </div>
                    )}
                    <Button type="button" variant="outline" className="w-full" onClick={() => setIsNewPatientOpen(true)}>
                      <UserRoundPlus className="mr-2 h-4 w-4" />
                      {searchQuery.trim() ? "Créer un nouveau dossier" : "Nouveau patient"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Motif (optionnel)</Label>
                    <Textarea
                      placeholder="Motif de la consultation..."
                      value={motif}
                      onChange={(e) => setMotif(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Montant consultation (DH)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={montant}
                      onChange={(e) => setMontant(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleAddToQueue} 
                    className="w-full"
                    disabled={!selectedPatientId || addToQueue.isPending}
                  >
                    {addToQueue.isPending ? "Ajout en cours..." : "Ajouter à la file"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <NewPatientDialog
        open={isNewPatientOpen}
        onOpenChange={setIsNewPatientOpen}
        onCreated={async (patientId, patientName) => {
          setSelectedPatientId(patientId);
          setSearchQuery(patientName);
          setIsAddDialogOpen(true);
          try {
            await addToQueue.mutateAsync({
              patient_id: patientId,
              motif: motif || undefined,
              montant_consultation: parseFloat(montant) || 0,
            });
            setIsAddDialogOpen(false);
            setSelectedPatientId("");
            setMotif("");
            setMontant("0");
            setSearchQuery("");
          } catch {
            // The patient remains selected in the queue dialog so reception can retry.
          }
        }}
      />
      <QueueClinicalSummaryDialog
        queueEntry={clinicalSummaryEntry}
        open={!!clinicalSummaryEntry}
        onOpenChange={(open) => {
          if (!open) setClinicalSummaryEntry(null);
        }}
      />
      <QueuePreconsultationDialog
        queueEntry={preconsultationEntry}
        open={!!preconsultationEntry}
        onOpenChange={(open) => {
          if (!open) setPreconsultationEntry(null);
        }}
      />
      <QueueEncashmentDialog
        invoiceId={encashmentInvoiceId}
        open={!!encashmentInvoiceId}
        onOpenChange={(open) => {
          if (!open) setEncashmentInvoiceId(null);
        }}
      />

      <main className="container mx-auto flex max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-8">
        <section className="order-1 relative isolate overflow-hidden rounded-[26px] bg-[#123c3b] px-4 py-4 text-white shadow-[0_22px_50px_-28px_rgba(18,60,59,0.65)] sm:px-8 sm:py-8">
          <div className="absolute -right-16 -top-24 -z-10 h-64 w-64 rounded-full bg-[#34776e]/35 blur-3xl" />
          <div className="absolute -bottom-24 right-1/3 -z-10 h-48 w-48 rounded-full bg-[#d5a86f]/15 blur-3xl" />
          <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-7">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b9d8d1]">
                {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
              </p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight sm:mt-2 sm:text-3xl">Le cabinet, en un coup d’œil.</h2>
              <p className="mt-1.5 max-w-lg text-xs leading-5 text-white/70 sm:mt-2 sm:text-sm sm:leading-6">
                Suivez l’accueil et faites avancer la journée, patient après patient.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 sm:mt-5">
                {nextPatient ? (
                  <Button
                    onClick={() => handleCallPatient(nextPatient)}
                    disabled={callQueueEntry.isPending}
                    className="h-10 rounded-xl bg-white px-4 text-sm font-semibold text-[#174f49] shadow-sm hover:bg-[#edf6f3] sm:h-11"
                  >
                    <BellRing className="mr-2 h-4 w-4" />
                    {callQueueEntry.isPending ? "Appel en cours…" : "Appeler le suivant"}
                  </Button>
                ) : (
                  <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-white/75">
                    <CheckCircle className="h-4 w-4 text-[#b9d8d1]" />
                    Aucun patient en attente d’appel
                  </span>
                )}
                <span className="text-xs text-white/65 sm:text-sm">
                  {waitingCount === 1 ? "1 patient attend" : `${waitingCount} patients attendent`}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[390px]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-2 sm:p-4">
                <Clock className="h-4 w-4 text-[#f2cb8e]" />
                <p className="mt-2 text-xl font-semibold tabular-nums sm:mt-3 sm:text-2xl">{waitingCount}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-white/65 sm:text-xs">En attente</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-2 sm:p-4">
                <BellRing className="h-4 w-4 text-[#d3b8f2]" />
                <p className="mt-2 text-xl font-semibold tabular-nums sm:mt-3 sm:text-2xl">{calledCount}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-white/65 sm:text-xs">Appelés</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-2 sm:p-4">
                <Stethoscope className="h-4 w-4 text-[#a9d7d2]" />
                <p className="mt-2 text-xl font-semibold tabular-nums sm:mt-3 sm:text-2xl">{inConsultationCount}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-white/65 sm:text-xs">En consultation</p>
              </div>
            </div>
          </div>
        </section>

        <div className="order-2 mt-6 grid items-start gap-5 sm:mt-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6">
        <aside className="order-1 self-start xl:sticky xl:top-[5.5rem] xl:order-2" aria-label="Panneau des rendez-vous">
        {canRegisterPayment && (
          <section className="mb-4 overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-[0_8px_28px_-24px_rgba(15,23,42,0.4)]" aria-label="Encaissements à suivre aujourd’hui">
            <div className="border-b border-emerald-100 bg-[linear-gradient(115deg,#effaf5,#ffffff)] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <WalletCards className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-slate-900 sm:text-base">À encaisser aujourd’hui</h2>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold tabular-nums text-emerald-900 ring-1 ring-emerald-200">
                      {encashmentSummary?.open_invoice_count ?? 0}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">Suivi des soldes patient et organisme, sans chercher dans la file.</p>
                </div>
              </div>
              {encashmentSummary && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white bg-white/90 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Part patient</p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
                      {encashmentSummary.patient_remaining_total.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                    </p>
                  </div>
                  <div className="rounded-xl border border-white bg-white/90 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Part organismes</p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
                      {encashmentSummary.insurer_remaining_total.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                    </p>
                  </div>
                </div>
              )}
            </div>
            {encashmentSummaryError ? (
              <div className="p-4">
                <p className="text-sm text-rose-800">Le suivi des encaissements n’a pas pu être chargé.</p>
                <Button type="button" variant="outline" size="sm" className="mt-2 h-8 rounded-lg" onClick={() => void refetchEncashmentSummary()}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Réessayer
                </Button>
              </div>
            ) : encashmentSummaryLoading ? (
              <div className="space-y-2 p-4" aria-label="Chargement des encaissements">
                <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ) : encashmentSummary && encashmentSummary.items.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">
                <p className="font-semibold text-slate-700">Aucun solde restant pour aujourd’hui.</p>
                <p className="mt-1 text-xs">Les factures avec règlement différé ou part assurance apparaîtront ici.</p>
              </div>
            ) : (
              <div className="max-h-[min(42vh,420px)] space-y-3 overflow-y-auto p-3">
                {encashmentSummary?.items.map((item) => (
                  <article key={item.invoice_id} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{item.patient_name}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          File n°{item.queue_number} · {item.invoice_number}
                          {item.reason ? ` · ${item.reason}` : ""}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-900 ring-1 ring-amber-200">
                        <CircleDollarSign className="h-3 w-3" />À régler
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-2.5">
                      {item.patient_remaining > 0 && (
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-600">À recevoir du patient</span>
                          <span className="font-bold tabular-nums text-slate-900">
                            {item.patient_remaining.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                          </span>
                        </div>
                      )}
                      {item.insurer_remaining > 0 && (
                        <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2 text-xs">
                          <span className="inline-flex min-w-0 items-center gap-1.5 text-indigo-800">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{item.insurance_name || "À recevoir de l’organisme"}</span>
                          </span>
                          <span className="shrink-0 font-bold tabular-nums text-indigo-900">
                            {item.insurer_remaining.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex min-h-8 items-center">
                      {item.telephone ? (
                        <a href={`tel:${item.telephone.replace(/[^\d+]/g, "")}`} className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-emerald-800 hover:underline">
                          <Phone className="h-3.5 w-3.5 shrink-0" />{formatPhoneNumber(item.telephone)}
                        </a>
                      ) : <span className="text-xs text-slate-400">Téléphone absent</span>}
                    </div>
                    <Button
                      type="button"
                      onClick={() => openEncashment(item.invoice_id)}
                      aria-label={`Ouvrir l’encaissement de ${item.patient_name}`}
                      className="mt-3 h-11 w-full rounded-xl bg-emerald-800 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-900 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                    >
                      <ReceiptText className="mr-2 h-4 w-4" />
                      Encaisser
                      <ArrowRight className="ml-auto h-4 w-4" />
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
        {currentUser?.role !== "medecin" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_8px_28px_-24px_rgba(15,23,42,0.4)] sm:p-5 xl:max-h-[calc(100vh-6.5rem)] xl:overflow-y-auto" aria-label="Rendez-vous du jour">
          <div className="flex flex-col gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff5f4] text-[#34776e]">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-sm font-bold text-slate-900 sm:text-base">Rendez-vous du jour</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600">
                    {sortedAppointments.length}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {appointmentsLoading
                    ? "Chargement des créneaux…"
                    : `${checkedInAppointmentCount} déjà dans la file${lateAppointmentCount ? ` · ${lateAppointmentCount} en retard` : ""}`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
              <span className="text-[11px] text-slate-500">Planning du cabinet</span>
              <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate("/agenda")}
                className="h-8 rounded-lg px-2 text-[11px] font-semibold text-[#34776e] hover:bg-[#eff5f4] hover:text-[#174f49] sm:px-2.5 sm:text-xs"
              >
                Ouvrir l’agenda
                <CalendarClock className="ml-1 h-3.5 w-3.5" />
              </Button>
              {!appointmentsLoading && !appointmentsError && sortedAppointments.length > 3 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-expanded={appointmentsExpanded}
                  onClick={() => setAppointmentsExpanded((expanded) => !expanded)}
                  className="h-8 rounded-lg px-2 text-[11px] text-slate-600 hover:bg-slate-100 sm:px-2.5 sm:text-xs"
                >
                  {appointmentsExpanded ? "Réduire" : `Tout voir · ${sortedAppointments.length}`}
                  {appointmentsExpanded
                    ? <ChevronUp className="ml-1.5 h-3.5 w-3.5" />
                    : <ChevronDown className="ml-1.5 h-3.5 w-3.5" />}
                </Button>
              )}
              </div>
            </div>
          </div>

          {appointmentsError ? (
            <div className="mt-4 flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-rose-900">Les rendez-vous du jour n’ont pas pu être chargés.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetchAppointments()}
                className="h-8 rounded-lg border-rose-200 bg-white text-rose-900 hover:bg-rose-100"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Réessayer
              </Button>
            </div>
          ) : appointmentsLoading ? (
            <div className="mt-4 h-12 animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />
          ) : sortedAppointments.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-500">
              {checkedInAppointmentCount > 0
                ? "Tous les rendez-vous prévus sont déjà pris en charge dans la file."
                : "Aucun rendez-vous prévu aujourd’hui. Les patients sans rendez-vous restent ajoutables à la file."}
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {visibleAppointments.map((appointment) => {
                const checkedInEntry = queue.find((entry) => entry.appointment_id === appointment.id);
                const alreadyInQueueEntry = activeQueue.find((entry) => entry.patient_id === appointment.patient_id);
                const inQueueEntry = checkedInEntry || alreadyInQueueEntry;
                const queueDisplayStatus = inQueueEntry ? getQueueDisplayStatus(inQueueEntry) : null;
                const appointmentEnd = new Date(`${appointment.date}T${appointment.heure_fin}`);
                const isLate = !inQueueEntry && appointmentEnd < new Date();
                const isCompleted = inQueueEntry?.status === "completed";
                const isInConsultation = inQueueEntry?.status === "in_consultation";
                const priority = getAppointmentPriority(appointment.type);
                const patientName = formatPatientName(appointment.patient?.nom, appointment.patient?.prenom);

                return (
                  <article
                    key={appointment.id}
                    className={cn(
                      "flex min-w-0 items-center gap-2.5 rounded-xl border p-2.5 transition-colors",
                      isLate
                        ? "border-amber-200 bg-amber-50/60"
                        : inQueueEntry && !isCompleted && !isInConsultation
                          ? "border-emerald-200 bg-emerald-50/40"
                          : "border-slate-200/80 bg-white",
                    )}
                  >
                    <div className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-slate-200 bg-white/80 px-1 py-1.5 text-center">
                      <span className="text-sm font-bold leading-none tabular-nums text-slate-900">
                        {appointment.heure_debut.slice(0, 5)}
                      </span>
                      {inQueueEntry && !isCompleted ? (
                        <span className="mt-1.5 border-t border-slate-200 pt-1 text-base font-bold leading-none tabular-nums text-[#174f49]">
                          {inQueueEntry.numero_ordre}
                        </span>
                      ) : appointment.heure_fin ? (
                        <span className="mt-1 border-t border-slate-200 pt-1 text-[10px] leading-none tabular-nums text-slate-500">
                          {appointment.heure_fin.slice(0, 5)}
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-5 text-slate-950">
                          {patientName}
                        </p>
                        <Badge className={cn("shrink-0 border px-1.5 py-0 text-[9px] font-semibold leading-[17px]", priority.className)}>
                          {priority.label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex min-w-0 items-center gap-1.5">
                        {appointment.patient?.telephone ? (
                          <a
                            href={`tel:${appointment.patient.telephone.replace(/[^\d+]/g, "")}`}
                            className="inline-flex h-7 max-w-full shrink items-center gap-1 rounded-full border border-emerald-800 bg-emerald-800 px-2.5 text-[11px] font-semibold tabular-nums text-white transition-colors hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-1"
                            aria-label={`Appeler ${patientName} au ${formatPhoneNumber(appointment.patient.telephone)}`}
                            title={`Appeler ${patientName}`}
                          >
                            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{formatPhoneNumber(appointment.patient.telephone)}</span>
                          </a>
                        ) : (
                          <span className="inline-flex h-7 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-medium text-slate-500">
                            <Phone className="h-3 w-3" aria-hidden="true" />
                            Téléphone absent
                          </span>
                        )}
                        <span className="min-w-0 truncate text-[10px] text-slate-500" title={appointment.type}>
                          {appointment.type}
                        </span>
                      </div>
                      <div className="mt-1 flex min-w-0 items-center justify-between gap-1.5">
                        <span className="min-w-0 truncate text-[10px] font-medium text-slate-500">
                          {isCompleted
                            ? "Visite clôturée"
                            : isInConsultation
                              ? "En consultation"
                              : inQueueEntry?.status === "cancelled"
                                ? "Passage annulé"
                              : inQueueEntry
                                ? queueDisplayStatus === "called"
                                  ? "Appelé"
                                  : "En attente"
                                : isLate
                                  ? "Créneau passé · arrivée à vérifier"
                                  : new Date(`${appointment.date}T${appointment.heure_debut}`) > new Date()
                                    ? "À venir"
                                    : "Créneau en cours"}
                        </span>
                        {!inQueueEntry && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={checkInAppointment.isPending}
                            onClick={() => checkInAppointment.mutate(appointment.id)}
                            className="h-7 shrink-0 rounded-lg border-[#b7d1cc] bg-white px-2 text-[10px] font-semibold text-[#245e57] hover:bg-[#eff7f5]"
                          >
                            <BadgeCheck className="mr-1 h-3 w-3" />
                            {checkInAppointment.isPending ? "Ajout…" : "Confirmer & ajouter"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        )}
        </aside>

        <section className="order-2 mt-5 sm:mt-7 xl:order-1 xl:mt-0" aria-label="Patients de la file">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-[#34776e] sm:block">Vue du jour</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">Parcours des patients</h2>
              <p className="mt-1 hidden text-sm text-slate-500 sm:block">La file active d’abord, l’historique à portée de main.</p>
            </div>
            <div className="flex w-full flex-row items-center gap-2 sm:w-auto">
              <div className="relative min-w-0 flex-1 sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={queueSearchQuery}
                  onChange={(event) => {
                    setQueueSearchQuery(event.target.value);
                    if (event.target.value.trim()) setQueueReorderingEnabled(false);
                  }}
                  placeholder="Patient, motif ou numéro…"
                  aria-label="Rechercher dans la file"
                  className="h-10 rounded-xl border-slate-200 bg-white pl-9 shadow-sm placeholder:text-slate-400"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                aria-label="Actualiser la file"
                onClick={() => void refetch()}
                disabled={isLoading}
                className="h-10 rounded-xl border-slate-200 bg-white px-3 text-slate-600 shadow-sm"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                <span className="ml-2 sm:hidden">Actualiser</span>
              </Button>
              {canSetQueuePriority && queueView === "active" && (
                <Button
                  type="button"
                  aria-pressed={queueReorderingEnabled}
                  onClick={() => {
                    setQueueReorderingEnabled((enabled) => !enabled);
                    setDraggedQueueEntryId(null);
                    setDragOverQueueEntryId(null);
                  }}
                  className={cn(
                    "h-10 shrink-0 rounded-xl px-3 text-xs font-semibold shadow-sm transition-all",
                    queueReorderingEnabled
                      ? "border border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-950"
                  )}
                >
                  <ArrowDownUp className="mr-2 h-4 w-4" />
                  {queueReorderingEnabled ? "Terminer le réagencement" : "Réagencer la file"}
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-1 border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setQueueView("active");
                setQueueStatusFilter("all");
              }}
              aria-pressed={queueView === "active"}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors",
                queueView === "active" ? "border-[#1e665f] text-[#174f49]" : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              <Users className="h-4 w-4" />
              File active
              <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", queueView === "active" ? "bg-[#e7f3f1] text-[#1e665f]" : "bg-slate-100 text-slate-600")}>
                {activeQueue.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setQueueView("history");
                setQueueStatusFilter("all");
                setQueueReorderingEnabled(false);
              }}
              aria-pressed={queueView === "history"}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors",
                queueView === "history" ? "border-[#1e665f] text-[#174f49]" : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              <History className="h-4 w-4" />
              Historique
              <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", queueView === "history" ? "bg-[#e7f3f1] text-[#1e665f]" : "bg-slate-100 text-slate-600")}>
                {completedCount + cancelledCount}
              </span>
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="shrink-0 text-xs font-semibold text-slate-500">Statut</span>
              <div className="flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto py-0.5" role="group" aria-label="Filtrer les patients par statut">
                {queueFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    aria-pressed={queueStatusFilter === filter.value}
                    onClick={() => {
                      setQueueStatusFilter(filter.value);
                      if (filter.value !== "all") setQueueReorderingEnabled(false);
                    }}
                    className={cn(
                      "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
                      queueStatusFilter === filter.value
                        ? "border-[#1e665f] bg-[#e7f3f1] text-[#174f49]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    {filter.label}
                    <span className={cn(
                      "tabular-nums",
                      queueStatusFilter === filter.value ? "text-[#34776e]" : "text-slate-400"
                    )}>
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Colonnes</span>
              <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm" role="group" aria-label="Nombre de colonnes">
                <button
                  type="button"
                  aria-pressed={queueColumns === 1}
                  aria-label="Afficher une colonne"
                  title="Une colonne"
                  onClick={() => setQueueColumnsPreference(1)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors",
                    queueColumns === 1 ? "bg-[#e7f3f1] text-[#174f49]" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Rows3 className="h-3.5 w-3.5" />1
                </button>
                <button
                  type="button"
                  aria-pressed={queueColumns === 2}
                  aria-label="Afficher deux colonnes"
                  title="Deux colonnes"
                  onClick={() => setQueueColumnsPreference(2)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors",
                    queueColumns === 2 ? "bg-[#e7f3f1] text-[#174f49]" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Columns2 className="h-3.5 w-3.5" />2
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                aria-pressed={compactQueue}
                aria-label={compactQueue ? "Passer en affichage détaillé" : "Passer en affichage compact"}
                title={compactQueuePreference === null && activeQueue.length >= 20
                  ? "Affichage compact activé pour cette file chargée"
                  : undefined}
                onClick={() => setCompactQueuePreference(!compactQueue)}
                className="h-9 shrink-0 rounded-xl border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
              >
                {compactQueue ? <Rows4 className="mr-2 h-4 w-4" /> : <Rows3 className="mr-2 h-4 w-4" />}
                {compactQueue ? "Vue détaillée" : "Vue compacte"}
              </Button>
            </div>
          </div>

          {queueView === "active" && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-sky-100 bg-sky-50/70 px-3.5 py-3 text-xs leading-5 text-sky-950">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-sky-800" />
              <p>
                Ordre d’appel : urgence vitale, très prioritaire, priorité relative, rendez-vous à l’heure, confort, puis standard.
                La priorité organise la file, elle ne constitue pas un diagnostic. En urgence vitale, alertez le médecin sans délai.
              </p>
            </div>
          )}
          {canSetQueuePriority && queueReorderingEnabled && (
            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3.5 text-sm leading-5 text-amber-950 shadow-sm ring-1 ring-amber-200/70 animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-950">
                <ArrowDownUp className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">Mode réagencement exceptionnel activé</span>
                <span className="mt-0.5 block text-xs text-amber-900">
                  Les commandes de déplacement sont visibles. Vous pouvez glisser-déposer ou utiliser les flèches, uniquement entre patients de même priorité.
                  <span className="font-semibold"> Désactivez ce mode dès que l’ordre est ajusté.</span>
                </span>
              </span>
              <span className="hidden shrink-0 rounded-full border border-amber-300 bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900 sm:inline-flex">
                Mode actif
              </span>
            </div>
          )}
          {canSetQueuePriority && !canReorderQueue && queueView === "active" && (
            <p className="mt-2 text-xs text-slate-500">
              Pour réorganiser, affichez tous les patients et effacez la recherche.
            </p>
          )}

          <div className="mt-5">
            {isLoading ? (
              <div className="space-y-3" aria-label="Chargement de la file" aria-live="polite">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                ))}
              </div>
            ) : isError ? (
              <Card className="rounded-2xl border-rose-200 bg-rose-50/70">
                <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-rose-950">La file n’a pas pu être chargée.</p>
                    <p className="mt-1 text-sm text-rose-800">Vérifiez la connexion puis réessayez. Les données ne sont pas actualisées.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => void refetch()} className="rounded-xl border-rose-200 bg-white text-rose-900 hover:bg-rose-100">
                    <RefreshCw className="mr-2 h-4 w-4" />Réessayer
                  </Button>
                </CardContent>
              </Card>
            ) : visibleQueue.length === 0 ? (
              <Card className="rounded-2xl border-dashed border-slate-300 bg-white shadow-none">
                <CardContent className="flex flex-col items-center px-5 py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e7f3f1] text-[#34776e]">
                    {queueSearchQuery ? <Search className="h-6 w-6" /> : queueView === "active" ? <CheckCircle className="h-6 w-6" /> : <History className="h-6 w-6" />}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {queueSearchQuery
                      ? "Aucun résultat pour cette recherche"
                      : queueView === "active"
                        ? "La file active est vide"
                        : "Aucun passage dans l’historique"}
                  </h3>
                  <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                    {queueSearchQuery
                      ? "Essayez un autre nom, motif ou numéro de passage."
                      : queueView === "active"
                        ? "Les patients ajoutés aujourd’hui apparaîtront ici."
                        : "Les consultations terminées ou annulées apparaîtront ici."}
                  </p>
                  {queueView === "active" && !queueSearchQuery && (
                    <Button onClick={() => setIsAddDialogOpen(true)} className="mt-5 rounded-xl bg-[#1e665f] font-semibold text-white hover:bg-[#174f49]">
                      <Plus className="mr-2 h-4 w-4" />Ajouter un patient
                    </Button>
                  )}
                  {queueSearchQuery && (
                    <Button variant="ghost" onClick={() => setQueueSearchQuery("")} className="mt-3 text-slate-600">
                      Effacer la recherche
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className={cn(
                "grid grid-cols-1 gap-2.5",
                queueColumns === 2 && "xl:grid-cols-2"
              )}>
                {visibleQueue.map(renderQueueCard)}
              </div>
            )}
          </div>
        </section>
        </div>
      </main>
    </div>
  );
};

export default FileAttente;
