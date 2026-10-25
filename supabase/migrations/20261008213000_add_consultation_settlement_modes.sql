ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS consigne_reglement TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invoices_consigne_reglement_check'
      AND conrelid = 'public.invoices'::regclass
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_consigne_reglement_check
      CHECK (consigne_reglement IS NULL OR consigne_reglement IN ('due_at_reception', 'deferred', 'free'));
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.save_consultation_pricing(UUID, NUMERIC, TEXT, NUMERIC);

CREATE FUNCTION public.save_consultation_pricing(
  _queue_id UUID,
  _gross_amount NUMERIC,
  _discount_type TEXT,
  _discount_value NUMERIC,
  _settlement_instruction TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_patient_id UUID;
  target_invoice_id UUID;
  final_amount NUMERIC(10, 2);
  discount_amount NUMERIC(10, 2);
  invoice_status TEXT;
BEGIN
  IF _settlement_instruction IS NULL OR _settlement_instruction NOT IN ('due_at_reception', 'deferred', 'free') THEN
    RAISE EXCEPTION 'Consigne de règlement invalide';
  END IF;
  IF _gross_amount IS NULL
    OR _gross_amount < 0
    OR _gross_amount > 1000000
    OR (_settlement_instruction <> 'free' AND _gross_amount = 0) THEN
    RAISE EXCEPTION 'Le tarif doit être supérieur à 0 et inférieur ou égal à 1 000 000, sauf pour une consultation gratuite';
  END IF;
  IF _discount_value IS NULL OR _discount_value < 0 THEN
    RAISE EXCEPTION 'La réduction ne peut pas être négative';
  END IF;

  IF _discount_type = 'none' THEN
    IF _discount_value <> 0 THEN
      RAISE EXCEPTION 'Une consultation sans réduction doit avoir une valeur de réduction nulle';
    END IF;
    discount_amount := 0;
  ELSIF _discount_type = 'percentage' THEN
    IF _discount_value > 100 THEN
      RAISE EXCEPTION 'La réduction en pourcentage doit être comprise entre 0 et 100';
    END IF;
    discount_amount := round(_gross_amount * _discount_value / 100, 2);
  ELSIF _discount_type = 'fixed' THEN
    IF _discount_value > _gross_amount THEN
      RAISE EXCEPTION 'La réduction ne peut pas dépasser le tarif de consultation';
    END IF;
    discount_amount := round(_discount_value, 2);
  ELSE
    RAISE EXCEPTION 'Type de réduction invalide';
  END IF;

  final_amount := CASE
    WHEN _settlement_instruction = 'free' THEN 0
    ELSE round(_gross_amount - discount_amount, 2)
  END;

  IF _settlement_instruction = 'deferred' AND final_amount <= 0 THEN
    RAISE EXCEPTION 'Un règlement différé doit laisser un montant à régler supérieur à 0';
  END IF;

  invoice_status := CASE WHEN _settlement_instruction = 'free' THEN 'no_charge' ELSE 'pending' END;

  SELECT patient_id, invoice_id
  INTO target_patient_id, target_invoice_id
  FROM public.queue
  WHERE id = _queue_id AND status = 'in_consultation'
  FOR UPDATE;

  IF target_patient_id IS NULL THEN
    RAISE EXCEPTION 'Le patient doit être en consultation pour enregistrer le tarif';
  END IF;

  IF target_invoice_id IS NULL THEN
    INSERT INTO public.invoices (
      patient_id, numero, date, montant, montant_brut, reduction_type, reduction_valeur, statut, consigne_reglement
    )
    VALUES (
      target_patient_id, public.generate_invoice_number(), CURRENT_DATE,
      final_amount, _gross_amount, _discount_type, _discount_value, invoice_status, _settlement_instruction
    )
    RETURNING id INTO target_invoice_id;
  ELSE
    UPDATE public.invoices
    SET montant = final_amount,
        montant_brut = _gross_amount,
        reduction_type = _discount_type,
        reduction_valeur = _discount_value,
        statut = invoice_status,
        consigne_reglement = _settlement_instruction
    WHERE id = target_invoice_id AND patient_id = target_patient_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'La facture associée à la consultation est introuvable';
    END IF;
  END IF;

  UPDATE public.queue
  SET montant_consultation = final_amount,
      invoice_id = target_invoice_id
  WHERE id = _queue_id;

  RETURN target_invoice_id;
END;
$$;
