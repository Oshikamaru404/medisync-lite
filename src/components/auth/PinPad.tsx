import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Delete, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PinPadProps {
  onComplete: (pin: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string;
  minLength?: number;
  maxLength?: number;
  showCancel?: boolean;
}

export function PinPad({ 
  onComplete, 
  onCancel, 
  isLoading = false, 
  error,
  minLength = 4,
  maxLength = 6,
  showCancel = true
}: PinPadProps) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (error) {
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setPin('');
      }, 500);
    }
  }, [error]);

  const handleDigit = useCallback((digit: string) => {
    if (pin.length < maxLength && !isLoading) {
      setPin(prev => prev + digit);
    }
  }, [pin.length, maxLength, isLoading]);

  const handleDelete = useCallback(() => {
    if (!isLoading) {
      setPin(prev => prev.slice(0, -1));
    }
  }, [isLoading]);

  const handleSubmit = useCallback(() => {
    if (pin.length >= minLength && !isLoading) {
      onComplete(pin);
    }
  }, [pin, minLength, isLoading, onComplete]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return;

      // Check if the key is a digit
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      }
      // Backspace to delete
      else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }
      // Enter to submit
      else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      // Escape to cancel
      else if (e.key === 'Escape' && onCancel) {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleDelete, handleSubmit, isLoading, onCancel]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* PIN Display */}
      <div className={cn(
        "flex gap-2 transition-transform",
        shake && "animate-shake"
      )}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-3 h-3 rounded-full border-2 transition-all duration-200",
              i < pin.length 
                ? "bg-primary border-primary" 
                : "border-muted-foreground/40",
              error && "border-destructive bg-destructive/20"
            )}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-destructive text-center max-w-[260px]">
          {error}
        </p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2">
        {digits.map((digit, i) => (
          <div key={i} className="w-16 h-12 flex items-center justify-center">
            {digit !== '' ? (
              <Button
                variant="outline"
                size="lg"
                className="w-full h-full text-xl font-semibold hover:bg-primary/10 active:scale-95 transition-transform"
                onClick={() => handleDigit(digit)}
                disabled={isLoading}
              >
                {digit}
              </Button>
            ) : i === 9 ? (
              showCancel && onCancel ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-full text-xs text-muted-foreground"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Annuler
                </Button>
              ) : null
            ) : (
              <Button
                variant="ghost"
                size="lg"
                className="w-full h-full"
                onClick={handleDelete}
                disabled={isLoading || pin.length === 0}
              >
                <Delete className="w-5 h-5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <Button
        size="default"
        className="w-full max-w-[220px] h-10 gap-2"
        onClick={handleSubmit}
        disabled={pin.length < minLength || isLoading}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Check className="w-4 h-4" />
            Valider
          </>
        )}
      </Button>

      {/* Keyboard hint */}
      <p className="text-xs text-muted-foreground">
        Utilisez le clavier ou le pavé numérique
      </p>
    </div>
  );
}