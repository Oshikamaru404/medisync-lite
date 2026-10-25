# 12. Plan d’action et matrices de synthèse

## 12.1 Priorités et critères de sortie

| Priorité | Action | Preuve attendue / critère d’acceptation | Effort |
|---|---|---|---|
| **P0** | Vérifier l’état des politiques et migrations Supabase dans un staging isolé | Inventaire migrations appliquées + tests anonymes, rôles et tenant; aucun accès hors périmètre | M/L |
| **P0** | Fermer les surfaces publiques de tables cliniques et les endpoints PDF si non intentionnels | Chaque action sensible exige session active et contrôle d’ownership côté serveur; pgTAP/API tests négatifs passés | M |
| **P0** | Prouver l’isolation par cabinet et réduire les RPC `SECURITY DEFINER`/`anon` | Tests d’accès croisé passent négativement; aucune table/fonction/storage/realtime exposée hors modèle | L |
| **P1** | Établir le schéma canonique et un déploiement de migrations reproductible | Réinitialisation staging depuis le dépôt, migrations idempotentes/ordonnées et snapshots comparables | M/L |
| **P1** | Transactionnaliser file/ordonnance/finalisation et encaissement | Tests de concurrence/échec injecté prouvent absence de doublons et d’objets partiels | M |
| **P1** | Établir rétention, sauvegarde et restauration | Restauration de test datée avec RPO/RTO mesurés et accès contrôlé | M |
| **P1** | Documenter sessions, révocation, PIN et rotation de secrets | Tests de durée, lockout, logout, changement utilisateur; KDF adapté à un secret court | M |
| **P1** | Valider la sous-traitance Groq/PDFLayer et minimiser les envois | Inventaire payload/région/rétention/contrats/consentement validés avant données réelles | M |
| **P1** | Couvrir parcours principal par E2E non sensibles | Agenda → file → consultation → document → suivi → encaissement; tests de rôle et erreur | M |
| **P2** | Mesurer valeur et différenciation auprès de cabinets marocains | 5–10 entretiens et pilote; indicateurs de temps, suivi et erreurs avant/après | M |
| **P2** | Unifier branding, onboarding et feedback UI | Nom, promesse, design system et explication des états cohérents; audit accessibilité | M |
| **P2** | Définir offre SaaS et paiements locaux | Modèle plan/entitlements, validation juridique/fiscale et prestataire compatible Maroc | L |
| **P2** | Ajouter analytics produit respectueux de la vie privée | Événements agrégés, aucun payload patient; consentement et revue privacy | M |
| **P3** | Étudier intégration d’annuaire ou Electron | Besoin documenté, étude partenaire et critères de décision de la section 11 satisfaits | M/L |

**P0** représente sécurité/exposition potentielle ou blocage critique; une gravité P0 locale n’affirme pas une exploitation en production sans vérification.

## 12.2 A. Fonctionnalités existantes

| Fonctionnalité | Statut | Preuves | Limites |
|---|---|---|---|
| Auth PIN / rôles | Implémenté | `AuthContext`, fonction `auth-pin`, guards React | Durcissement serveur, état déployé et récupération à confirmer |
| Agenda / présence | Implémenté | Page Agenda, hooks, RPC présence/check-in | Synchronisation distante non vérifiée |
| File d’attente | Implémenté | Page FileAttente, `useQueue` | Numéro d’ordre concurrence à sécuriser |
| Dossier patient / histoire | Implémenté | PatientDetail, hooks dossier/historique | RLS et portée tenant inconnus |
| Consultation et tarifs | Implémenté | Page Consultation, RPC clôture/pricing | Pas d’E2E du workflow |
| Ordonnances médication/biologie/imagerie | Implémenté | Hooks, modèles, items structurés | Atomicité globale à améliorer |
| Alertes d’allergie | Implémenté et vérifié par tests locaux | Service et jeux de tests | Pas de validation clinique externe |
| Suivis / RDV de contrôle | Implémenté | Tables/tasks et RPC schedule | Ne prouve pas que le patient a reçu/accepté la consigne |
| Pièces patient | Implémenté dans le code | Storage privé, upload signé, fonction documents | Bucket/ACL distants non testés |
| OCR | Implémenté côté intégration | `ocr-extract`, Groq, consentement/revue UI | Fournisseur, privacy, qualité clinique non certifiés |
| Recherche CIM-11 | Implémenté côté intégration | Edge `icd11-search`, appel OMS | Disponibilité/quota non vérifiés |
| Partage ordonnance | Implémenté dans le code | Edge, tables/RPC dédiées, test SQL ciblé | Flux déployé non testé |
| Impression / PDF | Implémenté | `window.print`, html2canvas/jsPDF | Navigateur/driver et rendu réel non testés dans cet audit |
| Comptabilité de cabinet | Implémenté | Factures, paiements, encaissement | Pas un système de facturation SaaS |
| PWA | Configurée et code client présent | Vite PWA, manifest, Workbox, hook mise à jour | Production/installation/hébergement inconnus |

## 12.3 B. Fonctionnalités partielles ou simulées

| Fonctionnalité | Éléments partiels / manquants | Dépendances / effort |
|---|---|---|
| Authentification robuste | PIN court et stockage local; source d’identité unique et durcissement à établir | Modèle d’identité, KDF, rate-limit; M |
| Séparation multi-cabinet | Aucun modèle global certifié par l’audit; policies ouvertes locales | Tenant explicite, RLS, RPC, Storage, Realtime; L |
| Mode hors ligne | Shell statique précaché, pas de dossiers/enregistrements offline | Sync, chiffrement, conflits, rétention; L |
| Consentement et responsabilité IA | UI de consentement/revue présente, gouvernance fournisseur/clinical non vérifiée | Legal/privacy, contrat, UX, évaluations; M |
| Marketing et onboarding | Métadonnées PWA/SEO, mais pas d’entonnoir produit repéré | Site public, sandbox, analytics privacy; M |
| Déploiement | Scripts build/dev, sans pipeline/cible locale confirmée | Environnements et CI/CD; M |
| Impression personnalisable | Formats et choix natif du navigateur, contrôle pilote non natif | Tests imprimeurs réels; S/M |

## 12.4 C. Fonctionnalités absentes du dépôt inspecté

| Besoin | Valeur métier | Priorité indicative | Prérequis |
|---|---|---|---|
| Souscription SaaS et droits Premium | Commercialiser par cabinet sans republier pour chaque plan | P2 | P0 sécurité + entitlements serveur |
| Paiement récurrent / gestion d’échec | Automatiser renouvellement et recouvrement | P2 | Validation prestataire/fiscalité Maroc |
| Inscription/onboarding self-service établi | Diminuer coût de déploiement et activer un nouveau cabinet | P2 | Tenant isolation, sandbox |
| E-mails/SMS transactionnels | Confirmer ou rappeler un RDV | P2 | Consentement, fournisseur local et templates, éviter donnée santé |
| Portail patient/téléconsultation | Réduire friction et échanges | P3 | Modèle de consentement, identité et régulation |
| Interopérabilité nationale/assurance certifiée | Simplifier dossiers/prises en charge | P3 | Normes, partenariats et autorisation |
| Offline clinique fiable | Continuer dans des zones à réseau instable | P3 | Architecture de sync/chiffrement et tests de conflit |
| Analytics de produit respectueux | Mesurer activation et fidélité | P2 | Minimisation et privacy by design |

« Absent » signifie non identifié dans le dépôt inspecté, pas nécessairement absent d’un service externe non accessible.

## 12.5 D. Plan d’action résumé

| Ordre | Problème | Solution proposée | Dépendances | Effort | Risque si différé | Réussite |
|---|---|---|---|---|---|---|
| 1 | Policies SQL potentiellement ouvertes | Revue staging + correction des grants/RLS | Accès contrôlé au projet + owner DB | M/L | Exposition de données de santé | tests anon/IDOR/RLS passés |
| 2 | Endpoints PDF sans garde visible | Session métier + ownership, tests négatifs | Refactor fonctions | M | Rendition de données fournies par un tiers | requêtes non autorisées rejetées |
| 3 | Base locale sans source canonique | État schéma/migrations reproductible | Choix convention migrations | M/L | Dérive et panne déploiement | bootstrap staging déterministe |
| 4 | Mutations composées et file concurrente | RPC atomiques + contraintes | Modèle SQL confirmé | M | Doublon ou dossier partiel | tests concurrence + panne |
| 5 | Pilotage de fiabilité absent | E2E, logs redacted, backup/restore | Environnement synthétique | M | Erreur difficile à détecter/récupérer | rapport exercice restauration |
| 6 | Valeur commerciale non démontrée | Pilote marocain et mesures UX | Stabilisation P0/P1 | M | Positionnement générique | indicateurs convenus et retour utilisateur |
| 7 | SaaS commercial non présent | Plans/entitlements/facturation locale | Validation marché, fiscale, sécurité | L | Revenus manuels et limites d’offre | test sandbox complet |
| 8 | Electron incertain | Ne pas investir sans cas d’usage prouvé | Résultats pilote P2 | M/L | Surcoût desktop prématuré | critères section 11 remplis |

