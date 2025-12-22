import React, { useState, useEffect } from 'react';
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

  const handleDigit = (digit: string) => {
    if (pin.length < maxLength && !isLoading) {
      const newPin = pin + digit;
      setPin(newPin);
    }
  };

  const handleDelete = () => {
    if (!isLoading) {
      setPin(pin.slice(0, -1));
    }
  };

  const handleSubmit = () => {
    if (pin.length >= minLength && !isLoading) {
      onComplete(pin);
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* PIN Display */}
      <div className={cn(
        "flex gap-3 transition-transform",
        shake && "animate-shake"
      )}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-4 h-4 rounded-full border-2 transition-all duration-200",
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
        <p className="text-sm text-destructive text-center max-w-[280px]">
          {error}
        </p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {digits.map((digit, i) => (
          <div key={i} className="w-20 h-16 flex items-center justify-center">
            {digit !== '' ? (
              <Button
                variant="outline"
                size="lg"
                className="w-full h-full text-2xl font-semibold hover:bg-primary/10 active:scale-95 transition-transform"
                onClick={() => handleDigit(digit)}
                disabled={isLoading}
              >
                {digit}
              </Button>
            ) : i === 9 ? (
              showCancel && onCancel ? (
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full h-full text-muted-foreground"
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
                <Delete className="w-6 h-6" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <Button
        size="lg"
        className="w-full max-w-[280px] h-12 text-lg gap-2"
        onClick={handleSubmit}
        disabled={pin.length < minLength || isLoading}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Check className="w-5 h-5" />
            Valider
          </>
        )}
      </Button>
    </div>
  );
}