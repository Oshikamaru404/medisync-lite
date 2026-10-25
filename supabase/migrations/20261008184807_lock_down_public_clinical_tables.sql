ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for patients" ON public.patients;
DROP POLICY IF EXISTS "Enable all access for consultations" ON public.consultations;
DROP POLICY IF EXISTS "Enable all access for queue" ON public.queue;
DROP POLICY IF EXISTS "Enable all access for appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable all access for prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Enable all access for invoices" ON public.invoices;

REVOKE ALL PRIVILEGES ON TABLE public.patients FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.consultations FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.queue FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.appointments FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.prescriptions FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.invoices FROM anon;
