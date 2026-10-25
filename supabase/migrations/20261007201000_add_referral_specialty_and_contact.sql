ALTER TABLE public.follow_up_tasks
  ADD COLUMN referral_specialty TEXT
    CHECK (referral_specialty IS NULL OR char_length(referral_specialty) <= 160),
  ADD COLUMN referral_contact_name TEXT
    CHECK (referral_contact_name IS NULL OR char_length(referral_contact_name) <= 160);

ALTER TABLE public.follow_up_tasks
  DROP CONSTRAINT follow_up_tasks_details_check;

UPDATE public.follow_up_tasks
SET referral_specialty = destination,
    destination = NULL
WHERE kind = 'referral'
  AND destination IS NOT NULL;
ALTER TABLE public.follow_up_tasks
  ADD CONSTRAINT follow_up_tasks_details_check
    CHECK (
      (kind = 'referral'
        AND due_date IS NULL
        AND NULLIF(BTRIM(referral_specialty), '') IS NOT NULL
        AND destination IS NULL)
      OR (kind = 'surgery' AND NULLIF(BTRIM(destination), '') IS NOT NULL)
      OR (kind IN ('control', 'exam') AND due_date IS NOT NULL)
    );

DROP FUNCTION IF EXISTS public.complete_consultation(UUID, DATE, TEXT, TEXT, TEXT, BOOLEAN);

CREATE FUNCTION public.complete_consultation(
  _consultation_id UUID,
  _follow_up_due_date DATE DEFAULT NULL,
  _follow_up_type TEXT DEFAULT NULL,
  _follow_up_instruction TEXT DEFAULT NULL,
  _follow_up_destination TEXT DEFAULT NULL,
  _follow_up_specialty TEXT DEFAULT NULL,
  _follow_up_contact_name TEXT DEFAULT NULL,
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
    OR _follow_up_specialty IS NOT NULL
    OR _follow_up_contact_name IS NOT NULL
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
    IF _follow_up_type = 'referral'
      AND (_follow_up_due_date IS NOT NULL OR NULLIF(BTRIM(_follow_up_specialty), '') IS NULL) THEN
      RAISE EXCEPTION 'Choisissez une spécialité pour cette référence, sans date souhaitée';
    END IF;
    IF _follow_up_type = 'surgery' AND NULLIF(BTRIM(_follow_up_destination), '') IS NULL THEN
      RAISE EXCEPTION 'Précisez l’intervention';
    END IF;
    IF _follow_up_due_date IS NOT NULL AND _follow_up_due_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'La date du suivi ne peut pas être passée';
    END IF;
    IF char_length(COALESCE(_follow_up_instruction, '')) > 500 THEN
      RAISE EXCEPTION 'La consigne de suivi ne peut pas dépasser 500 caractères';
    END IF;
    IF char_length(COALESCE(_follow_up_destination, '')) > 160
      OR char_length(COALESCE(_follow_up_specialty, '')) > 160
      OR char_length(COALESCE(_follow_up_contact_name, '')) > 160 THEN
      RAISE EXCEPTION 'Les informations de destination dépassent la longueur autorisée';
    END IF;
    IF _follow_up_type <> 'referral'
      AND (_follow_up_specialty IS NOT NULL OR _follow_up_contact_name IS NOT NULL) THEN
      RAISE EXCEPTION 'Les coordonnées du confrère ne sont valides que pour une référence';
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
      referral_specialty,
      referral_contact_name,
      created_by
    )
    VALUES (
      target_patient_id,
      _consultation_id,
      _follow_up_due_date,
      _follow_up_type,
      NULLIF(BTRIM(_follow_up_instruction), ''),
      CASE WHEN _follow_up_type = 'surgery' THEN NULLIF(BTRIM(_follow_up_destination), '') ELSE NULL END,
      CASE WHEN _follow_up_type = 'referral' THEN NULLIF(BTRIM(_follow_up_specialty), '') ELSE NULL END,
      CASE WHEN _follow_up_type = 'referral' THEN NULLIF(BTRIM(_follow_up_contact_name), '') ELSE NULL END,
      (SELECT created_by FROM public.consultations WHERE id = _consultation_id)
    );
  END IF;

  RETURN target_queue_id;
END;
$$;
