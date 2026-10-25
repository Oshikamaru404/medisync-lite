import type { MedicalActTemplateInput } from "@/hooks/useMedicalActTemplates";

export type MedicalActSuggestion = Omit<MedicalActTemplateInput, "id" | "is_active" | "unit_price">;

export const MEDICAL_ACT_SUGGESTIONS: MedicalActSuggestion[] = [
  {
    "category": "Consultations au cabinet",
    "label": "Consultation au cabinet par le médecin généraliste",
    "ngap_code": "C"
  },
  {
    "category": "Consultations au cabinet",
    "label": "Consultation au cabinet par le médecin spécialiste",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations au cabinet",
    "label": "Consultation au cabinet par le médecin psychiatre ou neurologue",
    "ngap_code": "CNPSY"
  },
  {
    "category": "Consultations au cabinet",
    "label": "Consultation de suivi (généraliste)",
    "ngap_code": "C"
  },
  {
    "category": "Consultations au cabinet",
    "label": "Consultation de suivi (spécialiste)",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations au cabinet",
    "label": "Consultation de première intention (spécialiste)",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations au cabinet",
    "label": "Consultation psychiatrique / neurologique de suivi",
    "ngap_code": "CNPSY"
  },
  {
    "category": "Visites à domicile",
    "label": "Visite à domicile par le médecin généraliste",
    "ngap_code": "V"
  },
  {
    "category": "Visites à domicile",
    "label": "Visite à domicile par le médecin spécialiste",
    "ngap_code": "Vs"
  },
  {
    "category": "Visites à domicile",
    "label": "Visite à domicile par le médecin psychiatre ou neurologue",
    "ngap_code": "VNPSY"
  },
  {
    "category": "Visites à domicile",
    "label": "Visite à domicile de suivi (généraliste)",
    "ngap_code": "V"
  },
  {
    "category": "Visites à domicile",
    "label": "Visite à domicile de suivi (spécialiste)",
    "ngap_code": "Vs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation médecine générale",
    "ngap_code": "C"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation de suivi médecine générale",
    "ngap_code": "C"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation urgente médecine générale",
    "ngap_code": "C"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation spécialiste",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation de suivi spécialiste",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Première consultation spécialiste",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation pédiatrique",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation gynécologique",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation cardiologique",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation dermatologique",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation ophtalmologique",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation ORL",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation gastro-entérologique",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation endocrinologique / diabète",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation rhumatologique",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation neurologique",
    "ngap_code": "CNPSY"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation psychiatrique",
    "ngap_code": "CNPSY"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation pneumologique",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation urologique",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation de la douleur",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation gériatrique",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation médecine du sport",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations spécifiques / majeures",
    "label": "Consultation médecine esthétique",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations avec majeures",
    "label": "Consultation de nuit (20h-8h)",
    "ngap_code": "CONS-NUIT"
  },
  {
    "category": "Consultations avec majeures",
    "label": "Consultation dimanche / jour férié",
    "ngap_code": "CONS-DIMANCHE"
  },
  {
    "category": "Consultations avec majeures",
    "label": "Consultation urgente de nuit",
    "ngap_code": "CONS-URGENCE-NUIT"
  },
  {
    "category": "Consultations avec majeures",
    "label": "Visite à domicile de nuit",
    "ngap_code": "VISITE-NUIT"
  },
  {
    "category": "Consultations avec majeures",
    "label": "Visite à domicile dimanche / férié",
    "ngap_code": "VISITE-DIMANCHE"
  },
  {
    "category": "Consultations particulières",
    "label": "Consultation de suivi de grossesse",
    "ngap_code": "Souvent Cs"
  },
  {
    "category": "Consultations particulières",
    "label": "Consultation post-natale",
    "ngap_code": "Souvent Cs"
  },
  {
    "category": "Consultations particulières",
    "label": "Consultation contraception / planification",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations particulières",
    "label": "Consultation bilan de santé / check-up",
    "ngap_code": "C ou Cs"
  },
  {
    "category": "Consultations particulières",
    "label": "Consultation + certificat médical",
    "ngap_code": "C + acte certificat"
  },
  {
    "category": "Consultations particulières",
    "label": "Consultation d'expertise / contre-visite",
    "ngap_code": "Cs"
  },
  {
    "category": "Consultations particulières",
    "label": "Téléconsultation",
    "ngap_code": "Non codé officiellement (usage libre)"
  },
  {
    "category": "Consultations particulières",
    "label": "Avis ponctuel de consultant",
    "ngap_code": "Cs"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Injection intramusculaire (IM)",
    "ngap_code": "K5"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Injection sous-cutanée (SC)",
    "ngap_code": "K5"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Injection intradermique",
    "ngap_code": "K5"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Injection intraveineuse (IV)",
    "ngap_code": "K8"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Perfusions (selon durée et complexité)",
    "ngap_code": "K10"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Prise de sang / prélèvement veineux",
    "ngap_code": "K5"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Glycémie capillaire",
    "ngap_code": "K5"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Pansement simple",
    "ngap_code": "K5"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Pansement complexe / brûlure",
    "ngap_code": "K10"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Ablation de points de suture",
    "ngap_code": "K10"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Suture de plaie simple (moins de 5 cm)",
    "ngap_code": "K15"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Suture de plaie complexe ou multiple",
    "ngap_code": "K20"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Ablation de corps étranger superficiel",
    "ngap_code": "K10"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Ablation de corps étranger profond",
    "ngap_code": "K15"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Incision d'abcès / furoncle",
    "ngap_code": "K10"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Drainage d'abcès",
    "ngap_code": "K15"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Exérèse de kyste sébacé / lipome superficiel",
    "ngap_code": "K10"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Exérèse de lésion cutanée avec suture",
    "ngap_code": "K20"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Cryothérapie (azote liquide) - lésion unique",
    "ngap_code": "K5"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Cryothérapie - lésions multiples",
    "ngap_code": "K10"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Électrocoagulation de lésions cutanées",
    "ngap_code": "K10"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Biopsie cutanée",
    "ngap_code": "K15"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Vaccination (acte d'injection)",
    "ngap_code": "K5"
  },
  {
    "category": "Actes généraux / médecine générale / petite chirurgie",
    "label": "Test allergique cutané (prick-test) - par série",
    "ngap_code": "K5"
  },
  {
    "category": "Cardiologie",
    "label": "Électrocardiogramme (ECG) de repos",
    "ngap_code": "K15"
  },
  {
    "category": "Cardiologie",
    "label": "ECG avec épreuve d'effort",
    "ngap_code": "K20"
  },
  {
    "category": "Cardiologie",
    "label": "Holter ECG 24h (pose + interprétation)",
    "ngap_code": "K25"
  },
  {
    "category": "Cardiologie",
    "label": "MAPA (Mesure Ambulatoire de la Pression Artérielle) 24h",
    "ngap_code": "K20"
  },
  {
    "category": "Cardiologie",
    "label": "Échocardiographie transthoracique",
    "ngap_code": "KE20"
  },
  {
    "category": "Cardiologie",
    "label": "Échocardiographie + Doppler",
    "ngap_code": "KE25"
  },
  {
    "category": "Cardiologie",
    "label": "Écho-Doppler des troncs supra-aortiques",
    "ngap_code": "KE30"
  },
  {
    "category": "Cardiologie",
    "label": "Écho-Doppler veineux des membres inférieurs",
    "ngap_code": "KE25"
  },
  {
    "category": "Cardiologie",
    "label": "Écho-Doppler artériel des membres",
    "ngap_code": "KE25"
  },
  {
    "category": "Cardiologie",
    "label": "Échographie abdominale simple",
    "ngap_code": "KE15"
  },
  {
    "category": "Cardiologie",
    "label": "Échographie abdomino-pelvienne",
    "ngap_code": "KE20"
  },
  {
    "category": "Cardiologie",
    "label": "Échographie pelvienne",
    "ngap_code": "KE20"
  },
  {
    "category": "Cardiologie",
    "label": "Échographie thyroïdienne",
    "ngap_code": "KE15"
  },
  {
    "category": "Cardiologie",
    "label": "Échographie thyroïdienne + Doppler",
    "ngap_code": "KE20"
  },
  {
    "category": "Cardiologie",
    "label": "Échographie mammaire unilatérale",
    "ngap_code": "KE15"
  },
  {
    "category": "Cardiologie",
    "label": "Échographie mammaire bilatérale",
    "ngap_code": "KE20"
  },
  {
    "category": "Cardiologie",
    "label": "Échographie obstétricale (1er trimestre)",
    "ngap_code": "KE20"
  },
  {
    "category": "Cardiologie",
    "label": "Échographie obstétricale (2e / 3e trimestre)",
    "ngap_code": "KE25"
  },
  {
    "category": "Cardiologie",
    "label": "Échographie pelvienne gynécologique",
    "ngap_code": "KE20"
  },
  {
    "category": "Cardiologie",
    "label": "Échographie des parties molles / musculaire",
    "ngap_code": "KE15"
  },
  {
    "category": "Cardiologie",
    "label": "Échographie articulaire (épaule, genou...)",
    "ngap_code": "KE20"
  },
  {
    "category": "Cardiologie",
    "label": "Écho-Doppler testiculaire",
    "ngap_code": "KE25"
  },
  {
    "category": "Cardiologie",
    "label": "Échographie prostatique (voie abdominale)",
    "ngap_code": "KE20"
  },
  {
    "category": "Dermatologie",
    "label": "Cryothérapie (verrues, kératoses...)",
    "ngap_code": "K10"
  },
  {
    "category": "Dermatologie",
    "label": "Électrocoagulation",
    "ngap_code": "K15"
  },
  {
    "category": "Dermatologie",
    "label": "Exérèse de naevus / grain de beauté",
    "ngap_code": "K15"
  },
  {
    "category": "Dermatologie",
    "label": "Exérèse de tumeur cutanée avec suture",
    "ngap_code": "K20"
  },
  {
    "category": "Dermatologie",
    "label": "Biopsie cutanée punch ou scalpel",
    "ngap_code": "K15"
  },
  {
    "category": "Dermatologie",
    "label": "Curetage de molluscum / verrue",
    "ngap_code": "K10"
  },
  {
    "category": "Dermatologie",
    "label": "Traitement de condylomes (plusieurs séances possibles)",
    "ngap_code": "K20"
  },
  {
    "category": "Dermatologie",
    "label": "Laser (selon type et surface) - souvent assimilé",
    "ngap_code": "K25"
  },
  {
    "category": "Dermatologie",
    "label": "Injection intralésionnelle (corticoïdes...)",
    "ngap_code": "K15"
  },
  {
    "category": "Gynécologie - obstétrique",
    "label": "Frottis cervico-vaginal (prélèvement)",
    "ngap_code": "K15"
  },
  {
    "category": "Gynécologie - obstétrique",
    "label": "Pose de stérilet (DIU)",
    "ngap_code": "K20"
  },
  {
    "category": "Gynécologie - obstétrique",
    "label": "Retrait de stérilet",
    "ngap_code": "K15"
  },
  {
    "category": "Gynécologie - obstétrique",
    "label": "Pose d'implant contraceptif",
    "ngap_code": "K25"
  },
  {
    "category": "Gynécologie - obstétrique",
    "label": "Retrait d'implant contraceptif",
    "ngap_code": "K20"
  },
  {
    "category": "Gynécologie - obstétrique",
    "label": "Colposcopie simple",
    "ngap_code": "K15"
  },
  {
    "category": "Gynécologie - obstétrique",
    "label": "Colposcopie avec biopsie",
    "ngap_code": "K25"
  },
  {
    "category": "Gynécologie - obstétrique",
    "label": "Biopsie du col utérin",
    "ngap_code": "K20"
  },
  {
    "category": "Gynécologie - obstétrique",
    "label": "Échographie pelvienne",
    "ngap_code": "KE20"
  },
  {
    "category": "Gynécologie - obstétrique",
    "label": "Échographie obstétricale",
    "ngap_code": "KE25"
  },
  {
    "category": "Gynécologie - obstétrique",
    "label": "Monitoring fœtal (selon équipement)",
    "ngap_code": "K15"
  },
  {
    "category": "Gynécologie - obstétrique",
    "label": "Insémination artificielle (par séance)",
    "ngap_code": "K10"
  },
  {
    "category": "Orl",
    "label": "Ablation de bouchon de cérumen (uni ou bilatéral)",
    "ngap_code": "K5"
  },
  {
    "category": "Orl",
    "label": "Ablation de corps étranger du conduit auditif",
    "ngap_code": "K10"
  },
  {
    "category": "Orl",
    "label": "Lavage d'oreille",
    "ngap_code": "K10"
  },
  {
    "category": "Orl",
    "label": "Cautérisation de saignement de nez (épistaxis)",
    "ngap_code": "K15"
  },
  {
    "category": "Orl",
    "label": "Audiométrie tonale",
    "ngap_code": "K20"
  },
  {
    "category": "Orl",
    "label": "Audiométrie tonale + vocale",
    "ngap_code": "K25"
  },
  {
    "category": "Orl",
    "label": "Impédancemétrie",
    "ngap_code": "K15"
  },
  {
    "category": "Orl",
    "label": "Endoscopie nasale / rhinoscopie",
    "ngap_code": "K20"
  },
  {
    "category": "Orl",
    "label": "Laryngoscopie / fibroscopie laryngée",
    "ngap_code": "K25"
  },
  {
    "category": "Ophtalmologie",
    "label": "Mesure de l'acuité visuelle",
    "ngap_code": "K10"
  },
  {
    "category": "Ophtalmologie",
    "label": "Fond d'œil",
    "ngap_code": "K15"
  },
  {
    "category": "Ophtalmologie",
    "label": "Tonométrie (mesure tension oculaire)",
    "ngap_code": "K15"
  },
  {
    "category": "Ophtalmologie",
    "label": "Champ visuel",
    "ngap_code": "K20"
  },
  {
    "category": "Ophtalmologie",
    "label": "OCT (Tomographie en cohérence optique)",
    "ngap_code": "K25"
  },
  {
    "category": "Ophtalmologie",
    "label": "Angiographie rétinienne",
    "ngap_code": "K20"
  },
  {
    "category": "Ophtalmologie",
    "label": "Rétinographie",
    "ngap_code": "K15"
  },
  {
    "category": "Ophtalmologie",
    "label": "Ablation de corps étranger cornéen",
    "ngap_code": "K10"
  },
  {
    "category": "Ophtalmologie",
    "label": "Adaptation de lentilles de contact",
    "ngap_code": "K15"
  },
  {
    "category": "Pneumologie / allergologie",
    "label": "Spirométrie simple",
    "ngap_code": "K15"
  },
  {
    "category": "Pneumologie / allergologie",
    "label": "Exploration fonctionnelle respiratoire (EFR) complète",
    "ngap_code": "K20"
  },
  {
    "category": "Pneumologie / allergologie",
    "label": "Peak-flow",
    "ngap_code": "K10"
  },
  {
    "category": "Pneumologie / allergologie",
    "label": "Tests cutanés allergologiques (prick-tests)",
    "ngap_code": "K15"
  },
  {
    "category": "Pneumologie / allergologie",
    "label": "Tests intradermiques",
    "ngap_code": "K20"
  },
  {
    "category": "Pneumologie / allergologie",
    "label": "Désensibilisation (injection)",
    "ngap_code": "K15"
  },
  {
    "category": "Rhumatologie / infiltrations",
    "label": "Infiltration articulaire simple (épaule, genou, etc.)",
    "ngap_code": "K15"
  },
  {
    "category": "Rhumatologie / infiltrations",
    "label": "Infiltration sous contrôle échographique",
    "ngap_code": "K20"
  },
  {
    "category": "Rhumatologie / infiltrations",
    "label": "Infiltration de corticoïdes péri-articulaire",
    "ngap_code": "K15"
  },
  {
    "category": "Rhumatologie / infiltrations",
    "label": "Infiltration épidurale (selon compétence)",
    "ngap_code": "K20"
  },
  {
    "category": "Rhumatologie / infiltrations",
    "label": "Ponction articulaire",
    "ngap_code": "K15"
  },
  {
    "category": "Rhumatologie / infiltrations",
    "label": "Échographie articulaire de guidage",
    "ngap_code": "KE15"
  },
  {
    "category": "Urologie",
    "label": "Pose de sonde urinaire",
    "ngap_code": "K10"
  },
  {
    "category": "Urologie",
    "label": "Ablation de sonde urinaire",
    "ngap_code": "K10"
  },
  {
    "category": "Urologie",
    "label": "Débitmétrie urinaire",
    "ngap_code": "K15"
  },
  {
    "category": "Urologie",
    "label": "Échographie vésicale + résidu post-mictionnel",
    "ngap_code": "KE20"
  },
  {
    "category": "Urologie",
    "label": "Échographie prostatique",
    "ngap_code": "KE25"
  },
  {
    "category": "Urologie",
    "label": "Cathétérisme urétral",
    "ngap_code": "K20"
  },
  {
    "category": "Gastro-entérologie",
    "label": "Test respiratoire Helicobacter pylori",
    "ngap_code": "K15"
  },
  {
    "category": "Gastro-entérologie",
    "label": "Tubage gastrique",
    "ngap_code": "K10"
  },
  {
    "category": "Gastro-entérologie",
    "label": "Échographie abdominale",
    "ngap_code": "KE20"
  },
  {
    "category": "Gastro-entérologie",
    "label": "Fibroscopie oeso-gastro-duodénale (si réalisée en cabinet)",
    "ngap_code": "K30"
  },
  {
    "category": "Neurologie",
    "label": "Électroencéphalogramme (EEG)",
    "ngap_code": "K20"
  },
  {
    "category": "Neurologie",
    "label": "Électromyogramme (EMG)",
    "ngap_code": "K25"
  },
  {
    "category": "Neurologie",
    "label": "Ponction lombaire (si réalisée en cabinet)",
    "ngap_code": "K15"
  },
  {
    "category": "Actes infirmiers - souvent facturés par le cabinet",
    "label": "Injection intramusculaire / sous-cutanée",
    "ngap_code": "AMI1"
  },
  {
    "category": "Actes infirmiers - souvent facturés par le cabinet",
    "label": "Injection intraveineuse",
    "ngap_code": "AMI2"
  },
  {
    "category": "Actes infirmiers - souvent facturés par le cabinet",
    "label": "Pansement simple",
    "ngap_code": "AMI3"
  },
  {
    "category": "Actes infirmiers - souvent facturés par le cabinet",
    "label": "Pansement complexe",
    "ngap_code": "AMI4"
  },
  {
    "category": "Actes infirmiers - souvent facturés par le cabinet",
    "label": "Prise de sang",
    "ngap_code": "AMI5"
  },
  {
    "category": "Actes infirmiers - souvent facturés par le cabinet",
    "label": "Glycémie capillaire",
    "ngap_code": "AMI5"
  },
  {
    "category": "Actes infirmiers - souvent facturés par le cabinet",
    "label": "Pose / surveillance de perfusion",
    "ngap_code": "AMI4"
  },
  {
    "category": "Actes infirmiers - souvent facturés par le cabinet",
    "label": "Ablation de points de suture",
    "ngap_code": "AMI3"
  },
  {
    "category": "Actes infirmiers - souvent facturés par le cabinet",
    "label": "Vaccination",
    "ngap_code": "AMI5"
  },
  {
    "category": "Actes dentaires - si cabinet dentaire intégré",
    "label": "Curetage et obturation cavité simple",
    "ngap_code": "D10"
  },
  {
    "category": "Actes dentaires - si cabinet dentaire intégré",
    "label": "Curetage et obturation cavité 2 faces",
    "ngap_code": "D10"
  },
  {
    "category": "Actes dentaires - si cabinet dentaire intégré",
    "label": "Curetage et obturation cavité 3 faces et plus",
    "ngap_code": "D15"
  },
  {
    "category": "Actes dentaires - si cabinet dentaire intégré",
    "label": "Pulpotomie / pulpectomie coronaire",
    "ngap_code": "D7"
  },
  {
    "category": "Actes dentaires - si cabinet dentaire intégré",
    "label": "Traitement endodontique inciso-canin",
    "ngap_code": "D10"
  },
  {
    "category": "Actes dentaires - si cabinet dentaire intégré",
    "label": "Traitement endodontique prémolaire",
    "ngap_code": "D15"
  },
  {
    "category": "Actes dentaires - si cabinet dentaire intégré",
    "label": "Traitement endodontique molaire",
    "ngap_code": "D25"
  },
  {
    "category": "Actes dentaires - si cabinet dentaire intégré",
    "label": "Détartrage complet",
    "ngap_code": "D12"
  },
  {
    "category": "Actes dentaires - si cabinet dentaire intégré",
    "label": "Ligature métallique parodontale",
    "ngap_code": "D8"
  },
  {
    "category": "Actes divers / certificats techniques",
    "label": "Certificat médical simple (sport, aptitude...)",
    "ngap_code": "K5"
  },
  {
    "category": "Actes divers / certificats techniques",
    "label": "Certificat médical détaillé / expertise",
    "ngap_code": "K10"
  },
  {
    "category": "Actes divers / certificats techniques",
    "label": "Ordonnance de transport / accident de travail",
    "ngap_code": "K5"
  },
  {
    "category": "Actes divers / certificats techniques",
    "label": "Frais de dossier / dossier médical (non coté NGAP)",
    "ngap_code": null
  }
];
