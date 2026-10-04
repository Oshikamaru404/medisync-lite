import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Clock, UserCheck, CheckCircle, XCircle, CreditCard, Phone, Search, Stethoscope, BellRing, CalendarDays, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQueue, useAddToQueue, useCallQueueEntry, useUpdateQueueStatus, useUpdateInvoiceStatus, getQueueDisplayStatus, QueueEntry, QueueStatus, QueueDisplayStatus } from "@/hooks/useQueue";
import { usePatientDirectory } from "@/hooks/usePatients";
import NewPatientDialog from "@/components/NewPatientDialog";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_CONFIG: Record<QueueDisplayStatus, { label: string; icon: typeof Clock; color: string; badgeClass: string }> = {
  waiting: { label: "En attente", icon: Clock, color: "text-amber-600", badgeClass: "bg-amber-100 text-amber-700" },
  called: { label: "Appelé", icon: BellRing, color: "text-violet-600", badgeClass: "bg-violet-100 text-violet-700" },
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
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const { currentUser } = useAuth();

  const { data: queue = [], isLoading } = useQueue();
  const { data: patients = [] } = usePatientDirectory();
  const addToQueue = useAddToQueue();
  const callQueueEntry = useCallQueueEntry();
  const updateStatus = useUpdateQueueStatus();
  const updateInvoice = useUpdateInvoiceStatus();

  const filteredPatients = patients.filter(p => 
    `${p.nom} ${p.prenom} ${p.telephone || ""} ${p.cin || ""}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const waitingCount = queue.filter(q => getQueueDisplayStatus(q) === 'waiting').length;
  const calledCount = queue.filter(q => getQueueDisplayStatus(q) === 'called').length;
  const inConsultationCount = queue.filter(q => q.status === 'in_consultation').length;
  const completedCount = queue.filter(q => q.status === 'completed').length;
  const nextPatient = queue
    .filter((entry) => getQueueDisplayStatus(entry) === "waiting")
    .sort((first, second) => first.numero_ordre - second.numero_ordre)[0];

  const handleAddToQueue = async () => {
    if (!selectedPatientId) return;

    try {
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
    } catch {
      // The mutation displays the error toast and keeps the form available for retry.
    }
  };

  const handleStatusChange = async (entry: QueueEntry, newStatus: QueueStatus) => {
    try {
      await updateStatus.mutateAsync({ id: entry.id, status: newStatus });
      if (newStatus === "in_consultation" && currentUser?.role === "medecin") {
        navigate(`/consultations/${entry.id}`);
      }
    } catch {
      // The mutation displays the error toast.
    }
  };

  const handleCallPatient = async (entry: QueueEntry) => {
    try {
      await callQueueEntry.mutateAsync(entry.id);
    } catch {
      // The mutation displays the error toast and keeps the patient in the queue.
    }
  };

  const openConsultation = (entry: QueueEntry) => navigate(`/consultations/${entry.id}`);

  const handleMarkAsPaid = (invoiceId: string) => {
    updateInvoice.mutate({ invoiceId, statut: 'paid' });
  };

  const renderQueueCard = (entry: QueueEntry) => {
    const displayStatus = getQueueDisplayStatus(entry);
    const config = STATUS_CONFIG[displayStatus];
    const StatusIcon = config.icon;
    const patient = entry.patients;

    return (
      <Card key={entry.id} className="relative overflow-hidden border-slate-200 bg-white transition-shadow hover:shadow-md">
        <div className={cn("absolute left-0 top-0 bottom-0 w-1", 
          displayStatus === 'waiting' && "bg-amber-500",
          displayStatus === 'called' && "bg-violet-500",
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
              {displayStatus === 'waiting' && (
                <Button 
                  size="sm" 
                  onClick={() => handleCallPatient(entry)}
                  className="bg-violet-600 hover:bg-violet-700"
                  disabled={callQueueEntry.isPending}
                >
                  <BellRing className="w-4 h-4 mr-1" />
                  Appeler
                </Button>
              )}

              {displayStatus === "called" && currentUser?.role === "medecin" && (
                <Button size="sm" onClick={() => handleStatusChange(entry, "in_consultation")}>
                  <Stethoscope className="mr-1 h-4 w-4" />Démarrer
                </Button>
              )}

              {displayStatus === "called" && currentUser?.role !== "medecin" && (
                <Badge className={STATUS_CONFIG.called.badgeClass}>En attente du médecin</Badge>
              )}
              
              {entry.status === 'in_consultation' && (
                <>
                  {currentUser?.role === "medecin" && (
                    <Button size="sm" variant="outline" onClick={() => openConsultation(entry)}>
                      <Stethoscope className="mr-1 h-4 w-4" />Ouvrir le dossier
                    </Button>
                  )}
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

              {(displayStatus === 'waiting' || displayStatus === 'called') && (
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
              <div className="flex items-center gap-3">
                <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                <h1 className="text-xl font-bold">File d'attente</h1>
                <p className="text-sm text-muted-foreground">
                  Accueil · {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
                </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <UserMenu />

              <Button variant="outline" onClick={() => navigate("/agenda")}>
                <CalendarDays className="mr-2 h-4 w-4" />Agenda
              </Button>

              {nextPatient && (
                <Button onClick={() => handleCallPatient(nextPatient)} disabled={callQueueEntry.isPending}>
                  <BellRing className="mr-2 h-4 w-4" />Appeler suivant
                </Button>
              )}

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
                  <DialogDescription>Retrouvez un patient existant ou créez son dossier avant de l’ajouter à la file.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Patient</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher un patient..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setSelectedPatientId("");
                        }}
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
                          <p className="p-3 text-sm text-muted-foreground">Aucun patient trouvé</p>
                        )}
                      </div>
                    )}
                    <Button type="button" variant="outline" className="w-full" onClick={() => setIsNewPatientOpen(true)}>
                      <UserRoundPlus className="mr-2 h-4 w-4" />
                      {searchQuery.trim() ? "Créer un nouveau dossier" : "Nouveau patient"}
                    </Button>
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
        </div>
      </header>

      <NewPatientDialog
        open={isNewPatientOpen}
        onOpenChange={setIsNewPatientOpen}
        onCreated={async (patientId, patientName) => {
          setSelectedPatientId(patientId);
          setSearchQuery(patientName);
          setIsAddDialogOpen(true);
          try {
            await addToQueue.mutateAsync({
              patient_id: patientId,
              motif: motif || undefined,
              montant_consultation: parseFloat(montant) || 0,
            });
            setIsAddDialogOpen(false);
            setSelectedPatientId("");
            setMotif("");
            setMontant("0");
            setSearchQuery("");
          } catch {
            // The patient remains selected in the queue dialog so reception can retry.
          }
        }}
      />

      {/* Stats */}
      <div className="container mx-auto px-4 py-4">
        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Card className="border-amber-200 bg-amber-50/70">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto text-amber-600 mb-2" />
              <p className="text-2xl font-bold">{waitingCount}</p>
              <p className="text-sm text-muted-foreground">En attente</p>
            </CardContent>
          </Card>
          <Card className="border-violet-200 bg-violet-50/70">
            <CardContent className="p-4 text-center">
              <BellRing className="mx-auto mb-2 h-6 w-6 text-violet-600" />
              <p className="text-2xl font-bold">{calledCount}</p>
              <p className="text-sm text-muted-foreground">Appelés</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/70">
            <CardContent className="p-4 text-center">
              <UserCheck className="w-6 h-6 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{inConsultationCount}</p>
              <p className="text-sm text-muted-foreground">En consultation</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/70">
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
            {queue.filter(q => getQueueDisplayStatus(q) === 'waiting').length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  En attente ({waitingCount})
                </h2>
                {queue.filter(q => getQueueDisplayStatus(q) === 'waiting').map(renderQueueCard)}
              </div>
            )}

            {queue.filter(q => getQueueDisplayStatus(q) === "called").length > 0 && (
              <div className="space-y-3 mt-6">
                <h2 className="flex items-center gap-2 font-semibold text-muted-foreground">
                  <BellRing className="h-4 w-4" />Appelés ({calledCount})
                </h2>
                {queue.filter(q => getQueueDisplayStatus(q) === "called").map(renderQueueCard)}
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

            {queue.filter(q => q.status === "cancelled").length > 0 && (
              <div className="space-y-3 mt-6">
                <h2 className="flex items-center gap-2 font-semibold text-muted-foreground">
                  <XCircle className="h-4 w-4" />Annulés ({queue.filter(q => q.status === "cancelled").length})
                </h2>
                {queue.filter(q => q.status === "cancelled").map(renderQueueCard)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileAttente;
