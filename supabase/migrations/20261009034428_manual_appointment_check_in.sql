ALTER TABLE public.queue
  ADD COLUMN appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX queue_appointment_id_unique
  ON public.queue (appointment_id)
  WHERE appointment_id IS NOT NULL;

DROP TRIGGER IF EXISTS on_appointment_confirmed_add_to_queue ON public.appointments;
DROP TRIGGER IF EXISTS on_appointment_confirmed_insert_to_queue ON public.appointments;

CREATE OR REPLACE FUNCTION public.check_in_appointment(_appointment_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.appointments%ROWTYPE;
  v_existing_queue_id UUID;
  v_next_order INTEGER;
  v_today DATE := (now() AT TIME ZONE 'Africa/Casablanca')::DATE;
  v_day_start TIMESTAMPTZ;
  v_day_end TIMESTAMPTZ;
BEGIN
  SELECT *
  INTO v_appointment
  FROM public.appointments
  WHERE id = _appointment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rendez-vous introuvable.';
  END IF;

  IF v_appointment.date <> v_today THEN
    RAISE EXCEPTION 'Seuls les rendez-vous du jour peuvent être enregistrés à l’accueil.';
  END IF;

  IF COALESCE(v_appointment.statut, 'pending') IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'Ce rendez-vous annulé ou terminé ne peut pas être ajouté à la file.';
  END IF;

  SELECT id
  INTO v_existing_queue_id
  FROM public.queue
  WHERE appointment_id = _appointment_id;

  IF FOUND THEN
    RETURN v_existing_queue_id;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_today::TEXT));

  SELECT id
  INTO v_existing_queue_id
  FROM public.queue
  WHERE patient_id = v_appointment.patient_id
    AND (created_at AT TIME ZONE 'Africa/Casablanca')::DATE = v_today
    AND status IN ('waiting', 'in_consultation')
  ORDER BY numero_ordre
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Ce patient est déjà présent dans la file.';
  END IF;

  v_day_start := v_today::TIMESTAMP AT TIME ZONE 'Africa/Casablanca';
  v_day_end := (v_today + 1)::TIMESTAMP AT TIME ZONE 'Africa/Casablanca';

  SELECT COALESCE(MAX(numero_ordre), 0) + 1
  INTO v_next_order
  FROM public.queue
  WHERE created_at >= v_day_start
    AND created_at < v_day_end;

  INSERT INTO public.queue (
    patient_id,
    appointment_id,
    numero_ordre,
    status,
    motif
  )
  VALUES (
    v_appointment.patient_id,
    _appointment_id,
    v_next_order,
    'waiting',
    v_appointment.type
  )
  RETURNING id INTO v_existing_queue_id;

  RETURN v_existing_queue_id;
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_appointment(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_in_appointment(UUID) TO anon, authenticated;
