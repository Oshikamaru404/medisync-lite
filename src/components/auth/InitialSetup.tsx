import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PinPad } from './PinPad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, User, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';

interface InitialSetupProps {
  onComplete: () => void;
}

export function InitialSetup({ onComplete }: InitialSetupProps) {
  const [step, setStep] = useState<'info' | 'pin' | 'confirm'>('info');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nom.trim() && prenom.trim()) {
      setStep('pin');
    }
  };

  const handlePinComplete = (enteredPin: string) => {
    setPin(enteredPin);
    setStep('confirm');
  };

  const handleConfirmPin = async (confirmedPin: string) => {
    if (confirmedPin !== pin) {
      setError('Les PINs ne correspondent pas');
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const { data, error: setupError } = await supabase.functions.invoke('auth-pin', {
        body: {
          action: 'setup_initial_admin',
          nom: nom.trim(),
          prenom: prenom.trim(),
          pin
        }
      });

      if (setupError || data?.error) {
        setError(data?.error || 'Erreur lors de la création');
        setIsLoading(false);
        return;
      }

      toast.success('Compte administrateur créé avec succès !');
      onComplete();
    } catch (err) {
      console.error('Setup error:', err);
      setError('Erreur lors de la création');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Configuration initiale
          </h1>
          <p className="text-muted-foreground">
            Créez le compte administrateur (médecin)
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['info', 'pin', 'confirm'].map((s, i) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === s 
                  ? 'bg-primary text-primary-foreground' 
                  : i < ['info', 'pin', 'confirm'].indexOf(step)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {i + 1}
              </div>
              {i < 2 && (
                <div className={`w-12 h-0.5 ${
                  i < ['info', 'pin', 'confirm'].indexOf(step)
                    ? 'bg-primary/50'
                    : 'bg-muted'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card Container */}
        <div className="bg-card rounded-2xl shadow-lg border border-border/50 p-8">
          {step === 'info' && (
            <form onSubmit={handleInfoSubmit} className="space-y-6">
              <div className="flex items-center gap-3 text-muted-foreground mb-4">
                <User className="w-5 h-5" />
                <span>Informations du médecin</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    id="prenom"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Ex: Mohamed"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Ex: Benali"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full gap-2"
                disabled={!nom.trim() || !prenom.trim()}
              >
                Continuer
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          {step === 'pin' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">
                  Choisissez un PIN de 4 à 6 chiffres
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Ce PIN sera utilisé pour vous connecter rapidement
                </p>
              </div>

              <PinPad
                onComplete={handlePinComplete}
                onCancel={() => setStep('info')}
              />
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">
                  Confirmez votre PIN
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Entrez le même PIN pour confirmer
                </p>
              </div>

              <PinPad
                onComplete={handleConfirmPin}
                onCancel={() => {
                  setPin('');
                  setError(undefined);
                  setStep('pin');
                }}
                isLoading={isLoading}
                error={error}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}