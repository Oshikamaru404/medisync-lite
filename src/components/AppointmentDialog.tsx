import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { usePatients, useCreatePatient } from "@/hooks/usePatients";
import { Appointment, useCreateAppointment, useUpdateAppointment, useDeleteAppointment } from "@/hooks/useAppointments";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";

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

export const AppointmentDialog = ({
  open,
  onOpenChange,
  appointment,
  defaultDate,
  defaultTime,
}: AppointmentDialogProps) => {
  const { data: patients = [] } = usePatients();
  const createPatient = useCreatePatient();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();

  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientData, setNewPatientData] = useState({ nom: "", prenom: "", telephone: "" });

  const [formData, setFormData] = useState<{
    patient_id: string;
    date: Date;
    heure_debut: string;
    heure_fin: string;
    type: string;
    statut: 'confirmed' | 'pending' | 'cancelled' | 'completed';
    notes: string;
  }>({
    patient_id: "",
    date: defaultDate || new Date(),
    heure_debut: defaultTime || "09:00",
    heure_fin: "09:30",
    type: "consultation",
    statut: "pending",
    notes: "",
  });

  const isEditing = !!appointment;

  useEffect(() => {
    if (appointment) {
      setFormData({
        patient_id: appointment.patient_id,
        date: new Date(appointment.date),
        heure_debut: appointment.heure_debut.slice(0, 5),
        heure_fin: appointment.heure_fin.slice(0, 5),
        type: appointment.type,
        statut: appointment.statut,
        notes: appointment.notes || "",
      });
      setIsNewPatient(false);
    } else {
      setFormData({
        patient_id: "",
        date: defaultDate || new Date(),
        heure_debut: defaultTime || "09:00",
        heure_fin: defaultTime ? `${parseInt(defaultTime.split(":")[0]) + 1}:00` : "09:30",
        type: "consultation",
        statut: "pending",
        notes: "",
      });
      setIsNewPatient(false);
      setNewPatientData({ nom: "", prenom: "", telephone: "" });
    }
  }, [appointment, defaultDate, defaultTime, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let patientId = formData.patient_id;

    // If new patient, create them first
    if (isNewPatient && newPatientData.nom && newPatientData.prenom) {
      try {
        const newPatient = await createPatient.mutateAsync({
          nom: newPatientData.nom,
          prenom: newPatientData.prenom,
          cin: null,
          date_naissance: null,
          telephone: newPatientData.telephone || null,
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

    const data = {
      patient_id: patientId,
      date: format(formData.date, "yyyy-MM-dd"),
      heure_debut: formData.heure_debut,
      heure_fin: formData.heure_fin,
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
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le RDV" : "Nouveau RDV"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifiez les détails du rendez-vous" : "Planifiez un nouveau rendez-vous"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Patient Selection Toggle */}
          {!isEditing && (
            <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
              <Label htmlFor="new-patient" className="text-sm flex items-center gap-2">
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
                  onChange={(e) => setNewPatientData({ ...newPatientData, telephone: e.target.value })}
                  placeholder="06 12 34 56 78"
                  className="h-9"
                  type="tel"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-xs">Patient *</Label>
              <Select
                value={formData.patient_id}
                onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sélectionner un patient" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.prenom} {patient.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date & Time Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-9 justify-start text-left font-normal px-2">
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    <span className="text-xs">{format(formData.date, "dd/MM", { locale: fr })}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border shadow-lg z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => date && setFormData({ ...formData, date })}
                    locale={fr}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Début *</Label>
              <Input
                type="time"
                value={formData.heure_debut}
                onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                className="h-9"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fin *</Label>
              <Input
                type="time"
                value={formData.heure_fin}
                onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                className="h-9"
                required
              />
            </div>
          </div>

          {/* Type & Status Row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="h-9">
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
              <Label className="text-xs">Statut</Label>
              <Select
                value={formData.statut}
                onValueChange={(value: 'pending' | 'confirmed' | 'cancelled' | 'completed') => 
                  setFormData({ ...formData, statut: value })
                }
              >
                <SelectTrigger className="h-9">
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
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
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
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              size="sm"
              disabled={!isValid || createAppointment.isPending || updateAppointment.isPending || createPatient.isPending}
            >
              {isEditing ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
