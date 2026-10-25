# 5. Backend, API et intégrations

## 5.1 Architecture

Le client web utilise `@supabase/supabase-js` et accède selon les fonctionnalités à PostgREST, RPC Postgres, Realtime, Storage et Edge Functions. Les règles sensibles présentes dans les fonctions RPC et Edge Functions complètent des lectures/mutations directes depuis les hooks. Les rôles applicatifs sont une identité métier personnalisée, distincte de l’auth Supabase gérée par le client.

## 5.2 Edge Functions identifiées

Sept fonctions sont configurées dans [config.toml](../../supabase/config.toml). La configuration place `verify_jwt = false` pour ces endpoints; leur sécurité dépend donc de chaque gestionnaire et ne peut être déduite de l’option globale seule.

| Fonction | Rôle et entrées/sorties observés | Contrôle / statut |
|---|---|---|
| `auth-pin` | Auth PIN, vérification session, opérations de compte | Vérifie ses sessions applicatives; code identifié, service distant non testé |
| `patient-documents` | Liste, prépare/valide uploads, suppression, liens signés, lecture/sauvegarde analyse | Valide session médecin dans les actions; bucket privé déclaré dans le code |
| `ocr-extract` | Images préparées en client, résultat d’analyse structurée | Contrôle session, nombre et taille d’images; transmet au fournisseur Groq |
| `prescription-share` | Création/liste/révocation/accès public contrôlé par token et code | Expiration, essais, audit, empreinte et accès depuis partage public visibles |
| `icd11-search` | Requête de recherche terme clinique | Validation de longueur et appel aux API OMS CIM-11 |
| `generate-prescription-pdf` | Données de prescription fournies en entrée, génération de PDF | Pas de contrôle de session visible dans la portion auditée; risque prioritaire |
| `generate-certificate-pdf` | Données certificat/HTML rendues en PDF | Pas de contrôle de session visible dans la portion auditée; envoi de HTML à PDFLayer |

**Preuves :** `supabase/functions/*/index.ts`; notamment [auth-pin](../../supabase/functions/auth-pin/index.ts), [patient-documents](../../supabase/functions/patient-documents/index.ts), [ocr-extract](../../supabase/functions/ocr-extract/index.ts), [prescription-share](../../supabase/functions/prescription-share/index.ts), [icd11-search](../../supabase/functions/icd11-search/index.ts), [generate-prescription-pdf](../../supabase/functions/generate-prescription-pdf/index.ts), [generate-certificate-pdf](../../supabase/functions/generate-certificate-pdf/index.ts).

## 5.3 RPC métier repérées

Les hooks appellent entre autres `complete_consultation`, `save_consultation_pricing`, `record_appointment_attendance`, `update_appointment_with_attendance`, `check_in_appointment_with_attendance`, `set_queue_priority`, `reorder_queue_priority_group`, `schedule_follow_up_appointment`, `save_structured_patient_medications`, `save_invoice_encashment` et fonctions de contexte d’encaissement. Ces RPC centralisent des actions atomiques ou auditables qui seraient autrement découpées côté client. Leurs permissions et définitions exactes sont décrites par les migrations pertinentes, non par le seul appel TypeScript.

## 5.4 Intégrations

| Intégration | Données en jeu | Point d’échec / coût | Vérification |
|---|---|---|---|
| Supabase Postgres | Données patients et de cabinet, contexte métier | Connexion, RLS, latence et quotas du projet | Configurée localement; distante non vérifiée |
| Supabase Storage | Fichiers du dossier patient; upload par URL signée, accès ensuite signé | Échec upload/expiration signature | Code présent; bucket et politiques effectives non vérifiés |
| Groq (OCR/LLM) | Images de pièces médicales | Coût/quota, erreurs modèle, confidentialité/retention | Appel code observé; contrat, région, déploiement non vérifiés |
| OMS ICD-11 | Terme recherché et réponse de recherche/codes | Token externe, disponibilité/quota | Appel code observé; API non exécutée |
| PDFLayer | HTML/document pour produire un PDF de certificat | Service externe et coût éventuel; échec HTTP | Appel code observé; configuration et politique de données non vérifiées |
| Impression du navigateur | Document affiché localement | Dépend du navigateur/OS/pilote | Pas de sélection silencieuse d’imprimante garantie |
| E-mail/SMS | Aucun fournisseur transactionnel repéré | — | Non identifié dans le périmètre |
| Paiement en ligne | Aucun prestataire SaaS repéré | — | Absent des éléments inspectés |
| Analytics / publicité | Aucun outil identifié | — | Aucune configuration identifiée |

Les flux d’OCR et PDF peuvent transmettre des données de santé à un service tiers. Avant usage réel, documenter la minimisation des données, l’hébergement, la durée de conservation, l’accord de traitement, les sous-traitants et la base juridique applicable.

## 5.5 Journalisation et erreurs

Les fonctions et hooks utilisent des logs console et messages toast; aucun système centralisé de journalisation applicative, trace de requête distribuée, rate limit global ou circuit breaker n’a été établi par l’inspection. Les messages ne doivent jamais contenir de données cliniques détaillées, jetons, codes de partage ou payloads complets. La politique effective est à vérifier.

