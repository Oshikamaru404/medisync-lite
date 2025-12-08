import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Shield, Calendar, Baby, UserCheck, Clock } from "lucide-react";
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

const getAgeCategory = (age: number | null): 'child' | 'adult' | 'senior' | null => {
  if (age === null) return null;
  if (age < 18) return 'child';
  if (age >= 65) return 'senior';
  return 'adult';
};

const getAgeCategoryLabel = (category: 'child' | 'adult' | 'senior' | null): string => {
  switch (category) {
    case 'child': return 'Enfant';
    case 'senior': return 'Senior';
    case 'adult': return 'Adulte';
    default: return '';
  }
};

const getGenderStyles = (sexe: string | null | undefined) => {
  switch (sexe) {
    case 'M':
      return {
        bgClass: 'bg-patient-male-light',
        borderClass: 'border-patient-male-border',
        iconColor: 'text-patient-male',
        badgeClass: 'bg-patient-male/10 text-patient-male border-patient-male/30',
      };
    case 'F':
      return {
        bgClass: 'bg-patient-female-light',
        borderClass: 'border-patient-female-border',
        iconColor: 'text-patient-female',
        badgeClass: 'bg-patient-female/10 text-patient-female border-patient-female/30',
      };
    case 'Autre':
      return {
        bgClass: 'bg-patient-other-light',
        borderClass: 'border-patient-other-border',
        iconColor: 'text-patient-other',
        badgeClass: 'bg-patient-other/10 text-patient-other border-patient-other/30',
      };
    default:
      return {
        bgClass: 'bg-card',
        borderClass: 'border-border',
        iconColor: 'text-muted-foreground',
        badgeClass: 'bg-muted text-muted-foreground',
      };
  }
};

const getAgeBadgeStyles = (category: 'child' | 'adult' | 'senior' | null) => {
  switch (category) {
    case 'child':
      return 'bg-age-child-light text-age-child border-age-child/30';
    case 'senior':
      return 'bg-age-senior-light text-age-senior border-age-senior/30';
    case 'adult':
      return 'bg-age-adult-light text-age-adult border-age-adult/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const PatientCard = ({ patient, onClick }: PatientCardProps) => {
  const age = calculateAge(patient.date_naissance);
  const ageCategory = getAgeCategory(age);
  const genderStyles = getGenderStyles(patient.sexe);

  return (
    <Card
      className={cn(
        "p-5 hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:-translate-y-0.5",
        genderStyles.bgClass,
        genderStyles.borderClass
      )}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header with avatar and name */}
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
            patient.sexe ? `bg-card` : 'bg-muted'
          )}>
            <User className={cn("w-6 h-6", genderStyles.iconColor)} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate">
              {patient.prenom} {patient.nom}
            </h3>
            {patient.email && (
              <p className="text-sm text-muted-foreground truncate">{patient.email}</p>
            )}
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-2">
          {patient.sexe && (
            <Badge variant="outline" className={cn("text-xs", genderStyles.badgeClass)}>
              {patient.sexe === 'M' ? '♂ Homme' : patient.sexe === 'F' ? '♀ Femme' : 'Autre'}
            </Badge>
          )}
          
          {age !== null && (
            <Badge variant="outline" className={cn("text-xs gap-1", getAgeBadgeStyles(ageCategory))}>
              {ageCategory === 'child' && <Baby className="w-3 h-3" />}
              {ageCategory === 'senior' && <Clock className="w-3 h-3" />}
              {ageCategory === 'adult' && <UserCheck className="w-3 h-3" />}
              {age} ans
            </Badge>
          )}
        </div>

        {/* Info rows */}
        <div className="space-y-2 pt-1">
          {patient.telephone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4 shrink-0" />
              <span className="truncate">{patient.telephone}</span>
            </div>
          )}
          
          {patient.mutuelle && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4 shrink-0" />
              <span className="truncate">{patient.mutuelle}</span>
            </div>
          )}

          {patient.date_naissance && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{format(parseISO(patient.date_naissance), "dd MMM yyyy", { locale: fr })}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
