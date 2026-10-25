CREATE TABLE public.prescription_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  access_code_hash text NOT NULL CHECK (access_code_hash ~ '^[0-9a-f]{64}$'),
  document_fingerprint text NOT NULL CHECK (document_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  failed_attempts smallint NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5),
  access_count integer NOT NULL DEFAULT 0 CHECK (access_count >= 0),
  last_accessed_at timestamptz,
  CONSTRAINT prescription_shares_expiry_window CHECK (
    expires_at > created_at
    AND expires_at <= created_at + interval '7 days'
  )
);

CREATE INDEX prescription_shares_creator_recent_idx
  ON public.prescription_shares (created_by, created_at DESC);

CREATE INDEX prescription_shares_prescription_recent_idx
  ON public.prescription_shares (prescription_id, created_at DESC);

ALTER TABLE public.prescription_shares ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.prescription_shares FROM PUBLIC, anon, authenticated;

CREATE TABLE public.prescription_share_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  share_id uuid NOT NULL REFERENCES public.prescription_shares(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('created', 'access_granted', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX prescription_share_events_share_recent_idx
  ON public.prescription_share_events (share_id, created_at DESC);

ALTER TABLE public.prescription_share_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.prescription_share_events FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.claim_prescription_share_attempt(p_token_hash text)
RETURNS TABLE (share_id uuid, attempts smallint)
LANGUAGE sql
SET search_path = ''
AS $$
  UPDATE public.prescription_shares AS shares
  SET failed_attempts = shares.failed_attempts + 1
  WHERE shares.token_hash = p_token_hash
    AND shares.revoked_at IS NULL
    AND shares.expires_at > pg_catalog.now()
    AND shares.failed_attempts < 5
  RETURNING shares.id, shares.failed_attempts;
$$;

REVOKE ALL ON FUNCTION public.claim_prescription_share_attempt(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_prescription_share_attempt(text) TO service_role;

CREATE FUNCTION public.record_prescription_share_access(p_share_id uuid)
RETURNS integer
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  new_access_count integer;
BEGIN
  UPDATE public.prescription_shares AS shares
  SET access_count = shares.access_count + 1,
      last_accessed_at = pg_catalog.now()
  WHERE shares.id = p_share_id
    AND shares.revoked_at IS NULL
    AND shares.expires_at > pg_catalog.now()
  RETURNING shares.access_count INTO new_access_count;

  IF new_access_count IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.prescription_share_events (share_id, event_type)
  VALUES (p_share_id, 'access_granted');

  RETURN new_access_count;
END;
$$;

REVOKE ALL ON FUNCTION public.record_prescription_share_access(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_prescription_share_access(uuid) TO service_role;