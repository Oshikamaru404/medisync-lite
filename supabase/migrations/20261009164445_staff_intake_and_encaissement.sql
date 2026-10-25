CREATE TABLE IF NOT EXISTS public.queue_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL UNIQUE REFERENCES public.queue(id) ON DELETE CASCADE,
  weight_kg NUMERIC(5, 2),
  height_cm NUMERIC(5, 2),
  temperature_c NUMERIC(4, 1),
  systolic_bp SMALLINT,
  diastolic_bp SMALLINT,
  pulse_bpm SMALLINT,
  respiratory_rate SMALLINT,
  oxygen_saturation NUMERIC(4, 1),
  pain_score SMALLINT,
  allergies_reported TEXT,
  antecedents_reported TEXT,
  treatments_reported TEXT,
  reason_for_visit TEXT,
  nursing_note TEXT,
  measured_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT queue_intakes_weight_check CHECK (weight_kg IS NULL OR weight_kg BETWEEN 0.1 AND 500),
  CONSTRAINT queue_intakes_height_check CHECK (height_cm IS NULL OR height_cm BETWEEN 20 AND 250),
  CONSTRAINT queue_intakes_temperature_check CHECK (temperature_c IS NULL OR temperature_c BETWEEN 25 AND 45),
  CONSTRAINT queue_intakes_pressure_check CHECK (
    (systolic_bp IS NULL OR systolic_bp BETWEEN 30 AND 300)
    AND (diastolic_bp IS NULL OR diastolic_bp BETWEEN 20 AND 200)
  ),
  CONSTRAINT queue_intakes_pulse_check CHECK (pulse_bpm IS NULL OR pulse_bpm BETWEEN 10 AND 300),
  CONSTRAINT queue_intakes_respiratory_check CHECK (respiratory_rate IS NULL OR respiratory_rate BETWEEN 1 AND 100),
  CONSTRAINT queue_intakes_saturation_check CHECK (oxygen_saturation IS NULL OR oxygen_saturation BETWEEN 0 AND 100),
  CONSTRAINT queue_intakes_pain_check CHECK (pain_score IS NULL OR pain_score BETWEEN 0 AND 10)
);

ALTER TABLE public.queue_intakes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.queue_intakes FROM anon, authenticated;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS coverage_mode TEXT NOT NULL DEFAULT 'reimbursement',
  ADD COLUMN IF NOT EXISTS insurance_name TEXT,
  ADD COLUMN IF NOT EXISTS insurance_member_number TEXT,
  ADD COLUMN IF NOT EXISTS insurer_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_coverage_mode_check;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_coverage_mode_check
  CHECK (coverage_mode IN ('reimbursement', 'third_party'));

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(8, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invoice_items_description_check CHECK (length(btrim(description)) BETWEEN 1 AND 180),
  CONSTRAINT invoice_items_quantity_check CHECK (quantity > 0 AND quantity <= 100),
  CONSTRAINT invoice_items_unit_price_check CHECK (unit_price >= 0 AND unit_price <= 1000000),
  CONSTRAINT invoice_items_line_total_check CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS invoice_items_invoice_sort_idx
  ON public.invoice_items (invoice_id, sort_order);

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payer_type TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  reference TEXT,
  received_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  received_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invoice_payments_payer_check CHECK (payer_type IN ('patient', 'insurer')),
  CONSTRAINT invoice_payments_method_check CHECK (payment_method IN ('cash', 'card', 'cheque', 'transfer', 'other')),
  CONSTRAINT invoice_payments_amount_check CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS invoice_payments_invoice_created_idx
  ON public.invoice_payments (invoice_id, created_at DESC);

INSERT INTO public.invoice_payments (
  invoice_id,
  payer_type,
  amount,
  payment_method,
  reference,
  created_at
)
SELECT
  invoice.id,
  'patient',
  invoice.montant,
  'other',
  'Paiement antérieur à la traçabilité des encaissements',
  COALESCE(invoice.updated_at, invoice.created_at, now())
FROM public.invoices AS invoice
WHERE invoice.statut = 'paid'
  AND invoice.montant > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.invoice_payments AS payment WHERE payment.invoice_id = invoice.id
  );

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invoice_items, public.invoice_payments FROM anon, authenticated;

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
  v_user_id UUID;
  v_role public.app_role;
  v_patient_id UUID;
  v_result JSONB;
BEGIN
  SELECT app_user.id, app_user.role
  INTO v_user_id, v_role
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
        'traitements', medical_record.traitements
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

CREATE OR REPLACE FUNCTION public.save_queue_intake(
  _queue_id UUID,
  _actor_session_token TEXT,
  _weight_kg NUMERIC,
  _height_cm NUMERIC,
  _temperature_c NUMERIC,
  _systolic_bp SMALLINT,
  _diastolic_bp SMALLINT,
  _pulse_bpm SMALLINT,
  _respiratory_rate SMALLINT,
  _oxygen_saturation NUMERIC,
  _pain_score SMALLINT,
  _allergies_reported TEXT,
  _antecedents_reported TEXT,
  _treatments_reported TEXT,
  _reason_for_visit TEXT,
  _nursing_note TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_role public.app_role;
  v_patient_id UUID;
  v_intake_id UUID;
BEGIN
  SELECT app_user.id, app_user.role
  INTO v_user_id, v_role
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
  WHERE id = _queue_id
    AND status <> 'cancelled';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ce passage est introuvable ou annulé.';
  END IF;

  INSERT INTO public.queue_intakes (
    queue_id, weight_kg, height_cm, temperature_c, systolic_bp, diastolic_bp,
    pulse_bpm, respiratory_rate, oxygen_saturation, pain_score,
    allergies_reported, antecedents_reported, treatments_reported,
    reason_for_visit, nursing_note, measured_by, updated_at
  )
  VALUES (
    _queue_id, _weight_kg, _height_cm, _temperature_c, _systolic_bp, _diastolic_bp,
    _pulse_bpm, _respiratory_rate, _oxygen_saturation, _pain_score,
    NULLIF(BTRIM(_allergies_reported), ''),
    NULLIF(BTRIM(_antecedents_reported), ''),
    NULLIF(BTRIM(_treatments_reported), ''),
    NULLIF(BTRIM(_reason_for_visit), ''),
    NULLIF(BTRIM(_nursing_note), ''),
    v_user_id,
    now()
  )
  ON CONFLICT (queue_id) DO UPDATE SET
    weight_kg = EXCLUDED.weight_kg,
    height_cm = EXCLUDED.height_cm,
    temperature_c = EXCLUDED.temperature_c,
    systolic_bp = EXCLUDED.systolic_bp,
    diastolic_bp = EXCLUDED.diastolic_bp,
    pulse_bpm = EXCLUDED.pulse_bpm,
    respiratory_rate = EXCLUDED.respiratory_rate,
    oxygen_saturation = EXCLUDED.oxygen_saturation,
    pain_score = EXCLUDED.pain_score,
    allergies_reported = EXCLUDED.allergies_reported,
    antecedents_reported = EXCLUDED.antecedents_reported,
    treatments_reported = EXCLUDED.treatments_reported,
    reason_for_visit = EXCLUDED.reason_for_visit,
    nursing_note = EXCLUDED.nursing_note,
    measured_by = EXCLUDED.measured_by,
    updated_at = now()
  RETURNING id INTO v_intake_id;

  UPDATE public.patients
  SET poids = COALESCE(_weight_kg, poids),
      taille = COALESCE(_height_cm, taille)
  WHERE id = v_patient_id;

  RETURN v_intake_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_invoice_encashment_context(
  _invoice_id UUID,
  _actor_session_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
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

  SELECT jsonb_build_object(
    'invoice', to_jsonb(invoice),
    'patient', jsonb_build_object(
      'id', patient.id,
      'nom', patient.nom,
      'prenom', patient.prenom,
      'cin', patient.cin,
      'telephone', patient.telephone,
      'mutuelle', patient.mutuelle,
      'numero_mutuelle', patient.numero_mutuelle
    ),
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(item) ORDER BY item.sort_order, item.created_at)
      FROM public.invoice_items AS item
      WHERE item.invoice_id = invoice.id
    ), '[]'::JSONB),
    'payments', COALESCE((
      SELECT jsonb_agg(to_jsonb(payment) ORDER BY payment.created_at DESC)
      FROM public.invoice_payments AS payment
      WHERE payment.invoice_id = invoice.id
    ), '[]'::JSONB)
  )
  INTO v_result
  FROM public.invoices AS invoice
  JOIN public.patients AS patient ON patient.id = invoice.patient_id
  WHERE invoice.id = _invoice_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Facture introuvable.';
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_queue_encashment_summary(
  _actor_session_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_today DATE := (now() AT TIME ZONE 'Africa/Casablanca')::DATE;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_items JSONB;
  v_patient_total NUMERIC(10, 2);
  v_insurer_total NUMERIC(10, 2);
BEGIN
  SELECT app_user.role
  INTO v_role
  FROM public.app_sessions AS app_session
  JOIN public.app_users AS app_user ON app_user.id = app_session.user_id
  WHERE app_session.session_token = _actor_session_token
    AND app_session.expires_at > now()
    AND app_user.is_active;

  IF NOT FOUND OR v_role NOT IN ('secretaire', 'assistant', 'medecin') THEN
    RAISE EXCEPTION 'Session invalide ou non autorisée. Reconnectez-vous.';
  END IF;

  v_start := v_today::TIMESTAMP AT TIME ZONE 'Africa/Casablanca';
  v_end := (v_today + 1)::TIMESTAMP AT TIME ZONE 'Africa/Casablanca';

  WITH daily_invoices AS (
    SELECT
      queue.numero_ordre,
      queue.motif,
      patient.nom,
      patient.prenom,
      patient.telephone,
      invoice.id AS invoice_id,
      invoice.numero AS invoice_number,
      invoice.montant AS total_amount,
      invoice.statut AS invoice_status,
      invoice.coverage_mode,
      invoice.insurance_name,
      invoice.insurer_amount,
      COALESCE(payment_totals.patient_paid, 0) AS patient_paid,
      COALESCE(payment_totals.insurer_paid, 0) AS insurer_paid,
      GREATEST(invoice.montant - invoice.insurer_amount, 0) AS patient_due,
      GREATEST(invoice.insurer_amount, 0) AS insurer_due,
      COALESCE(line_items.items, '[]'::JSONB) AS line_items
    FROM public.queue AS queue
    JOIN public.patients AS patient ON patient.id = queue.patient_id
    JOIN public.invoices AS invoice ON invoice.id = queue.invoice_id
    LEFT JOIN LATERAL (
      SELECT
        sum(payment.amount) FILTER (WHERE payment.payer_type = 'patient') AS patient_paid,
        sum(payment.amount) FILTER (WHERE payment.payer_type = 'insurer') AS insurer_paid
      FROM public.invoice_payments AS payment
      WHERE payment.invoice_id = invoice.id
    ) AS payment_totals ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'description', item.description,
        'quantity', item.quantity,
        'line_total', item.line_total
      ) ORDER BY item.sort_order, item.created_at) AS items
      FROM public.invoice_items AS item
      WHERE item.invoice_id = invoice.id
    ) AS line_items ON true
    WHERE queue.created_at >= v_start
      AND queue.created_at < v_end
      AND queue.status <> 'cancelled'
      AND invoice.statut NOT IN ('cancelled', 'no_charge')
  ), outstanding AS (
    SELECT daily_invoices.*,
      GREATEST(patient_due - patient_paid, 0) AS patient_remaining,
      GREATEST(insurer_due - insurer_paid, 0) AS insurer_remaining
    FROM daily_invoices
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'queue_number', numero_ordre,
      'reason', motif,
      'patient_name', concat_ws(' ', prenom, nom),
      'telephone', telephone,
      'invoice_id', invoice_id,
      'invoice_number', invoice_number,
      'invoice_status', invoice_status,
      'total_amount', total_amount,
      'coverage_mode', coverage_mode,
      'insurance_name', insurance_name,
      'insurer_amount', insurer_due,
      'patient_remaining', patient_remaining,
      'insurer_remaining', insurer_remaining,
      'items', line_items
    ) ORDER BY numero_ordre), '[]'::JSONB),
    COALESCE(sum(patient_remaining), 0),
    COALESCE(sum(insurer_remaining), 0)
  INTO v_items, v_patient_total, v_insurer_total
  FROM outstanding
  WHERE patient_remaining > 0 OR insurer_remaining > 0;

  RETURN jsonb_build_object(
    'items', v_items,
    'patient_remaining_total', v_patient_total,
    'insurer_remaining_total', v_insurer_total,
    'open_invoice_count', jsonb_array_length(v_items)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.save_invoice_encashment(
  _invoice_id UUID,
  _actor_session_token TEXT,
  _coverage_mode TEXT,
  _insurance_name TEXT,
  _insurance_member_number TEXT,
  _insurer_amount NUMERIC,
  _items JSONB,
  _payment_payer TEXT DEFAULT NULL,
  _payment_amount NUMERIC DEFAULT 0,
  _payment_method TEXT DEFAULT 'cash',
  _payment_reference TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_role public.app_role;
  v_invoice public.invoices%ROWTYPE;
  v_gross_amount NUMERIC(10, 2);
  v_net_amount NUMERIC(10, 2);
  v_insurer_due NUMERIC(10, 2);
  v_patient_due NUMERIC(10, 2);
  v_patient_paid NUMERIC(10, 2);
  v_insurer_paid NUMERIC(10, 2);
  v_payment_amount NUMERIC(10, 2) := COALESCE(_payment_amount, 0);
  v_item JSONB;
  v_quantity NUMERIC(8, 2);
  v_unit_price NUMERIC(10, 2);
  v_line_total NUMERIC(10, 2);
  v_description TEXT;
  v_order SMALLINT := 0;
BEGIN
  SELECT app_user.id, app_user.role, concat_ws(' ', app_user.prenom, app_user.nom)
  INTO v_user_id, v_role, v_user_name
  FROM public.app_sessions AS app_session
  JOIN public.app_users AS app_user ON app_user.id = app_session.user_id
  WHERE app_session.session_token = _actor_session_token
    AND app_session.expires_at > now()
    AND app_user.is_active;

  IF NOT FOUND OR v_role NOT IN ('secretaire', 'assistant', 'medecin') THEN
    RAISE EXCEPTION 'Session invalide ou non autorisée. Reconnectez-vous.';
  END IF;

  IF _coverage_mode IS NULL OR _coverage_mode NOT IN ('reimbursement', 'third_party') THEN
    RAISE EXCEPTION 'Mode de couverture non reconnu.';
  END IF;

  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) < 1 OR jsonb_array_length(_items) > 30 THEN
    RAISE EXCEPTION 'La facture doit contenir entre 1 et 30 prestations.';
  END IF;

  SELECT *
  INTO v_invoice
  FROM public.invoices
  WHERE id = _invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable.';
  END IF;

  IF v_invoice.statut = 'cancelled' THEN
    RAISE EXCEPTION 'Une facture annulée ne peut pas être encaissée.';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _invoice_items_input (
    description TEXT,
    quantity NUMERIC(8, 2),
    unit_price NUMERIC(10, 2),
    line_total NUMERIC(10, 2),
    sort_order SMALLINT
  ) ON COMMIT DROP;
  TRUNCATE TABLE _invoice_items_input;

  FOR v_item IN SELECT value FROM jsonb_array_elements(_items)
  LOOP
    v_description := NULLIF(BTRIM(v_item->>'description'), '');
    v_quantity := (v_item->>'quantity')::NUMERIC;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;

    IF v_description IS NULL OR length(v_description) > 180
       OR v_quantity IS NULL OR v_quantity <= 0 OR v_quantity > 100
       OR v_unit_price IS NULL OR v_unit_price < 0 OR v_unit_price > 1000000 THEN
      RAISE EXCEPTION 'Une prestation comporte une description, quantité ou tarif invalide.';
    END IF;

    v_line_total := round(v_quantity * v_unit_price, 2);
    INSERT INTO _invoice_items_input (description, quantity, unit_price, line_total, sort_order)
    VALUES (v_description, v_quantity, v_unit_price, v_line_total, v_order);
    v_order := v_order + 1;
  END LOOP;

  SELECT round(COALESCE(sum(line_total), 0), 2)
  INTO v_gross_amount
  FROM _invoice_items_input;

  v_net_amount := CASE v_invoice.reduction_type
    WHEN 'percentage' THEN round(v_gross_amount * (1 - LEAST(GREATEST(v_invoice.reduction_valeur, 0), 100) / 100), 2)
    WHEN 'fixed' THEN GREATEST(v_gross_amount - GREATEST(v_invoice.reduction_valeur, 0), 0)
    ELSE v_gross_amount
  END;

  v_insurer_due := CASE
    WHEN _coverage_mode = 'third_party' THEN COALESCE(_insurer_amount, 0)
    ELSE 0
  END;

  IF v_insurer_due < 0 OR v_insurer_due > v_net_amount THEN
    RAISE EXCEPTION 'La part mutuelle doit être comprise entre 0 et le total net.';
  END IF;

  v_patient_due := v_net_amount - v_insurer_due;

  SELECT
    COALESCE(sum(amount) FILTER (WHERE payer_type = 'patient'), 0),
    COALESCE(sum(amount) FILTER (WHERE payer_type = 'insurer'), 0)
  INTO v_patient_paid, v_insurer_paid
  FROM public.invoice_payments
  WHERE invoice_id = _invoice_id;

  IF v_patient_paid > v_patient_due OR v_insurer_paid > v_insurer_due THEN
    RAISE EXCEPTION 'Le nouveau partage est inférieur aux paiements déjà enregistrés.';
  END IF;

  IF v_payment_amount < 0 THEN
    RAISE EXCEPTION 'Le montant encaissé ne peut pas être négatif.';
  END IF;

  IF v_payment_amount > 0 THEN
    IF _payment_payer IS NULL OR _payment_payer NOT IN ('patient', 'insurer') THEN
      RAISE EXCEPTION 'Choisissez si le règlement provient du patient ou de la mutuelle.';
    END IF;
    IF _payment_method IS NULL OR _payment_method NOT IN ('cash', 'card', 'cheque', 'transfer', 'other') THEN
      RAISE EXCEPTION 'Mode de règlement non reconnu.';
    END IF;
    IF _payment_payer = 'insurer' AND _coverage_mode <> 'third_party' THEN
      RAISE EXCEPTION 'Un règlement mutuelle ne peut être saisi qu’en tiers payant.';
    END IF;
    IF _payment_payer = 'patient' AND v_patient_paid + v_payment_amount > v_patient_due THEN
      RAISE EXCEPTION 'Le montant dépasse le solde restant dû par le patient.';
    END IF;
    IF _payment_payer = 'insurer' AND v_insurer_paid + v_payment_amount > v_insurer_due THEN
      RAISE EXCEPTION 'Le montant dépasse la part restante due par la mutuelle.';
    END IF;
  END IF;

  DELETE FROM public.invoice_items WHERE invoice_id = _invoice_id;
  INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price, line_total, sort_order)
  SELECT _invoice_id, description, quantity, unit_price, line_total, sort_order
  FROM _invoice_items_input;

  UPDATE public.invoices
  SET montant_brut = v_gross_amount,
      montant = v_net_amount,
      coverage_mode = _coverage_mode,
      insurance_name = NULLIF(BTRIM(_insurance_name), ''),
      insurance_member_number = NULLIF(BTRIM(_insurance_member_number), ''),
      insurer_amount = v_insurer_due,
      statut = CASE WHEN v_net_amount = 0 THEN 'no_charge' ELSE statut END,
      updated_at = now()
  WHERE id = _invoice_id;

  IF v_payment_amount > 0 THEN
    INSERT INTO public.invoice_payments (
      invoice_id, payer_type, amount, payment_method, reference, received_by, received_by_name
    )
    VALUES (
      _invoice_id, _payment_payer, v_payment_amount, _payment_method,
      NULLIF(BTRIM(_payment_reference), ''), v_user_id, NULLIF(v_user_name, '')
    );
  END IF;

  SELECT
    COALESCE(sum(amount) FILTER (WHERE payer_type = 'patient'), 0),
    COALESCE(sum(amount) FILTER (WHERE payer_type = 'insurer'), 0)
  INTO v_patient_paid, v_insurer_paid
  FROM public.invoice_payments
  WHERE invoice_id = _invoice_id;

  UPDATE public.invoices
  SET statut = CASE
    WHEN montant = 0 THEN 'no_charge'
    WHEN v_patient_paid >= v_patient_due AND v_insurer_paid >= v_insurer_due THEN 'paid'
    ELSE 'pending'
  END,
  updated_at = now()
  WHERE id = _invoice_id;

  RETURN _invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_queue_intake_context(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_queue_intake(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, SMALLINT, SMALLINT, SMALLINT, SMALLINT, NUMERIC, SMALLINT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_invoice_encashment_context(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_queue_encashment_summary(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_invoice_encashment(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_queue_intake_context(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_queue_intake(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, SMALLINT, SMALLINT, SMALLINT, SMALLINT, NUMERIC, SMALLINT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_invoice_encashment_context(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_queue_encashment_summary(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_invoice_encashment(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB, TEXT, NUMERIC, TEXT, TEXT) TO anon, authenticated;
