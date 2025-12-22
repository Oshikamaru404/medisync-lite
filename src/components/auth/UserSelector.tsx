import React from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserSelectorProps {
  users: Array<{
    id: string;
    nom: string;
    prenom: string;
    role: string;
  }>;
  onSelect: (userId: string) => void;
  isLoading?: boolean;
}

export function UserSelector({ users, onSelect, isLoading }: UserSelectorProps) {
  const roleLabels: Record<string, string> = {
    medecin: 'Médecin',
    secretaire: 'Secrétaire',
    assistant: 'Assistant'
  };

  const roleColors: Record<string, string> = {
    medecin: 'bg-blue-500',
    secretaire: 'bg-green-500',
    assistant: 'bg-amber-500'
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-muted rounded-xl h-24"
          />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun utilisateur trouvé
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {users.map((user) => (
        <button
          key={user.id}
          onClick={() => onSelect(user.id)}
          className={cn(
            "flex items-center gap-4 p-4 rounded-xl border border-border/50",
            "bg-card hover:bg-accent/50 transition-all duration-200",
            "hover:border-primary/30 hover:shadow-md",
            "active:scale-[0.98] cursor-pointer text-left"
          )}
        >
          {/* Avatar */}
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg",
            roleColors[user.role] || 'bg-gray-500'
          )}>
            {user.prenom.charAt(0)}{user.nom.charAt(0)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {user.prenom} {user.nom}
            </h3>
            <p className="text-sm text-muted-foreground">
              {roleLabels[user.role] || user.role}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}