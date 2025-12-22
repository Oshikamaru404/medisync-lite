import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { InitialSetup } from '@/components/auth/InitialSetup';
import { UserSelector } from '@/components/auth/UserSelector';
import { PinPad } from '@/components/auth/PinPad';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Stethoscope } from 'lucide-react';

interface AppUserBasic {
  id: string;
  nom: string;
  prenom: string;
  role: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, needsSetup, login, isLoading: authLoading } = useAuth();
  
  const [users, setUsers] = useState<AppUserBasic[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AppUserBasic | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string>();
  const [showSetup, setShowSetup] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Check if setup is needed
  useEffect(() => {
    if (!authLoading && needsSetup) {
      setShowSetup(true);
      setIsLoadingUsers(false);
    }
  }, [needsSetup, authLoading]);

  // Load users
  useEffect(() => {
    if (authLoading || needsSetup) return;

    async function loadUsers() {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('id, nom, prenom, role')
          .eq('is_active', true)
          .order('prenom');

        if (error) {
          console.error('Error loading users:', error);
          return;
        }

        setUsers(data || []);
      } catch (err) {
        console.error('Error loading users:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    }

    loadUsers();
  }, [authLoading, needsSetup]);

  const handleUserSelect = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setError(undefined);
    }
  };

  const handlePinComplete = async (pin: string) => {
    if (!selectedUser) return;

    setIsLoggingIn(true);
    setError(undefined);

    const result = await login(selectedUser.id, pin);

    setIsLoggingIn(false);
    if (!result.success) {
      setError(result.error);
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    window.location.reload();
  };

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show initial setup if needed
  if (showSetup) {
    return <InitialSetup onComplete={handleSetupComplete} />;
  }

  const roleLabels: Record<string, string> = {
    medecin: 'Médecin',
    secretaire: 'Secrétaire',
    assistant: 'Assistant'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col items-center justify-center p-4 overflow-auto">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-7 h-7 text-primary" />
          </div>
        </div>

        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-foreground mb-1">
            Cabinet Médical
          </h1>
          <p className="text-sm text-muted-foreground">
            {selectedUser 
              ? `Connectez-vous en tant que ${selectedUser.prenom}`
              : 'Sélectionnez votre profil'
            }
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-card rounded-xl shadow-lg border border-border/50 p-5">
          {!selectedUser ? (
            <UserSelector
              users={users}
              onSelect={handleUserSelect}
              isLoading={isLoadingUsers}
            />
          ) : (
            <div className="space-y-4">
              {/* Selected User Info */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {selectedUser.prenom.charAt(0)}{selectedUser.nom.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{selectedUser.prenom} {selectedUser.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      {roleLabels[selectedUser.role]}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedUser(null);
                    setError(undefined);
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Retour
                </Button>
              </div>

              {/* PIN Pad */}
              <div className="pt-2">
                <p className="text-center text-sm text-muted-foreground mb-4">
                  Entrez votre PIN
                </p>
                <PinPad
                  onComplete={handlePinComplete}
                  onCancel={() => {
                    setSelectedUser(null);
                    setError(undefined);
                  }}
                  isLoading={isLoggingIn}
                  error={error}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}