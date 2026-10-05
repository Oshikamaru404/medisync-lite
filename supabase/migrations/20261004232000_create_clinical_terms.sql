CREATE TABLE public.clinical_terms (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category_id TEXT,
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'ICD-11',
  source_release TEXT,
  search_text TEXT GENERATED ALWAYS AS (
    lower(concat_ws(' ', code, label, array_to_string(synonyms, ' ')))
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinical terms are readable by the application"
ON public.clinical_terms
FOR SELECT
USING (true);

CREATE INDEX clinical_terms_category_id_idx
ON public.clinical_terms (category_id);
