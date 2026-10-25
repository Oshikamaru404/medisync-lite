CREATE OR REPLACE FUNCTION public.prevent_active_appointment_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.statut, 'pending') NOT IN ('pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  IF NEW.heure_fin <= NEW.heure_debut THEN
    RAISE EXCEPTION 'L’heure de fin doit être après l’heure de début.'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.date = NEW.date
    AND OLD.heure_debut = NEW.heure_debut
    AND OLD.heure_fin = NEW.heure_fin
    AND COALESCE(OLD.statut, 'pending') IN ('pending', 'confirmed')
  THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('appointment_schedule:' || NEW.date::TEXT));

  IF EXISTS (
    SELECT 1
    FROM public.appointments existing
    WHERE existing.date = NEW.date
      AND existing.id IS DISTINCT FROM NEW.id
      AND COALESCE(existing.statut, 'pending') IN ('pending', 'confirmed')
      AND NEW.heure_debut < existing.heure_fin
      AND existing.heure_debut < NEW.heure_fin
  ) THEN
    RAISE EXCEPTION 'Ce créneau chevauche un autre rendez-vous actif.'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_active_appointment_overlap() FROM PUBLIC;

DROP TRIGGER IF EXISTS prevent_active_appointment_overlap ON public.appointments;
CREATE TRIGGER prevent_active_appointment_overlap
  BEFORE INSERT OR UPDATE OF date, heure_debut, heure_fin, statut
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_active_appointment_overlap();
