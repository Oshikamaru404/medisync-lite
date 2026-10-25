ALTER TABLE public.consultations
  ADD COLUMN follow_up_decision TEXT
  CHECK (follow_up_decision IN ('pending', 'none', 'planned', 'not_recorded'));

UPDATE public.consultations
SET follow_up_decision = CASE
  WHEN status = 'completed' THEN 'not_recorded'
  ELSE 'pending'
END;

ALTER TABLE public.consultations
  ALTER COLUMN follow_up_decision SET DEFAULT 'pending',
  ALTER COLUMN follow_up_decision SET NOT NULL;

DROP FUNCTION IF EXISTS public.complete_consultation(UUID, DATE, TEXT, TEXT);

CREATE FUNCTION public.complete_consultation(
  _consultation_id UUID,
  _follow_up_due_date DATE DEFAULT NULL,
  _follow_up_type TEXT DEFAULT NULL,
  _follow_up_instruction TEXT DEFAULT NULL,
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
    RAISE EXCEPTION 'Indiquez si un suivi est nécessaire';
  END IF;

  IF _follow_up_none AND (
    _follow_up_due_date IS NOT NULL
    OR _follow_up_type IS NOT NULL
    OR _follow_up_instruction IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Un suivi ne peut pas être à la fois prévu et déclaré inutile';
  END IF;

  IF NOT _follow_up_none AND _follow_up_due_date IS NULL THEN
    RAISE EXCEPTION 'Choisissez une échéance ou indiquez qu’aucun suivi n’est nécessaire';
  END IF;

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
      updated_at = NOW(),
      follow_up_decision = CASE WHEN _follow_up_none THEN 'none' ELSE 'planned' END
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
