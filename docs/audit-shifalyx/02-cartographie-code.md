# 2. Cartographie du dépôt

## 2.1 Entrée et organisation

| Zone | Responsabilité observée | Repères |
|---|---|---|
| `src/` | Application React : routes, écrans, composants, contextes, hooks, données, bibliothèques locales et tests | [src/App.tsx](../../src/App.tsx) |
| `src/pages/` | Écrans de route (dashboard, agenda, file, suivis, consultation, patient, comptabilité, paramètres, modèles) | Liste de routes dans [App.tsx](../../src/App.tsx#L61) |
| `src/components/` | Shell de navigation, composants transverses et présentation, dont l’ordonnance | [AppNavigationShell.tsx](../../src/components/AppNavigationShell.tsx), [PrescriptionPreview.tsx](../../src/components/PrescriptionPreview.tsx) |
| `src/components/ui/` | Primitives réutilisables basées sur Radix/shadcn | `components.json`, Tailwind |
| `src/hooks/` | Hooks React Query organisant lecture et mutation Supabase | `usePatients.ts`, `useAppointments.ts`, `useQueue.ts`, etc. |
| `src/contexts/` | Authentification, rappels et état transversal | [AuthContext.tsx](../../src/contexts/AuthContext.tsx), [AppointmentReminderContext.tsx](../../src/contexts/AppointmentReminderContext.tsx) |
| `src/integrations/supabase/` | Client Supabase et types de base générés | [client.ts](../../src/integrations/supabase/client.ts) |
| `src/services/` | Logique métier partageable ; service d’alertes allergiques et tests | [AllergyAlertService.ts](../../src/services/AllergyAlertService.ts) |
| `src/lib/`, `src/data/` | Règles de dates, sécurité de session, tarifs marocains, catalogues et données statiques | `src/lib/`, `src/data/` |
| `src/assets/`, `public/` | Ressources d’interface et icônes PWA | [public/](../../public) |
| `supabase/migrations/` | Historique SQL local, politiques, fonctions, évolution du schéma | 43 fichiers horodatés recensés |
| `supabase/functions/` | Edge Functions Deno : auth, documents, OCR, partage, PDF, CIM-11 | `supabase/functions/` |
| `supabase/tests/` | Tests SQL pgTAP repérés | `prescription_secure_shares_rls.test.sql` |
| `scripts/` | Scripts de projet, dont import du dictionnaire CIM-11 | `scripts/import-icd11.mjs` |
| Racine | Entrée HTML, Vite, TypeScript, Tailwind, ESLint, lockfiles, README et anciens documents | [index.html](../../index.html), [vite.config.ts](../../vite.config.ts), [package.json](../../package.json) |

Le dépôt contient plusieurs lockfiles pour différentes couches (`package-lock.json`, lockfiles Bun et Deno). Les raisons et conventions d’usage ne sont pas explicitées dans les scripts.

## 2.2 Fichiers structurants

| Fichier | Pourquoi il est central |
|---|---|
| [src/main.tsx](../../src/main.tsx) | Monte le composant racine et charge la feuille de style globale |
| [src/App.tsx](../../src/App.tsx) | Crée le `QueryClient`, les fournisseurs, le routeur et les routes protégées |
| [src/contexts/AuthContext.tsx](../../src/contexts/AuthContext.tsx) | Session applicative PIN, rôles, verrouillage et vérification de session |
| [src/components/auth/ProtectedRoute.tsx](../../src/components/auth/ProtectedRoute.tsx) | Contrôle d’accès visuel aux routes selon session/rôle |
| [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts) | Configure le client Supabase navigateur à partir de variables `VITE_` |
| `src/hooks/use*.ts` | Accès aux tables, fonctions RPC et invalidations du cache |
| `supabase/config.toml` | Paramètres locaux des Edge Functions |
| `supabase/migrations/` | Décrit l’évolution du schéma et des fonctions, sans prouver application distante |
| [vite.config.ts](../../vite.config.ts) | Build/dev server et manifeste/service worker PWA |
| [src/index.css](../../src/index.css) et [tailwind.config.ts](../../tailwind.config.ts) | Variables et tokens du design system |

## 2.3 Commandes déclarées

Les scripts déclarés dans [package.json](../../package.json#L6) sont `dev`, `build`, `build:dev`, `lint`, `test:allergy`, `import:icd11` et `preview`. Aucun script de déploiement n’a été identifié. Le script d’import CIM-11 appelle potentiellement des ressources externes : il n’a pas été exécuté dans cet audit.

## 2.4 Sources et cohérence documentaire

- Le README racine contient une présentation et des instructions d’installation, mais plusieurs textes utilisent le nom historique « MediCare ERP » : à remettre en cohérence avec Shifalyx avant de s’en servir comme documentation produit.
- [supabase-schema.sql](../../supabase-schema.sql) est un snapshot SQL racine distinct des migrations. Il ne doit pas être traité comme le schéma effectif actuel.
- [supabase/manual_apply_follow_up_migrations.sql](../../supabase/manual_apply_follow_up_migrations.sql) est un script manuel qui vérifie la présence de versions avant application. Il constitue une procédure à risque si son usage n’est pas coordonné avec l’historique local.
- Aucune copie de valeur de fichier d’environnement n’est reproduite dans cet audit. Les noms de variables nécessaires au client sont cités sans leurs valeurs.

## 2.5 Couverture du code

**Analysé :** routes et contrôles frontend, principaux hooks métier, design tokens, manifest/PWA, scripts et déclarations de dépendances, tests repérés, migrations et fonctions ciblées.

**Partiellement analysé :** toutes les branches des pages très volumineuses, tous les formulaires, chaque migration une par une, toutes les validations et l’intégralité des composants secondaires.

**Non analysé :** historique Git complet, données opérationnelles, comportement navigateur authentifié, configuration privée de l’hébergeur, état Supabase distant, comptes et secrets.
