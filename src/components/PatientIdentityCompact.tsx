import { User, Phone, Mail, MapPin, Shield, Users, Edit, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Patient } from "@/hooks/usePatients";
import { differenceInYears, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type PatientWithExtras = Patient & {
  sexe?: string | null;
  numero_mutuelle?: string | null;
  lien_personne_contact?: string | null;
  telephone_personne_contact?: string | null;
};

interface PatientIdentityCompactProps {
  patient: PatientWithExtras;
  onEdit: () => void;
}

export const PatientIdentityCompact = ({ patient, onEdit }: PatientIdentityCompactProps) => {
  const calculateAge = (dateNaissance: string | null) => {
    if (!dateNaissance) return null;
    try {
      return differenceInYears(new Date(), parseISO(dateNaissance));
    } catch {
      return null;
    }
  };

  const age = calculateAge(patient.date_naissance);
  const sexe = (patient as any).sexe;

  return (
    <Card className="sticky top-24">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Identité
          </h3>
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 px-2">
            <Edit className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Basic Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {sexe && (
              <Badge className={cn(
                "text-xs",
                sexe === 'M' && "bg-blue-100 text-blue-700",
                sexe === 'F' && "bg-pink-100 text-pink-700",
                sexe === 'Autre' && "bg-gray-100 text-gray-700"
              )}>
                {sexe === 'M' ? '♂' : sexe === 'F' ? '♀' : '⚧'}
              </Badge>
            )}
            {age !== null && (
              <Badge variant="secondary" className="text-xs">{age} ans</Badge>
            )}
            {patient.date_naissance && (
              <span className="text-xs text-muted-foreground">
                {format(parseISO(patient.date_naissance), "dd/MM/yyyy")}
              </span>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          {patient.telephone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground">{patient.telephone}</span>
            </div>
          )}
          {patient.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground truncate">{patient.email}</span>
            </div>
          )}
          {patient.adresse && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
              <span className="text-foreground text-xs leading-relaxed">{patient.adresse}</span>
            </div>
          )}
        </div>

        {/* Mutuelle */}
        {patient.mutuelle && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
              <div>
                <span className="text-foreground">{patient.mutuelle}</span>
                {(patient as any).numero_mutuelle && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({(patient as any).numero_mutuelle})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Emergency Contact */}
        {patient.personne_contact && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-start gap-2 text-sm">
              <Users className="w-3.5 h-3.5 text-destructive mt-0.5" />
              <div className="text-xs">
                <p className="text-foreground font-medium">{patient.personne_contact}</p>
                {(patient as any).lien_personne_contact && (
                  <p className="text-muted-foreground">{(patient as any).lien_personne_contact}</p>
                )}
                {(patient as any).telephone_personne_contact && (
                  <p className="text-muted-foreground">{(patient as any).telephone_personne_contact}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Created date */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Depuis {format(new Date(patient.created_at), "MMM yyyy", { locale: fr })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
