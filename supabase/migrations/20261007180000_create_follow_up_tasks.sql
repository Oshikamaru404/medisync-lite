CREATE TABLE public.follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id UUID NOT NULL UNIQUE REFERENCES public.consultations(id) ON DELETE CASCADE,
  appointment_id UUID UNIQUE REFERENCES public.appointments(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('control', 'exam')),
  instruction TEXT CHECK (char_length(instruction) <= 500),
  status TEXT NOT NULL DEFAULT 'to_contact'
    CHECK (status IN ('to_contact', 'unreachable', 'declined', 'scheduled', 'completed', 'cancelled')),
  created_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_follow_up_tasks_status_due_date
  ON public.follow_up_tasks(status, due_date);

ALTER TABLE public.follow_up_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for follow_up_tasks"
  ON public.follow_up_tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_up_tasks;

DROP FUNCTION IF EXISTS public.complete_consultation(UUID);

CREATE FUNCTION public.complete_consultation(
  _consultation_id UUID,
  _follow_up_due_date DATE DEFAULT NULL,
  _follow_up_type TEXT DEFAULT NULL,
  _follow_up_instruction TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_queue_id UUID;
  target_patient_id UUID;
  rows_updated INTEGER;
BEGIN
  IF _follow_up_due_date IS NULL AND (_follow_up_type IS NOT NULL OR _follow_up_instruction IS NOT NULL) THEN
    RAISE EXCEPTION 'Une date est nécessaire pour créer un suivi';
  END IF;

  IF _follow_up_due_date IS NOT NULL THEN
    IF _follow_up_due_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'La date du suivi ne peut pas être passée';
    END IF;
    IF _follow_up_type IS NULL OR _follow_up_type NOT IN ('control', 'exam') THEN
      RAISE EXCEPTION 'Type de suivi invalide';
    END IF;
    IF char_length(COALESCE(_follow_up_instruction, '')) > 500 THEN
      RAISE EXCEPTION 'La consigne de suivi ne peut pas dépasser 500 caractères';
    END IF;
  END IF;

  SELECT queue_id, patient_id
  INTO target_queue_id, target_patient_id
  FROM public.consultations
  WHERE id = _consultation_id
  FOR UPDATE;

  IF target_queue_id IS NULL THEN
    RAISE EXCEPTION 'Consultation introuvable';
  END IF;

  UPDATE public.queue
  SET status = 'completed'
  WHERE id = target_queue_id
    AND status = 'in_consultation';

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  IF rows_updated = 0 THEN
    RAISE EXCEPTION 'Le patient n’est pas en consultation';
  END IF;

  UPDATE public.consultations
  SET status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = _consultation_id;

  IF _follow_up_due_date IS NOT NULL THEN
    INSERT INTO public.follow_up_tasks (
      patient_id,
      consultation_id,
      due_date,
      kind,
      instruction,
      created_by
    )
    VALUES (
      target_patient_id,
      _consultation_id,
      _follow_up_due_date,
      _follow_up_type,
      NULLIF(BTRIM(_follow_up_instruction), ''),
      (SELECT created_by FROM public.consultations WHERE id = _consultation_id)
    );
  END IF;

  RETURN target_queue_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_follow_up_appointment(
  _follow_up_id UUID,
  _date DATE,
  _heure_debut TIME,
  _heure_fin TIME
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_patient_id UUID;
  target_status TEXT;
  target_appointment_id UUID;
BEGIN
  IF _date IS NULL OR _date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Choisissez une date à venir';
  END IF;
  IF _heure_debut IS NULL OR _heure_fin IS NULL OR _heure_fin <= _heure_debut THEN
    RAISE EXCEPTION 'L’heure de fin doit être après l’heure de début';
  END IF;

  SELECT patient_id, status, appointment_id
  INTO target_patient_id, target_status, target_appointment_id
  FROM public.follow_up_tasks
  WHERE id = _follow_up_id
  FOR UPDATE;

  IF target_patient_id IS NULL THEN
    RAISE EXCEPTION 'Suivi introuvable';
  END IF;

  IF target_appointment_id IS NOT NULL THEN
    RETURN target_appointment_id;
  END IF;
  IF target_status NOT IN ('to_contact', 'unreachable') THEN
    RAISE EXCEPTION 'Ce suivi ne peut plus être planifié';
  END IF;

  INSERT INTO public.appointments (
    patient_id,
    date,
    heure_debut,
    heure_fin,
    type,
    statut,
    notes
  )
  VALUES (
    target_patient_id,
    _date,
    _heure_debut,
    _heure_fin,
    'suivi',
    'confirmed',
    'Suivi recommandé par le médecin'
  )
  RETURNING id INTO target_appointment_id;

  UPDATE public.follow_up_tasks
  SET status = 'scheduled',
      appointment_id = target_appointment_id,
      updated_at = NOW()
  WHERE id = _follow_up_id;

  RETURN target_appointment_id;
END;
$$;
