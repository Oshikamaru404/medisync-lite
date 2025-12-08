import { User, Phone, Shield, Edit, Hash, Ruler } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Patient } from "@/hooks/usePatients";
import { differenceInYears, parseISO } from "date-fns";
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
  const fullName = `${patient.prenom} ${patient.nom}`.toUpperCase();

  const InfoRow = ({ icon: Icon, label, value, className }: { 
    icon: React.ElementType; 
    label: string; 
    value: string | null | undefined;
    className?: string;
  }) => {
    if (!value) return null;
    return (
      <div className={cn("flex items-center gap-3 py-2", className)}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium text-foreground truncate">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <Card className="sticky top-24 overflow-hidden">
      {/* Header with name and badges */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 border-b border-border/50">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 px-2 hover:bg-background/50">
            <Edit className="w-4 h-4" />
          </Button>
        </div>
        
        <h2 className="text-lg font-bold text-foreground tracking-wide">{fullName}</h2>
        
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {sexe && (
            <Badge className={cn(
              "text-xs font-medium",
              sexe === 'M' && "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
              sexe === 'F' && "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30",
              sexe === 'Autre' && "bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30"
            )}>
              {sexe === 'M' ? '♂ Homme' : sexe === 'F' ? '♀ Femme' : '⚧ Autre'}
            </Badge>
          )}
          {age !== null && (
            <Badge variant="secondary" className="text-xs font-medium">
              {age} ans
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-1">
        {/* ID Patient */}
        <InfoRow 
          icon={Hash} 
          label="N° Patient" 
          value={patient.id.slice(0, 8).toUpperCase()}
        />

        {/* Téléphone */}
        <InfoRow 
          icon={Phone} 
          label="Téléphone" 
          value={patient.telephone}
        />

        {/* Mutuelle */}
        <InfoRow 
          icon={Shield} 
          label="Mutuelle" 
          value={patient.mutuelle ? `${patient.mutuelle}${(patient as any).numero_mutuelle ? ` (${(patient as any).numero_mutuelle})` : ''}` : null}
        />

        {/* IMC - placeholder for future */}
        <InfoRow 
          icon={Ruler} 
          label="IMC" 
          value={null} // À ajouter quand les données seront disponibles
        />

        {/* Contact d'urgence si présent */}
        {patient.personne_contact && (
          <div className="pt-3 mt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Contact d'urgence</p>
            <p className="text-sm font-medium text-foreground">{patient.personne_contact}</p>
            {(patient as any).telephone_personne_contact && (
              <p className="text-xs text-muted-foreground">{(patient as any).telephone_personne_contact}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
