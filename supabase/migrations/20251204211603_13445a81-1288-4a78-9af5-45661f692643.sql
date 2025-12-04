-- Create queue status enum
CREATE TYPE public.queue_status AS ENUM ('waiting', 'in_consultation', 'completed', 'cancelled');

-- Create queue table
CREATE TABLE public.queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  status queue_status NOT NULL DEFAULT 'waiting',
  numero_ordre INTEGER NOT NULL,
  motif TEXT,
  montant_consultation NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  called_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  invoice_id UUID REFERENCES public.invoices(id)
);

-- Enable RLS
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Enable all access for queue" ON public.queue
FOR ALL USING (true) WITH CHECK (true);

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  invoice_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO invoice_count FROM public.invoices WHERE EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM NOW());
  RETURN 'FAC-' || year_prefix || '-' || LPAD(invoice_count::TEXT, 4, '0');
END;
$$;

-- Function to auto-create invoice when patient enters consultation
CREATE OR REPLACE FUNCTION public.handle_queue_consultation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_invoice_id UUID;
  patient_name TEXT;
BEGIN
  -- Only trigger when status changes to 'in_consultation'
  IF NEW.status = 'in_consultation' AND (OLD.status IS NULL OR OLD.status != 'in_consultation') THEN
    -- Get patient name for invoice
    SELECT nom || ' ' || prenom INTO patient_name FROM public.patients WHERE id = NEW.patient_id;
    
    -- Create invoice
    INSERT INTO public.invoices (patient_id, numero, date, montant, statut)
    VALUES (
      NEW.patient_id,
      public.generate_invoice_number(),
      CURRENT_DATE,
      COALESCE(NEW.montant_consultation, 0),
      'pending'
    )
    RETURNING id INTO new_invoice_id;
    
    -- Update queue with invoice reference and called_at timestamp
    NEW.invoice_id := new_invoice_id;
    NEW.called_at := NOW();
  END IF;
  
  -- Set completed_at when status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_queue_status_change
  BEFORE UPDATE ON public.queue
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_queue_consultation();

-- Also trigger on insert if status is already 'in_consultation'
CREATE TRIGGER on_queue_insert
  BEFORE INSERT ON public.queue
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_queue_consultation();

-- Enable realtime for queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue;