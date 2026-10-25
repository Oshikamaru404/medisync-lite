import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, CalendarIcon, Check, Clock3, Trash2, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  cn,
  formatPatientName,
  getMoroccanPhoneDigits,
  isValidMoroccanPhone,
  sanitizeMoroccanPhoneInput,
} from "@/lib/utils";
import { usePatients, useCreatePatient } from "@/hooks/usePatients";
import { Appointment, useAppointments, useCreateAppointment, useUpdateAppointment, useDeleteAppointment } from "@/hooks/useAppointments";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";
import { DEFAULT_CABINET_WORKING_DAYS, parseCabinetWorkingDays } from "@/lib/cabinetWorkingDays";

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  defaultDate?: Date;
  defaultTime?: string;
}

const APPOINTMENT_TYPES = [
  { value: "consultation", label: "Consultation" },
  { value: "suivi", label: "Suivi" },
  { value: "urgence", label: "Urgence" },
  { value: "controle", label: "Contrôle" },
  { value: "vaccination", label: "Vaccination" },
  { value: "examen", label: "Examen" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmé" },
  { value: "cancelled", label: "Annulé" },
  { value: "completed", label: "Terminé" },
];

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90];

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const findScheduleConflict = (
  appointments: Appointment[],
  date: string,
  startMinutes: number,
  endMinutes: number,
  excludedAppointmentId?: string,
) => appointments.find((existing) => {
  if (
    existing.id === excludedAppointmentId
    || existing.date !== date
    || !["pending", "confirmed"].includes(existing.statut ?? "pending")
  ) return false;
  return startMinutes < timeToMinutes(existing.heure_fin)
    && timeToMinutes(existing.heure_debut) < endMinutes;
});

export const AppointmentDialog = ({
  open,
  onOpenChange,
  appointment,
  defaultDate,
  defaultTime,
}: AppointmentDialogProps) => {
  const { data: patients = [] } = usePatients();
  const { data: appointments = [] } = useAppointments();
  const { getSettingValue, isLoading: settingsLoading } = useSettings();
  const createPatient = useCreatePatient();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();

  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientData, setNewPatientData] = useState({ nom: "", prenom: "", telephone: "" });
  const [phoneError, setPhoneError] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const formHasBeenInteractedWith = useRef(false);
  const initializedAppointmentKey = useRef<string | null>(null);
  const openTime = getSettingValue("open_time") || "08:00";
  const closeTime = getSettingValue("close_time") || "19:00";
  const configuredDefaultDuration = getSettingValue("appointment_default_duration");
  const defaultDuration = DURATION_OPTIONS.includes(Number(configuredDefaultDuration))
    ? configuredDefaultDuration
    : "30";
  const configuredSlotInterval = Number(getSettingValue("appointment_slot_interval"));
  const slotIntervalMinutes = configuredSlotInterval === 15 || configuredSlotInterval === 30
    ? configuredSlotInterval
    : 30;
  const workingDaysSetting = getSettingValue("cabinet_working_days");
  const workingDays = useMemo(() => {
    try {
      return parseCabinetWorkingDays(workingDaysSetting);
    } catch (error) {
      console.error("Invalid cabinet working days setting:", error);
      return [...DEFAULT_CABINET_WORKING_DAYS];
    }
  }, [workingDaysSetting]);

  const [formData, setFormData] = useState<{
    patient_id: string;
    date: Date;
    heure_debut: string;
    duration: string;
    type: string;
    statut: 'confirmed' | 'pending' | 'cancelled' | 'completed';
    notes: string;
  }>({
    patient_id: "",
    date: defaultDate || new Date(),
    heure_debut: defaultTime || "09:00",
    duration: "30",
    type: "consultation",
    statut: "pending",
    notes: "",
  });

  const isEditing = !!appointment;
  const durationMinutes = Number(formData.duration);
  const startMinutes = timeToMinutes(formData.heure_debut);
  const endMinutes = startMinutes + durationMinutes;
  const endTime = minutesToTime(endMinutes);
  const isActiveAppointment = formData.statut === "pending" || formData.statut === "confirmed";
  const formDateKey = format(formData.date, "yyyy-MM-dd");
  const isWorkingDay = workingDays.includes(formData.date.getDay());
  const appointmentScheduleChanged = !appointment
    || appointment.date !== formDateKey
    || appointment.heure_debut.slice(0, 5) !== formData.heure_debut
    || appointment.heure_fin.slice(0, 5) !== endTime;
  const appointmentBecomesActive = !!appointment
    && appointment.statut !== "pending"
    && appointment.statut !== "confirmed"
    && isActiveAppointment;
  const shouldCheckSchedule = appointmentScheduleChanged || appointmentBecomesActive;
  const scheduleConflict = isActiveAppointment && shouldCheckSchedule
    ? findScheduleConflict(
      appointments,
      formDateKey,
      startMinutes,
      endMinutes,
      appointment?.id,
    )
    : undefined;
  const nextAvailableStart = (() => {
    if (!isWorkingDay) return null;

    const firstCandidate = Math.max(
      Math.ceil((startMinutes + 1) / slotIntervalMinutes) * slotIntervalMinutes,
      Math.ceil(timeToMinutes(openTime) / slotIntervalMinutes) * slotIntervalMinutes,
    );
    for (
      let candidate = firstCandidate;
      candidate + durationMinutes <= timeToMinutes(closeTime);
      candidate += slotIntervalMinutes
    ) {
      if (!findScheduleConflict(
        appointments,
        format(formData.date, "yyyy-MM-dd"),
        candidate,
        candidate + durationMinutes,
        appointment?.id,
      )) return minutesToTime(candidate);
    }
    return null;
  })();

  useEffect(() => {
    if (!open) {
      formHasBeenInteractedWith.current = false;
      initializedAppointmentKey.current = null;
      setScheduleError("");
      return;
    }

    const appointmentKey = appointment?.id ?? "new";
    if (initializedAppointmentKey.current !== appointmentKey) {
      initializedAppointmentKey.current = appointmentKey;
      formHasBeenInteractedWith.current = false;
    }
    if ((!appointment && settingsLoading) || formHasBeenInteractedWith.current) return;

    if (appointment) {
      setFormData({
        patient_id: appointment.patient_id,
        date: new Date(appointment.date),
        heure_debut: appointment.heure_debut.slice(0, 5),
        duration: String(timeToMinutes(appointment.heure_fin.slice(0, 5)) - timeToMinutes(appointment.heure_debut.slice(0, 5))),
        type: appointment.type,
        statut: appointment.statut,
        notes: appointment.notes || "",
      });
      setIsNewPatient(false);
    } else {
      setFormData({
        patient_id: "",
        date: defaultDate || new Date(),
        heure_debut: defaultTime || openTime,
        duration: defaultDuration,
        type: "consultation",
        statut: "pending",
        notes: "",
      });
      setIsNewPatient(false);
      setNewPatientData({ nom: "", prenom: "", telephone: "" });
      setPhoneError("");
    }
    setScheduleError("");
  }, [appointment, defaultDate, defaultDuration, defaultTime, open, openTime, settingsLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError("");

    if (isNewPatient && !isValidMoroccanPhone(newPatientData.telephone)) {
      setPhoneError("Le numéro doit contenir 10 chiffres et commencer par 0.");
      return;
    }
    setPhoneError("");
    
    let patientId = formData.patient_id;

    // If new patient, create them first
    if (isNewPatient && newPatientData.nom && newPatientData.prenom) {
      try {
        const newPatient = await createPatient.mutateAsync({
          nom: newPatientData.nom,
          prenom: newPatientData.prenom,
          cin: null,
          date_naissance: null,
          telephone: getMoroccanPhoneDigits(newPatientData.telephone) || null,
          email: null,
          adresse: null,
          mutuelle: null,
          numero_mutuelle: null,
          personne_contact: null,
          lien_personne_contact: null,
          telephone_personne_contact: null,
          sexe: null,
          poids: null,
          taille: null,
        });
        patientId = newPatient.id;
      } catch {
        return;
      }
    }

    if (!patientId) return;

    const startMinutes = timeToMinutes(formData.heure_debut);
    const endMinutes = startMinutes + Number(formData.duration);
    const endTime = minutesToTime(endMinutes);
    const activeStatus = formData.statut === "pending" || formData.statut === "confirmed";
    const scheduleNeedsValidation = !appointmentScheduleChanged
      ? appointmentBecomesActive
      : true;

    if (!Number.isFinite(endMinutes) || endMinutes <= startMinutes || endMinutes > 24 * 60) {
      setScheduleError("Vérifiez l’heure de début et la durée du rendez-vous.");
      return;
    }
    if (activeStatus && scheduleNeedsValidation && !isWorkingDay) {
      setScheduleError("Le cabinet est fermé ce jour. Choisissez une date parmi les jours de consultation définis dans Paramètres.");
      return;
    }
    if (
      scheduleNeedsValidation
      && (!isEditing || formData.heure_debut !== appointment?.heure_debut.slice(0, 5))
      && startMinutes % slotIntervalMinutes !== 0
    ) {
      setScheduleError(`Choisissez une heure de début sur un pas de ${slotIntervalMinutes} minutes.`);
      return;
    }
    if (scheduleNeedsValidation && (startMinutes < timeToMinutes(openTime) || endMinutes > timeToMinutes(closeTime))) {
      setScheduleError(`Le rendez-vous doit être compris entre ${openTime} et ${closeTime}.`);
      return;
    }

    const conflictingAppointment = activeStatus && scheduleNeedsValidation
      ? findScheduleConflict(
        appointments,
        formDateKey,
        startMinutes,
        endMinutes,
        appointment?.id,
      )
      : undefined;
    if (conflictingAppointment) {
      const conflictingName = formatPatientName(
        conflictingAppointment.patient?.nom,
        conflictingAppointment.patient?.prenom,
      );
      setScheduleError(
        `${conflictingName} a déjà un rendez-vous de ${conflictingAppointment.heure_debut.slice(0, 5)} à ${conflictingAppointment.heure_fin.slice(0, 5)}. Choisissez un autre créneau.`,
      );
      return;
    }

    const data = {
      patient_id: patientId,
      date: format(formData.date, "yyyy-MM-dd"),
      heure_debut: formData.heure_debut,
      heure_fin: endTime,
      type: formData.type,
      statut: formData.statut,
      notes: formData.notes || null,
    };

    if (isEditing && appointment) {
      updateAppointment.mutate(
        { id: appointment.id, ...data },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createAppointment.mutate(data, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const handleDelete = () => {
    if (appointment) {
      deleteAppointment.mutate(appointment.id, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isValid = isNewPatient 
    ? (newPatientData.nom && newPatientData.prenom) 
    : formData.patient_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl border-slate-200 p-0 sm:max-w-[560px]">
        <div className="rounded-t-2xl bg-[linear-gradient(115deg,#123f3b,#1c6259_58%,#31776d)] px-5 py-5 text-white sm:px-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight">
            {isEditing ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
          </DialogTitle>
          <DialogDescription className="text-xs text-white/75">
            {isEditing
              ? "Ajustez les informations et le créneau du patient."
              : "Choisissez un patient, puis trouvez un créneau sans chevauchement."}
          </DialogDescription>
        </DialogHeader>
        </div>

        <form
          onSubmit={handleSubmit}
          onChangeCapture={() => { formHasBeenInteractedWith.current = true; }}
          onClickCapture={() => { formHasBeenInteractedWith.current = true; }}
          className="space-y-5 px-5 py-5 sm:px-6"
        >
          {/* Patient Selection Toggle */}
          {!isEditing && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Label htmlFor="new-patient" className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <UserPlus className="w-4 h-4" />
                Nouveau patient
              </Label>
              <Switch
                id="new-patient"
                checked={isNewPatient}
                onCheckedChange={setIsNewPatient}
              />
            </div>
          )}

          {/* Patient Selection or New Patient */}
          {isNewPatient && !isEditing ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Prénom *</Label>
                  <Input
                    value={newPatientData.prenom}
                    onChange={(e) => setNewPatientData({ ...newPatientData, prenom: e.target.value })}
                    placeholder="Prénom"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nom *</Label>
                  <Input
                    value={newPatientData.nom}
                    onChange={(e) => setNewPatientData({ ...newPatientData, nom: e.target.value })}
                    placeholder="Nom"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Téléphone</Label>
                <Input
                  value={newPatientData.telephone}
                  onChange={(e) => {
                    setPhoneError("");
                    setNewPatientData({ ...newPatientData, telephone: sanitizeMoroccanPhoneInput(e.target.value) });
                  }}
                  placeholder="06 12 34 56 78"
                  className="h-9"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={20}
                  aria-invalid={!!phoneError}
                />
                <p className="text-xs text-muted-foreground">10 chiffres, indicatif +212 implicite.</p>
                {phoneError && <p role="alert" className="text-xs text-destructive">{phoneError}</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Patient *</Label>
              <Select
                value={formData.patient_id}
                onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
              >
                <SelectTrigger className="h-10 rounded-lg border-slate-200">
                  <SelectValue placeholder="Sélectionner un patient" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {formatPatientName(patient.nom, patient.prenom)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
                <Clock3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Créneau de consultation</h3>
                <p className="text-[11px] text-slate-500">Début par pas de 30 minutes · durée ajustable</p>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_1fr] gap-2.5 sm:grid-cols-[1.1fr_1fr_1fr]">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 w-full justify-start rounded-lg px-2.5 text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4 text-teal-700" />
                      <span className="truncate text-xs">{format(formData.date, "EEE d MMM yyyy", { locale: fr })}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto border bg-background p-0 shadow-lg" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => {
                        if (date) {
                          setScheduleError("");
                          setFormData({ ...formData, date });
                        }
                      }}
                      locale={fr}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="appointment-start" className="text-xs font-semibold text-slate-700">Début *</Label>
                <Input
                  id="appointment-start"
                  type="time"
                  value={formData.heure_debut}
                  step={slotIntervalMinutes * 60}
                  onChange={(e) => {
                    setScheduleError("");
                    setFormData({ ...formData, heure_debut: e.target.value });
                  }}
                  className="h-10 rounded-lg border-slate-200 tabular-nums"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="appointment-duration" className="text-xs font-semibold text-slate-700">Durée *</Label>
                <Select
                  value={formData.duration}
                  onValueChange={(value) => {
                    setScheduleError("");
                    setFormData({ ...formData, duration: value });
                  }}
                >
                  <SelectTrigger id="appointment-duration" className="h-10 rounded-lg border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 border bg-background shadow-lg">
                    {DURATION_OPTIONS.map((duration) => (
                      <SelectItem key={duration} value={String(duration)}>
                        {duration} minutes{duration === 30 ? " · standard" : ""}
                      </SelectItem>
                    ))}
                    {!DURATION_OPTIONS.includes(Number(formData.duration)) && (
                      <SelectItem value={formData.duration}>{formData.duration} minutes · durée actuelle</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-teal-50/80 px-3 py-2">
              <span className="text-xs font-medium text-teal-900">Fin estimée</span>
              <span className="text-sm font-bold tabular-nums text-teal-950">
                {Number.isFinite(endMinutes) ? endTime : "--:--"}
                <span className="ml-2 text-[10px] font-medium text-teal-700">
                  · {openTime}–{closeTime}
                </span>
              </span>
            </div>
            {!isWorkingDay && (!appointment || shouldCheckSchedule) && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                Cabinet fermé ce jour : un rendez-vous actif ne pourra pas être enregistré.
              </p>
            )}
            {scheduleConflict && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {formatPatientName(scheduleConflict.patient?.nom, scheduleConflict.patient?.prenom)}
                    {" "}occupe une partie de ce créneau ({scheduleConflict.heure_debut.slice(0, 5)}–{scheduleConflict.heure_fin.slice(0, 5)}).
                  </p>
                  <p className="mt-0.5 text-rose-800">Les rendez-vous actifs ne peuvent pas se chevaucher.</p>
                </div>
                {nextAvailableStart && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setScheduleError("");
                      setFormData({ ...formData, heure_debut: nextAvailableStart });
                    }}
                    className="h-7 shrink-0 border-rose-300 bg-white px-2 text-[10px] font-semibold text-rose-900 hover:bg-rose-100"
                  >
                    {nextAvailableStart} libre
                  </Button>
                )}
              </div>
            )}
            {scheduleError && !scheduleConflict && (
              <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-900">
                {scheduleError}
              </p>
            )}
          </section>

          {/* Type & Status Row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Motif du rendez-vous</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="h-10 rounded-lg border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {APPOINTMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Confirmation</Label>
              <Select
                value={formData.statut}
                onValueChange={(value: 'pending' | 'confirmed' | 'cancelled' | 'completed') => {
                  setScheduleError("");
                  setFormData({ ...formData, statut: value })
                }}
              >
                <SelectTrigger className="h-10 rounded-lg border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Note pour l’équipe <span className="font-normal text-slate-400">· facultatif</span></Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Précision utile à l’accueil ou au médecin…"
              rows={3}
              className="resize-none rounded-lg border-slate-200"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
            {isEditing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer le RDV ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="flex-1" />
            <Button type="button" variant="outline" className="rounded-lg" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid || !!scheduleConflict || !!scheduleError || createAppointment.isPending || updateAppointment.isPending || createPatient.isPending}
              className="rounded-lg bg-teal-800 font-semibold text-white hover:bg-teal-900"
            >
              {isEditing ? "Enregistrer" : "Créer le rendez-vous"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
