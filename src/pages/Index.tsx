import { DashboardTile } from "@/components/DashboardTile";
import {
  Calendar,
  Users,
  Calculator,
  BarChart3,
  RefreshCw,
  Settings,
} from "lucide-react";

const Index = () => {
  const tiles = [
    {
      title: "Agenda",
      description: "Gérer les rendez-vous",
      icon: Calendar,
      colorScheme: "agenda" as const,
      href: "/agenda",
    },
    {
      title: "Patients",
      description: "Dossiers, documents & historique",
      icon: Users,
      colorScheme: "patients" as const,
      href: "/patients",
    },
    {
      title: "Comptabilité",
      description: "Gestion financière",
      icon: Calculator,
      colorScheme: "comptabilite" as const,
      href: "/comptabilite",
    },
    {
      title: "Statistiques",
      description: "Tableaux de bord",
      icon: BarChart3,
      colorScheme: "statistiques" as const,
      href: "/statistiques",
    },
    {
      title: "Synchronisation",
      description: "Sync cloud (optionnel)",
      icon: RefreshCw,
      colorScheme: "sync" as const,
      href: "/synchronisation",
    },
    {
      title: "Paramètres",
      description: "Configuration système",
      icon: Settings,
      colorScheme: "settings" as const,
      href: "/parametres",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                MediCare ERP
              </h1>
              <p className="text-muted-foreground mt-1">
                Gestion médicale simplifiée et offline-first
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-secondary animate-pulse"></div>
              <span className="text-sm font-medium text-muted-foreground">
                Mode Offline
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiles.map((tile) => (
            <DashboardTile key={tile.title} {...tile} />
          ))}
        </div>

        {/* Quick Info Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-medical-blue-light flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">
                  Rendez-vous aujourd'hui
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-medical-green-light flex items-center justify-center">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">Patients actifs</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-tile-agenda-light flex items-center justify-center">
                <Calendar className="w-6 h-6 text-tile-agenda" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">
                  RDV cette semaine
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
