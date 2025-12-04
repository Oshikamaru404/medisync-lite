import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface DashboardTileProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
  href?: string;
  colorScheme?: "agenda" | "patients" | "dossiers" | "scanner" | "comptabilite" | "statistiques" | "sync" | "settings" | "queue";
  disabled?: boolean;
}

export const DashboardTile = ({
  title,
  description,
  icon: Icon,
  onClick,
  href,
  colorScheme = "settings",
  disabled = false,
}: DashboardTileProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (disabled) return;
    if (href) {
      navigate(href);
    } else if (onClick) {
      onClick();
    }
  };
  const getColorClasses = () => {
    const colors = {
      agenda: { bg: "bg-tile-agenda-light", icon: "bg-tile-agenda", text: "text-white" },
      patients: { bg: "bg-tile-patients-light", icon: "bg-tile-patients", text: "text-white" },
      dossiers: { bg: "bg-tile-dossiers-light", icon: "bg-tile-dossiers", text: "text-white" },
      scanner: { bg: "bg-tile-scanner-light", icon: "bg-tile-scanner", text: "text-white" },
      comptabilite: { bg: "bg-tile-comptabilite-light", icon: "bg-tile-comptabilite", text: "text-white" },
      statistiques: { bg: "bg-tile-statistiques-light", icon: "bg-tile-statistiques", text: "text-white" },
      sync: { bg: "bg-tile-sync-light", icon: "bg-tile-sync", text: "text-white" },
      settings: { bg: "bg-tile-settings-light", icon: "bg-tile-settings", text: "text-white" },
      queue: { bg: "bg-tile-queue-light", icon: "bg-tile-queue", text: "text-white" },
    };
    return colors[colorScheme];
  };

  const colors = getColorClasses();

  return (
    <div
      onClick={handleClick}
      className={cn(
        "tile-card group overflow-hidden relative",
        colors.bg,
        disabled && "opacity-50 cursor-not-allowed hover:shadow-lg hover:translate-y-0"
      )}
    >
      <div className="tile-card-content">
        <div
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
            colors.icon
          )}
        >
          <Icon className={cn("w-8 h-8", colors.text)} />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-card-foreground mb-1">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
};
