ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS attendance_status TEXT NOT NULL DEFAULT 'expected',
  ADD COLUMN IF NOT EXISTS attendance_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attendance_updated_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attendance_note TEXT;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_attendance_status_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_attendance_status_check
  CHECK (attendance_status IN ('expected', 'late_contacted', 'late_expected', 'no_show', 'arrived', 'cancelled'));

CREATE TABLE IF NOT EXISTS public.appointment_attendance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  note TEXT,
  actor_user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointment_attendance_events_appointment_created_idx
  ON public.appointment_attendance_events (appointment_id, created_at DESC);

ALTER TABLE public.appointment_attendance_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Attendance events are readable by the clinic team"
  ON public.appointment_attendance_events;
CREATE POLICY "Attendance events are readable by the clinic team"
  ON public.appointment_attendance_events
  FOR SELECT
  USING (true);

GRANT SELECT ON public.appointment_attendance_events TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.capture_appointment_attendance_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_name TEXT;
  v_event_type TEXT;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.attendance_status = OLD.attendance_status
     AND NEW.attendance_updated_at IS NOT DISTINCT FROM OLD.attendance_updated_at THEN
    RETURN NEW;
  END IF;

  IF NEW.attendance_updated_by IS NOT NULL THEN
    SELECT concat_ws(' ', prenom, nom)
    INTO v_actor_name
    FROM public.app_users
    WHERE id = NEW.attendance_updated_by;
  END IF;

  v_event_type := CASE
    WHEN NEW.attendance_status = 'expected'
      AND OLD.attendance_status IS DISTINCT FROM 'expected'
      THEN CASE
        WHEN OLD.attendance_status = 'cancelled' THEN 'reopened'
        ELSE 'reset_after_reschedule'
      END
    ELSE NEW.attendance_status
  END;

  INSERT INTO public.appointment_attendance_events (
    appointment_id,
    event_type,
    note,
    actor_user_id,
    actor_name
  )
  VALUES (
    NEW.id,
    v_event_type,
    NEW.attendance_note,
    NEW.attendance_updated_by,
    NULLIF(v_actor_name, '')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capture_appointment_attendance_event
  ON public.appointments;
CREATE TRIGGER capture_appointment_attendance_event
  AFTER UPDATE
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_appointment_attendance_event();

CREATE OR REPLACE FUNCTION public.reset_appointment_attendance_on_reschedule()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.date, NEW.heure_debut, NEW.heure_fin)
       IS DISTINCT FROM (OLD.date, OLD.heure_debut, OLD.heure_fin)
     AND NEW.statut IS DISTINCT FROM 'cancelled'
     AND OLD.attendance_status IN ('late_contacted', 'late_expected', 'no_show') THEN
    NEW.attendance_status := 'expected';
    NEW.attendance_updated_at := now();
    NEW.attendance_updated_by := NULL;
    NEW.attendance_note := 'Présence réinitialisée après reprogrammation.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reset_appointment_attendance_on_reschedule
  ON public.appointments;
CREATE TRIGGER reset_appointment_attendance_on_reschedule
  BEFORE UPDATE OF date, heure_debut, heure_fin
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_appointment_attendance_on_reschedule();

CREATE OR REPLACE FUNCTION public.sync_cancelled_appointment_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.statut = 'cancelled' AND OLD.statut IS DISTINCT FROM 'cancelled' THEN
    IF NEW.attendance_status IS DISTINCT FROM 'cancelled' THEN
      NEW.attendance_status := 'cancelled';
      NEW.attendance_updated_at := now();
      NEW.attendance_updated_by := NULL;
      NEW.attendance_note := COALESCE(NEW.attendance_note, 'Rendez-vous annulé.');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_cancelled_appointment_attendance
  ON public.appointments;
CREATE TRIGGER sync_cancelled_appointment_attendance
  BEFORE UPDATE OF statut
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_cancelled_appointment_attendance();

CREATE OR REPLACE FUNCTION public.record_appointment_attendance(
  _appointment_id UUID,
  _attendance_status TEXT,
  _actor_session_token TEXT,
  _note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.appointments%ROWTYPE;
  v_actor_user_id UUID;
  v_today DATE := (now() AT TIME ZONE 'Africa/Casablanca')::DATE;
  v_now_local TIMESTAMP := now() AT TIME ZONE 'Africa/Casablanca';
BEGIN
  IF _attendance_status IS NULL
     OR _attendance_status NOT IN ('late_contacted', 'late_expected', 'no_show', 'cancelled') THEN
    RAISE EXCEPTION 'Décision de présence non reconnue.';
  END IF;

  SELECT app_user.id
  INTO v_actor_user_id
  FROM public.app_sessions AS app_session
  JOIN public.app_users AS app_user ON app_user.id = app_session.user_id
  WHERE app_session.session_token = _actor_session_token
    AND app_session.expires_at > now()
    AND app_user.is_active;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session invalide ou expirée. Reconnectez-vous.';
  END IF;

  SELECT *
  INTO v_appointment
  FROM public.appointments
  WHERE id = _appointment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rendez-vous introuvable.';
  END IF;

  IF COALESCE(v_appointment.statut, 'pending') IN ('cancelled', 'completed')
     OR v_appointment.attendance_status IN ('arrived', 'no_show', 'cancelled') THEN
    RAISE EXCEPTION 'Ce rendez-vous a déjà été pris en charge ou clôturé.';
  END IF;

  IF v_appointment.date <> v_today THEN
    RAISE EXCEPTION 'La présence ne peut être décidée que le jour du rendez-vous.';
  END IF;

  IF _attendance_status <> 'cancelled'
     AND COALESCE(v_appointment.statut, 'pending') <> 'confirmed' THEN
    RAISE EXCEPTION 'Confirmez d’abord le rendez-vous avant de traiter son retard.';
  END IF;

  IF _attendance_status IN ('late_contacted', 'late_expected')
     AND v_now_local < v_appointment.date + v_appointment.heure_debut THEN
    RAISE EXCEPTION 'Le rendez-vous n’a pas encore commencé.';
  END IF;

  IF _attendance_status = 'no_show'
     AND v_now_local < v_appointment.date + v_appointment.heure_debut + INTERVAL '15 minutes' THEN
    RAISE EXCEPTION 'L’absence ne peut être confirmée qu’après 15 minutes de retard.';
  END IF;

  UPDATE public.appointments
  SET attendance_status = _attendance_status,
      attendance_updated_at = now(),
      attendance_updated_by = _actor_user_id,
      attendance_note = NULLIF(BTRIM(_note), ''),
      statut = CASE WHEN _attendance_status = 'cancelled' THEN 'cancelled' ELSE statut END
  WHERE id = _appointment_id;

  RETURN _appointment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_in_appointment_with_attendance(
  _appointment_id UUID,
  _actor_session_token TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_id UUID;
  v_actor_user_id UUID;
BEGIN
  SELECT app_user.id
  INTO v_actor_user_id
  FROM public.app_sessions AS app_session
  JOIN public.app_users AS app_user ON app_user.id = app_session.user_id
  WHERE app_session.session_token = _actor_session_token
    AND app_session.expires_at > now()
    AND app_user.is_active;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session invalide ou expirée. Reconnectez-vous.';
  END IF;

  v_queue_id := public.check_in_appointment(_appointment_id);

  UPDATE public.appointments
  SET attendance_status = 'arrived',
      attendance_updated_at = now(),
      attendance_updated_by = _actor_user_id,
      attendance_note = NULL
  WHERE id = _appointment_id
    AND attendance_status IS DISTINCT FROM 'arrived';

  RETURN v_queue_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_appointment_with_attendance(
  _appointment_id UUID,
  _patient_id UUID,
  _date DATE,
  _heure_debut TIME,
  _heure_fin TIME,
  _type TEXT,
  _statut TEXT,
  _notes TEXT,
  _actor_session_token TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.appointments%ROWTYPE;
  v_actor_user_id UUID;
BEGIN
  SELECT app_user.id
  INTO v_actor_user_id
  FROM public.app_sessions AS app_session
  JOIN public.app_users AS app_user ON app_user.id = app_session.user_id
  WHERE app_session.session_token = _actor_session_token
    AND app_session.expires_at > now()
    AND app_user.is_active;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session invalide ou expirée. Reconnectez-vous.';
  END IF;

  IF _statut IS NULL OR _statut NOT IN ('pending', 'confirmed', 'cancelled', 'completed') THEN
    RAISE EXCEPTION 'Statut de rendez-vous non reconnu.';
  END IF;

  SELECT *
  INTO v_appointment
  FROM public.appointments
  WHERE id = _appointment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rendez-vous introuvable.';
  END IF;

  UPDATE public.appointments
  SET patient_id = _patient_id,
      date = _date,
      heure_debut = _heure_debut,
      heure_fin = _heure_fin,
      type = _type,
      statut = _statut,
      notes = _notes,
      attendance_status = CASE
        WHEN _statut = 'cancelled' AND v_appointment.statut IS DISTINCT FROM 'cancelled' THEN 'cancelled'
        WHEN v_appointment.attendance_status = 'cancelled'
          AND _statut IN ('pending', 'confirmed') THEN 'expected'
        ELSE v_appointment.attendance_status
      END,
      attendance_updated_at = CASE
        WHEN _statut = 'cancelled' AND v_appointment.statut IS DISTINCT FROM 'cancelled' THEN now()
        WHEN v_appointment.attendance_status = 'cancelled'
          AND _statut IN ('pending', 'confirmed') THEN now()
        ELSE v_appointment.attendance_updated_at
      END,
      attendance_updated_by = CASE
        WHEN _statut = 'cancelled' AND v_appointment.statut IS DISTINCT FROM 'cancelled' THEN v_actor_user_id
        WHEN v_appointment.attendance_status = 'cancelled'
          AND _statut IN ('pending', 'confirmed') THEN v_actor_user_id
        ELSE v_appointment.attendance_updated_by
      END,
      attendance_note = CASE
        WHEN _statut = 'cancelled' AND v_appointment.statut IS DISTINCT FROM 'cancelled' THEN 'Rendez-vous annulé depuis l’agenda.'
        WHEN v_appointment.attendance_status = 'cancelled'
          AND _statut IN ('pending', 'confirmed') THEN 'Rendez-vous réactivé depuis l’agenda.'
        ELSE v_appointment.attendance_note
      END
  WHERE id = _appointment_id;

  RETURN _appointment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_appointment_attendance(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_in_appointment_with_attendance(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_appointment_with_attendance(UUID, UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_appointment_attendance(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_appointment_with_attendance(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_appointment_with_attendance(UUID, UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
