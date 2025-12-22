import React from 'react';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Lock, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const roleLabels: Record<AppRole, string> = {
  medecin: 'Médecin',
  secretaire: 'Secrétaire',
  assistant: 'Assistant'
};

const roleColors: Record<AppRole, string> = {
  medecin: 'bg-blue-500',
  secretaire: 'bg-green-500',
  assistant: 'bg-amber-500'
};

export function UserMenu() {
  const { currentUser, lock, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const handleLock = () => {
    lock();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold",
            roleColors[currentUser.role]
          )}>
            {currentUser.prenom.charAt(0)}{currentUser.nom.charAt(0)}
          </div>
          <div className="hidden md:flex flex-col items-start text-left">
            <span className="text-sm font-medium leading-none">
              {currentUser.prenom}
            </span>
            <span className="text-xs text-muted-foreground leading-none mt-0.5">
              {roleLabels[currentUser.role]}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span>{currentUser.prenom} {currentUser.nom}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {roleLabels[currentUser.role]}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {hasRole('medecin') && (
          <DropdownMenuItem onClick={() => navigate('/parametres')}>
            <Settings className="mr-2 h-4 w-4" />
            Paramètres
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={handleLock}>
          <Lock className="mr-2 h-4 w-4" />
          Verrouiller
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}