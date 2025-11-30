import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardTileProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "default";
  disabled?: boolean;
}

export const DashboardTile = ({
  title,
  description,
  icon: Icon,
  onClick,
  variant = "default",
  disabled = false,
}: DashboardTileProps) => {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={cn(
        "tile-card group",
        disabled && "opacity-50 cursor-not-allowed hover:shadow-lg hover:translate-y-0"
      )}
    >
      <div className="tile-card-content">
        <div
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
            variant === "primary" && "bg-primary",
            variant === "secondary" && "bg-secondary",
            variant === "default" && "bg-muted"
          )}
        >
          <Icon
            className={cn(
              "w-8 h-8",
              variant === "primary" && "text-primary-foreground",
              variant === "secondary" && "text-secondary-foreground",
              variant === "default" && "text-muted-foreground"
            )}
          />
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
