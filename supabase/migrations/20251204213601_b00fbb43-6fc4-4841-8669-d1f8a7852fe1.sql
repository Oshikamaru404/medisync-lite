-- Remove the trigger that automatically adds new patients to queue
-- Patients should only be added to queue when appointment is confirmed
DROP TRIGGER IF EXISTS on_patient_created_add_to_queue ON public.patients;

-- Drop the function as it's no longer needed
DROP FUNCTION IF EXISTS public.add_new_patient_to_queue();