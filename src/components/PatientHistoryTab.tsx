import { useState } from "react";
import { Calendar, Clock, CreditCard, CheckCircle, XCircle, AlertCircle, Filter, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePatientHistory } from "@/hooks/usePatientHistory";
import { format, parseISO, subDays, subMonths, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PatientHistoryTabProps {
  patientId: string;
}

export const PatientHistoryTab = ({ patientId }: PatientHistoryTabProps) => {
  const { data, isLoading } = usePatientHistory(patientId);
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

  const getStatusBadge = (status: string, invoiceStatus: string | null) => {
    if (status === 'completed') {
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
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Chargement de l'historique...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats?.totalConsultations || 0}</p>
              <p className="text-sm text-muted-foreground">Consultations</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-secondary bg-secondary/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-secondary">{stats?.totalPaid?.toLocaleString() || 0} DH</p>
              <p className="text-sm text-muted-foreground">Total Payé</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-tile-queue bg-tile-queue/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-tile-queue">{stats?.pendingAmount?.toLocaleString() || 0} DH</p>
              <p className="text-sm text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-tile-scanner bg-tile-scanner/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-tile-scanner">
                {stats?.firstVisit 
                  ? format(parseISO(stats.firstVisit), "dd MMM yyyy", { locale: fr })
                  : "-"
                }
              </p>
              <p className="text-sm text-muted-foreground">Première visite</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout l'historique</SelectItem>
                <SelectItem value="30days">30 derniers jours</SelectItem>
                <SelectItem value="6months">6 derniers mois</SelectItem>
                <SelectItem value="1year">1 an</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredHistory.length} consultation{filteredHistory.length > 1 ? 's' : ''} trouvée{filteredHistory.length > 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {filteredHistory.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Aucun historique
            </h3>
            <p className="text-muted-foreground">
              Ce patient n'a pas encore de consultations enregistrées.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((entry, index) => (
            <Card key={entry.id} className="overflow-hidden">
              <div className="flex">
                {/* Timeline indicator */}
                <div className="w-1.5 bg-primary shrink-0" />
                
                <div className="flex-1 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="shrink-0">
                          {entry.type === 'queue' ? 'Consultation' : 'Rendez-vous'}
                        </Badge>
                        {getStatusBadge(entry.status, entry.invoice_status)}
                      </div>
                      
                      <h4 className="font-medium text-foreground">
                        {entry.motif || "Consultation générale"}
                      </h4>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(parseISO(entry.date), "EEEE dd MMMM yyyy", { locale: fr })}
                        </span>
                        {entry.called_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Appelé à {format(parseISO(entry.called_at), "HH:mm")}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {entry.montant !== null && (
                      <div className="text-right shrink-0">
                        <p className="text-lg font-semibold text-foreground">
                          {entry.montant.toLocaleString()} DH
                        </p>
                        {entry.invoice_number && (
                          <p className="text-xs text-muted-foreground">
                            {entry.invoice_number}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
