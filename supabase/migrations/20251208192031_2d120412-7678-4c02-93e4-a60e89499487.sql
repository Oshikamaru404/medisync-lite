-- Add CIN (Carte d'Identité Nationale) column to patients table
ALTER TABLE public.patients 
ADD COLUMN cin text;