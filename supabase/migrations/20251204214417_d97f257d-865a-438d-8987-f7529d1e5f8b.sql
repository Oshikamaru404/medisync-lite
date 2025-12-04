-- Update function to handle both INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.add_confirmed_appointment_to_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  next_order INTEGER;
  already_in_queue BOOLEAN;
BEGIN
  -- For INSERT: check if new appointment is confirmed and today
  -- For UPDATE: check if status changed to confirmed and appointment is today
  IF NEW.statut = 'confirmed' AND NEW.date = today THEN
    -- For UPDATE, only trigger if status actually changed
    IF TG_OP = 'UPDATE' AND OLD.statut = 'confirmed' THEN
      RETURN NEW;
    END IF;
    
    -- Check if patient is already in queue today
    SELECT EXISTS (
      SELECT 1 FROM public.queue 
      WHERE patient_id = NEW.patient_id 
      AND DATE(created_at) = today
      AND status IN ('waiting', 'in_consultation')
    ) INTO already_in_queue;

    IF NOT already_in_queue THEN
      -- Get next order number for today
      SELECT COALESCE(MAX(numero_ordre), 0) + 1 INTO next_order
      FROM public.queue
      WHERE DATE(created_at) = today;

      -- Insert into queue
      INSERT INTO public.queue (patient_id, numero_ordre, status, motif)
      VALUES (NEW.patient_id, next_order, 'waiting', NEW.type);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Add INSERT trigger as well
DROP TRIGGER IF EXISTS on_appointment_confirmed_insert_to_queue ON public.appointments;
CREATE TRIGGER on_appointment_confirmed_insert_to_queue
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.add_confirmed_appointment_to_queue();