import { User, Phone, Shield, Edit, Scale, CreditCard, Hash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Patient } from "@/hooks/usePatients";
import { differenceInYears, parseISO } from "date-fns";
import { cn, formatPatientName, formatPhoneNumber } from "@/lib/utils";

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

  const calculateIMC = (poids: number | null, taille: number | null) => {
    if (!poids || !taille || taille === 0) return null;
    const tailleM = taille / 100; // Convert cm to meters
    return poids / (tailleM * tailleM);
  };

  const getIMCCategory = (imc: number) => {
    if (imc < 18.5) return { label: "Insuffisance", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200" };
    if (imc < 25) return { label: "Normal", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-200" };
    if (imc < 30) return { label: "Surpoids", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200" };
    return { label: "Obésité", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-200" };
  };

  const age = calculateAge(patient.date_naissance);
  const sexe = patient.sexe;
  const fullName = formatPatientName(patient.nom, patient.prenom);
  const identifierLabel = patient.cin ? "N° CIN" : "N° dossier";
  const identifierValue = patient.cin || patient.id.slice(0, 8).toUpperCase();
  const imc = calculateIMC(patient.poids, patient.taille);
  const imcCategory = imc ? getIMCCategory(imc) : null;

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
        
        <h2 className="text-xl font-bold leading-tight text-foreground">{fullName}</h2>

        <div className="mt-3 rounded-xl border border-indigo-200/80 bg-white/80 p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
            {patient.cin ? <CreditCard className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
            {identifierLabel}
          </div>
          <p className="mt-1 break-all font-mono text-lg font-bold tracking-wide text-slate-900">
            {identifierValue}
          </p>
        </div>
        
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Badge className={cn(
            "text-xs font-medium",
            sexe === 'M' && "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
            sexe === 'F' && "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30",
            sexe !== 'M' && sexe !== 'F' && "bg-muted text-muted-foreground border-border"
          )}>
            {sexe === 'M' ? '♂ Homme' : sexe === 'F' ? '♀ Femme' : 'Non renseigné'}
          </Badge>
          {age !== null && (
            <Badge variant="secondary" className="text-xs font-medium">
              {age} ans
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="space-y-3 p-4">
        <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-800">
            <Phone className="h-4 w-4" />
            Téléphone
          </div>
          {patient.telephone ? (
            <a
              href={`tel:${patient.telephone}`}
              className="mt-1 block text-lg font-bold tabular-nums tracking-wide text-teal-950 hover:underline"
              aria-label={`Appeler le ${formatPhoneNumber(patient.telephone)}`}
            >
              {formatPhoneNumber(patient.telephone)}
            </a>
          ) : (
            <p className="mt-1 text-sm italic text-muted-foreground">Non renseigné</p>
          )}
        </div>

        <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-800">
            <Shield className="h-4 w-4" />
            Couverture médicale
          </div>
          <p className="mt-1 text-base font-bold text-violet-950">
            {patient.mutuelle || <span className="text-sm font-normal italic text-muted-foreground">Non renseignée</span>}
          </p>
          {patient.numero_mutuelle && (
            <p className="mt-0.5 text-sm font-medium tabular-nums text-violet-900">
              N° adhérent : {patient.numero_mutuelle}
            </p>
          )}
        </div>

        {/* Morphologie */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
            <Scale className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Morphologie</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {patient.poids ? (
                <Badge variant="outline" className="text-xs font-medium bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
                  {patient.poids} kg
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                  -- kg
                </Badge>
              )}
              {patient.taille ? (
                <Badge variant="outline" className="text-xs font-medium bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700">
                  {patient.taille} cm
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                  -- cm
                </Badge>
              )}
              {imc ? (
                <Badge variant="outline" className={cn("text-xs font-bold", imcCategory?.color)}>
                  IMC {imc.toFixed(1)} • {imcCategory?.label}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                  IMC --
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Contact d'urgence si présent */}
        {patient.personne_contact && (
          <div className="pt-3 mt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Contact d'urgence</p>
            <p className="text-sm font-medium text-foreground">{patient.personne_contact}</p>
            {patient.telephone_personne_contact && (
              <p className="text-sm font-medium tabular-nums text-muted-foreground">{formatPhoneNumber(patient.telephone_personne_contact)}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
