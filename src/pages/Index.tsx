import { useState, useEffect } from "react";
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
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useSettings } from "@/hooks/useSettings";

const Index = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { cabinetName, isLoading: settingsLoading } = useSettings();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50"></div>
        
        <div className="relative container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo container with subtle glow - left aligned */}
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-secondary/15 rounded-xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300"></div>
              <div className="relative bg-card/70 backdrop-blur-sm px-4 py-2 rounded-xl border border-border/40 shadow-lg">
                <img src={logo} alt="MediCare ERP" className="h-12 md:h-14 w-auto" />
              </div>
            </div>
            {/* Central element - Cabinet name & DateTime */}
            <div className="flex flex-col items-center text-center">
              <h1 className="text-lg md:text-xl font-semibold text-foreground tracking-tight">
                {settingsLoading ? "Chargement..." : cabinetName}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span className="capitalize">
                  {format(currentTime, "EEEE d MMMM yyyy", { locale: fr })}
                </span>
                <span className="text-border">•</span>
                <span className="font-mono text-primary">
                  {format(currentTime, "HH:mm:ss")}
                </span>
              </div>
            </div>
          
            {/* Offline badge - right aligned */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
              <span className="text-xs font-medium text-secondary">Offline</span>
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
