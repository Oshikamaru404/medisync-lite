ALTER TABLE public.queue
  ADD COLUMN IF NOT EXISTS priority_level TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS priority_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority_updated_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL;

ALTER TABLE public.queue
  DROP CONSTRAINT IF EXISTS queue_priority_level_check;

ALTER TABLE public.queue
  ADD CONSTRAINT queue_priority_level_check
  CHECK (priority_level IN ('critical', 'high', 'relative', 'comfort', 'standard'));

CREATE TABLE IF NOT EXISTS public.queue_priority_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES public.queue(id) ON DELETE CASCADE,
  previous_priority TEXT NOT NULL,
  new_priority TEXT NOT NULL,
  note TEXT,
  actor_user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT queue_priority_events_previous_check
    CHECK (previous_priority IN ('critical', 'high', 'relative', 'comfort', 'standard')),
  CONSTRAINT queue_priority_events_new_check
    CHECK (new_priority IN ('critical', 'high', 'relative', 'comfort', 'standard'))
);

CREATE INDEX IF NOT EXISTS queue_priority_events_queue_created_idx
  ON public.queue_priority_events (queue_id, created_at DESC);

ALTER TABLE public.queue_priority_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.queue_priority_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_queue_priority(
  _queue_id UUID,
  _priority_level TEXT,
  _actor_session_token TEXT,
  _note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_role public.app_role;
  v_queue public.queue%ROWTYPE;
BEGIN
  SELECT app_user.id, app_user.role, concat_ws(' ', app_user.prenom, app_user.nom)
  INTO v_user_id, v_role, v_user_name
  FROM public.app_sessions AS app_session
  JOIN public.app_users AS app_user ON app_user.id = app_session.user_id
  WHERE app_session.session_token = _actor_session_token
    AND app_session.expires_at > now()
    AND app_user.is_active;

  IF NOT FOUND OR v_role NOT IN ('medecin', 'secretaire', 'assistant') THEN
    RAISE EXCEPTION 'Session invalide ou non autorisée. Reconnectez-vous.';
  END IF;

  IF _priority_level IS NULL
     OR _priority_level NOT IN ('critical', 'high', 'relative', 'comfort', 'standard') THEN
    RAISE EXCEPTION 'Niveau de priorité non reconnu.';
  END IF;

  IF _note IS NOT NULL AND length(btrim(_note)) > 240 THEN
    RAISE EXCEPTION 'La note de priorité ne peut pas dépasser 240 caractères.';
  END IF;

  SELECT *
  INTO v_queue
  FROM public.queue
  WHERE id = _queue_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Passage de file introuvable.';
  END IF;

  IF v_queue.status <> 'waiting' OR v_queue.called_at IS NOT NULL THEN
    RAISE EXCEPTION 'La priorité ne peut être modifiée qu’avant l’appel du patient.';
  END IF;

  IF v_queue.priority_level IS DISTINCT FROM _priority_level THEN
    UPDATE public.queue
    SET priority_level = _priority_level,
        priority_updated_at = now(),
        priority_updated_by = v_user_id
    WHERE id = _queue_id;

    INSERT INTO public.queue_priority_events (
      queue_id,
      previous_priority,
      new_priority,
      note,
      actor_user_id,
      actor_name
    )
    VALUES (
      _queue_id,
      v_queue.priority_level,
      _priority_level,
      NULLIF(btrim(_note), ''),
      v_user_id,
      NULLIF(v_user_name, '')
    );
  END IF;

  RETURN _queue_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_queue_priority(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_queue_priority(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;