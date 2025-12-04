-- Drop the problematic trigger
DROP TRIGGER IF EXISTS on_patient_created_add_to_queue ON public.patients;

-- Create a specific function for patient creation
CREATE OR REPLACE FUNCTION public.add_new_patient_to_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  next_order INTEGER;
BEGIN
  -- Get next order number for today
  SELECT COALESCE(MAX(numero_ordre), 0) + 1 INTO next_order
  FROM public.queue
  WHERE DATE(created_at) = today;

  -- Insert into queue using NEW.id (patient's id)
  INSERT INTO public.queue (patient_id, numero_ordre, status, motif)
  VALUES (NEW.id, next_order, 'waiting', 'Première consultation');

  RETURN NEW;
END;
$$;

-- Recreate trigger with the correct function
CREATE TRIGGER on_patient_created_add_to_queue
  AFTER INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.add_new_patient_to_queue();

-- Drop the old generic function that was causing issues
DROP FUNCTION IF EXISTS public.add_patient_to_queue();