CREATE TABLE public.clinical_terms (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category_id TEXT,
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'ICD-11',
  source_release TEXT,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_clinical_term_search_text()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_text := lower(concat_ws(' ', NEW.code, NEW.label, array_to_string(NEW.synonyms, ' ')));
  RETURN NEW;
END;
$$;

CREATE TRIGGER clinical_terms_set_search_text
BEFORE INSERT OR UPDATE OF code, label, synonyms
ON public.clinical_terms
FOR EACH ROW
EXECUTE FUNCTION public.set_clinical_term_search_text();

ALTER TABLE public.clinical_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinical terms are readable by the application"
ON public.clinical_terms
FOR SELECT
USING (true);

CREATE INDEX clinical_terms_category_id_idx
ON public.clinical_terms (category_id);
