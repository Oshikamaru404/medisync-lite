ALTER TABLE public.medical_records
  ADD COLUMN traitements_structures jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD CONSTRAINT medical_records_traitements_structures_is_array
    CHECK (jsonb_typeof(traitements_structures) = 'array');

COMMENT ON COLUMN public.medical_records.traitements_structures IS
  'Structured patient medication history. Legacy free-text traitements remain separate and unconfirmed.';

CREATE OR REPLACE FUNCTION public.get_queue_intake_context(
  _queue_id UUID,
  _actor_session_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_patient_id UUID;
  v_result JSONB;
BEGIN
  SELECT app_user.role
  INTO v_role
  FROM public.app_sessions AS app_session
  JOIN public.app_users AS app_user ON app_user.id = app_session.user_id
  WHERE app_session.session_token = _actor_session_token
    AND app_session.expires_at > now()
    AND app_user.is_active;

  IF NOT FOUND OR v_role NOT IN ('medecin', 'secretaire', 'assistant') THEN
    RAISE EXCEPTION 'Session invalide ou non autorisée. Reconnectez-vous.';
  END IF;

  SELECT patient_id
  INTO v_patient_id
  FROM public.queue
  WHERE id = _queue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Passage de file introuvable.';
  END IF;

  SELECT jsonb_build_object(
    'patient', jsonb_build_object(
      'id', patient.id,
      'nom', patient.nom,
      'prenom', patient.prenom,
      'cin', patient.cin,
      'date_naissance', patient.date_naissance,
      'telephone', patient.telephone,
      'mutuelle', patient.mutuelle,
      'numero_mutuelle', patient.numero_mutuelle,
      'sexe', patient.sexe,
      'poids', patient.poids,
      'taille', patient.taille
    ),
    'medical_record', (
      SELECT jsonb_build_object(
        'antecedents', medical_record.antecedents,
        'allergies', medical_record.allergies,
        'traitements', medical_record.traitements,
        'traitements_structures', medical_record.traitements_structures
      )
      FROM public.medical_records AS medical_record
      WHERE medical_record.patient_id = patient.id
    ),
    'current_intake', (
      SELECT to_jsonb(intake)
      FROM public.queue_intakes AS intake
      WHERE intake.queue_id = _queue_id
    ),
    'previous_visit_count', (
      SELECT count(*)
      FROM public.queue AS previous_queue
      WHERE previous_queue.patient_id = patient.id
        AND previous_queue.id <> _queue_id
        AND previous_queue.status IN ('in_consultation', 'completed')
    ),
    'last_visit_at', (
      SELECT max(COALESCE(previous_queue.completed_at, previous_queue.created_at))
      FROM public.queue AS previous_queue
      WHERE previous_queue.patient_id = patient.id
        AND previous_queue.id <> _queue_id
        AND previous_queue.status = 'completed'
    ),
    'recent_intakes', COALESCE((
      SELECT jsonb_agg(to_jsonb(recent))
      FROM (
        SELECT intake.*
        FROM public.queue_intakes AS intake
        JOIN public.queue AS intake_queue ON intake_queue.id = intake.queue_id
        WHERE intake_queue.patient_id = patient.id
          AND intake.queue_id <> _queue_id
        ORDER BY intake.created_at DESC
        LIMIT 5
      ) AS recent
    ), '[]'::JSONB)
  )
  INTO v_result
  FROM public.patients AS patient
  WHERE patient.id = v_patient_id;

  RETURN v_result;
END;
$$;