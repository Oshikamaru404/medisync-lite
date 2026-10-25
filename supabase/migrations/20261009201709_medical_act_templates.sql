CREATE TABLE public.medical_act_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Autres actes',
  ngap_code TEXT,
  unit_price NUMERIC(10, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT medical_act_templates_label_check CHECK (length(btrim(label)) BETWEEN 1 AND 150),
  CONSTRAINT medical_act_templates_category_check CHECK (length(btrim(category)) BETWEEN 1 AND 80),
  CONSTRAINT medical_act_templates_ngap_code_check CHECK (ngap_code IS NULL OR length(btrim(ngap_code)) <= 40),
  CONSTRAINT medical_act_templates_price_check CHECK (unit_price IS NULL OR unit_price BETWEEN 0 AND 1000000)
);

CREATE INDEX medical_act_templates_doctor_active_idx
  ON public.medical_act_templates (doctor_user_id, is_active, category, label);

CREATE UNIQUE INDEX medical_act_templates_doctor_label_active_uidx
  ON public.medical_act_templates (doctor_user_id, lower(label))
  WHERE is_active;

ALTER TABLE public.medical_act_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.medical_act_templates FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_medical_act_templates(_actor_session_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_role public.app_role;
BEGIN
  SELECT app_user.id, app_user.role
  INTO v_user_id, v_role
  FROM public.app_sessions AS app_session
  JOIN public.app_users AS app_user ON app_user.id = app_session.user_id
  WHERE app_session.session_token = _actor_session_token
    AND app_session.expires_at > now()
    AND app_user.is_active;

  IF NOT FOUND OR v_role <> 'medecin' THEN
    RAISE EXCEPTION 'Session médecin invalide ou non autorisée. Reconnectez-vous.';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(template) ORDER BY template.is_active DESC, template.category, template.label)
    FROM public.medical_act_templates AS template
    WHERE template.doctor_user_id = v_user_id
  ), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_medical_act_template(
  _actor_session_token TEXT,
  _template_id UUID,
  _label TEXT,
  _category TEXT,
  _ngap_code TEXT,
  _unit_price NUMERIC,
  _is_active BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_role public.app_role;
  v_template_id UUID;
BEGIN
  SELECT app_user.id, app_user.role
  INTO v_user_id, v_role
  FROM public.app_sessions AS app_session
  JOIN public.app_users AS app_user ON app_user.id = app_session.user_id
  WHERE app_session.session_token = _actor_session_token
    AND app_session.expires_at > now()
    AND app_user.is_active;

  IF NOT FOUND OR v_role <> 'medecin' THEN
    RAISE EXCEPTION 'Session médecin invalide ou non autorisée. Reconnectez-vous.';
  END IF;
  IF _label IS NULL OR length(btrim(_label)) NOT BETWEEN 1 AND 150 THEN
    RAISE EXCEPTION 'Le libellé de l’acte doit comporter entre 1 et 150 caractères.';
  END IF;
  IF _category IS NULL OR length(btrim(_category)) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'La catégorie doit comporter entre 1 et 80 caractères.';
  END IF;
  IF _ngap_code IS NOT NULL AND length(btrim(_ngap_code)) > 40 THEN
    RAISE EXCEPTION 'Le code NGAP ne peut pas dépasser 40 caractères.';
  END IF;
  IF _unit_price IS NOT NULL AND (_unit_price < 0 OR _unit_price > 1000000) THEN
    RAISE EXCEPTION 'Le tarif doit être compris entre 0 et 1 000 000 DH.';
  END IF;

  IF _template_id IS NULL THEN
    INSERT INTO public.medical_act_templates (
      doctor_user_id, label, category, ngap_code, unit_price, is_active
    )
    VALUES (
      v_user_id, btrim(_label), btrim(_category), NULLIF(btrim(_ngap_code), ''),
      _unit_price, COALESCE(_is_active, true)
    )
    RETURNING id INTO v_template_id;
  ELSE
    UPDATE public.medical_act_templates
    SET label = btrim(_label),
        category = btrim(_category),
        ngap_code = NULLIF(btrim(_ngap_code), ''),
        unit_price = _unit_price,
        is_active = COALESCE(_is_active, true),
        updated_at = now()
    WHERE id = _template_id
      AND doctor_user_id = v_user_id
    RETURNING id INTO v_template_id;

    IF v_template_id IS NULL THEN
      RAISE EXCEPTION 'Acte introuvable dans votre catalogue.';
    END IF;
  END IF;

  RETURN v_template_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_medical_act_template(
  _actor_session_token TEXT,
  _template_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_role public.app_role;
BEGIN
  SELECT app_user.id, app_user.role
  INTO v_user_id, v_role
  FROM public.app_sessions AS app_session
  JOIN public.app_users AS app_user ON app_user.id = app_session.user_id
  WHERE app_session.session_token = _actor_session_token
    AND app_session.expires_at > now()
    AND app_user.is_active;

  IF NOT FOUND OR v_role <> 'medecin' THEN
    RAISE EXCEPTION 'Session médecin invalide ou non autorisée. Reconnectez-vous.';
  END IF;

  UPDATE public.medical_act_templates
  SET is_active = false, updated_at = now()
  WHERE id = _template_id
    AND doctor_user_id = v_user_id
    AND is_active;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.get_medical_act_templates(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_medical_act_template(TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_medical_act_template(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_medical_act_templates(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_medical_act_template(TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_medical_act_template(TEXT, UUID) TO anon, authenticated;