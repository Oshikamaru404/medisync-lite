import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Shield, Calendar, Baby, UserCheck, Clock, AlertTriangle } from "lucide-react";
import { differenceInYears, parseISO, format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Patient {
  id: string;
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  mutuelle?: string | null;
  date_naissance?: string | null;
  sexe?: string | null;
  created_at: string;
  medical_records?: { allergies: string | null } | null;
}

interface PatientCardProps {
  patient: Patient;
  onClick: () => void;
}

const calculateAge = (dateNaissance: string | null | undefined): number | null => {
  if (!dateNaissance) return null;
  try {
    return differenceInYears(new Date(), parseISO(dateNaissance));
  } catch {
    return null;
  }
};

const getAgeCategory = (age: number | null): "child" | "adult" | "senior" | null => {
  if (age === null) return null;
  if (age < 18) return "child";
  if (age >= 65) return "senior";
  return "adult";
};

const hasAllergies = (patient: Patient): boolean => {
  if (!patient.medical_records) return false;
  const allergies = patient.medical_records.allergies;
  return !!allergies && allergies.trim().length > 0;
};

const getGenderGradient = (sexe: string | null | undefined) => {
  switch (sexe) {
    case "M":
      return {
        gradient: "from-blue-50 via-blue-100/50 to-sky-50",
        border: "border-blue-200/60",
        accent: "bg-gradient-to-br from-blue-500 to-sky-400",
        iconBg: "bg-gradient-to-br from-blue-100 to-sky-100",
        iconColor: "text-blue-600",
        badgeClass: "bg-gradient-to-r from-blue-500 to-sky-400 text-white border-0",
      };
    case "F":
      return {
        gradient: "from-pink-50 via-rose-100/50 to-fuchsia-50",
        border: "border-pink-200/60",
        accent: "bg-gradient-to-br from-pink-500 to-rose-400",
        iconBg: "bg-gradient-to-br from-pink-100 to-rose-100",
        iconColor: "text-pink-600",
        badgeClass: "bg-gradient-to-r from-pink-500 to-rose-400 text-white border-0",
      };
    case "Autre":
      return {
        gradient: "from-violet-50 via-purple-100/50 to-indigo-50",
        border: "border-violet-200/60",
        accent: "bg-gradient-to-br from-violet-500 to-purple-400",
        iconBg: "bg-gradient-to-br from-violet-100 to-purple-100",
        iconColor: "text-violet-600",
        badgeClass: "bg-gradient-to-r from-violet-500 to-purple-400 text-white border-0",
      };
    default:
      return {
        gradient: "from-slate-50 via-gray-100/50 to-zinc-50",
        border: "border-slate-200/60",
        accent: "bg-gradient-to-br from-slate-500 to-gray-400",
        iconBg: "bg-gradient-to-br from-slate-100 to-gray-100",
        iconColor: "text-slate-600",
        badgeClass: "bg-muted text-muted-foreground",
      };
  }
};

const getAgeBadgeStyles = (category: "child" | "adult" | "senior" | null) => {
  switch (category) {
    case "child":
      return "bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0";
    case "senior":
      return "bg-gradient-to-r from-emerald-500 to-teal-400 text-white border-0";
    case "adult":
      return "bg-gradient-to-r from-slate-500 to-gray-400 text-white border-0";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const PatientCard = ({ patient, onClick }: PatientCardProps) => {
  const age = calculateAge(patient.date_naissance);
  const ageCategory = getAgeCategory(age);
  const styles = getGenderGradient(patient.sexe);
  const patientHasAllergies = hasAllergies(patient);

  return (
    <Card
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-300",
        "hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]",
        "border-2",
        styles.border,
      )}
      onClick={onClick}
    >
      {/* Background gradient */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", styles.gradient)} />

      {/* Decorative accent */}
      <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-bl-[100px] opacity-20", styles.accent)} />

      {/* Allergy alert badge */}
      {patientHasAllergies && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-gradient-to-r from-red-500 to-red-500 text-white border-0 shadow-lg animate-pulse gap-1">
            <AlertTriangle className="w-3 h-3" />
            Allergies
          </Badge>
        </div>
      )}

      <div className="relative p-5 space-y-4">
        {/* Header with avatar and name */}
        <div className="flex items-start gap-4">
          <div
            className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md", styles.iconBg)}
          >
            <User className={cn("w-7 h-7", styles.iconColor)} />
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <h3 className="text-lg font-bold text-foreground truncate">
              {patient.prenom} {patient.nom}
            </h3>
            {patient.email && <p className="text-sm text-muted-foreground truncate">{patient.email}</p>}
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-2">
          {patient.sexe && (
            <Badge className={cn("text-xs font-medium shadow-sm", styles.badgeClass)}>
              {patient.sexe === "M" ? "♂ Homme" : patient.sexe === "F" ? "♀ Femme" : "⚧ Autre"}
            </Badge>
          )}

          {age !== null && (
            <Badge className={cn("text-xs font-medium shadow-sm gap-1", getAgeBadgeStyles(ageCategory))}>
              {ageCategory === "child" && <Baby className="w-3 h-3" />}
              {ageCategory === "senior" && <Clock className="w-3 h-3" />}
              {ageCategory === "adult" && <UserCheck className="w-3 h-3" />}
              {age} ans
            </Badge>
          )}
        </div>

        {/* Info rows with modern styling */}
        <div className="space-y-2.5 pt-1">
          {patient.telephone && (
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-background/80 flex items-center justify-center shadow-sm">
                <Phone className="w-4 h-4 text-primary" />
              </div>
              <span className="text-foreground/80 truncate font-medium">{patient.telephone}</span>
            </div>
          )}

          {patient.mutuelle && (
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-background/80 flex items-center justify-center shadow-sm">
                <Shield className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-foreground/80 truncate font-medium">{patient.mutuelle}</span>
            </div>
          )}

          {patient.date_naissance && (
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-background/80 flex items-center justify-center shadow-sm">
                <Calendar className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-foreground/80 font-medium">
                {format(parseISO(patient.date_naissance), "dd MMM yyyy", { locale: fr })}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
