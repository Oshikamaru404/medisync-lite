BEGIN;

SELECT plan(12);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.prescription_shares'::regclass),
  'prescription shares has row-level security enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.prescription_share_events'::regclass),
  'prescription share events has row-level security enabled'
);

SELECT ok(NOT has_table_privilege('anon', 'public.prescription_shares', 'SELECT'), 'anon cannot read prescription shares');
SELECT ok(NOT has_table_privilege('authenticated', 'public.prescription_shares', 'SELECT'), 'authenticated cannot read prescription shares');
SELECT ok(NOT has_table_privilege('anon', 'public.prescription_share_events', 'SELECT'), 'anon cannot read share audit events');
SELECT ok(NOT has_table_privilege('authenticated', 'public.prescription_share_events', 'SELECT'), 'authenticated cannot read share audit events');

SELECT ok(
  has_function_privilege('service_role', 'public.claim_prescription_share_attempt(text)', 'EXECUTE'),
  'service role can atomically count failed share-code attempts'
);
SELECT ok(
  has_function_privilege('service_role', 'public.record_prescription_share_access(uuid)', 'EXECUTE'),
  'service role can atomically record successful share access'
);

SELECT ok(NOT has_function_privilege('anon', 'public.claim_prescription_share_attempt(text)', 'EXECUTE'), 'anon cannot count share-code attempts');
SELECT ok(NOT has_function_privilege('authenticated', 'public.claim_prescription_share_attempt(text)', 'EXECUTE'), 'authenticated cannot count share-code attempts');
SELECT ok(NOT has_function_privilege('anon', 'public.record_prescription_share_access(uuid)', 'EXECUTE'), 'anon cannot record share access');
SELECT ok(NOT has_function_privilege('authenticated', 'public.record_prescription_share_access(uuid)', 'EXECUTE'), 'authenticated cannot record share access');

SELECT * FROM finish();
ROLLBACK;
