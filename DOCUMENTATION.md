# 📋 MediCare ERP - Documentation Complète

## 🏥 À Propos

**MediCare ERP** est un système de gestion médicale moderne, complet et professionnel conçu pour les cabinets médicaux. Cette application offre une solution tout-en-un pour la gestion des patients, des rendez-vous, des ordonnances, de la comptabilité et bien plus encore.

### Technologies Utilisées
- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Edge Functions, Storage)
- **State Management**: TanStack React Query
- **Routing**: React Router DOM v6
- **Date Handling**: date-fns

---

## 🏠 Dashboard Principal

### Accès
URL: `/`

### Description
Le tableau de bord principal est la page d'accueil de l'application. Il offre une vue d'ensemble rapide de l'activité du cabinet.

### Éléments Affichés

#### Header
- **Logo MediCare ERP** (à gauche)
- **Nom du cabinet** (centre) - Configurable dans les paramètres
- **Date et heure en temps réel** - Format: "Jeudi 19 décembre 2024 • 14:30:25"
- **Indicateur de mode** - Badge "Offline" indiquant le mode hors-ligne

#### Tuiles de Navigation (6 modules)

| Module | Description | Couleur | Icône |
|--------|-------------|---------|-------|
| **Agenda** | Gérer les rendez-vous | Bleu | 📅 Calendar |
| **File d'attente** | Gestion des consultations | Jaune/Or | 📋 ListOrdered |
| **Patients** | Dossiers, documents & historique | Vert | 👥 Users |
| **Comptabilité** | Gestion financière | Orange | 🧮 Calculator |
| **Statistiques** | Tableaux de bord | Violet | 📊 BarChart3 |
| **Paramètres** | Configuration système | Gris | ⚙️ Settings |

#### Section Informations Rapides
Trois cartes affichant:
- Nombre de rendez-vous aujourd'hui
- Nombre de patients actifs
- Nombre de RDV cette semaine

---

## 👥 Module Patients

### Accès
URL: `/patients`

### Fonctionnalités

#### Liste des Patients
- **Recherche avancée** par:
  - Nom
  - Prénom
  - Email
  - Téléphone
  - CIN (Carte d'Identité Nationale)
  
- **Affichage en grille** responsive (1-3 colonnes selon l'écran)

#### Carte Patient
Chaque carte affiche:
- Avatar avec initiales
- Nom complet
- Badge de sexe (♂ bleu / ♀ rose / ⚧ neutre)
- Badge d'âge calculé automatiquement
- Téléphone
- Email
- Mutuelle

#### Création d'un Nouveau Patient

**Champs disponibles:**

| Champ | Type | Obligatoire |
|-------|------|-------------|
| Prénom | Texte | ✅ Oui |
| Nom | Texte | ✅ Oui |
| CIN/ID | Texte | Non |
| Date de naissance | Date | Non |
| Téléphone | Téléphone | Non |
| Email | Email | Non |
| Adresse | Texte | Non |
| Mutuelle | Texte | Non |
| Personne à contacter | Texte | Non |

---

## 📁 Dossier Patient Détaillé

### Accès
URL: `/patients/:id`

### Structure en Onglets

#### 1. Onglet "Dossier Médical" 🩺

**Layout à 2 colonnes:**

**Colonne gauche - Identité compacte:**
- Photo/Avatar
- Nom complet
- Âge et sexe
- Coordonnées (téléphone, email)
- Adresse
- Informations d'assurance (mutuelle, numéro)
- Personne de contact d'urgence
- Mensurations (poids, taille, IMC calculé)
- Bouton "Modifier"

**Colonne droite - Sections médicales (Accordion):**

| Section | Description | Icône |
|---------|-------------|-------|
| **Antécédents** | Historique médical personnel et familial | 📋 |
| **Allergies** | Liste des allergies connues | ⚠️ |
| **Traitements en cours** | Médicaments actuels | 💊 |
| **Notes** | Observations diverses | 📝 |

Chaque section permet:
- Affichage du contenu
- Mode édition inline
- Sauvegarde automatique

#### 2. Onglet "Ordonnances" 💊

**Liste des ordonnances:**
- Date de création
- Nombre de médicaments
- Notes
- Actions: Voir, Télécharger PDF, Supprimer

**Création d'une nouvelle ordonnance:**

**Recherche de médicaments:**
- Base de données de médicaments intégrée
- Recherche par nom commercial ou DCI
- Ajout de médicaments personnalisés

**Pour chaque médicament:**
| Champ | Options |
|-------|---------|
| **Posologie** | 1 comprimé matin, 1 matin et soir, 3x/jour, etc. |
| **Durée** | 3, 5, 7, 10, 14, 21 jours, 1-6 mois, continu |
| **Instructions** | Texte libre (ex: "À prendre pendant les repas") |

**Format de l'ordonnance PDF:**
- En-tête bilingue (Français/Arabe)
- Logo personnalisable du cabinet
- Informations du médecin (Dr + Nom)
- Spécialité en version longue
- N° d'ordre du Conseil
- Coordonnées du cabinet
- Informations patient
- Liste des médicaments avec posologie
- Signature et cachet

#### 3. Onglet "Documents" 📄

**Types de documents supportés:**
| Type | Couleur | Icône |
|------|---------|-------|
| Ordonnance | Bleu | 💊 Pill |
| Analyse | Vert | 🧪 TestTube |
| Radiologie | Violet | 📡 Scan |
| Compte rendu | Orange | 📋 ClipboardList |
| Certificat | Jaune | 🏆 Award |
| Courrier | Cyan | ✉️ Mail |
| Autre | Gris | ⋯ MoreHorizontal |

**Fonctionnalités:**
- Upload de documents (images, PDF)
- OCR automatique (extraction de texte)
- Filtrage par type
- Recherche par nom
- Prévisualisation
- Suppression

**Stockage:**
- Bucket Supabase Storage: `patient-documents`
- Accès public pour les URLs

#### 4. Onglet "Historique" 📜

Affiche la chronologie complète du patient:
- Toutes les consultations passées
- Rendez-vous
- Documents ajoutés
- Ordonnances créées

---

## 📅 Module Agenda

### Accès
URL: `/agenda`

### Vues Disponibles

#### Vue Semaine (par défaut)
- Grille 7 jours × 12 heures (8h-20h)
- Navigation par semaine
- Indicateur visuel du jour actuel
- Clic sur un créneau = Création de RDV
- Clic sur un RDV existant = Modification

#### Vue Jour
- Liste détaillée des RDV du jour
- Timeline horaire
- Numéro de téléphone cliquable (appel direct)
- Actions rapides par RDV

### Statuts des Rendez-vous

| Statut | Couleur | Description |
|--------|---------|-------------|
| **Confirmé** | 🟢 Vert | RDV confirmé par le patient |
| **En attente** | 🟡 Jaune | En attente de confirmation |
| **Annulé** | 🔴 Rouge | RDV annulé |
| **Terminé** | 🔵 Bleu | Consultation effectuée |

### Création/Modification de RDV

**Champs du formulaire:**
| Champ | Type | Description |
|-------|------|-------------|
| Patient | Sélection | Recherche parmi les patients existants |
| Date | Date picker | Date du rendez-vous |
| Heure début | Heure | Heure de début |
| Heure fin | Heure | Heure de fin |
| Type | Sélection | Consultation, Suivi, Urgence, etc. |
| Statut | Sélection | État du rendez-vous |
| Notes | Texte | Informations complémentaires |

### Automatisations
- **RDV confirmé le jour même** → Ajout automatique à la file d'attente
- Trigger base de données: `add_confirmed_appointment_to_queue`

---

## 🚶 Module File d'Attente

### Accès
URL: `/file-attente`

### Tableau de Bord

**Statistiques en temps réel:**
- 🟡 En attente (nombre)
- 🔵 En consultation (nombre)
- 🟢 Terminés (nombre)

### États de la File

```
┌─────────────┐    ┌──────────────────┐    ┌───────────┐
│  En attente │ →  │  En consultation │ →  │  Terminé  │
│   (waiting) │    │ (in_consultation)│    │(completed)│
└─────────────┘    └──────────────────┘    └───────────┘
       │                                         
       ↓                                         
┌─────────────┐                                  
│   Annulé    │                                  
│ (cancelled) │                                  
└─────────────┘                                  
```

### Ajout d'un Patient à la File

**Formulaire:**
| Champ | Description |
|-------|-------------|
| Patient | Recherche et sélection |
| Motif | Raison de la consultation (optionnel) |
| Montant | Prix de la consultation en DA |

### Actions par État

| État | Actions Disponibles |
|------|---------------------|
| **En attente** | Appeler, Annuler |
| **En consultation** | Terminer, Marquer payé |
| **Terminé** | Marquer payé (si non payé) |

### Automatisations

**Lors du passage en consultation:**
1. Création automatique d'une facture
2. Numéro de facture généré (FAC-YYYY-XXXX)
3. Enregistrement de l'heure d'appel

**Trigger:** `handle_queue_consultation`

---

## 💰 Module Comptabilité

### Accès
URL: `/comptabilite`

### Tableau de Bord Financier

**Indicateurs clés:**
| Métrique | Description |
|----------|-------------|
| **Ce mois** | Total des revenus du mois en cours |
| **Cette année** | Total des revenus annuels |
| **En attente** | Montant des factures non payées |
| **Factures** | Nombre total de factures |

### Onglets

#### 1. Factures
Table complète avec:
- N° Facture (format: FAC-YYYY-XXXX)
- Patient (nom complet)
- Date
- Montant
- Statut (Payée/En attente)
- Actions (Détails)

#### 2. Paiements
Module de gestion des paiements (à développer)

#### 3. Rapports
Rapports et exports comptables (à développer)

### Génération de Factures
- **Automatique**: Lors du passage en consultation depuis la file d'attente
- **Manuelle**: Bouton "Nouvelle facture"

### Statuts des Factures
| Statut | Badge |
|--------|-------|
| **paid** | 🟢 "Payée" |
| **pending** | 🟡 "En attente" |

---

## 📊 Module Statistiques

### Accès
URL: `/statistiques`

### Métriques Principales

| Métrique | Calcul |
|----------|--------|
| **Total Patients** | Nombre de patients enregistrés |
| **RDV ce mois** | Rendez-vous du mois en cours |
| **Revenu mensuel** | Somme des factures du mois |
| **Moyenne/jour** | RDV mensuels / 30 |

### Onglets d'Analyse

1. **Vue d'ensemble** - Graphiques généraux
2. **Patients** - Statistiques démographiques
3. **Revenus** - Évolution financière
4. **Rendez-vous** - Analyse des consultations

*Note: Les graphiques sont prévus pour une version future*

---

## ⚙️ Module Paramètres

### Accès
URL: `/parametres`

### Onglets de Configuration

#### 1. Cabinet & Praticien 🏥

**Informations du praticien:**
| Champ | Description |
|-------|-------------|
| Prénom | Prénom du médecin |
| Nom | Nom de famille |
| Nom en arabe | Pour l'ordonnance bilingue |
| Spécialité | Sélection parmi 20 spécialités |
| N° d'ordre | Numéro du Conseil de l'Ordre |
| Email | Email professionnel |
| Téléphone | Format marocain (+212 6XX XX XX XX) |

**Spécialités disponibles:**
- Médecine Générale
- ORL (Oto-Rhino-Laryngologie)
- Cardiologie
- Dermatologie
- Ophtalmologie
- Pédiatrie
- Gynécologie
- Neurologie
- Orthopédie
- Gastro-entérologie
- Pneumologie
- Urologie
- Psychiatrie
- Rhumatologie
- Endocrinologie
- Néphrologie
- Chirurgie Générale
- Médecine Dentaire
- Radiologie
- Anesthésie-Réanimation

**Logo personnalisé:**
- Upload d'un logo propre au cabinet
- Formats acceptés: Images (JPEG, PNG, etc.)
- Taille max: 2 Mo
- Utilisé dans les ordonnances à la place de l'icône par défaut

**Informations du cabinet:**
| Champ | Description |
|-------|-------------|
| Adresse | Rue et numéro |
| Code postal | Code postal |
| Ville | Ville du cabinet |
| Téléphone cabinet | Numéro fixe du cabinet |
| Horaires | Heure d'ouverture et fermeture |

**Aperçu du nom affiché:**
> "Cabinet [Spécialité] Dr [Nom]"

#### 2. Notifications 🔔
Configuration des alertes et rappels (à développer)

#### 3. Sécurité 🔒
Paramètres de sécurité et mots de passe (à développer)

#### 4. Apparence 🎨
Thème et personnalisation visuelle (à développer)

#### 5. Synchronisation ☁️

**Fonctionnalités:**
- Activer/désactiver la synchronisation
- Historique des synchronisations
- Bouton de synchronisation manuelle

**Statuts de sync:**
| Icône | Statut |
|-------|--------|
| ✅ | Succès |
| ❌ | Erreur |

---

## 💊 Gestion des Ordonnances

### Format de l'Ordonnance

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  [Spécialité FR]      [LOGO]       [Spécialité AR]     │
│     Dr [Nom]                         الدكتور [اسم]     │
│                                                         │
│  ═══════════════════════════════════════════════════   │
│                                                         │
│                     ORDONNANCE                          │
│                                                         │
│  Patient: [Nom Prénom]                                  │
│  Date: [Date du jour]                                   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Rp/                                                    │
│                                                         │
│  1. [Médicament] [Dosage]                              │
│     [Posologie]                                         │
│     Pendant [X] jours                                   │
│     [Instructions spéciales]                            │
│                                                         │
│  2. [Médicament] ...                                   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Notes: [Recommandations]                               │
│                                                         │
│  ═══════════════════════════════════════════════════   │
│                                                         │
│  [Adresse cabinet]                                      │
│  Tél: [Téléphone]                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Génération PDF

**Edge Function:** `generate-prescription-pdf`

**Processus:**
1. Récupération des données de l'ordonnance
2. Récupération des paramètres du cabinet
3. Génération du PDF avec layout bilingue
4. Retour du blob PDF

---

## 🗄️ Base de Données

### Schéma des Tables

#### `patients`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| nom | TEXT | Nom de famille |
| prenom | TEXT | Prénom |
| cin | TEXT | Carte d'identité |
| date_naissance | DATE | Date de naissance |
| sexe | TEXT | M/F/Autre |
| telephone | TEXT | Numéro de téléphone |
| email | TEXT | Adresse email |
| adresse | TEXT | Adresse postale |
| mutuelle | TEXT | Nom de l'assurance |
| numero_mutuelle | TEXT | N° d'assuré |
| personne_contact | TEXT | Contact d'urgence |
| telephone_personne_contact | TEXT | Tél. contact |
| lien_personne_contact | TEXT | Lien familial |
| poids | NUMERIC | Poids en kg |
| taille | NUMERIC | Taille en cm |
| created_at | TIMESTAMP | Date de création |

#### `appointments`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| patient_id | UUID | Référence patient |
| date | DATE | Date du RDV |
| heure_debut | TIME | Heure de début |
| heure_fin | TIME | Heure de fin |
| type | TEXT | Type de consultation |
| statut | TEXT | confirmed/pending/cancelled/completed |
| notes | TEXT | Notes additionnelles |
| created_at | TIMESTAMP | Date de création |

#### `queue`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| patient_id | UUID | Référence patient |
| status | ENUM | waiting/in_consultation/completed/cancelled |
| numero_ordre | INTEGER | Numéro dans la file |
| motif | TEXT | Motif de consultation |
| montant_consultation | NUMERIC | Prix de la consultation |
| invoice_id | UUID | Référence facture |
| called_at | TIMESTAMP | Heure d'appel |
| completed_at | TIMESTAMP | Heure de fin |
| created_at | TIMESTAMP | Date de création |

#### `invoices`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| patient_id | UUID | Référence patient |
| numero | TEXT | N° facture (FAC-YYYY-XXXX) |
| date | DATE | Date de facturation |
| montant | NUMERIC | Montant en DA |
| statut | TEXT | paid/pending |
| created_at | TIMESTAMP | Date de création |

#### `prescriptions`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| patient_id | UUID | Référence patient |
| date | DATE | Date de prescription |
| notes | TEXT | Notes générales |
| created_at | TIMESTAMP | Date de création |

#### `prescription_items`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| prescription_id | UUID | Référence ordonnance |
| medication_id | UUID | Référence médicament |
| nom_medicament | TEXT | Nom affiché |
| dosage | TEXT | Dosage |
| posologie | TEXT | Posologie |
| duree | TEXT | Durée du traitement |
| instructions | TEXT | Instructions spéciales |
| ordre | INTEGER | Ordre d'affichage |

#### `medications`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| nom | TEXT | Nom commercial |
| dci | TEXT | Dénomination Commune |
| forme | TEXT | Comprimé, gélule, etc. |
| dosage_defaut | TEXT | Dosage par défaut |
| unite | TEXT | mg, ml, etc. |
| created_at | TIMESTAMP | Date de création |

#### `medical_records`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| patient_id | UUID | Référence patient |
| antecedents | TEXT | Historique médical |
| allergies | TEXT | Liste des allergies |
| traitements | TEXT | Traitements en cours |
| notes | TEXT | Notes diverses |
| created_at | TIMESTAMP | Date de création |

#### `documents`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| patient_id | UUID | Référence patient |
| type | TEXT | Type de document |
| nom | TEXT | Nom du fichier |
| url | TEXT | URL de stockage |
| created_at | TIMESTAMP | Date de création |

#### `settings`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| key | TEXT | Clé du paramètre |
| value | TEXT | Valeur du paramètre |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Date de modification |

### Fonctions Base de Données

#### `generate_invoice_number()`
Génère un numéro de facture unique au format `FAC-YYYY-XXXX`

#### `handle_queue_consultation()`
Trigger qui:
- Crée une facture lors du passage en consultation
- Met à jour les timestamps `called_at` et `completed_at`

#### `add_confirmed_appointment_to_queue()`
Trigger qui ajoute automatiquement un RDV confirmé du jour à la file d'attente

---

## 🔐 Sécurité

### Row Level Security (RLS)
Toutes les tables ont RLS activé avec des politiques permissives pour le développement.

### Stockage
- Bucket `patient-documents`: Public
- Sous-dossiers: `logos/`, documents patients

### Edge Functions
- `generate-prescription-pdf`: Génération PDF côté serveur
- `ocr-extract`: Extraction de texte par OCR

---

## 🎨 Design System

### Couleurs des Modules

| Module | Variable CSS | Hex approximatif |
|--------|--------------|------------------|
| Agenda | `--tile-agenda` | #3B82F6 (bleu) |
| File d'attente | `--tile-queue` | #EAB308 (jaune) |
| Patients | `--tile-patients` | #22C55E (vert) |
| Comptabilité | `--tile-comptabilite` | #F97316 (orange) |
| Statistiques | `--tile-statistiques` | #8B5CF6 (violet) |
| Paramètres | `--tile-settings` | #6B7280 (gris) |

### Composants UI (shadcn/ui)
- Button, Card, Dialog, Input, Label
- Select, Tabs, Table, Badge
- Accordion, Avatar, Separator
- Toast (sonner), Tooltip
- Et bien d'autres...

---

## 📱 Responsive Design

L'application est entièrement responsive avec des breakpoints:
- **Mobile**: < 768px (1 colonne)
- **Tablet**: 768px - 1024px (2 colonnes)
- **Desktop**: > 1024px (3 colonnes)

---

## 🔧 Edge Functions

### `generate-prescription-pdf`

**Endpoint:** `/functions/v1/generate-prescription-pdf`

**Méthode:** POST

**Payload:**
```json
{
  "prescriptionId": "uuid-de-lordonnance"
}
```

**Réponse:** PDF blob (application/pdf)

### `ocr-extract`

**Endpoint:** `/functions/v1/ocr-extract`

**Méthode:** POST

**Payload:**
```json
{
  "imageUrl": "url-de-limage"
}
```

**Réponse:** Texte extrait de l'image

---

## 📦 Structure des Fichiers

```
src/
├── assets/
│   └── logo.svg
├── components/
│   ├── ui/                    # Composants shadcn/ui
│   ├── AllergiesSection.tsx
│   ├── AppointmentDialog.tsx
│   ├── DashboardTile.tsx
│   ├── DocumentUploadDialog.tsx
│   ├── MedicalRecordAccordion.tsx
│   ├── MedicalRecordSection.tsx
│   ├── NavLink.tsx
│   ├── NewPatientDialog.tsx
│   ├── PatientCard.tsx
│   ├── PatientHistoryTab.tsx
│   ├── PatientIdentityCompact.tsx
│   ├── PatientIdentityTab.tsx
│   ├── PrescriptionDialog.tsx
│   ├── PrescriptionPreview.tsx
│   ├── PrescriptionsList.tsx
│   └── TreatmentsSection.tsx
├── data/
│   ├── medicalTemplates.ts
│   └── specialties.ts         # 20 spécialités médicales
├── hooks/
│   ├── useAppointments.ts
│   ├── useDocuments.ts
│   ├── useInvoices.ts
│   ├── useMedicalRecords.ts
│   ├── usePatientHistory.ts
│   ├── usePatients.ts
│   ├── usePrescriptions.ts
│   ├── useQueue.ts
│   └── useSettings.ts
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts
├── pages/
│   ├── Agenda.tsx
│   ├── Comptabilite.tsx
│   ├── FileAttente.tsx
│   ├── Index.tsx              # Dashboard
│   ├── NotFound.tsx
│   ├── Parametres.tsx
│   ├── PatientDetail.tsx
│   ├── Patients.tsx
│   └── Statistiques.tsx
├── lib/
│   └── utils.ts
├── App.tsx
├── App.css
├── index.css
└── main.tsx

supabase/
├── config.toml
└── functions/
    ├── generate-prescription-pdf/
    │   └── index.ts
    └── ocr-extract/
        └── index.ts
```

---

## 🚀 Démarrage Rapide

### Installation

```bash
# Cloner le repository
git clone <YOUR_GIT_URL>

# Accéder au répertoire
cd medicare-erp

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

### Configuration Initiale

1. **Paramètres du cabinet** → `/parametres`
   - Renseigner nom du médecin (FR et AR)
   - Sélectionner la spécialité
   - Remplir les coordonnées du cabinet
   - Uploader un logo personnalisé (optionnel)

2. **Ajouter des patients** → `/patients`
   - Bouton "Nouveau patient"
   - Remplir les informations de base

3. **Planifier des RDV** → `/agenda`
   - Cliquer sur un créneau libre
   - Sélectionner le patient
   - Définir le type et la durée

4. **Gérer la file d'attente** → `/file-attente`
   - Ajouter les patients arrivés
   - Appeler pour consultation
   - Terminer et encaisser

---

## 📞 Support

Pour toute question ou assistance:
- Consulter cette documentation
- Vérifier les logs de la console
- Contacter l'équipe de développement

---

## 📄 Licence

Propriétaire - Tous droits réservés

---

*Documentation générée le 19 décembre 2024*
*Version: 1.0.0*
