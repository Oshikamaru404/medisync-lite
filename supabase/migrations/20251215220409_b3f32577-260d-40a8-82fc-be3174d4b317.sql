-- Enrichir la table medications avec DCI et posologie
ALTER TABLE public.medications 
ADD COLUMN IF NOT EXISTS dci text,
ADD COLUMN IF NOT EXISTS forme text DEFAULT 'comprimé',
ADD COLUMN IF NOT EXISTS dosage_defaut text,
ADD COLUMN IF NOT EXISTS unite text DEFAULT 'mg';

-- Table des ordonnances
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des lignes d'ordonnance
CREATE TABLE public.prescription_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES public.medications(id),
  nom_medicament text NOT NULL,
  dosage text,
  posologie text NOT NULL,
  duree text,
  instructions text,
  ordre INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable all access for prescriptions" 
ON public.prescriptions 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable all access for prescription_items" 
ON public.prescription_items 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Index pour performances
CREATE INDEX idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX idx_prescription_items_prescription_id ON public.prescription_items(prescription_id);

-- Insérer quelques médicaments marocains courants
INSERT INTO public.medications (nom, dci, forme, dosage_defaut, unite) VALUES
('Doliprane', 'Paracétamol', 'comprimé', '1000', 'mg'),
('Efferalgan', 'Paracétamol', 'comprimé effervescent', '1000', 'mg'),
('Augmentin', 'Amoxicilline/Acide clavulanique', 'comprimé', '1g', 'g'),
('Amoxil', 'Amoxicilline', 'gélule', '500', 'mg'),
('Clamoxyl', 'Amoxicilline', 'gélule', '1g', 'g'),
('Voltarène', 'Diclofénac', 'comprimé', '50', 'mg'),
('Nexium', 'Esoméprazole', 'gélule', '40', 'mg'),
('Mopral', 'Oméprazole', 'gélule', '20', 'mg'),
('Inexium', 'Esoméprazole', 'comprimé', '20', 'mg'),
('Gaviscon', 'Alginate de sodium', 'suspension buvable', '10', 'ml'),
('Spasfon', 'Phloroglucinol', 'comprimé', '80', 'mg'),
('Motilium', 'Dompéridone', 'comprimé', '10', 'mg'),
('Imodium', 'Lopéramide', 'gélule', '2', 'mg'),
('Smecta', 'Diosmectite', 'sachet', '3', 'g'),
('Ventoline', 'Salbutamol', 'aérosol', '100', 'µg'),
('Seretide', 'Fluticasone/Salmétérol', 'diskus', '500/50', 'µg'),
('Aerius', 'Desloratadine', 'comprimé', '5', 'mg'),
('Zyrtec', 'Cétirizine', 'comprimé', '10', 'mg'),
('Xyzall', 'Lévocétirizine', 'comprimé', '5', 'mg'),
('Aspegic', 'Acide acétylsalicylique', 'sachet', '100', 'mg'),
('Kardegic', 'Acide acétylsalicylique', 'sachet', '75', 'mg'),
('Plavix', 'Clopidogrel', 'comprimé', '75', 'mg'),
('Lipitor', 'Atorvastatine', 'comprimé', '20', 'mg'),
('Crestor', 'Rosuvastatine', 'comprimé', '10', 'mg'),
('Tahor', 'Atorvastatine', 'comprimé', '10', 'mg'),
('Aprovel', 'Irbésartan', 'comprimé', '150', 'mg'),
('Coaprovel', 'Irbésartan/HCTZ', 'comprimé', '150/12.5', 'mg'),
('Amlor', 'Amlodipine', 'gélule', '5', 'mg'),
('Coversyl', 'Périndopril', 'comprimé', '5', 'mg'),
('Triatec', 'Ramipril', 'comprimé', '5', 'mg'),
('Lasilix', 'Furosémide', 'comprimé', '40', 'mg'),
('Glucophage', 'Metformine', 'comprimé', '850', 'mg'),
('Diamicron', 'Gliclazide', 'comprimé', '30', 'mg'),
('Lantus', 'Insuline glargine', 'stylo injectable', '100', 'UI/ml'),
('Novorapid', 'Insuline asparte', 'stylo injectable', '100', 'UI/ml'),
('Levothyrox', 'Lévothyroxine', 'comprimé', '100', 'µg'),
('Euthyrox', 'Lévothyroxine', 'comprimé', '50', 'µg'),
('Lexomil', 'Bromazépam', 'comprimé', '6', 'mg'),
('Xanax', 'Alprazolam', 'comprimé', '0.5', 'mg'),
('Stilnox', 'Zolpidem', 'comprimé', '10', 'mg'),
('Deroxat', 'Paroxétine', 'comprimé', '20', 'mg'),
('Prozac', 'Fluoxétine', 'gélule', '20', 'mg'),
('Laroxyl', 'Amitriptyline', 'comprimé', '25', 'mg')
ON CONFLICT (nom) DO UPDATE SET
  dci = EXCLUDED.dci,
  forme = EXCLUDED.forme,
  dosage_defaut = EXCLUDED.dosage_defaut,
  unite = EXCLUDED.unite;