ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS consultation_pricing_item BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.invoice_items
SET consultation_pricing_item = TRUE
WHERE medical_act_template_id IS NOT NULL
   OR description = 'Honoraires de consultation';

CREATE OR REPLACE FUNCTION public.save_consultation_pricing(
  _queue_id UUID,
  _consultation_amount NUMERIC,
  _discount_type TEXT,
  _discount_value NUMERIC,
  _settlement_instruction TEXT,
  _actor_session_token TEXT,
  _items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_role public.app_role;
  v_patient_id UUID;
  v_invoice_id UUID;
  v_gross_amount NUMERIC(12, 2);
  v_final_amount NUMERIC(10, 2);
  v_discount_amount NUMERIC(10, 2);
  v_invoice_status TEXT;
  v_item JSONB;
  v_template_id UUID;
  v_description TEXT;
  v_quantity NUMERIC(8, 2);
  v_unit_price NUMERIC(10, 2);
  v_catalog_price NUMERIC(10, 2);
  v_line_total NUMERIC(12, 2);
  v_order SMALLINT := 0;
  v_seen_template_ids UUID[] := ARRAY[]::UUID[];
  v_invoice_lines JSONB;
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

  IF _settlement_instruction IS NULL
    OR _settlement_instruction NOT IN ('due_at_reception', 'deferred', 'free') THEN
    RAISE EXCEPTION 'Consigne de règlement invalide.';
  END IF;

  IF _consultation_amount IS NULL
    OR _consultation_amount < 0
    OR _consultation_amount > 1000000 THEN
    RAISE EXCEPTION 'Le tarif de consultation doit être compris entre 0 et 1 000 000 DH.';
  END IF;

  IF _items IS NULL OR jsonb_typeof(_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'La liste des actes sélectionnés est invalide.';
  END IF;
  IF jsonb_array_length(_items) > 29 THEN
    RAISE EXCEPTION 'La liste des actes sélectionnés dépasse la limite autorisée.';
  END IF;

  v_invoice_lines := jsonb_build_array(jsonb_build_object(
    'medical_act_template_id', NULL,
    'description', 'Honoraires de consultation',
    'quantity', 1,
    'unit_price', round(_consultation_amount, 2),
    'line_total', round(_consultation_amount, 2),
    'sort_order', v_order
  ));
  v_gross_amount := round(_consultation_amount, 2);
  v_order := v_order + 1;

  FOR v_item IN SELECT value FROM jsonb_array_elements(_items)
  LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Un acte sélectionné est invalide.';
    END IF;

    v_template_id := NULLIF(v_item->>'template_id', '')::UUID;
    v_quantity := (v_item->>'quantity')::NUMERIC;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;

    IF v_quantity IS NULL OR v_quantity <= 0 OR v_quantity > 100 THEN
      RAISE EXCEPTION 'La quantité d’un acte doit être comprise entre 0 et 100.';
    END IF;

    IF v_template_id IS NOT NULL THEN
      IF v_template_id = ANY(v_seen_template_ids) THEN
        RAISE EXCEPTION 'Un même acte du catalogue ne peut apparaître qu’une seule fois dans la facture.';
      END IF;
      v_seen_template_ids := array_append(v_seen_template_ids, v_template_id);

      SELECT template.label, template.unit_price
      INTO v_description, v_catalog_price
      FROM public.medical_act_templates AS template
      WHERE template.id = v_template_id
        AND template.doctor_user_id = v_user_id
        AND template.is_active
        AND template.unit_price IS NOT NULL;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Un acte sélectionné n’est plus actif ou tarifé dans votre catalogue.';
      END IF;
      v_unit_price := COALESCE(v_unit_price, v_catalog_price);
    ELSE
      v_description := NULLIF(btrim(v_item->>'description'), '');
      IF v_description IS NULL OR length(v_description) > 180
        OR v_description = 'Honoraires de consultation' THEN
        RAISE EXCEPTION 'Le libellé d’une prestation libre doit comporter entre 1 et 180 caractères.';
      END IF;
    END IF;

    IF v_unit_price IS NULL OR v_unit_price < 0 OR v_unit_price > 1000000 THEN
      RAISE EXCEPTION 'Le tarif unitaire doit être compris entre 0 et 1 000 000 DH.';
    END IF;
    IF v_template_id IS NOT NULL AND v_unit_price = 0 AND v_catalog_price > 0 THEN
      RAISE EXCEPTION 'Le tarif d’un acte du catalogue doit être supérieur à zéro.';
    END IF;

    v_line_total := round(v_quantity * v_unit_price, 2);
    IF v_line_total > 1000000 THEN
      RAISE EXCEPTION 'Le total d’une ligne ne peut pas dépasser 1 000 000 DH.';
    END IF;
    v_invoice_lines := v_invoice_lines || jsonb_build_array(jsonb_build_object(
      'medical_act_template_id', v_template_id,
      'description', v_description,
      'quantity', v_quantity,
      'unit_price', v_unit_price,
      'line_total', v_line_total,
      'sort_order', v_order
    ));
    v_gross_amount := v_gross_amount + v_line_total;
    v_order := v_order + 1;
  END LOOP;

  v_gross_amount := round(v_gross_amount, 2);

  IF v_gross_amount > 1000000 THEN
    RAISE EXCEPTION 'Le total de la facture dépasse 1 000 000 DH.';
  END IF;
  IF _settlement_instruction <> 'free' AND v_gross_amount <= 0 THEN
    RAISE EXCEPTION 'Un montant supérieur à 0 est requis sauf pour une consultation gratuite.';
  END IF;
  IF _discount_value IS NULL OR _discount_value < 0 THEN
    RAISE EXCEPTION 'La réduction ne peut pas être négative.';
  END IF;

  IF _discount_type = 'none' THEN
    IF _discount_value <> 0 THEN
      RAISE EXCEPTION 'Une consultation sans réduction doit avoir une valeur de réduction nulle.';
    END IF;
    v_discount_amount := 0;
  ELSIF _discount_type = 'percentage' THEN
    IF _discount_value > 100 THEN
      RAISE EXCEPTION 'La réduction en pourcentage doit être comprise entre 0 et 100.';
    END IF;
    v_discount_amount := round(v_gross_amount * _discount_value / 100, 2);
  ELSIF _discount_type = 'fixed' THEN
    IF _discount_value > v_gross_amount THEN
      RAISE EXCEPTION 'La réduction ne peut pas dépasser le montant total.';
    END IF;
    v_discount_amount := round(_discount_value, 2);
  ELSE
    RAISE EXCEPTION 'Type de réduction invalide.';
  END IF;

  v_final_amount := CASE
    WHEN _settlement_instruction = 'free' THEN 0
    ELSE round(v_gross_amount - v_discount_amount, 2)
  END;
  IF _settlement_instruction = 'deferred' AND v_final_amount <= 0 THEN
    RAISE EXCEPTION 'Un règlement différé doit laisser un montant à régler supérieur à 0.';
  END IF;
  v_invoice_status := CASE WHEN _settlement_instruction = 'free' THEN 'no_charge' ELSE 'pending' END;

  SELECT queue.patient_id, queue.invoice_id
  INTO v_patient_id, v_invoice_id
  FROM public.queue AS queue
  JOIN public.consultations AS consultation
    ON consultation.queue_id = queue.id
   AND consultation.created_by = v_user_id
  WHERE queue.id = _queue_id AND queue.status = 'in_consultation'
  FOR UPDATE;

  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'Le patient doit être en consultation pour enregistrer le tarif.';
  END IF;

  IF v_invoice_id IS NULL THEN
    INSERT INTO public.invoices (
      patient_id, numero, date, montant, montant_brut, reduction_type, reduction_valeur, statut, consigne_reglement
    )
    VALUES (
      v_patient_id, public.generate_invoice_number(), CURRENT_DATE,
      v_final_amount, v_gross_amount, _discount_type, _discount_value, v_invoice_status, _settlement_instruction
    )
    RETURNING id INTO v_invoice_id;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.invoices AS invoice
      WHERE invoice.id = v_invoice_id AND invoice.statut IN ('paid', 'cancelled')
    ) THEN
      RAISE EXCEPTION 'Une facture réglée ou annulée ne peut plus être modifiée.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.invoice_payments AS payment WHERE payment.invoice_id = v_invoice_id
    ) THEN
      RAISE EXCEPTION 'Le tarif ne peut plus être modifié après l’enregistrement d’un règlement.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.invoice_items AS item
      WHERE item.invoice_id = v_invoice_id AND NOT item.consultation_pricing_item
    ) THEN
      RAISE EXCEPTION 'Cette facture contient des prestations gérées par l’encaissement et ne peut pas être remplacée depuis la consultation.';
    END IF;

    UPDATE public.invoices
    SET montant = v_final_amount,
        montant_brut = v_gross_amount,
        reduction_type = _discount_type,
        reduction_valeur = _discount_value,
        statut = v_invoice_status,
        consigne_reglement = _settlement_instruction
    WHERE id = v_invoice_id AND patient_id = v_patient_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La facture associée à la consultation est introuvable.';
    END IF;
  END IF;

  DELETE FROM public.invoice_items
  WHERE invoice_id = v_invoice_id AND consultation_pricing_item;
  INSERT INTO public.invoice_items (
    invoice_id, description, quantity, unit_price, line_total, sort_order,
    medical_act_template_id, consultation_pricing_item
  )
  SELECT
    v_invoice_id, item.description, item.quantity, item.unit_price, item.line_total,
    item.sort_order, item.medical_act_template_id, TRUE
  FROM jsonb_to_recordset(v_invoice_lines) AS item(
    medical_act_template_id UUID,
    description TEXT,
    quantity NUMERIC(8, 2),
    unit_price NUMERIC(10, 2),
    line_total NUMERIC(10, 2),
    sort_order SMALLINT
  )
  ORDER BY item.sort_order;

  UPDATE public.queue
  SET montant_consultation = v_final_amount, invoice_id = v_invoice_id
  WHERE id = _queue_id;

  RETURN v_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_consultation_pricing_items(
  _queue_id UUID,
  _actor_session_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_role public.app_role;
  v_invoice_id UUID;
  v_consultation_amount NUMERIC(10, 2);
  v_items JSONB;
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

  SELECT queue.invoice_id INTO v_invoice_id
  FROM public.queue AS queue
  WHERE queue.id = _queue_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consultation introuvable.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.consultations AS consultation
    WHERE consultation.queue_id = _queue_id AND consultation.created_by = v_user_id
  ) THEN
    IF EXISTS (
      SELECT 1 FROM public.consultations AS consultation WHERE consultation.queue_id = _queue_id
    ) THEN
      RAISE EXCEPTION 'Cette consultation appartient à un autre médecin.';
    END IF;
    RETURN jsonb_build_object('consultation_amount', NULL, 'items', '[]'::JSONB);
  END IF;

  SELECT item.unit_price INTO v_consultation_amount
  FROM public.invoice_items AS item
  WHERE item.invoice_id = v_invoice_id
    AND item.consultation_pricing_item
    AND item.medical_act_template_id IS NULL
    AND item.description = 'Honoraires de consultation'
  ORDER BY item.sort_order
  LIMIT 1;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'template_id', item.medical_act_template_id,
        'description', item.description,
        'quantity', item.quantity,
        'unit_price', item.unit_price
      )
      ORDER BY item.sort_order
    ),
    '[]'::JSONB
  )
  INTO v_items
  FROM public.invoice_items AS item
  WHERE item.invoice_id = v_invoice_id
    AND item.consultation_pricing_item
    AND item.description <> 'Honoraires de consultation';

  RETURN jsonb_build_object('consultation_amount', v_consultation_amount, 'items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.save_consultation_pricing(UUID, NUMERIC, TEXT, NUMERIC, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_consultation_pricing_items(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_consultation_pricing(UUID, NUMERIC, TEXT, NUMERIC, TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_consultation_pricing_items(UUID, TEXT) TO anon, authenticated;