-- Add poids (weight in kg) and taille (height in cm) columns to patients table
ALTER TABLE public.patients 
ADD COLUMN poids numeric NULL,
ADD COLUMN taille numeric NULL;