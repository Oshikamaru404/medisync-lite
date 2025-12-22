import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PinPad } from './PinPad';
import { Button } from '@/components/ui/button';
import { Lock, LogOut, User } from 'lucide-react';

export function LockScreen() {
  const { currentUser, unlock, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleUnlock = async (pin: string) => {
    setIsLoading(true);
    setError(undefined);
    
    const result = await unlock(pin);
    
    setIsLoading(false);
    if (!result.success) {
      setError(result.error);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const roleLabels = {
    medecin: 'Médecin',
    secretaire: 'Secrétaire',
    assistant: 'Assistant'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Lock Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* User Info */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Session verrouillée
          </h1>
          {currentUser && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="font-medium">
                  {currentUser.prenom} {currentUser.nom}
                </span>
              </div>
              <span className="text-sm text-muted-foreground/70">
                {roleLabels[currentUser.role]}
              </span>
            </div>
          )}
        </div>

        {/* Card Container */}
        <div className="bg-card rounded-2xl shadow-lg border border-border/50 p-8">
          <p className="text-center text-muted-foreground mb-6">
            Entrez votre PIN pour déverrouiller
          </p>
          
          <PinPad
            onComplete={handleUnlock}
            isLoading={isLoading}
            error={error}
            showCancel={false}
          />
        </div>

        {/* Logout Option */}
        <div className="flex justify-center mt-6">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Changer d'utilisateur
          </Button>
        </div>
      </div>
    </div>
  );
}