ALTER TABLE public.queue
  ADD COLUMN IF NOT EXISTS manual_order INTEGER;

CREATE OR REPLACE FUNCTION public.clear_queue_manual_order_on_priority_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.priority_level IS DISTINCT FROM OLD.priority_level THEN
    NEW.manual_order := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_queue_manual_order_on_priority_change ON public.queue;
CREATE TRIGGER clear_queue_manual_order_on_priority_change
  BEFORE UPDATE OF priority_level ON public.queue
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_queue_manual_order_on_priority_change();

CREATE OR REPLACE FUNCTION public.reorder_queue_priority_group(
  _ordered_queue_ids UUID[],
  _actor_session_token TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.app_role;
  v_priority TEXT;
  v_day DATE;
  v_is_punctual BOOLEAN;
  v_group_count INTEGER;
  v_requested_count INTEGER;
  v_valid_count INTEGER;
BEGIN
  SELECT app_user.role
  INTO v_role
  FROM public.app_sessions AS app_session
  JOIN public.app_users AS app_user ON app_user.id = app_session.user_id
  WHERE app_session.session_token = _actor_session_token
    AND app_session.expires_at > now()
    AND app_user.is_active;

  IF NOT FOUND OR v_role <> 'secretaire' THEN
    RAISE EXCEPTION 'Secrétariat uniquement : vous n’êtes pas autorisé à réorganiser la file.';
  END IF;

  IF _ordered_queue_ids IS NULL OR cardinality(_ordered_queue_ids) < 2 THEN
    RAISE EXCEPTION 'Il faut au moins deux patients à réorganiser.';
  END IF;

  SELECT COUNT(*), COUNT(DISTINCT requested.id)
  INTO v_requested_count, v_valid_count
  FROM unnest(_ordered_queue_ids) AS requested(id);

  IF v_requested_count <> v_valid_count THEN
    RAISE EXCEPTION 'La liste contient des passages en double.';
  END IF;

  SELECT
    queue.priority_level,
    (queue.created_at AT TIME ZONE 'Africa/Casablanca')::DATE,
    COALESCE(
      appointment.date = (queue.created_at AT TIME ZONE 'Africa/Casablanca')::DATE
      AND (queue.created_at AT TIME ZONE 'Africa/Casablanca')
        BETWEEN appointment.date + appointment.heure_debut - INTERVAL '15 minutes'
        AND appointment.date + appointment.heure_debut + INTERVAL '15 minutes',
      FALSE
    )
  INTO v_priority, v_day, v_is_punctual
  FROM public.queue AS queue
  LEFT JOIN public.appointments AS appointment ON appointment.id = queue.appointment_id
  WHERE queue.id = _ordered_queue_ids[1]
    AND queue.status = 'waiting'
    AND queue.called_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ce patient n’est plus en attente et ne peut pas être déplacé.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    v_day::TEXT || ':' || v_priority || ':' || v_is_punctual::TEXT,
    0
  ));

  PERFORM 1
  FROM public.queue AS queue
  LEFT JOIN public.appointments AS appointment ON appointment.id = queue.appointment_id
  WHERE queue.status = 'waiting'
    AND queue.called_at IS NULL
    AND queue.priority_level = v_priority
    AND (queue.created_at AT TIME ZONE 'Africa/Casablanca')::DATE = v_day
    AND (
      v_priority <> 'standard'
      OR COALESCE(
        appointment.date = v_day
        AND (queue.created_at AT TIME ZONE 'Africa/Casablanca')
          BETWEEN appointment.date + appointment.heure_debut - INTERVAL '15 minutes'
          AND appointment.date + appointment.heure_debut + INTERVAL '15 minutes',
        FALSE
      ) = v_is_punctual
    )
  FOR UPDATE OF queue;

  SELECT COUNT(*)
  INTO v_group_count
  FROM public.queue AS queue
  LEFT JOIN public.appointments AS appointment ON appointment.id = queue.appointment_id
  WHERE queue.status = 'waiting'
    AND queue.called_at IS NULL
    AND queue.priority_level = v_priority
    AND (queue.created_at AT TIME ZONE 'Africa/Casablanca')::DATE = v_day
    AND (
      v_priority <> 'standard'
      OR COALESCE(
        appointment.date = v_day
        AND (queue.created_at AT TIME ZONE 'Africa/Casablanca')
          BETWEEN appointment.date + appointment.heure_debut - INTERVAL '15 minutes'
          AND appointment.date + appointment.heure_debut + INTERVAL '15 minutes',
        FALSE
      ) = v_is_punctual
    );

  SELECT COUNT(*)
  INTO v_valid_count
  FROM unnest(_ordered_queue_ids) AS requested(id)
  JOIN public.queue AS queue ON queue.id = requested.id
  LEFT JOIN public.appointments AS appointment ON appointment.id = queue.appointment_id
  WHERE queue.status = 'waiting'
    AND queue.called_at IS NULL
    AND queue.priority_level = v_priority
    AND (queue.created_at AT TIME ZONE 'Africa/Casablanca')::DATE = v_day
    AND (
      v_priority <> 'standard'
      OR COALESCE(
        appointment.date = v_day
        AND (queue.created_at AT TIME ZONE 'Africa/Casablanca')
          BETWEEN appointment.date + appointment.heure_debut - INTERVAL '15 minutes'
          AND appointment.date + appointment.heure_debut + INTERVAL '15 minutes',
        FALSE
      ) = v_is_punctual
    );

  IF v_requested_count <> v_group_count OR v_valid_count <> v_group_count THEN
    RAISE EXCEPTION 'La file a changé. Actualisez-la puis réessayez.';
  END IF;

  UPDATE public.queue AS queue
  SET manual_order = requested.ordinality::INTEGER
  FROM unnest(_ordered_queue_ids) WITH ORDINALITY AS requested(id, ordinality)
  WHERE queue.id = requested.id;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_queue_priority_group(UUID[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_queue_priority_group(UUID[], TEXT) TO anon, authenticated;