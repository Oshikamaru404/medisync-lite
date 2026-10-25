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
import { Lock, LogOut, Settings, ChevronDown, ShieldCheck, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const roleLabels: Record<AppRole, string> = {
  medecin: 'Médecin',
  secretaire: 'Secrétaire',
  assistant: 'Assistant'
};

const roleColors: Record<AppRole, string> = {
  medecin: 'bg-gradient-to-br from-teal-500 to-cyan-600',
  secretaire: 'bg-green-500',
  assistant: 'bg-amber-500'
};

const compactRoleColors: Record<AppRole, string> = {
  medecin: 'bg-teal-50 text-teal-800',
  secretaire: 'bg-green-50 text-green-800',
  assistant: 'bg-amber-50 text-amber-800'
};

export function UserMenu({ compact = false, circular = false }: { compact?: boolean; circular?: boolean }) {
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
        <Button
          variant="ghost"
          aria-label={`${currentUser.prenom} ${currentUser.nom}, ouvrir le menu du compte`}
          className={cn(
            "h-auto min-w-0 gap-2 border border-transparent bg-transparent text-left shadow-none transition hover:border-slate-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500",
            compact
              ? cn(
                  "h-8 w-8 justify-center p-0",
                  circular ? "rounded-full hover:border-transparent hover:bg-slate-100" : "rounded-xl p-1.5",
                )
              : "w-full justify-start rounded-xl px-2 py-2 sm:gap-2.5 sm:px-2.5",
          )}
        >
          <div className={cn(
            "relative flex shrink-0 items-center justify-center font-bold",
            compact && circular ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs text-white",
            circular ? "rounded-full" : "rounded-lg",
            compact && circular ? compactRoleColors[currentUser.role] : roleColors[currentUser.role]
          )}>
            {currentUser.prenom.charAt(0)}{currentUser.nom.charAt(0)}
            <span className={cn(
              "absolute rounded-full border-2 border-white bg-emerald-500",
              compact && circular ? "-bottom-0.5 -right-0.5 h-2 w-2" : "-bottom-0.5 -right-0.5 h-2.5 w-2.5",
            )} aria-label="Session active" />
          </div>
          <div className={compact ? "hidden" : "flex min-w-0 flex-1 flex-col items-start text-left"}>
            <span className="max-w-full truncate text-xs font-semibold leading-tight text-slate-800">
              {currentUser.role === 'medecin' ? 'Dr ' : ''}{currentUser.prenom} {currentUser.nom}
            </span>
            <span className="mt-1 flex items-center gap-1 text-[10px] leading-none text-slate-500">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              {roleLabels[currentUser.role]} · Session active
            </span>
          </div>
          {!compact && <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={compact ? "center" : "end"}
        side="top"
        sideOffset={8}
        className="max-h-[min(70dvh,420px)] w-56 overflow-y-auto rounded-xl p-1.5"
      >
        <DropdownMenuLabel className="px-2 py-2">
          <div className="flex items-center gap-3">
            <div className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white", roleColors[currentUser.role])}>
              {currentUser.prenom.charAt(0)}{currentUser.nom.charAt(0)}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-semibold">{currentUser.role === 'medecin' ? 'Dr ' : ''}{currentUser.prenom} {currentUser.nom}</span>
              <span className="mt-0.5 text-[10px] font-normal text-muted-foreground">{roleLabels[currentUser.role]} · Session active</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {hasRole('medecin') && (
          <DropdownMenuItem onClick={() => navigate('/parametres?section=cabinet')} className="py-2 text-xs">
            <Settings className="mr-2 h-4 w-4" />
            Cabinet & praticien
          </DropdownMenuItem>
        )}

        {hasRole('medecin') && (
          <DropdownMenuItem onClick={() => navigate('/parametres?section=users')} className="py-2 text-xs">
            <UsersRound className="mr-2 h-4 w-4" />
            Équipe & accès
          </DropdownMenuItem>
        )}

        {hasRole('medecin') && (
          <DropdownMenuItem onClick={() => navigate('/parametres?section=security')} className="py-2 text-xs">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Sécurité de session
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={handleLock} className="py-2 text-xs">
          <Lock className="mr-2 h-4 w-4" />
          Verrouiller la session
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout} className="py-2 text-xs text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}