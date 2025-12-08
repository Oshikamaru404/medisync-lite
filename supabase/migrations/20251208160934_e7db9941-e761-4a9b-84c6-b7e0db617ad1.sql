-- Add new columns to patients table for complete identity management
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS sexe TEXT CHECK (sexe IN ('M', 'F', 'Autre')),
ADD COLUMN IF NOT EXISTS numero_mutuelle TEXT,
ADD COLUMN IF NOT EXISTS lien_personne_contact TEXT,
ADD COLUMN IF NOT EXISTS telephone_personne_contact TEXT;