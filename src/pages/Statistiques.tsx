import { ArrowLeft, TrendingUp, Users, Calendar, Euro } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePatients } from "@/hooks/usePatients";
import { useAppointments } from "@/hooks/useAppointments";
import { useInvoices } from "@/hooks/useInvoices";

const Statistiques = () => {
  const navigate = useNavigate();

  const { data: patients = [] } = usePatients();
  const { data: appointments = [] } = useAppointments();
  const { data: invoices = [] } = useInvoices();

  // Calculate real statistics
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const appointmentsMonth = appointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    return aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear;
  }).length;

  const revenueMonth = invoices
    .filter((inv) => {
      const invDate = new Date(inv.date);
      return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
    })
    .reduce((sum, inv) => sum + inv.montant, 0);

  const averagePerDay = appointmentsMonth > 0 ? Math.round(appointmentsMonth / 30) : 0;

  const stats = {
    totalPatients: patients.length,
    appointmentsMonth,
    revenueMonth,
    averagePerDay,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Statistiques</h1>
              <p className="text-sm text-muted-foreground">
                Tableaux de bord et analyses
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-tile-patients/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-tile-patients" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Patients</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalPatients}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-tile-agenda/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-tile-agenda" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">RDV ce mois</p>
                <p className="text-2xl font-bold text-foreground">{stats.appointmentsMonth}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-tile-comptabilite/10 flex items-center justify-center">
                <Euro className="w-6 h-6 text-tile-comptabilite" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenu mensuel</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.revenueMonth.toLocaleString()}€
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-tile-statistiques/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-tile-statistiques" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Moyenne/jour</p>
                <p className="text-2xl font-bold text-foreground">{stats.averagePerDay}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts & Reports */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="revenue">Revenus</TabsTrigger>
            <TabsTrigger value="appointments">Rendez-vous</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="p-8">
              <h3 className="text-lg font-semibold mb-4">Aperçu général</h3>
              <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-border rounded-lg">
                <p className="text-muted-foreground">Graphiques à venir</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="patients">
            <Card className="p-8">
              <h3 className="text-lg font-semibold mb-4">Statistiques patients</h3>
              <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-border rounded-lg">
                <p className="text-muted-foreground">Graphiques patients à venir</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="revenue">
            <Card className="p-8">
              <h3 className="text-lg font-semibold mb-4">Évolution des revenus</h3>
              <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-border rounded-lg">
                <p className="text-muted-foreground">Graphiques revenus à venir</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="appointments">
            <Card className="p-8">
              <h3 className="text-lg font-semibold mb-4">Analyse des rendez-vous</h3>
              <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-border rounded-lg">
                <p className="text-muted-foreground">Graphiques RDV à venir</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Statistiques;
