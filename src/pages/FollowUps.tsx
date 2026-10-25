import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertCircle,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  Phone,
  RefreshCw,
  Scissors,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  FollowUpTask,
} from "@/hooks/useFollowUpTasks";
import {
  useFollowUpTasks,
  useScheduleFollowUpAppointment,
  useUpdateFollowUpStatus,
} from "@/hooks/useFollowUpTasks";
import { formatPatientName, formatPhoneNumber } from "@/lib/utils";
import logo from "@/assets/shifalyx-wordmark.png";

const KIND_CONFIG = {
  control: { label: "Contrôle / résultats", icon: Stethoscope, tone: "blue" },
  exam: { label: "Examen au cabinet", icon: ClipboardCheck, tone: "violet" },
  referral: { label: "Référence vers un spécialiste", icon: Stethoscope, tone: "teal" },
  surgery: { label: "Préparation chirurgicale", icon: Scissors, tone: "violet" },
} as const;

const STATUS_LABELS = {
  to_contact: "À contacter",
  unreachable: "À rappeler",
  declined: "Suivi refusé",
  scheduled: "Rendez-vous confirmé",
  arranged: "Pris en charge",
  completed: "Suivi effectué",
  cancelled: "Suivi annulé",
} as const;

const getLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const FollowUps = () => {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading, isError, refetch } = useFollowUpTasks();
  const updateStatus = useUpdateFollowUpStatus();
  const scheduleAppointment = useScheduleFollowUpAppointment();
  const [selectedTask, setSelectedTask] = useState<FollowUpTask | null>(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");

  const today = getLocalDateKey(new Date());
  const activeTasks = useMemo(
    () => tasks.filter((task) => task.status === "to_contact" || task.status === "unreachable"),
    [tasks],
  );
  const historyTasks = useMemo(
    () => tasks.filter((task) => task.status !== "to_contact" && task.status !== "unreachable"),
    [tasks],
  );
  const overdueCount = activeTasks.filter((task) => task.due_date !== null && task.due_date < today).length;

  const openScheduleDialog = (task: FollowUpTask) => {
    setSelectedTask(task);
    setAppointmentDate(task.due_date && task.due_date >= today ? task.due_date : today);
    setStartTime("09:00");
    setEndTime("09:30");
  };

  const handleScheduleAppointment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTask) return;

    try {
      await scheduleAppointment.mutateAsync({
        followUpId: selectedTask.id,
        date: appointmentDate,
        heureDebut: startTime,
        heureFin: endTime,
      });
      setSelectedTask(null);
    } catch {
      // The mutation reports the error and leaves the follow-up open.
    }
  };

  const handleContactOutcome = async (task: FollowUpTask, status: "unreachable" | "declined" | "arranged") => {
    try {
      await updateStatus.mutateAsync({ id: task.id, status });
    } catch {
      // The mutation reports the error and keeps the task available.
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f8f8] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <img src={logo} alt="Shifalyx" className="h-9 w-[150px] shrink-0 object-contain sm:h-10 sm:w-[180px]" />
            <div className="hidden h-9 w-px bg-slate-200 sm:block" />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-base font-bold text-slate-900 sm:text-lg">Suivis du cabinet</p>
              <p className="text-xs font-medium text-teal-700">Les prochaines étapes, sans perdre le fil</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/agenda")} className="hidden rounded-xl sm:inline-flex">
              Voir l’agenda
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-7 px-5 py-7 sm:px-8 sm:py-9">
        <section className="relative isolate overflow-hidden rounded-[28px] border border-[#173b49] bg-[#102c3a] px-6 py-7 text-white shadow-[0_22px_60px_-28px_rgba(16,44,58,0.55)] sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-4 -top-24 -z-10 h-64 w-64 rounded-full bg-teal-300/10 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-teal-100">
                <CalendarClock className="h-3.5 w-3.5" />
                CONTINUITÉ DES SOINS
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">La suite, bien organisée.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                Les suivis recommandés par le médecin restent à organiser jusqu’à ce que le patient confirme.
                Un rendez-vous confirmé rejoint ensuite l’agenda — jamais la file du jour.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs font-medium text-slate-300">À organiser</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{isLoading || isError ? "—" : activeTasks.length}</p>
              </div>
              <div className={`rounded-2xl border p-4 ${overdueCount ? "border-amber-200/30 bg-amber-300/10" : "border-white/10 bg-white/[0.06]"}`}>
                <p className="text-xs font-medium text-slate-300">Échéance dépassée</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{isLoading || isError ? "—" : overdueCount}</p>
              </div>
            </div>
          </div>
        </section>

        <Tabs defaultValue="todo" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Suivis recommandés</h2>
              <p className="mt-1 text-sm text-slate-500">Organisez la prochaine étape sans confondre orientation et rendez-vous confirmé.</p>
            </div>
            <TabsList className="h-11 rounded-xl bg-slate-200/70 p-1">
              <TabsTrigger value="todo" className="rounded-lg px-4">
                À organiser <span className="ml-2 text-xs tabular-nums">{isLoading || isError ? "—" : activeTasks.length}</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-lg px-4">
                Historique <span className="ml-2 text-xs tabular-nums">{isLoading || isError ? "—" : historyTasks.length}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="todo" className="mt-0">
            {isLoading ? (
              <div className="grid gap-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                ))}
              </div>
            ) : isError ? (
              <Card className="rounded-2xl border-rose-200 bg-white">
                <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                    <AlertCircle className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Les suivis n’ont pas pu être chargés.</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Vérifiez la connexion et appliquez, dans l’ordre, les migrations de suivi indiquées dans le README.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => void refetch()}>
                    <RefreshCw className="mr-2 h-4 w-4" />Réessayer
                  </Button>
                </CardContent>
              </Card>
            ) : activeTasks.length === 0 ? (
              <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
                <CardContent className="flex flex-col items-center px-6 py-12 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    <CheckCircle2 className="h-7 w-7" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">Tout est à jour</h3>
                  <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                    Les nouveaux suivis recommandés apparaîtront ici à la fin d’une consultation.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {activeTasks.map((task) => (
                  <FollowUpCard
                    key={task.id}
                    task={task}
                    today={today}
                    isUpdating={updateStatus.isPending}
                    onSchedule={openScheduleDialog}
                    onArrange={(item) => void handleContactOutcome(item, "arranged")}
                    onUnreachable={(item) => void handleContactOutcome(item, "unreachable")}
                    onDecline={(item) => void handleContactOutcome(item, "declined")}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            {isError ? (
              <Card className="rounded-2xl border-rose-200 bg-white">
                <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                    <AlertCircle className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">L’historique n’a pas pu être chargé.</p>
                    <p className="mt-1 text-sm text-slate-500">Vérifiez la connexion et appliquez, dans l’ordre, les migrations de suivi indiquées dans le README.</p>
                  </div>
                  <Button variant="outline" onClick={() => void refetch()}>
                    <RefreshCw className="mr-2 h-4 w-4" />Réessayer
                  </Button>
                </CardContent>
              </Card>
            ) : historyTasks.length === 0 ? (
              <Card className="rounded-2xl border-slate-200/80 bg-white">
                <CardContent className="p-10 text-center text-sm text-slate-500">
                  Les suivis planifiés ou clôturés apparaîtront ici.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {historyTasks.map((task) => (
                  <FollowUpCard key={task.id} task={task} today={today} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer le rendez-vous</DialogTitle>
            <DialogDescription>
              {selectedTask
                ? `Choisissez une date convenue avec ${formatPatientName(selectedTask.patients.nom, selectedTask.patients.prenom)}. Le rendez-vous sera ajouté à l’agenda.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void handleScheduleAppointment(event)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="follow-up-appointment-date">Date convenue</Label>
              <Input
                id="follow-up-appointment-date"
                type="date"
                min={today}
                value={appointmentDate}
                onChange={(event) => setAppointmentDate(event.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="follow-up-start-time">Début</Label>
                <Input
                  id="follow-up-start-time"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="follow-up-end-time">Fin</Label>
                <Input
                  id="follow-up-end-time"
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setSelectedTask(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={scheduleAppointment.isPending}>
                <CalendarPlus className="mr-2 h-4 w-4" />
                {scheduleAppointment.isPending ? "Confirmation…" : "Confirmer et ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function FollowUpCard({
  task,
  today,
  isUpdating = false,
  onSchedule,
  onArrange,
  onUnreachable,
  onDecline,
}: {
  task: FollowUpTask;
  today: string;
  isUpdating?: boolean;
  onSchedule?: (task: FollowUpTask) => void;
  onArrange?: (task: FollowUpTask) => void;
  onUnreachable?: (task: FollowUpTask) => void;
  onDecline?: (task: FollowUpTask) => void;
}) {
  const kind = KIND_CONFIG[task.kind];
  const KindIcon = kind.icon;
  const isOpen = task.status === "to_contact" || task.status === "unreachable";
  const isOverdue = isOpen && task.due_date !== null && task.due_date < today;
  const tone = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    teal: "bg-teal-50 text-teal-700 ring-teal-100",
  }[kind.tone];

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${tone}`}>
            <KindIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-slate-900">
                {formatPatientName(task.patients.nom, task.patients.prenom)}
              </h3>
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                {STATUS_LABELS[task.status]}
              </Badge>
              {isOverdue && (
                <Badge className="border-amber-200 bg-amber-50 text-amber-800">En retard</Badge>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
              <span className="font-medium text-slate-800">{kind.label}</span>
              <span className={isOverdue ? "font-semibold text-amber-800" : ""}>
                {task.status === "scheduled" && task.appointments
                  ? `RDV ${format(parseISO(task.appointments.date), "d MMM yyyy", { locale: fr })} à ${task.appointments.heure_debut.slice(0, 5)}`
                  : task.due_date
                    ? `Échéance souhaitée : ${format(parseISO(task.due_date), "d MMMM yyyy", { locale: fr })}`
                    : "Sans date souhaitée"}
              </span>
              {task.patients.telephone && (
                <a
                  href={`tel:${task.patients.telephone}`}
                  className="inline-flex items-center gap-1.5 font-medium text-teal-800 hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {formatPhoneNumber(task.patients.telephone)}
                </a>
              )}
            </div>
            {task.instruction && (
              <p className="mt-2 max-w-2xl text-sm leading-5 text-slate-500">{task.instruction}</p>
            )}
            {(task.specialty || task.contact_name || task.destination) && (
              <p className="mt-1 text-sm font-medium text-slate-700">
                {task.kind === "referral"
                  ? <>Orientation : {task.specialty}{task.contact_name ? ` · Dr ${task.contact_name.replace(/^Dr\.?\s*/i, "")}` : ""}</>
                  : <>Intervention : {task.destination}</>}
              </p>
            )}
            {task.status === "unreachable" && task.last_contact_at && (
              <p className="mt-2 text-xs text-amber-800">
                Dernière tentative : {format(parseISO(task.last_contact_at), "d MMM à HH:mm", { locale: fr })}
              </p>
            )}
          </div>
        </div>

        {isOpen && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {task.patients.telephone && (
              <Button asChild variant="outline" className="rounded-xl">
                <a href={`tel:${task.patients.telephone}`}>
                  <Phone className="mr-2 h-4 w-4" />Appeler
                </a>
              </Button>
            )}
            {task.kind === "control" || task.kind === "exam" ? (
              <Button onClick={() => onSchedule?.(task)} className="rounded-xl bg-teal-700 hover:bg-teal-800">
                <CalendarPlus className="mr-2 h-4 w-4" />
                {task.kind === "control" ? "Planifier le contrôle" : "Planifier l’examen"}
              </Button>
            ) : (
              <Button
                onClick={() => onArrange?.(task)}
                disabled={isUpdating}
                className="rounded-xl bg-teal-700 hover:bg-teal-800"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {task.kind === "referral" ? "Marquer transmis" : "Marquer organisé"}
              </Button>
            )}
            <Button
              variant="outline"
              disabled={isUpdating}
              onClick={() => onUnreachable?.(task)}
              className="rounded-xl"
              aria-label={task.status === "unreachable" ? "Enregistrer une nouvelle tentative" : "Marquer le patient injoignable"}
            >
              {task.status === "unreachable" ? "Nouvel essai" : "Injoignable"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" disabled={isUpdating} className="rounded-xl text-slate-500 hover:text-rose-700">
                  Clore
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clore ce suivi ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Confirmez uniquement si le patient ne souhaite pas organiser cette suite. La consultation d’origine restera dans son dossier.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Garder le suivi</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDecline?.(task)}>Clore le suivi</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FollowUps;
