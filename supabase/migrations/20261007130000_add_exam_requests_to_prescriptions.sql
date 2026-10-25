  ALTER TABLE public.prescription_items
    ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'medication',
    ADD COLUMN IF NOT EXISTS request_details jsonb NOT NULL DEFAULT '{}'::jsonb;

  ALTER TABLE public.prescriptions
    ADD COLUMN IF NOT EXISTS prescription_type text NOT NULL DEFAULT 'medication';

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'prescription_items_request_type_check'
        AND conrelid = 'public.prescription_items'::regclass
    ) THEN
      ALTER TABLE public.prescription_items
        ADD CONSTRAINT prescription_items_request_type_check
        CHECK (request_type IN ('medication', 'laboratory', 'imaging'));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'prescriptions_type_check'
        AND conrelid = 'public.prescriptions'::regclass
    ) THEN
      ALTER TABLE public.prescriptions
        ADD CONSTRAINT prescriptions_type_check
        CHECK (prescription_type IN ('medication', 'laboratory', 'imaging'));
    END IF;
  END $$;
