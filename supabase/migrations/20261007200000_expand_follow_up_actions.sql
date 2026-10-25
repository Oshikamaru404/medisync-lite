ALTER TABLE public.follow_up_tasks
  ALTER COLUMN due_date DROP NOT NULL,
  ADD COLUMN destination TEXT
    CHECK (destination IS NULL OR char_length(destination) <= 160);

ALTER TABLE public.follow_up_tasks
  DROP CONSTRAINT follow_up_tasks_kind_check,
  ADD CONSTRAINT follow_up_tasks_kind_check
    CHECK (kind IN ('control', 'exam', 'referral', 'surgery')),
  DROP CONSTRAINT follow_up_tasks_status_check,
  ADD CONSTRAINT follow_up_tasks_status_check
    CHECK (status IN ('to_contact', 'unreachable', 'declined', 'scheduled', 'arranged', 'completed', 'cancelled')),
  ADD CONSTRAINT follow_up_tasks_details_check
    CHECK (
      (kind = 'referral' AND due_date IS NULL AND NULLIF(BTRIM(destination), '') IS NOT NULL)
      OR (kind = 'surgery' AND NULLIF(BTRIM(destination), '') IS NOT NULL)
      OR (kind IN ('control', 'exam') AND due_date IS NOT NULL)
    );

DROP FUNCTION IF EXISTS public.complete_consultation(UUID, DATE, TEXT, TEXT, BOOLEAN);

CREATE FUNCTION public.complete_consultation(
  _consultation_id UUID,
  _follow_up_due_date DATE DEFAULT NULL,
  _follow_up_type TEXT DEFAULT NULL,
  _follow_up_instruction TEXT DEFAULT NULL,
  _follow_up_destination TEXT DEFAULT NULL,
  _follow_up_none BOOLEAN DEFAULT FALSE
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
  IF _follow_up_none IS NULL THEN
    RAISE EXCEPTION 'Indiquez si une suite est nécessaire';
  END IF;

  IF _follow_up_none AND (
    _follow_up_due_date IS NOT NULL
    OR _follow_up_type IS NOT NULL
    OR _follow_up_instruction IS NOT NULL
    OR _follow_up_destination IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Une suite ne peut pas être à la fois prévue et déclarée inutile';
  END IF;

  IF NOT _follow_up_none THEN
    IF _follow_up_type IS NULL OR _follow_up_type NOT IN ('control', 'exam', 'referral', 'surgery') THEN
      RAISE EXCEPTION 'Type de suite invalide';
    END IF;
    IF _follow_up_type IN ('control', 'exam') AND _follow_up_due_date IS NULL THEN
      RAISE EXCEPTION 'Une échéance est nécessaire pour ce suivi';
    END IF;
    IF _follow_up_type = 'referral' AND _follow_up_due_date IS NOT NULL THEN
      RAISE EXCEPTION 'Une référence ne nécessite pas de date souhaitée';
    END IF;
    IF _follow_up_type IN ('referral', 'surgery')
      AND NULLIF(BTRIM(_follow_up_destination), '') IS NULL THEN
      RAISE EXCEPTION 'Précisez la spécialité ou l’intervention';
    END IF;
    IF _follow_up_due_date IS NOT NULL AND _follow_up_due_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'La date du suivi ne peut pas être passée';
    END IF;
    IF char_length(COALESCE(_follow_up_instruction, '')) > 500 THEN
      RAISE EXCEPTION 'La consigne de suivi ne peut pas dépasser 500 caractères';
    END IF;
    IF char_length(COALESCE(_follow_up_destination, '')) > 160 THEN
      RAISE EXCEPTION 'La spécialité ou l’intervention ne peut pas dépasser 160 caractères';
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
      updated_at = NOW(),
      follow_up_decision = CASE WHEN _follow_up_none THEN 'none' ELSE 'planned' END
  WHERE id = _consultation_id;

  IF NOT _follow_up_none THEN
    INSERT INTO public.follow_up_tasks (
      patient_id,
      consultation_id,
      due_date,
      kind,
      instruction,
      destination,
      created_by
    )
    VALUES (
      target_patient_id,
      _consultation_id,
      _follow_up_due_date,
      _follow_up_type,
      NULLIF(BTRIM(_follow_up_instruction), ''),
      NULLIF(BTRIM(_follow_up_destination), ''),
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
  target_kind TEXT;
  target_appointment_id UUID;
BEGIN
  IF _date IS NULL OR _date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Choisissez une date à venir';
  END IF;
  IF _heure_debut IS NULL OR _heure_fin IS NULL OR _heure_fin <= _heure_debut THEN
    RAISE EXCEPTION 'L’heure de fin doit être après l’heure de début';
  END IF;

  SELECT patient_id, status, kind, appointment_id
  INTO target_patient_id, target_status, target_kind, target_appointment_id
  FROM public.follow_up_tasks
  WHERE id = _follow_up_id
  FOR UPDATE;

  IF target_patient_id IS NULL THEN
    RAISE EXCEPTION 'Suivi introuvable';
  END IF;
  IF target_kind NOT IN ('control', 'exam') THEN
    RAISE EXCEPTION 'Cette suite ne se planifie pas comme un rendez-vous de contrôle';
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
