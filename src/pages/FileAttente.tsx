import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Clock, UserCheck, CheckCircle, XCircle, CreditCard, Phone, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQueue, useAddToQueue, useUpdateQueueStatus, useUpdateInvoiceStatus, QueueEntry, QueueStatus } from "@/hooks/useQueue";
import { usePatients } from "@/hooks/usePatients";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_CONFIG: Record<QueueStatus, { label: string; icon: typeof Clock; color: string; badgeClass: string }> = {
  waiting: { label: "En attente", icon: Clock, color: "text-amber-600", badgeClass: "bg-amber-100 text-amber-700" },
  in_consultation: { label: "En consultation", icon: UserCheck, color: "text-blue-600", badgeClass: "bg-blue-100 text-blue-700" },
  completed: { label: "Terminé", icon: CheckCircle, color: "text-green-600", badgeClass: "bg-green-100 text-green-700" },
  cancelled: { label: "Annulé", icon: XCircle, color: "text-red-600", badgeClass: "bg-red-100 text-red-700" },
};

const FileAttente = () => {
  const navigate = useNavigate();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [motif, setMotif] = useState("");
  const [montant, setMontant] = useState("0");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: queue = [], isLoading } = useQueue();
  const { data: patients = [] } = usePatients();
  const addToQueue = useAddToQueue();
  const updateStatus = useUpdateQueueStatus();
  const updateInvoice = useUpdateInvoiceStatus();

  const filteredPatients = patients.filter(p => 
    `${p.nom} ${p.prenom}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const waitingCount = queue.filter(q => q.status === 'waiting').length;
  const inConsultationCount = queue.filter(q => q.status === 'in_consultation').length;
  const completedCount = queue.filter(q => q.status === 'completed').length;

  const handleAddToQueue = async () => {
    if (!selectedPatientId) return;
    
    await addToQueue.mutateAsync({
      patient_id: selectedPatientId,
      motif: motif || undefined,
      montant_consultation: parseFloat(montant) || 0,
    });
    
    setIsAddDialogOpen(false);
    setSelectedPatientId("");
    setMotif("");
    setMontant("0");
    setSearchQuery("");
  };

  const handleStatusChange = (entry: QueueEntry, newStatus: QueueStatus) => {
    updateStatus.mutate({ id: entry.id, status: newStatus });
  };

  const handleMarkAsPaid = (invoiceId: string) => {
    updateInvoice.mutate({ invoiceId, statut: 'paid' });
  };

  const renderQueueCard = (entry: QueueEntry) => {
    const config = STATUS_CONFIG[entry.status];
    const StatusIcon = config.icon;
    const patient = entry.patients;

    return (
      <Card key={entry.id} className="relative overflow-hidden">
        <div className={cn("absolute left-0 top-0 bottom-0 w-1", 
          entry.status === 'waiting' && "bg-amber-500",
          entry.status === 'in_consultation' && "bg-blue-500",
          entry.status === 'completed' && "bg-green-500",
          entry.status === 'cancelled' && "bg-red-500"
        )} />
        <CardContent className="p-4 pl-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg">#{entry.numero_ordre}</span>
                <Badge className={cn("text-xs", config.badgeClass)}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
              
              <h3 className="font-semibold text-foreground truncate">
                {patient?.nom} {patient?.prenom}
              </h3>
              
              {patient?.telephone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3" />
                  {patient.telephone}
                </p>
              )}
              
              {entry.motif && (
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  Motif: {entry.motif}
                </p>
              )}

              {entry.invoices && (
                <div className="mt-2 p-2 bg-muted/50 rounded-md">
                  <p className="text-sm font-medium">
                    Facture: {entry.invoices.numero}
                  </p>
                  <p className="text-sm">
                    Montant: {entry.invoices.montant.toLocaleString()} DA
                  </p>
                  <Badge className={cn("text-xs mt-1", 
                    entry.invoices.statut === 'paid' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {entry.invoices.statut === 'paid' ? 'Payé' : 'En attente'}
                  </Badge>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2">
                Arrivé à {format(new Date(entry.created_at), "HH:mm", { locale: fr })}
                {entry.called_at && ` • Appelé à ${format(new Date(entry.called_at), "HH:mm", { locale: fr })}`}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {entry.status === 'waiting' && (
                <Button 
                  size="sm" 
                  onClick={() => handleStatusChange(entry, 'in_consultation')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserCheck className="w-4 h-4 mr-1" />
                  Appeler
                </Button>
              )}
              
              {entry.status === 'in_consultation' && (
                <>
                  <Button 
                    size="sm" 
                    onClick={() => handleStatusChange(entry, 'completed')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Terminer
                  </Button>
                  {entry.invoices && entry.invoices.statut !== 'paid' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleMarkAsPaid(entry.invoices!.id)}
                    >
                      <CreditCard className="w-4 h-4 mr-1" />
                      Paiement reçu
                    </Button>
                  )}
                </>
              )}

              {entry.status === 'completed' && entry.invoices && entry.invoices.statut !== 'paid' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleMarkAsPaid(entry.invoices!.id)}
                >
                  <CreditCard className="w-4 h-4 mr-1" />
                  Paiement reçu
                </Button>
              )}

              {entry.status === 'waiting' && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleStatusChange(entry, 'cancelled')}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Annuler
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">File d'attente</h1>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
                </p>
              </div>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter patient
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un patient à la file</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Patient</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher un patient..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {searchQuery && (
                      <div className="max-h-40 overflow-y-auto border rounded-md">
                        {filteredPatients.map(p => (
                          <button
                            key={p.id}
                            className={cn(
                              "w-full text-left px-3 py-2 hover:bg-muted transition-colors",
                              selectedPatientId === p.id && "bg-primary/10"
                            )}
                            onClick={() => {
                              setSelectedPatientId(p.id);
                              setSearchQuery(`${p.nom} ${p.prenom}`);
                            }}
                          >
                            <p className="font-medium">{p.nom} {p.prenom}</p>
                            {p.telephone && <p className="text-sm text-muted-foreground">{p.telephone}</p>}
                          </button>
                        ))}
                        {filteredPatients.length === 0 && (
                          <p className="px-3 py-2 text-sm text-muted-foreground">Aucun patient trouvé</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Motif (optionnel)</Label>
                    <Textarea
                      placeholder="Motif de la consultation..."
                      value={motif}
                      onChange={(e) => setMotif(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Montant consultation (DA)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={montant}
                      onChange={(e) => setMontant(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleAddToQueue} 
                    className="w-full"
                    disabled={!selectedPatientId || addToQueue.isPending}
                  >
                    {addToQueue.isPending ? "Ajout en cours..." : "Ajouter à la file"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto text-amber-600 mb-2" />
              <p className="text-2xl font-bold">{waitingCount}</p>
              <p className="text-sm text-muted-foreground">En attente</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <UserCheck className="w-6 h-6 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{inConsultationCount}</p>
              <p className="text-sm text-muted-foreground">En consultation</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Terminés</p>
            </CardContent>
          </Card>
        </div>

        {/* Queue List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : queue.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun patient dans la file</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par ajouter un patient à la file d'attente.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un patient
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Waiting */}
            {queue.filter(q => q.status === 'waiting').length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  En attente ({queue.filter(q => q.status === 'waiting').length})
                </h2>
                {queue.filter(q => q.status === 'waiting').map(renderQueueCard)}
              </div>
            )}

            {/* In consultation */}
            {queue.filter(q => q.status === 'in_consultation').length > 0 && (
              <div className="space-y-3 mt-6">
                <h2 className="font-semibold text-muted-foreground flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  En consultation ({queue.filter(q => q.status === 'in_consultation').length})
                </h2>
                {queue.filter(q => q.status === 'in_consultation').map(renderQueueCard)}
              </div>
            )}

            {/* Completed */}
            {queue.filter(q => q.status === 'completed').length > 0 && (
              <div className="space-y-3 mt-6">
                <h2 className="font-semibold text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Terminés ({queue.filter(q => q.status === 'completed').length})
                </h2>
                {queue.filter(q => q.status === 'completed').map(renderQueueCard)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileAttente;
