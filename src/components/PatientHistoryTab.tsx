import { useState } from "react";
import { Calendar, Clock, CreditCard, CheckCircle, AlertCircle, Filter, History, Stethoscope, CalendarDays, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { usePatientHistory } from "@/hooks/usePatientHistory";
import { format, parseISO, subDays, subMonths, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PatientHistoryTabProps {
  patientId: string;
}

export const PatientHistoryTab = ({ patientId }: PatientHistoryTabProps) => {
  const { data, isLoading, isError, refetch } = usePatientHistory(patientId);
  const [periodFilter, setPeriodFilter] = useState("all");

  const history = data?.history || [];
  const stats = data?.stats;

  const filterByPeriod = () => {
    if (periodFilter === "all") return history;
    
    const now = new Date();
    let cutoffDate: Date;
    
    switch (periodFilter) {
      case "30days":
        cutoffDate = subDays(now, 30);
        break;
      case "6months":
        cutoffDate = subMonths(now, 6);
        break;
      case "1year":
        cutoffDate = subMonths(now, 12);
        break;
      default:
        return history;
    }
    
    return history.filter(entry => isAfter(parseISO(entry.date), cutoffDate));
  };

  const filteredHistory = filterByPeriod();
  const sectionHeader = (
    <section className="overflow-hidden rounded-2xl border border-[#dce8e2] bg-[linear-gradient(115deg,#123b37_0%,#18564e_68%,#287267_100%)] p-4 text-white shadow-md shadow-[#184a43]/10 sm:flex sm:items-center sm:justify-between sm:px-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c3e2d8]">Activité du patient</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Parcours de soins</h2>
        <p className="mt-0.5 text-xs text-[#d8e9e3]">Consultations, rendez-vous et règlements dans l’ordre chronologique.</p>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/90 sm:mt-0">
        <History className="h-4 w-4 text-[#c3e2d8]" />
        {history.length} élément{history.length === 1 ? "" : "s"} enregistré{history.length === 1 ? "" : "s"}
      </div>
    </section>
  );

  const getStatusBadge = (status: string, invoiceStatus: string | null, settlementInstruction: string | null) => {
    if (status === 'completed') {
      if (settlementInstruction === 'free') {
        return <Badge variant="secondary">Gratuit</Badge>;
      }
      if (settlementInstruction === 'deferred' && invoiceStatus === 'pending') {
        return <Badge className="bg-tile-queue/20 text-tile-queue border border-tile-queue/30"><AlertCircle className="w-3 h-3 mr-1" />Différé · à régler</Badge>;
      }
      if (settlementInstruction === 'due_at_reception' && invoiceStatus === 'pending') {
        return <Badge className="bg-tile-queue/20 text-tile-queue border border-tile-queue/30"><AlertCircle className="w-3 h-3 mr-1" />À encaisser</Badge>;
      }
      if (invoiceStatus === 'paid') {
        return <Badge className="bg-secondary/20 text-secondary border border-secondary/30"><CheckCircle className="w-3 h-3 mr-1" />Payé</Badge>;
      }
      if (invoiceStatus === 'pending') {
        return <Badge className="bg-tile-queue/20 text-tile-queue border border-tile-queue/30"><AlertCircle className="w-3 h-3 mr-1" />En attente</Badge>;
      }
      return <Badge variant="secondary">Terminé</Badge>;
    }
    if (status === 'in_consultation') {
      return <Badge className="bg-primary/20 text-primary border border-primary/30">En cours</Badge>;
    }
    if (status === 'confirmed') {
      return <Badge variant="secondary">Confirmé</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-5" aria-label="Chargement de l’historique du patient">
        {sectionHeader}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />)}</div>
        <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-5">
      {sectionHeader}
      <Card className="rounded-2xl border-rose-200 bg-rose-50/60 p-6">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-rose-950">Historique indisponible</h3>
            <p className="mt-1 text-xs text-rose-800">Les visites et les indicateurs du dossier n’ont pas pu être chargés.</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="border-rose-200 bg-white text-rose-900" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />Réessayer
          </Button>
        </div>
      </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {sectionHeader}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Consultations", value: (stats?.totalConsultations || 0).toLocaleString("fr-MA"), detail: "visites terminées ou en cours", icon: Stethoscope },
          { label: "Total réglé", value: `${(stats?.totalPaid || 0).toLocaleString("fr-MA")} DH`, detail: "sur l’ensemble des factures", icon: CheckCircle },
          { label: "Reste à régler", value: `${(stats?.pendingAmount || 0).toLocaleString("fr-MA")} DH`, detail: "factures non réglées", icon: CreditCard },
          { label: "Première visite", value: stats?.firstVisit ? format(parseISO(stats.firstVisit), "d MMM yyyy", { locale: fr }) : "—", detail: "date connue dans le dossier", icon: CalendarDays },
        ].map(({ label, value, detail, icon: Icon }) => (
          <Card key={label} className="rounded-2xl border-slate-200 bg-white p-3 text-slate-800 shadow-sm transition-shadow hover:shadow-md sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">{label}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 truncate text-lg font-bold tabular-nums text-slate-900 sm:text-2xl">{value}</p>
            <p className="mt-1 hidden text-[10px] text-slate-500 sm:block">{detail}</p>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Filter className="h-4 w-4 text-slate-400" />
            <span>Filtrer le parcours</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="h-9 w-full rounded-xl sm:w-[200px]">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout l'historique</SelectItem>
                <SelectItem value="30days">30 derniers jours</SelectItem>
                <SelectItem value="6months">6 derniers mois</SelectItem>
                <SelectItem value="1year">1 an</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-slate-500">
              {filteredHistory.length} élément{filteredHistory.length > 1 ? "s" : ""} · {history.length} au total
            </span>
          </div>
        </CardContent>
      </Card>

      {filteredHistory.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-slate-300 p-8 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <History className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">{history.length ? "Aucun résultat sur cette période" : "Aucun passage enregistré"}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {history.length ? "Élargissez la période pour retrouver les visites précédentes." : "Les consultations et rendez-vous confirmés apparaîtront ici."}
          </p>
        </Card>
      ) : (
        <ol className="relative space-y-3 before:absolute before:bottom-5 before:left-[18px] before:top-5 before:w-px before:bg-[#c9ddd5] sm:space-y-4">
          {filteredHistory.map((entry) => (
            <li key={`${entry.type}-${entry.id}`} className="relative pl-11">
              <span className={cn(
                "absolute left-0 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl border-4 border-[#f8faf9]",
                entry.type === "queue" ? "bg-teal-100 text-teal-800" : "bg-[#e8f0ed] text-[#42635a]",
              )}>
                {entry.type === "queue" ? <Stethoscope className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
              </span>
              <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={entry.type === "queue" ? "border-teal-200 bg-teal-50 text-teal-800" : "border-slate-200 bg-slate-50 text-slate-700"}>
                        {entry.type === "queue" ? "Consultation" : "Rendez-vous"}
                      </Badge>
                      {getStatusBadge(entry.status, entry.invoice_status, entry.settlement_instruction)}
                    </div>
                    <h4 className="break-words text-sm font-semibold text-slate-900">{entry.motif || (entry.type === "queue" ? "Consultation générale" : "Rendez-vous")}</h4>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(parseISO(entry.date), "EEEE d MMMM yyyy", { locale: fr })}
                      </span>
                      {entry.called_at && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Appelé à {format(parseISO(entry.called_at), "HH:mm")}
                        </span>
                      )}
                    </div>
                  </div>
                  {entry.montant !== null && (
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
                      <div>
                        <p className="text-base font-bold tabular-nums text-slate-900">{entry.montant.toLocaleString("fr-MA")} DH</p>
                        {entry.invoice_number && <p className="text-[10px] text-slate-500">{entry.invoice_number}</p>}
                      </div>
                      <CreditCard className="h-4 w-4 text-slate-300 sm:hidden" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
