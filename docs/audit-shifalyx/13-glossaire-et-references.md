# 13. Glossaire et références

## 13.1 Glossaire

| Terme | Sens dans ce rapport |
|---|---|
| Cabinet / tenant | Frontière logique de données et d’autorisations d’une organisation de soins |
| Edge Function | Code serveur déployable sur l’infrastructure Supabase, ici écrit pour Deno |
| Entitlement | Droit fonctionnel accordé à un cabinet selon plan ou règle commerciale |
| KDF | Fonction de dérivation de clé adaptée au stockage de secrets mot de passe/PIN |
| PostgREST | API REST générée par Postgres et consommée via Supabase JS |
| PWA | Application web installable, avec manifeste et service worker si l’hébergement le permet |
| RLS | Row-Level Security, politiques SQL appliquées ligne par ligne |
| RPC | Fonction Postgres appelée comme opération API |
| Service worker | Script navigateur intermédiaire pour cache et mise à jour d’une PWA |
| Staging | Environnement isolé de validation, sans données patient de production |
| DCI | Dénomination commune internationale d’un médicament |
| CIM-11 | Classification internationale des maladies, version 11 (OMS) |

## 13.2 Références internes principales

| Sujet | Fichiers |
|---|---|
| Routes et fournisseurs | [App.tsx](../../src/App.tsx), [main.tsx](../../src/main.tsx) |
| Authentification / client | [AuthContext.tsx](../../src/contexts/AuthContext.tsx), [ProtectedRoute.tsx](../../src/components/auth/ProtectedRoute.tsx), [client.ts](../../src/integrations/supabase/client.ts) |
| Modules métier | [pages/](../../src/pages), [hooks/](../../src/hooks) |
| Impression | [PrescriptionPreview.tsx](../../src/components/PrescriptionPreview.tsx), [Parametres.tsx](../../src/pages/Parametres.tsx) |
| Tokens UI | [index.css](../../src/index.css), [tailwind.config.ts](../../tailwind.config.ts), [components.json](../../components.json) |
| PWA / build | [vite.config.ts](../../vite.config.ts), [PwaStatus.tsx](../../src/components/PwaStatus.tsx), [package.json](../../package.json) |
| SQL et fonctions | [migrations/](../../supabase/migrations), [functions/](../../supabase/functions), [config.toml](../../supabase/config.toml), [schema racine](../../supabase-schema.sql) |
| Tests | [tests unitaires](../../src/services/AllergyAlertService.test.ts), [tests SQL](../../supabase/tests) |

## 13.3 Sources externes de comparaison de marché

- [DabaDoc Maroc](https://www.dabadoc.com/ma) — page publique consultée pour son titre et son positionnement d’accès aux médecins/rendez-vous en ligne.
- [Med.ma](https://www.med.ma/) — page publique consultée; titre et métadonnées annoncent un annuaire de professionnels de santé et une prise de rendez-vous.

Consultation : 12 octobre 2026. Les sites n’ont pas été parcourus derrière authentification; aucun produit concurrent complet, tarif contractuel, politique de données ou fonctionnalité de back-office ne peut en être déduit.

## 13.4 Limite documentaire

Les notes et recommandations constituent une base de travail technique et produit. Elles ne remplacent pas une revue juridique, un audit indépendant d’intrusion, une certification d’interopérabilité ni une validation clinique des outils d’aide à la prescription.

