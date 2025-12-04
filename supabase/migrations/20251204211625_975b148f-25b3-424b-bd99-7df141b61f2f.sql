-- Fix search_path for generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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