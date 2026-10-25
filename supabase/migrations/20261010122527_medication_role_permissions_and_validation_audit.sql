CREATE OR REPLACE FUNCTION public.guard_structured_medication_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (
    TG_OP = 'INSERT'
    AND NEW.traitements_structures IS DISTINCT FROM '[]'::jsonb
  ) OR (
    TG_OP = 'UPDATE'
    AND NEW.traitements_structures IS DISTINCT FROM OLD.traitements_structures
  ) THEN
    IF current_user <> 'postgres' THEN
      RAISE EXCEPTION 'Les traitements doivent être modifiés via la fonction sécurisée du dossier.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON TABLE public.app_sessions FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_structured_medication_write ON public.medical_records;
CREATE TRIGGER guard_structured_medication_write
BEFORE INSERT OR UPDATE OF traitements_structures ON public.medical_records
FOR EACH ROW
EXECUTE FUNCTION public.guard_structured_medication_write();

CREATE OR REPLACE FUNCTION public.save_structured_patient_medications(
  _patient_id uuid,
  _medications jsonb,
  _actor_session_token text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_user_name text;
  v_role public.app_role;
  v_record_id uuid;
  v_previous jsonb := '[]'::jsonb;
  v_next jsonb := '[]'::jsonb;
  v_item jsonb;
  v_previous_item jsonb;
  v_status text;
  v_source text;
  v_write_changed boolean;
  v_key text;
BEGIN
  SELECT app_user.id, app_user.role, concat_ws(' ', app_user.prenom, app_user.nom)
  INTO v_user_id, v_role, v_user_name
  FROM public.app_sessions AS app_session
  JOIN public.app_users AS app_user ON app_user.id = app_session.user_id
  WHERE app_session.session_token = _actor_session_token
    AND app_session.expires_at > now()
    AND app_user.is_active;

  IF NOT FOUND OR v_role NOT IN ('medecin', 'secretaire') THEN
    RAISE EXCEPTION 'Seuls le médecin et le secrétariat peuvent modifier les traitements.';
  END IF;

  IF _patient_id IS NULL OR jsonb_typeof(_medications) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Dossier patient ou liste de traitements invalide.';
  END IF;

  IF jsonb_array_length(_medications) > 300 THEN
    RAISE EXCEPTION 'La liste des traitements dépasse la limite autorisée.';
  END IF;

  SELECT medical_record.id, medical_record.traitements_structures
  INTO v_record_id, v_previous
  FROM public.medical_records AS medical_record
  WHERE medical_record.patient_id = _patient_id
  FOR UPDATE;

  v_previous := COALESCE(v_previous, '[]'::jsonb);

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(_medications) AS item(value)
    WHERE jsonb_typeof(item.value) IS DISTINCT FROM 'object'
      OR COALESCE(item.value->>'id', '') = ''
      OR COALESCE(item.value->>'name', '') = ''
      OR COALESCE(item.value->>'status', '') NOT IN (
        'prescribed', 'needs_confirmation', 'active', 'suspended',
        'stopped', 'completed', 'not_started'
      )
      OR COALESCE(item.value->>'source', '') NOT IN (
        'patient_report', 'clinician_verified', 'clinic_prescription'
      )
  ) THEN
    RAISE EXCEPTION 'La liste contient un médicament ou un statut invalide.';
  END IF;

  IF EXISTS (
    SELECT item.value->>'id'
    FROM jsonb_array_elements(_medications) AS item(value)
    GROUP BY item.value->>'id'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'La liste contient des identifiants de traitement en double.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_previous) AS previous(value)
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(_medications) AS proposed(value)
      WHERE proposed.value->>'id' = previous.value->>'id'
    )
  ) THEN
    RAISE EXCEPTION 'Un traitement existant ne peut pas être supprimé de l’historique.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(_medications)
  LOOP
    v_status := v_item->>'status';
    v_source := v_item->>'source';
    v_previous_item := NULL;

    SELECT previous.value
    INTO v_previous_item
    FROM jsonb_array_elements(v_previous) AS previous(value)
    WHERE previous.value->>'id' = v_item->>'id'
    LIMIT 1;

    v_write_changed := v_previous_item IS DISTINCT FROM v_item;

    IF v_role = 'secretaire' AND v_write_changed THEN
      IF v_source <> 'patient_report' OR v_status IN ('active', 'prescribed') THEN
        RAISE EXCEPTION 'Le secrétariat peut consigner une déclaration du patient, mais seul le médecin peut valider ou prescrire un traitement.';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(v_item->'status_history', '[]'::jsonb)) AS event(value)
        WHERE event.value->>'status' IN ('active', 'prescribed')
           OR event.value->>'decided_by' = 'clinician'
      ) THEN
        RAISE EXCEPTION 'Le secrétariat ne peut pas consigner une validation médicale dans l’historique.';
      END IF;
    END IF;

    IF v_role <> 'medecin'
       AND v_write_changed
       AND (v_status = 'active' OR v_source = 'clinician_verified') THEN
      RAISE EXCEPTION 'La validation d’un traitement est réservée au médecin.';
    END IF;

    v_item := v_item - 'validated_by_user_id' - 'validated_by_name' - 'validated_at';

    IF v_status = 'active' AND v_role = 'medecin'
       AND (
          v_previous_item IS NULL
          OR v_previous_item->>'status' IS DISTINCT FROM 'active'
        ) THEN
      v_item := v_item || jsonb_build_object(
        'validated_by_user_id', v_user_id,
        'validated_by_name', NULLIF(v_user_name, ''),
        'validated_at', now(),
        'confirmed_at', now()
      );
    ELSE
      FOREACH v_key IN ARRAY ARRAY['validated_by_user_id', 'validated_by_name', 'validated_at']
      LOOP
        IF v_previous_item ? v_key THEN
          v_item := v_item || jsonb_build_object(v_key, v_previous_item->v_key);
        END IF;
      END LOOP;
    END IF;

    v_next := v_next || jsonb_build_array(v_item);
  END LOOP;

  IF v_record_id IS NULL THEN
    INSERT INTO public.medical_records (patient_id, traitements_structures)
    VALUES (_patient_id, v_next)
    RETURNING id INTO v_record_id;
  ELSE
    UPDATE public.medical_records
    SET traitements_structures = v_next
    WHERE id = v_record_id;
  END IF;

  RETURN v_record_id;
END;
$$;

ALTER FUNCTION public.save_structured_patient_medications(uuid, jsonb, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.save_structured_patient_medications(uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_structured_patient_medications(uuid, jsonb, text) TO anon, authenticated;