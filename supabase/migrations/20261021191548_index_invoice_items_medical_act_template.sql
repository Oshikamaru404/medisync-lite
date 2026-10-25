-- Index the nullable invoice-item reference for foreign-key checks.
CREATE INDEX IF NOT EXISTS invoice_items_medical_act_template_id_idx
  ON public.invoice_items (medical_act_template_id)
  WHERE medical_act_template_id IS NOT NULL;