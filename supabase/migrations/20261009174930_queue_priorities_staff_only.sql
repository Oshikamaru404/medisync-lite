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

  IF NOT FOUND OR v_role NOT IN ('secretaire', 'assistant') THEN
    RAISE EXCEPTION 'Secrétariat uniquement : vous n’êtes pas autorisé à modifier la priorité.';
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