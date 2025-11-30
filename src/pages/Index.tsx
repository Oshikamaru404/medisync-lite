import { DashboardTile } from "@/components/DashboardTile";
import {
  Calendar,
  Users,
  FolderOpen,
  ScanLine,
  Calculator,
  BarChart3,
  RefreshCw,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();

  const handleTileClick = (feature: string) => {
    toast({
      title: feature,
      description: "Cette fonctionnalité sera bientôt disponible",
    });
  };

  const tiles = [
    {
      title: "Agenda",
      description: "Gérer les rendez-vous",
      icon: Calendar,
      colorScheme: "agenda" as const,
      onClick: () => handleTileClick("Agenda"),
    },
    {
      title: "Patients",
      description: "Base de données patients",
      icon: Users,
      colorScheme: "patients" as const,
      onClick: () => handleTileClick("Patients"),
    },
    {
      title: "Dossiers",
      description: "Dossiers médicaux",
      icon: FolderOpen,
      colorScheme: "dossiers" as const,
      onClick: () => handleTileClick("Dossiers"),
    },
    {
      title: "Scanner",
      description: "Numériser documents",
      icon: ScanLine,
      colorScheme: "scanner" as const,
      onClick: () => handleTileClick("Scanner"),
    },
    {
      title: "Comptabilité",
      description: "Gestion financière",
      icon: Calculator,
      colorScheme: "comptabilite" as const,
      onClick: () => handleTileClick("Comptabilité"),
    },
    {
      title: "Statistiques",
      description: "Tableaux de bord",
      icon: BarChart3,
      colorScheme: "statistiques" as const,
      onClick: () => handleTileClick("Statistiques"),
    },
    {
      title: "Synchronisation",
      description: "Sync cloud (optionnel)",
      icon: RefreshCw,
      colorScheme: "sync" as const,
      onClick: () => handleTileClick("Synchronisation"),
    },
    {
      title: "Paramètres",
      description: "Configuration système",
      icon: Settings,
      colorScheme: "settings" as const,
      onClick: () => handleTileClick("Paramètres"),
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">
                  Dossiers consultés
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
