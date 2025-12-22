import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { PinPad } from '@/components/auth/PinPad';
import { Plus, Edit, Key, UserX, UserCheck, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AppUser {
  id: string;
  nom: string;
  prenom: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

const SESSION_TOKEN_KEY = 'medical_erp_session';

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

export function UserManagement() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPinDialogOpen, setIsResetPinDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  
  // Form states
  const [formNom, setFormNom] = useState('');
  const [formPrenom, setFormPrenom] = useState('');
  const [formRole, setFormRole] = useState<string>('assistant');
  const [formPin, setFormPin] = useState('');
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinError, setPinError] = useState<string>();

  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['app-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, nom, prenom, role, is_active, last_login, created_at')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as AppUser[];
    }
  });

  const resetForm = () => {
    setFormNom('');
    setFormPrenom('');
    setFormRole('assistant');
    setFormPin('');
    setPinStep('enter');
    setPinError(undefined);
    setSelectedUser(null);
  };

  const handleAddUser = async (confirmedPin: string) => {
    if (confirmedPin !== formPin) {
      setPinError('Les PINs ne correspondent pas');
      return;
    }

    setIsSubmitting(true);
    setPinError(undefined);

    try {
      const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
      const { data, error } = await supabase.functions.invoke('auth-pin', {
        body: {
          action: 'create_user',
          nom: formNom.trim(),
          prenom: formPrenom.trim(),
          pin: formPin,
          role: formRole,
          creatorSessionToken: sessionToken
        }
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Erreur lors de la création');
        setIsSubmitting(false);
        return;
      }

      toast.success('Utilisateur créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['app-users'] });
      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error('Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);

    try {
      const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
      const { data, error } = await supabase.functions.invoke('auth-pin', {
        body: {
          action: 'update_user',
          userId: selectedUser.id,
          nom: formNom.trim(),
          prenom: formPrenom.trim(),
          role: formRole,
          creatorSessionToken: sessionToken
        }
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Erreur lors de la mise à jour');
        setIsSubmitting(false);
        return;
      }

      toast.success('Utilisateur mis à jour');
      queryClient.invalidateQueries({ queryKey: ['app-users'] });
      setIsEditDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error updating user:', err);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPin = async (confirmedPin: string) => {
    if (!selectedUser) return;
    
    if (confirmedPin !== formPin) {
      setPinError('Les PINs ne correspondent pas');
      return;
    }

    setIsSubmitting(true);
    setPinError(undefined);

    try {
      const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
      const { data, error } = await supabase.functions.invoke('auth-pin', {
        body: {
          action: 'reset_pin',
          userId: selectedUser.id,
          newPin: formPin,
          creatorSessionToken: sessionToken
        }
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Erreur lors de la réinitialisation');
        setIsSubmitting(false);
        return;
      }

      toast.success('PIN réinitialisé avec succès');
      setIsResetPinDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error resetting PIN:', err);
      toast.error('Erreur lors de la réinitialisation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);

    try {
      const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
      const { data, error } = await supabase.functions.invoke('auth-pin', {
        body: {
          action: 'update_user',
          userId: selectedUser.id,
          is_active: !selectedUser.is_active,
          creatorSessionToken: sessionToken
        }
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Erreur lors de la mise à jour');
        setIsSubmitting(false);
        return;
      }

      toast.success(selectedUser.is_active ? 'Utilisateur désactivé' : 'Utilisateur réactivé');
      queryClient.invalidateQueries({ queryKey: ['app-users'] });
      setIsDeactivateDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error toggling user status:', err);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (user: AppUser) => {
    setSelectedUser(user);
    setFormNom(user.nom);
    setFormPrenom(user.prenom);
    setFormRole(user.role);
    setIsEditDialogOpen(true);
  };

  const openResetPinDialog = (user: AppUser) => {
    setSelectedUser(user);
    setFormPin('');
    setPinStep('enter');
    setPinError(undefined);
    setIsResetPinDialogOpen(true);
  };

  const openDeactivateDialog = (user: AppUser) => {
    setSelectedUser(user);
    setIsDeactivateDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestion des utilisateurs</h3>
          <p className="text-sm text-muted-foreground">
            Ajoutez et gérez les utilisateurs de l'application
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setIsAddDialogOpen(true);
        }} className="gap-2">
          <Plus className="w-4 h-4" />
          Ajouter un utilisateur
        </Button>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {users.map((user) => (
          <Card 
            key={user.id} 
            className={cn(
              "p-4 flex items-center justify-between",
              !user.is_active && "opacity-60"
            )}
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold",
                roleColors[user.role] || 'bg-gray-500',
                !user.is_active && "grayscale"
              )}>
                {user.prenom.charAt(0)}{user.nom.charAt(0)}
              </div>

              {/* Info */}
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{user.prenom} {user.nom}</h4>
                  {!user.is_active && (
                    <Badge variant="secondary" className="text-xs">Inactif</Badge>
                  )}
                  {user.id === currentUser?.id && (
                    <Badge variant="outline" className="text-xs">Vous</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{roleLabels[user.role]}</span>
                  {user.last_login && (
                    <span>• Dernière connexion: {new Date(user.last_login).toLocaleDateString('fr-FR')}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openEditDialog(user)}
                title="Modifier"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openResetPinDialog(user)}
                title="Réinitialiser le PIN"
              >
                <Key className="w-4 h-4" />
              </Button>
              {user.id !== currentUser?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openDeactivateDialog(user)}
                  title={user.is_active ? "Désactiver" : "Réactiver"}
                >
                  {user.is_active ? (
                    <UserX className="w-4 h-4 text-destructive" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-green-500" />
                  )}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsAddDialogOpen(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
            <DialogDescription>
              {pinStep === 'enter' 
                ? 'Remplissez les informations et définissez un PIN'
                : 'Confirmez le PIN'
              }
            </DialogDescription>
          </DialogHeader>

          {pinStep === 'enter' ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    id="prenom"
                    value={formPrenom}
                    onChange={(e) => setFormPrenom(e.target.value)}
                    placeholder="Ex: Fatima"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    value={formNom}
                    onChange={(e) => setFormNom(e.target.value)}
                    placeholder="Ex: Alami"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medecin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-500" />
                        Médecin (Admin)
                      </div>
                    </SelectItem>
                    <SelectItem value="secretaire">Secrétaire</SelectItem>
                    <SelectItem value="assistant">Assistant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Définissez un PIN de 4 à 6 chiffres
                </p>
                <PinPad
                  onComplete={(pin) => {
                    setFormPin(pin);
                    setPinStep('confirm');
                  }}
                  showCancel={false}
                />
              </div>
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Confirmez le PIN
              </p>
              <PinPad
                onComplete={handleAddUser}
                onCancel={() => {
                  setFormPin('');
                  setPinStep('enter');
                  setPinError(undefined);
                }}
                isLoading={isSubmitting}
                error={pinError}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsEditDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>
              Modifiez les informations de {selectedUser?.prenom} {selectedUser?.nom}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-prenom">Prénom</Label>
                <Input
                  id="edit-prenom"
                  value={formPrenom}
                  onChange={(e) => setFormPrenom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nom">Nom</Label>
                <Input
                  id="edit-nom"
                  value={formNom}
                  onChange={(e) => setFormNom(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Rôle</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medecin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      Médecin (Admin)
                    </div>
                  </SelectItem>
                  <SelectItem value="secretaire">Secrétaire</SelectItem>
                  <SelectItem value="assistant">Assistant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleUpdateUser} 
              disabled={isSubmitting || !formNom.trim() || !formPrenom.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset PIN Dialog */}
      <Dialog open={isResetPinDialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsResetPinDialogOpen(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Réinitialiser le PIN</DialogTitle>
            <DialogDescription>
              {pinStep === 'enter'
                ? `Définissez un nouveau PIN pour ${selectedUser?.prenom}`
                : 'Confirmez le nouveau PIN'
              }
            </DialogDescription>
          </DialogHeader>

          {pinStep === 'enter' ? (
            <div className="py-4">
              <PinPad
                onComplete={(pin) => {
                  setFormPin(pin);
                  setPinStep('confirm');
                }}
                onCancel={() => setIsResetPinDialogOpen(false)}
              />
            </div>
          ) : (
            <div className="py-4">
              <PinPad
                onComplete={handleResetPin}
                onCancel={() => {
                  setFormPin('');
                  setPinStep('enter');
                  setPinError(undefined);
                }}
                isLoading={isSubmitting}
                error={pinError}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivate/Reactivate Confirmation */}
      <AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.is_active ? 'Désactiver' : 'Réactiver'} l'utilisateur ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.is_active
                ? `${selectedUser?.prenom} ${selectedUser?.nom} ne pourra plus se connecter à l'application.`
                : `${selectedUser?.prenom} ${selectedUser?.nom} pourra à nouveau se connecter.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              className={selectedUser?.is_active ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {selectedUser?.is_active ? 'Désactiver' : 'Réactiver'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}