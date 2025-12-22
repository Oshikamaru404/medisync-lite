import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'medecin' | 'secretaire' | 'assistant';

export interface AppUser {
  id: string;
  nom: string;
  prenom: string;
  role: AppRole;
}

interface AuthContextType {
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  isLoading: boolean;
  needsSetup: boolean;
  login: (userId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  lock: () => void;
  unlock: (pin: string) => Promise<{ success: boolean; error?: string }>;
  hasRole: (role: AppRole) => boolean;
  canAccess: (requiredRoles: AppRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TOKEN_KEY = 'medical_erp_session';
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Check if any users exist (for initial setup)
  const checkNeedsSetup = useCallback(async () => {
    try {
      const { data: users, error } = await supabase
        .from('app_users')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('Error checking users:', error);
        return false;
      }
      
      return !users || users.length === 0;
    } catch (error) {
      console.error('Error checking setup:', error);
      return false;
    }
  }, []);

  // Verify session token on mount
  const verifySession = useCallback(async () => {
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    
    if (!sessionToken) {
      setIsLoading(false);
      const setup = await checkNeedsSetup();
      setNeedsSetup(setup);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('auth-pin', {
        body: { action: 'verify', sessionToken }
      });

      if (error) {
        console.error('Session verification error:', error);
        localStorage.removeItem(SESSION_TOKEN_KEY);
        setIsLoading(false);
        const setup = await checkNeedsSetup();
        setNeedsSetup(setup);
        return;
      }

      if (data.valid && data.user) {
        setCurrentUser(data.user);
        setIsLocked(false);
      } else {
        localStorage.removeItem(SESSION_TOKEN_KEY);
        const setup = await checkNeedsSetup();
        setNeedsSetup(setup);
      }
    } catch (error) {
      console.error('Session verification error:', error);
      localStorage.removeItem(SESSION_TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }, [checkNeedsSetup]);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  // Inactivity timer
  useEffect(() => {
    if (!currentUser || isLocked) return;

    const checkInactivity = () => {
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        setIsLocked(true);
      }
    };

    const interval = setInterval(checkInactivity, 1000);
    return () => clearInterval(interval);
  }, [currentUser, isLocked, lastActivity]);

  // Track user activity
  useEffect(() => {
    if (!currentUser || isLocked) return;

    const updateActivity = () => setLastActivity(Date.now());
    
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity));
    
    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
    };
  }, [currentUser, isLocked]);

  const login = async (userId: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-pin', {
        body: { action: 'login', userId, pin }
      });

      if (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Erreur de connexion' };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }

      if (data.success && data.sessionToken && data.user) {
        localStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
        setCurrentUser(data.user);
        setIsLocked(false);
        setLastActivity(Date.now());
        setNeedsSetup(false);
        return { success: true };
      }

      return { success: false, error: 'Erreur inconnue' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  };

  const logout = async () => {
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    
    if (sessionToken) {
      try {
        await supabase.functions.invoke('auth-pin', {
          body: { action: 'logout', sessionToken }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    localStorage.removeItem(SESSION_TOKEN_KEY);
    setCurrentUser(null);
    setIsLocked(false);
  };

  const lock = () => {
    if (currentUser) {
      setIsLocked(true);
    }
  };

  const unlock = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Aucun utilisateur connecté' };
    }

    // Re-verify PIN through login
    const result = await login(currentUser.id, pin);
    if (result.success) {
      setIsLocked(false);
    }
    return result;
  };

  const hasRole = (role: AppRole): boolean => {
    return currentUser?.role === role;
  };

  const canAccess = (requiredRoles: AppRole[]): boolean => {
    if (!currentUser) return false;
    return requiredRoles.includes(currentUser.role);
  };

  const value: AuthContextType = {
    currentUser,
    isAuthenticated: !!currentUser,
    isLocked,
    isLoading,
    needsSetup,
    login,
    logout,
    lock,
    unlock,
    hasRole,
    canAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}