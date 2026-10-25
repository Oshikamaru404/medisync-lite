CREATE INDEX IF NOT EXISTS queue_priority_updated_by_idx
  ON public.queue (priority_updated_by)
  WHERE priority_updated_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS queue_priority_events_actor_user_id_idx
  ON public.queue_priority_events (actor_user_id)
  WHERE actor_user_id IS NOT NULL;