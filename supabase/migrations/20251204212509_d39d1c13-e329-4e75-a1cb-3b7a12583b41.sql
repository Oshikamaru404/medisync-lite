-- Function to add patient to queue
CREATE OR REPLACE FUNCTION public.add_patient_to_queue()
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

  -- Insert into queue
  INSERT INTO public.queue (patient_id, numero_ordre, status, motif)
  VALUES (
    COALESCE(NEW.patient_id, NEW.id), -- NEW.id for patients table, NEW.patient_id for appointments
    next_order,
    'waiting',
    CASE 
      WHEN TG_TABLE_NAME = 'patients' THEN 'Première consultation'
      WHEN TG_TABLE_NAME = 'appointments' THEN NEW.type
      ELSE NULL
    END
  );

  RETURN NEW;
END;
$$;

-- Trigger: Add new patient to queue on patient creation
CREATE TRIGGER on_patient_created_add_to_queue
  AFTER INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.add_patient_to_queue();

-- Trigger: Add patient to queue when appointment is confirmed
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
  -- Only trigger when status changes to 'confirmé' and appointment is today
  IF NEW.statut = 'confirmé' AND (OLD.statut IS NULL OR OLD.statut != 'confirmé') AND NEW.date = today THEN
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

-- Trigger for appointments
CREATE TRIGGER on_appointment_confirmed_add_to_queue
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.add_confirmed_appointment_to_queue();