import { useEffect, useMemo, useState } from "react";
import { Pill, Calendar, Eye, Printer, Trash2, FlaskConical, ScanLine, Pencil, RefreshCw, Search, X, Plus, ClipboardList, ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { usePrescriptions, usePrescription, useDeletePrescription, type PrescriptionType } from "@/hooks/usePrescriptions";
import { PrescriptionDialog } from "@/components/PrescriptionDialog";
import { PrescriptionPreview } from "@/components/PrescriptionPreview";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface PrescriptionsListProps {
  patientId: string;
  patientName: string;
  initialPrescriptionId?: string | null;
  onInitialPrescriptionOpened?: () => void;
}

export const PrescriptionsList = ({
  patientId,
  patientName,
  initialPrescriptionId,
  onInitialPrescriptionOpened,
}: PrescriptionsListProps) => {
  const { data: prescriptions = [], isLoading, isError, refetch } = usePrescriptions(patientId);
  const deletePrescription = useDeletePrescription();
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(initialPrescriptionId ?? null);
  const [autoPrintPrescriptionId, setAutoPrintPrescriptionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | PrescriptionType>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "30" | "90" | "year">("all");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  useEffect(() => {
    if (!initialPrescriptionId) return;
    if (isLoading) return;
    if (isError || !prescriptions.some(({ id }) => id === initialPrescriptionId)) {
      toast.error("Cette prescription n’est pas disponible dans ce dossier patient.");
      onInitialPrescriptionOpened?.();
      return;
    }
    setSelectedPrescriptionId(initialPrescriptionId);
    onInitialPrescriptionOpened?.();
  }, [initialPrescriptionId, isLoading, isError, prescriptions, onInitialPrescriptionOpened]);
  const counts = useMemo(() => ({
    medication: prescriptions.filter((prescription) => prescription.prescription_type === "medication").length,
    laboratory: prescriptions.filter((prescription) => prescription.prescription_type === "laboratory").length,
    imaging: prescriptions.filter((prescription) => prescription.prescription_type === "imaging").length,
  }), [prescriptions]);
  const filteredPrescriptions = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    const now = new Date();
    const cutoff = dateFilter === "30"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
      : dateFilter === "90"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90)
        : dateFilter === "year"
          ? new Date(now.getFullYear(), 0, 1)
          : null;

    return prescriptions.filter((prescription) => {
      if (typeFilter !== "all" && prescription.prescription_type !== typeFilter) return false;
      if (cutoff && new Date(prescription.date) < cutoff) return false;
      if (!query) return true;
      const date = format(new Date(prescription.date), "d MMMM yyyy", { locale: fr });
      const type = prescription.prescription_type === "laboratory"
        ? "analyses biologie laboratoire"
        : prescription.prescription_type === "imaging"
          ? "imagerie radiologie"
          : "ordonnance médicament";
      return `${type} ${prescription.notes || ""} ${date}`.toLocaleLowerCase().includes(query);
    }).sort((left, right) => {
      const dateDifference = new Date(left.date).getTime() - new Date(right.date).getTime();
      const stableDifference = dateDifference || new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
      return dateSort === "newest" ? -stableDifference : stableDifference;
    });
  }, [prescriptions, searchQuery, typeFilter, dateFilter, dateSort]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
          <Pill className="h-5 w-5 animate-pulse" />
        </div>
        <p className="text-sm text-slate-600">Chargement des ordonnances...</p>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="flex flex-col gap-3 rounded-2xl border-rose-200 bg-rose-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-rose-950">Ordonnances indisponibles</h3>
          <p className="mt-1 text-xs text-rose-800">Les prescriptions de ce patient n’ont pas pu être chargées.</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0 border-rose-200 bg-white text-rose-900" onClick={() => void refetch()}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />Réessayer
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-[#d7e7df] bg-[linear-gradient(125deg,#edf7f1_0%,#f8fbf8_52%,#f0f6f4_100%)] shadow-sm">
        <div className="flex flex-col gap-5 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white bg-white/80 text-[#23634f] shadow-sm">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#668777]">Espace de prescription</p>
              <h3 className="mt-1 text-xl font-bold tracking-tight text-[#194d40]">Prescriptions</h3>
              <p className="mt-1 max-w-xl text-xs leading-5 text-[#5f766a]">Ordonnance, biologie et imagerie réunies dans le parcours clinique de {patientName}.</p>
            </div>
          </div>
          <PrescriptionDialog patientId={patientId} patientName={patientName}>
            <Button type="button" className="h-10 gap-2 rounded-xl bg-[#23634f] px-4 text-white shadow-sm hover:bg-[#194d40]">
              <Plus className="h-4 w-4" />Nouvelle prescription
            </Button>
          </PrescriptionDialog>
        </div>
        <div className="flex flex-wrap gap-2.5 border-t border-[#dce9e2] bg-white/55 p-3 sm:gap-3 sm:p-4" role="group" aria-label="Filtrer les prescriptions">
          {([
            { key: "medication", label: "Ordonnance", value: counts.medication, icon: Pill, selected: "border-sky-500 bg-sky-100 text-sky-950 ring-2 ring-sky-200 shadow-sm", idle: "border-sky-100 bg-sky-50/75 text-sky-900 hover:border-sky-300 hover:bg-sky-50", iconTone: "bg-sky-100 text-sky-800" },
            { key: "laboratory", label: "Prescription biologique", value: counts.laboratory, icon: FlaskConical, selected: "border-emerald-600 bg-emerald-100 text-emerald-950 ring-2 ring-emerald-200 shadow-sm", idle: "border-emerald-100 bg-emerald-50/75 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50", iconTone: "bg-emerald-100 text-emerald-800" },
            { key: "imaging", label: "Prescription d’imagerie", value: counts.imaging, icon: ScanLine, selected: "border-violet-500 bg-violet-100 text-violet-950 ring-2 ring-violet-200 shadow-sm", idle: "border-violet-100 bg-violet-50/75 text-violet-900 hover:border-violet-300 hover:bg-violet-50", iconTone: "bg-violet-100 text-violet-800" },
          ] as const).map(({ key, label, value, icon: Icon, selected, idle, iconTone }) => (
            <button
              key={key}
              type="button"
              aria-pressed={typeFilter === key}
              onClick={() => setTypeFilter(key)}
              className={`flex min-h-12 flex-1 items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#56866c] focus-visible:ring-offset-2 sm:flex-none sm:gap-3 sm:px-4 ${typeFilter === key ? selected : idle}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block whitespace-nowrap text-[11px] font-semibold sm:text-xs">{label}</span>
              </span>
              <span className={`ml-auto flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-2 text-xs font-bold tabular-nums ${typeFilter === key ? "bg-white/80" : "bg-white/80"}`}>{value}</span>
            </button>
          ))}
          <button
            type="button"
            aria-pressed={typeFilter === "all"}
            onClick={() => setTypeFilter("all")}
            className={`min-h-12 rounded-2xl border px-4 py-2.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#56866c] focus-visible:ring-offset-2 ${typeFilter === "all" ? "border-[#28664f] bg-[#e5f1e9] text-[#174d3c] ring-2 ring-[#c6dece] shadow-sm" : "border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white"}`}
          >
            Tout afficher
          </button>
        </div>
      </section>

      {prescriptions.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Historique des prescriptions</h4>
              <p className="mt-0.5 text-[11px] text-slate-500">{filteredPrescriptions.length} sur {prescriptions.length} prescription{prescriptions.length === 1 ? "" : "s"}</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <div className="relative w-full sm:w-[min(100%,19rem)]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Rechercher dans les notes, le type, la date…"
                  aria-label="Rechercher une prescription"
                  className="h-10 rounded-xl border-slate-200 bg-white pl-9 pr-9 shadow-sm"
                />
                {searchQuery && (
                  <button type="button" aria-label="Effacer la recherche" onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Select value={dateFilter} onValueChange={(value: "all" | "30" | "90" | "year") => setDateFilter(value)}>
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs shadow-sm sm:w-[155px]" aria-label="Filtrer par période">
                  <Calendar className="mr-2 h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 bg-white">
                  <SelectItem value="all">Toutes les dates</SelectItem>
                  <SelectItem value="30">30 derniers jours</SelectItem>
                  <SelectItem value="90">90 derniers jours</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateSort} onValueChange={(value: "newest" | "oldest") => setDateSort(value)}>
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs shadow-sm sm:w-[155px]" aria-label="Trier les prescriptions par date">
                  <ArrowDownUp className="mr-2 h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 bg-white">
                  <SelectItem value="newest">Plus récentes</SelectItem>
                  <SelectItem value="oldest">Plus anciennes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {filteredPrescriptions.length > 0 ? (
            <div className="grid gap-3">
              {filteredPrescriptions.map((prescription) => (
                <PrescriptionCard
                  key={prescription.id}
                  prescription={prescription}
                  patientId={patientId}
                  patientName={patientName}
                  deleting={deletePrescription.isPending}
                  onView={() => setSelectedPrescriptionId(prescription.id)}
                  onPrint={() => {
                    setAutoPrintPrescriptionId(prescription.id);
                    setSelectedPrescriptionId(prescription.id);
                  }}
                  onDelete={() => deletePrescription.mutate({ id: prescription.id, patientId })}
                />
              ))}
            </div>
          ) : (
            <Card className="rounded-2xl border-dashed border-slate-300 bg-white p-8 text-center shadow-none">
              <Search className="mx-auto h-5 w-5 text-slate-400" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-slate-700">Aucun document ne correspond</p>
              <p className="mt-1 text-xs text-slate-500">Modifiez la recherche ou choisissez un autre type.</p>
              <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => { setSearchQuery(""); setTypeFilter("all"); setDateFilter("all"); setDateSort("newest"); }}>Effacer les filtres</Button>
            </Card>
          )}
        </section>
      )}

      {prescriptions.length === 0 && (
        <Card className="rounded-2xl border-dashed border-[#cbded3] bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf7f1] text-[#23634f]">
            <Pill className="h-6 w-6" aria-hidden="true" />
          </div>
          <h4 className="mt-4 text-base font-bold text-slate-900">Le suivi des prescriptions commence ici</h4>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-500">Créez une ordonnance, une prescription biologique ou une prescription d’imagerie. Tout restera accessible dans l’historique du patient.</p>
          <PrescriptionDialog patientId={patientId} patientName={patientName}>
            <Button type="button" className="mt-4 gap-2 rounded-xl bg-[#23634f] text-white shadow-sm hover:bg-[#194d40]">
              <Plus className="h-4 w-4" />Créer le premier document
            </Button>
          </PrescriptionDialog>
        </Card>
      )}

      {selectedPrescriptionId && (
        <PrescriptionPreview
          prescriptionId={selectedPrescriptionId}
          patientName={patientName}
          autoPrint={autoPrintPrescriptionId === selectedPrescriptionId}
          onClose={() => {
            setSelectedPrescriptionId(null);
            setAutoPrintPrescriptionId(null);
          }}
        />
      )}
    </div>
  );
};

interface PrescriptionCardProps {
  prescription: {
    id: string;
    date: string;
    notes: string | null;
    created_at: string;
    prescription_type: "medication" | "laboratory" | "imaging";
  };
  patientId: string;
  patientName: string;
  deleting: boolean;
  onView: () => void;
  onPrint: () => void;
  onDelete: () => void;
}

const PrescriptionCard = ({
  prescription,
  patientId,
  patientName,
  deleting,
  onView,
  onPrint,
  onDelete,
}: PrescriptionCardProps) => {
  const { data: fullPrescription, isLoading } = usePrescription(prescription.id);
  const items = fullPrescription?.items || [];
  const medicationItems = items.filter((item) => item.request_type === "medication");
  const medicationCount = medicationItems.length;
  const laboratoryCount = items.filter((item) => item.request_type === "laboratory").length;
  const imagingCount = items.filter((item) => item.request_type === "imaging").length;
  const document = {
    medication: { title: "Ordonnance", icon: Pill, palette: "border-sky-200 bg-sky-50 text-sky-800", line: "bg-sky-500" },
    laboratory: { title: "Prescription biologique", icon: FlaskConical, palette: "border-emerald-200 bg-emerald-50 text-emerald-800", line: "bg-emerald-500" },
    imaging: { title: "Prescription d’imagerie", icon: ScanLine, palette: "border-violet-200 bg-violet-50 text-violet-800", line: "bg-violet-500" },
  }[prescription.prescription_type];
  const DocumentIcon = document.icon;
  const itemSummary = [
    medicationCount ? `${medicationCount} médicament${medicationCount > 1 ? "s" : ""}` : "",
    laboratoryCount ? `${laboratoryCount} analyse${laboratoryCount > 1 ? "s" : ""}` : "",
    imagingCount ? `${imagingCount} imagerie${imagingCount > 1 ? "s" : ""}` : "",
  ].filter(Boolean).join(" · ");
  const visibleMedicationItems = medicationItems.slice(0, 2);

  return (
    <Card className="group relative overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
      <span className={`absolute inset-y-0 left-0 w-1 ${document.line}`} aria-hidden="true" />
      <div className="flex flex-col gap-4 p-4 pl-5 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:pl-6">
        <button type="button" onClick={onView} className="flex min-w-0 items-start gap-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8bb9a2] focus-visible:ring-offset-2">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${document.palette}`}>
            <DocumentIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900">{document.title}</span>
              <Badge variant="outline" className={`rounded-full text-[10px] ${document.palette}`}>
                {isLoading ? "…" : itemSummary || "Prescription"}
              </Badge>
            </span>
            <span className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {format(new Date(prescription.date), "d MMMM yyyy", { locale: fr })}
            </span>
            {prescription.prescription_type === "medication" && !isLoading && medicationItems.length > 0 && (
              <span className="mt-2.5 block space-y-1.5">
                {visibleMedicationItems.map((item, index) => (
                  <span key={item.id || `${item.nom_medicament}-${index}`} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs leading-relaxed">
                    <span className="font-semibold text-slate-800">{item.nom_medicament}{item.dosage ? ` · ${item.dosage}` : ""}</span>
                    {item.posologie && <span className="text-slate-600">— {item.posologie}</span>}
                    {item.duree && <span className="text-slate-500">({item.duree})</span>}
                  </span>
                ))}
                {medicationItems.length > visibleMedicationItems.length && (
                  <span className="block text-[11px] font-medium text-slate-500">
                    + {medicationItems.length - visibleMedicationItems.length} autre{medicationItems.length - visibleMedicationItems.length === 1 ? "" : "s"} médicament{medicationItems.length - visibleMedicationItems.length === 1 ? "" : "s"}
                  </span>
                )}
              </span>
            )}
            {prescription.notes && <span className="mt-1.5 block line-clamp-1 text-xs text-slate-600">{prescription.notes}</span>}
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 sm:shrink-0 sm:border-0 sm:pt-0">
          <PrescriptionDialog patientId={patientId} patientName={patientName} initialPrescription={fullPrescription || undefined}>
            <Button variant="outline" size="sm" disabled={!fullPrescription} className="h-9 rounded-xl border-slate-200 bg-white px-3">
              <Pencil className="mr-1.5 h-3.5 w-3.5" />Modifier
            </Button>
          </PrescriptionDialog>
          <Button variant="outline" size="sm" onClick={onView} className="h-9 rounded-xl border-slate-200 bg-white px-3">
            <Eye className="mr-1.5 h-3.5 w-3.5" />Aperçu
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label={`Imprimer ${document.title}`} onClick={onPrint} className="h-9 w-9 rounded-xl text-slate-600">
            <Printer className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="icon" disabled={deleting} aria-label={`Supprimer ${document.title}`} className="h-9 w-9 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
                <AlertDialogDescription>Cette action est irréversible. Le document sera supprimé du dossier patient.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-rose-700 text-white hover:bg-rose-800">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );
};
