-- Prototype only: exposes synthetic clinical records to any client holding
-- the public project URL and publishable key. Re-lock before using real data.
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_tasks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.patients TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.consultations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.queue TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.appointments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.prescriptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invoices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.follow_up_tasks TO anon;

DROP POLICY IF EXISTS "Enable all access for patients" ON public.patients;
CREATE POLICY "Enable all access for patients" ON public.patients FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all access for consultations" ON public.consultations;
CREATE POLICY "Enable all access for consultations" ON public.consultations FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all access for queue" ON public.queue;
CREATE POLICY "Enable all access for queue" ON public.queue FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all access for appointments" ON public.appointments;
CREATE POLICY "Enable all access for appointments" ON public.appointments FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all access for prescriptions" ON public.prescriptions;
CREATE POLICY "Enable all access for prescriptions" ON public.prescriptions FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all access for invoices" ON public.invoices;
CREATE POLICY "Enable all access for invoices" ON public.invoices FOR ALL TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all access for follow_up_tasks" ON public.follow_up_tasks;
CREATE POLICY "Enable all access for follow_up_tasks" ON public.follow_up_tasks FOR ALL TO public USING (true) WITH CHECK (true);
