ALTER TABLE public.documents
ADD COLUMN ai_analysis jsonb,
ADD CONSTRAINT documents_ai_analysis_object
  CHECK (ai_analysis IS NULL OR jsonb_typeof(ai_analysis) = 'object');