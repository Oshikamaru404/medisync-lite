CREATE OR REPLACE FUNCTION public.handle_queue_consultation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_invoice_id UUID;
BEGIN
  IF NEW.status = 'in_consultation' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'in_consultation') THEN
    IF NEW.invoice_id IS NULL THEN
      INSERT INTO public.invoices (patient_id, numero, date, montant, statut)
      VALUES (
        NEW.patient_id,
        public.generate_invoice_number(),
        CURRENT_DATE,
        COALESCE(NEW.montant_consultation, 0),
        'pending'
      )
      RETURNING id INTO new_invoice_id;

      NEW.invoice_id := new_invoice_id;
    END IF;

    NEW.called_at := COALESCE(NEW.called_at, NOW());
  END IF;

  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL UNIQUE REFERENCES public.queue(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  motif TEXT,
  histoire TEXT,
  examen_clinique TEXT,
  diagnostic TEXT,
  plan TEXT,
  created_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consultations_patient_created
  ON public.consultations(patient_id, created_at DESC);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for consultations"
  ON public.consultations
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.complete_consultation(_consultation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_queue_id UUID;
  rows_updated INTEGER;
BEGIN
  SELECT queue_id
  INTO target_queue_id
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
      updated_at = NOW()
  WHERE id = _consultation_id;

  RETURN target_queue_id;
END;
$$;