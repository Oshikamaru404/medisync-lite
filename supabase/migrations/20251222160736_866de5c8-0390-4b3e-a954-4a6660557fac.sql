-- Create certificates table
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'repos', 'aptitude', 'bonne_sante', 'custom'
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  duree_jours INTEGER, -- For repos certificates
  date_debut DATE, -- Start date for repos
  date_fin DATE, -- End date for repos
  motif TEXT, -- Reason/purpose
  contenu TEXT, -- Custom content
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Create policy for all access (to be refined with auth later)
CREATE POLICY "Enable all access for certificates"
ON public.certificates
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_certificates_patient_id ON public.certificates(patient_id);
CREATE INDEX idx_certificates_date ON public.certificates(date DESC);