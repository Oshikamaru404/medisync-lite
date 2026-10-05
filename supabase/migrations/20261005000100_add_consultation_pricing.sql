ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS montant_brut NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reduction_type TEXT NOT NULL DEFAULT 'none'
    CHECK (reduction_type IN ('none', 'percentage', 'fixed')),
  ADD COLUMN IF NOT EXISTS reduction_valeur NUMERIC NOT NULL DEFAULT 0;

UPDATE public.invoices
SET montant_brut = montant
WHERE montant_brut = 0 AND montant > 0;

CREATE OR REPLACE FUNCTION public.save_consultation_pricing(
  _queue_id UUID,
  _gross_amount NUMERIC,
  _discount_type TEXT,
  _discount_value NUMERIC
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
BEGIN
  IF _gross_amount IS NULL OR _gross_amount <= 0 OR _gross_amount > 1000000 THEN
    RAISE EXCEPTION 'Le tarif doit être supérieur à 0 et inférieur à 1 000 000';
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

  final_amount := round(_gross_amount - discount_amount, 2);

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
      patient_id, numero, date, montant, montant_brut, reduction_type, reduction_valeur, statut
    )
    VALUES (
      target_patient_id, public.generate_invoice_number(), CURRENT_DATE,
      final_amount, _gross_amount, _discount_type, _discount_value, 'pending'
    )
    RETURNING id INTO target_invoice_id;
  ELSE
    UPDATE public.invoices
    SET montant = final_amount,
        montant_brut = _gross_amount,
        reduction_type = _discount_type,
        reduction_valeur = _discount_value
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
