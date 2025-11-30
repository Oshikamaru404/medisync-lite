-- Schéma complet pour l'application de gestion médicale
-- À exécuter dans votre projet Supabase (SQL Editor)

-- 1. Table des patients
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    date_naissance DATE,
    telephone TEXT,
    email TEXT,
    adresse TEXT,
    mutuelle TEXT,
    personne_contact TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des rendez-vous
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    type TEXT NOT NULL,
    statut TEXT CHECK (statut IN ('confirmed', 'pending', 'cancelled', 'completed')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table des factures
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    numero TEXT UNIQUE NOT NULL,
    date DATE NOT NULL,
    montant DECIMAL(10, 2) NOT NULL,
    statut TEXT CHECK (statut IN ('paid', 'pending', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des dossiers médicaux
CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE UNIQUE NOT NULL,
    antecedents TEXT,
    allergies TEXT,
    traitements TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des documents scannés
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    nom TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policies (Pour l'instant, accès complet - à ajuster selon vos besoins d'authentification)
CREATE POLICY "Enable all access for patients" ON public.patients FOR ALL USING (true);
CREATE POLICY "Enable all access for appointments" ON public.appointments FOR ALL USING (true);
CREATE POLICY "Enable all access for invoices" ON public.invoices FOR ALL USING (true);
CREATE POLICY "Enable all access for medical_records" ON public.medical_records FOR ALL USING (true);
CREATE POLICY "Enable all access for documents" ON public.documents FOR ALL USING (true);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON public.documents(patient_id);

-- Données de démonstration
INSERT INTO public.patients (nom, prenom, telephone, email) VALUES
('Dubois', 'Marie', '06 12 34 56 78', 'marie.dubois@email.com'),
('Martin', 'Jean', '06 23 45 67 89', 'jean.martin@email.com'),
('Bernard', 'Sophie', '06 34 56 78 90', 'sophie.bernard@email.com');

-- Récupérer les IDs des patients pour les relations
DO $$
DECLARE
    patient1_id UUID;
    patient2_id UUID;
    patient3_id UUID;
BEGIN
    SELECT id INTO patient1_id FROM public.patients WHERE nom = 'Dubois' LIMIT 1;
    SELECT id INTO patient2_id FROM public.patients WHERE nom = 'Martin' LIMIT 1;
    SELECT id INTO patient3_id FROM public.patients WHERE nom = 'Bernard' LIMIT 1;

    -- Rendez-vous de démonstration
    INSERT INTO public.appointments (patient_id, date, heure_debut, heure_fin, type, statut) VALUES
    (patient1_id, CURRENT_DATE, '09:00', '10:00', 'Consultation', 'confirmed'),
    (patient2_id, CURRENT_DATE, '14:00', '15:00', 'Suivi', 'confirmed'),
    (patient3_id, CURRENT_DATE + 1, '10:00', '11:00', 'Urgence', 'pending');

    -- Factures de démonstration
    INSERT INTO public.invoices (patient_id, numero, date, montant, statut) VALUES
    (patient1_id, 'INV-2024-001', CURRENT_DATE - 5, 75.00, 'paid'),
    (patient2_id, 'INV-2024-002', CURRENT_DATE - 3, 120.00, 'pending'),
    (patient3_id, 'INV-2024-003', CURRENT_DATE - 1, 90.00, 'paid');
END $$;
