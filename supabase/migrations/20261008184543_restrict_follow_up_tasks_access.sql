DROP POLICY IF EXISTS "Enable all access for follow_up_tasks" ON public.follow_up_tasks;
REVOKE ALL PRIVILEGES ON TABLE public.follow_up_tasks FROM anon;
