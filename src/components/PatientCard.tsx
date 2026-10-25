import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronRight, Phone, Shield, CreditCard, Hash } from "lucide-react";
import { differenceInYears, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn, formatPersonName, formatPhoneNumber } from "@/lib/utils";

interface Patient {
  id: string;
  nom: string;
  prenom: string;
  cin?: string | null;
  email?: string | null;
  telephone?: string | null;
  mutuelle?: string | null;
  numero_mutuelle?: string | null;
  date_naissance?: string | null;
  sexe?: string | null;
  created_at: string;
  medical_records?: { allergies: string | null } | null;
}

interface PatientCardProps {
  patient: Patient;
  onClick: () => void;
  view?: "grid" | "list";
  lastConsultationDate?: string | null;
  consultationDatesUnavailable?: boolean;
}

const calculateAge = (dateNaissance: string | null | undefined): number | null => {
  if (!dateNaissance) return null;
  try {
    return differenceInYears(new Date(), parseISO(dateNaissance));
  } catch {
    return null;
  }
};

export const PatientCard = ({
  patient,
  onClick,
  view = "grid",
  lastConsultationDate,
  consultationDatesUnavailable = false,
}: PatientCardProps) => {
  const age = calculateAge(patient.date_naissance);
  const allergies = patient.medical_records?.allergies?.trim();
  const sexStyle = patient.sexe === "F"
    ? {
        accent: "border-l-rose-400",
        avatar: "bg-rose-50 text-rose-700",
        badge: "border-rose-200 bg-rose-50 text-rose-800",
        tint: "from-rose-50/80 via-white to-white",
        initials: "bg-gradient-to-br from-rose-100 to-pink-50 text-rose-800",
        accentLine: "from-rose-400/80 via-pink-200 to-transparent",
      }
    : patient.sexe === "M"
      ? {
          accent: "border-l-sky-500",
          avatar: "bg-sky-50 text-sky-800",
          badge: "border-sky-200 bg-sky-50 text-sky-800",
          tint: "from-sky-50/80 via-white to-white",
          initials: "bg-gradient-to-br from-sky-100 to-cyan-50 text-sky-800",
          accentLine: "from-sky-500/80 via-cyan-200 to-transparent",
        }
      : {
          accent: "border-l-slate-400",
          avatar: "bg-slate-100 text-slate-600",
          badge: "border-slate-200 bg-slate-100 text-slate-600",
          tint: "from-slate-100/80 via-white to-white",
          initials: "bg-gradient-to-br from-slate-200 to-slate-50 text-slate-700",
          accentLine: "from-slate-400/80 via-slate-200 to-transparent",
        };
  const sexLabel = patient.sexe === "F"
    ? "Femme"
    : patient.sexe === "M"
      ? "Homme"
      : "Non renseigné";

  const formattedFirstName = formatPersonName(patient.prenom);
  const formattedLastName = formatPersonName(patient.nom);
  const formattedName = `${formattedLastName} ${formattedFirstName}`.trim();
  const identifierLabel = patient.cin ? "CIN" : "Dossier";
  const identifierValue = patient.cin || patient.id.slice(0, 8).toUpperCase();
  const initials = `${formattedFirstName.charAt(0)}${formattedLastName.charAt(0)}`.toLocaleUpperCase("fr");

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Ouvrir le dossier de ${formattedName}`}
      className={cn(
        "group relative cursor-pointer overflow-hidden border border-l-4 border-slate-200 bg-gradient-to-br shadow-sm transition-all duration-200",
        view === "grid" ? "rounded-2xl" : "rounded-xl",
        sexStyle.accent,
        view === "grid" ? sexStyle.tint : "bg-white",
        view === "grid" ? "hover:-translate-y-1 hover:shadow-lg" : "hover:border-teal-300 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2",
      )}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {view === "list" ? (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_20px] items-center gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_100px_56px_20px] sm:gap-3 sm:px-4 md:grid-cols-[minmax(0,1.2fr)_100px_56px_minmax(120px,1fr)_20px] xl:grid-cols-[minmax(0,1.2fr)_100px_56px_minmax(140px,1fr)_minmax(100px,0.8fr)_minmax(130px,1fr)_minmax(110px,0.8fr)_20px]">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold", sexStyle.initials)}>
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-900">{formattedName}</h3>
              <p className="mt-1 flex min-w-0 items-center gap-1 text-xs font-semibold text-indigo-800">
                {patient.cin ? <CreditCard className="h-3 w-3 shrink-0" aria-hidden="true" /> : <Hash className="h-3 w-3 shrink-0" aria-hidden="true" />}
                <span className="shrink-0">{identifierLabel} :</span>
                <span className="truncate font-mono tabular-nums">{identifierValue}</span>
              </p>
              {view === "list" && (
                <p className="mt-1 hidden text-xs text-slate-600 md:block xl:hidden">
                  Dernière consultation : {consultationDatesUnavailable ? "Indisponible" : lastConsultationDate ? format(parseISO(lastConsultationDate), "dd/MM/yyyy", { locale: fr }) : "Jamais"}
                </p>
              )}
              <div className="mt-1 grid min-w-0 gap-1 md:hidden">
                <p className="truncate text-xs font-semibold tabular-nums text-teal-900">
                  {patient.telephone ? formatPhoneNumber(patient.telephone) : "Téléphone non renseigné"}
                </p>
                <p className="truncate text-xs font-medium text-violet-900">
                  {patient.mutuelle
                    ? `${patient.mutuelle}${patient.numero_mutuelle ? ` · N° ${patient.numero_mutuelle}` : ""}`
                    : "Couverture non renseignée"}
                </p>
              </div>
              <p className="mt-1 hidden truncate text-xs font-semibold text-violet-900 md:block xl:hidden">
                {patient.mutuelle
                  ? `Couverture : ${patient.mutuelle}${patient.numero_mutuelle ? ` · N° ${patient.numero_mutuelle}` : ""}`
                  : "Couverture non renseignée"}
              </p>
            </div>
          </div>

          <div className="hidden min-w-0 sm:block">
            <Badge className={cn("h-6 max-w-full gap-1 border px-2 text-[11px] font-medium", sexStyle.badge)}>
              <span aria-hidden="true">{patient.sexe === "F" ? "♀" : patient.sexe === "M" ? "♂" : "•"}</span>
              <span className="truncate">{sexLabel}</span>
            </Badge>
          </div>

          <span className="hidden text-xs tabular-nums text-slate-600 sm:block">
            {age !== null ? `${age} ans` : "—"}
          </span>

          <div className="hidden min-w-0 items-center gap-1.5 text-xs text-slate-600 md:flex">
            {patient.telephone ? (
              <>
                <Phone className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                <span className="truncate text-sm font-bold tabular-nums text-teal-900">{formatPhoneNumber(patient.telephone)}</span>
              </>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>

          <div className="hidden min-w-0 items-center gap-1.5 text-xs text-slate-600 xl:flex">
            {patient.mutuelle ? (
              <>
                <Shield className="h-4 w-4 shrink-0 text-violet-700" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-violet-950">{patient.mutuelle}</span>
                  {patient.numero_mutuelle && <span className="block truncate text-[11px] tabular-nums text-violet-800">N° {patient.numero_mutuelle}</span>}
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-400"><Shield className="h-4 w-4" aria-hidden="true" />Non renseignée</span>
            )}
          </div>

          <div className="hidden min-w-0 xl:block">
            {allergies ? (
              <span
                title={`Allergies : ${allergies}`}
                className="flex min-w-0 items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-800"
              >
                <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{allergies}</span>
              </span>
            ) : (
              <span className="text-xs text-slate-400">—</span>
            )}
          </div>

          <div className="hidden min-w-0 xl:block">
            <p className="text-xs text-slate-500">Dernière consultation</p>
            <p className="mt-0.5 text-sm font-medium tabular-nums text-slate-700">
              {consultationDatesUnavailable ? "Indisponible" : lastConsultationDate ? format(parseISO(lastConsultationDate), "dd/MM/yyyy", { locale: fr }) : "Jamais"}
            </p>
          </div>

          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-teal-700" aria-hidden="true" />
        </div>
      ) : (
        <div className="relative space-y-3 p-4">
          <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r", sexStyle.accentLine)} />
          <div className="flex items-center gap-2.5">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm ring-1 ring-white/80", sexStyle.initials)}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-slate-900">{formattedName}</h3>
              <div className="mt-1 inline-flex max-w-full items-center gap-1 rounded-md border border-indigo-200/80 bg-indigo-50/80 px-1.5 py-0.5 text-[11px] font-medium text-indigo-800">
                {patient.cin ? <CreditCard className="h-3 w-3 shrink-0" aria-hidden="true" /> : <Hash className="h-3 w-3 shrink-0" aria-hidden="true" />}
                <span className="shrink-0">{identifierLabel} :</span>
                <span className="truncate font-mono tabular-nums">{identifierValue}</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-teal-700" aria-hidden="true" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className={cn("h-6 gap-1 border px-2 text-[11px] font-medium", sexStyle.badge)}>
              <span aria-hidden="true">{patient.sexe === "F" ? "♀" : patient.sexe === "M" ? "♂" : "•"}</span>
              {sexLabel}
            </Badge>
            {age !== null && (
              <Badge className="h-6 border border-slate-200 bg-white/80 px-2 text-[11px] font-normal text-slate-700 hover:bg-white">
                {age} ans
              </Badge>
            )}
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-1.5 border-t border-slate-200/70 pt-2 sm:grid-cols-2">
            <div className="min-w-0 rounded-md border border-teal-100 bg-teal-50/60 px-2 py-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-teal-800">Téléphone</p>
                <p className="truncate text-xs font-bold tabular-nums tracking-wide text-teal-950">
                  {patient.telephone ? formatPhoneNumber(patient.telephone) : "Non renseigné"}
                </p>
              </div>
              </div>
            </div>
            <div className="min-w-0 rounded-md border border-violet-100 bg-violet-50/60 px-2 py-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 shrink-0 text-violet-700" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-violet-800">Couverture</p>
                <p className="truncate text-xs font-semibold text-violet-950" title={patient.mutuelle || undefined}>
                  {patient.mutuelle || "Non renseignée"}
                </p>
                {patient.numero_mutuelle && (
                  <p className="truncate text-[10px] tabular-nums text-violet-800" title={`N° adhérent : ${patient.numero_mutuelle}`}>
                    N° adhérent : {patient.numero_mutuelle}
                  </p>
                )}
              </div>
              </div>
            </div>
          </div>

          {allergies && (
            <div className="flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50/90 px-2 py-1.5 text-[11px] font-medium text-rose-800">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Allergies : {allergies}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
