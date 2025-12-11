import { DashboardTile } from "@/components/DashboardTile";
import {
  Calendar,
  Users,
  Calculator,
  BarChart3,
  RefreshCw,
  Settings,
  ListOrdered,
} from "lucide-react";
import logo from "@/assets/logo.svg";

const Index = () => {
  // Dashboard principal avec 6 modules
  const tiles = [
    {
      title: "Agenda",
      description: "Gérer les rendez-vous",
      icon: Calendar,
      colorScheme: "agenda" as const,
      href: "/agenda",
    },
    {
      title: "File d'attente",
      description: "Gestion des consultations",
      icon: ListOrdered,
      colorScheme: "queue" as const,
      href: "/file-attente",
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
      <header className="border-b border-border bg-gradient-to-r from-card via-background to-card">
        <div className="container mx-auto px-6 py-8">
          <div className="relative flex items-center justify-center">
            <img src={logo} alt="MediCare ERP" className="h-20 md:h-24 w-auto" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20">
              <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></div>
              <span className="text-sm font-medium text-secondary">
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
