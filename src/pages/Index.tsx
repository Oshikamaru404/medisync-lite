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
      <header className="relative overflow-hidden border-b border-border/50 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-primary/5 to-transparent blur-3xl"></div>
        
        <div className="relative container mx-auto px-6 py-12">
          <div className="flex flex-col items-center justify-center gap-6">
            {/* Logo container with glow effect */}
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20 rounded-3xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
              <div className="relative bg-card/80 backdrop-blur-sm px-10 py-6 rounded-2xl border border-border/50 shadow-xl shadow-primary/5">
                <img src={logo} alt="MediCare ERP" className="h-24 md:h-28 lg:h-32 w-auto drop-shadow-lg" />
              </div>
            </div>
            
            {/* Tagline */}
            <p className="text-muted-foreground text-sm md:text-base tracking-wide">
              Gestion médicale simplifiée • Offline-first
            </p>
          </div>
          
          {/* Offline badge - positioned absolute */}
          <div className="absolute right-6 top-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 backdrop-blur-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></div>
            <span className="text-sm font-medium text-secondary">
              Mode Offline
            </span>
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
