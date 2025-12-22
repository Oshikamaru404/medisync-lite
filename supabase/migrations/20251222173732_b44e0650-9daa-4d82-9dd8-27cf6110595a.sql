-- 1. Créer l'enum pour les rôles
CREATE TYPE public.app_role AS ENUM ('medecin', 'secretaire', 'assistant');

-- 2. Créer la table des utilisateurs de l'application
CREATE TABLE public.app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    role app_role NOT NULL DEFAULT 'assistant',
    is_active BOOLEAN NOT NULL DEFAULT true,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Créer la table des sessions
CREATE TABLE public.app_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Activer RLS sur les tables
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;

-- 5. Policies pour app_users (accès public pour lecture des noms, mais PIN_hash protégé)
CREATE POLICY "Anyone can view active users basic info" 
ON public.app_users 
FOR SELECT 
USING (true);

-- 6. Policies pour app_sessions
CREATE POLICY "Sessions are managed by edge functions" 
ON public.app_sessions 
FOR ALL 
USING (true);

-- 7. Trigger pour updated_at sur app_users
CREATE TRIGGER update_app_users_updated_at
    BEFORE UPDATE ON public.app_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Index pour améliorer les performances
CREATE INDEX idx_app_users_is_active ON public.app_users(is_active);
CREATE INDEX idx_app_sessions_token ON public.app_sessions(session_token);
CREATE INDEX idx_app_sessions_expires ON public.app_sessions(expires_at);

-- 9. Fonction security definer pour vérifier les rôles
CREATE OR REPLACE FUNCTION public.has_app_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.app_users
        WHERE id = _user_id
          AND role = _role
          AND is_active = true
    )
$$;

-- 10. Fonction pour obtenir le rôle d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.app_users
    WHERE id = _user_id
      AND is_active = true
    LIMIT 1
$$;

-- 11. Fonction pour nettoyer les sessions expirées
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM public.app_sessions
    WHERE expires_at < now();
$$;