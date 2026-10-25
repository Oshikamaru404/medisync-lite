# Audit global de Shifalyx

**Date de l’audit :** 2026-10-12

**Périmètre :** dépôt local ouvert dans VS Code, lecture seule côté application.

**Conclusion courte :** Shifalyx est déjà un ERP de cabinet médical riche en parcours cliniques, de suivi et d’impression, avec des adaptations marocaines visibles. Sa proposition de valeur la plus crédible est le fil de travail du cabinet, pas une simple prise de rendez-vous. La priorité absolue est de faire converger le modèle de sécurité : les migrations locales contiennent une réouverture d’accès anonyme à des tables médicales sensibles, et l’état réellement appliqué à Supabase n’a pas été vérifié.

> Cet audit ne certifie ni l’état d’un projet Supabase distant, ni un déploiement, ni les intégrations tierces. Les statuts sont attribués selon les preuves locales ; « vérifié » signifie uniquement qu’un comportement a passé le test local cité.

## Table des matières

1. [Synthèse et limites](#synthèse-et-limites)
2. [Identité, stack et proposition de valeur](./01-identite-et-stack.md)
3. [Cartographie du dépôt](./02-cartographie-code.md)
4. [Modules, routes et parcours](./03-modules-et-parcours.md)
5. [Frontend, design system et UX](./04-architecture-frontend.md)
6. [Backend, API et intégrations](./05-backend-et-api.md)
7. [Base de données et migrations](./06-base-de-donnees.md)
8. [Sécurité et données médicales](./07-securite-et-donnees-medicales.md)
9. [PWA, build et déploiement](./08-pwa-et-deploiement.md)
10. [Abonnements, Premium et croissance](./09-abonnements-premium-marketing.md)
11. [Tests, qualité et dette technique](./10-tests-et-dette-technique.md)
12. [Préparation à Electron](./11-compatibilite-electron.md)
13. [Impression et documents](./14-impression-et-documents.md)
14. [Glossaire et références](./13-glossaire-et-references.md)
15. [Plan priorisé et matrices de synthèse](./12-plan-d-action.md)

## Synthèse et limites

| Domaine | Conclusion | Certitude |
|---|---|---|
| Produit | Application web React pour la coordination d’un cabinet : patients, agenda, file active, consultations, documents et facturation. | Élevée, routes et code observés |
| Parcours métier | Le fil accueil → file → consultation → ordonnance/suivi → encaissement est représenté par des modules et des mutations distincts. | Élevée pour le code ; fonctionnement multi-écran non testé en navigateur |
| Adaptation Maroc | Référentiels de tarifs, spécialités et nomenclatures marocains, devise en dirhams et langue française sont présents. | Élevée dans le code ; adéquation réglementaire non certifiée |
| Authentification | PIN et sessions applicatives personnalisées, en plus de la persistance Auth du client Supabase. | Élevée pour le client ; état déployé et protections SQL effectives non vérifiés |
| Sécurité SQL | Des migrations locales rétablissent des droits/politiques `public` non restreints sur des tables cliniques après une migration de durcissement. | Confirmé dans les fichiers ; gravité effective conditionnée à leur application distante |
| Données | 43 migrations horodatées et un SQL de schéma initial séparé ; ces sources ne forment pas un état distant certifié. | Élevée localement |
| Documents/IA | Pièces privées, liens temporaires, OCR via Groq, recherche CIM-11 via l’OMS ; certaines fonctions PDF appellent PDFLayer. | Code identifié ; appels fournisseurs et contrats non testés |
| PWA | Manifest, icônes, Workbox et interface d’actualisation configurés. Hors ligne, les données médicales ne sont pas disponibles. | Configuration et code identifiés ; hébergement/installation réelle non testés |
| Monétisation | Pas d’offre SaaS, abonnement ou paiement récurrent identifié. La comptabilité est celle du cabinet. | Recherche locale ; absence de preuve dans le dépôt |
| Tests | 7 fichiers de tests locaux recensés ; 28 tests ont passé avec `node --test`, sans production ni service externe. | Vérifié pour ces tests uniquement |
| UI | Système de couleurs et composants partagés visibles ; rendus responsives et accessibilité complète à valider visuellement et au clavier. | Analyse statique, non audit visuel complet |

### Mode de lecture

- **Fait observé** : directement présent dans le code, les configurations ou les migrations locales.
- **Déduction** : conséquence probable des éléments observés, à confirmer par un essai non destructif ou en environnement de test.
- **Recommandation** : action proposée, non réalisée.
- Les références pointent vers le dépôt local. Les lignes sont des repères dans les fichiers de cette version et peuvent évoluer.
- Aucun secret ni aucune donnée de patient n’est reproduit dans ces documents.

### Couverture

| Domaine | Couverture | Ce qui reste non vérifié |
|---|---|---|
| Arborescence, routes, modules, hooks et UI | Analysé statiquement | Parcours complet connecté et test utilisateur |
| Authentification client | Analysée | Durée réelle, révocation, comportements en concurrence |
| Backend Edge Functions et SQL local | Analysé par inspection ciblée | Déploiement, configuration et politiques réellement actifs |
| Tables et relations | Cartographiées à partir du SQL local | Comparaison aux catalogues d’une base distante |
| PWA/build/CI | Configurations et scripts inspectés | Installation et caches sur navigateurs réels, hébergeur |
| Tests | 28 tests locaux exécutés, tous passés | E2E, RLS clinique, Edge Functions, impression navigateur |
| UX/UI | Code et design tokens inspectés | Audit ergonomique en cabinet, mesures d’accessibilité automatisées |
| Marché marocain | Positionnement comparatif prudent à partir des promesses publiques consultées | Entretiens terrain, démos concurrentes, prix et conformité légale |
| Exploitation et conformité | Non certifiées | Sauvegardes, résidence, contrats, PRA, conformité réglementaire |

## Verdict produit

La différenciation la plus défendable à construire est **« le poste de pilotage du cabinet, de l’arrivée du patient à la suite de soins »** : la file opérationnelle, la documentation clinique, le suivi à organiser, les prescriptions médicales structurées et l’encaissement sont déjà des briques présentes. Les places de marché consultées mettent surtout en avant la découverte et la prise de rendez-vous ; elles ne constituent donc pas une comparaison fonctionnelle complète avec un logiciel de gestion interne.

Le potentiel ne devient un avantage produit que si les fondamentaux sont prouvés : cloisonnement des cabinets, historique fiable, sauvegardes, continuité en cas de réseau instable, documents correctement imprimés et expérience d’équipe cohérente. Le risque de sécurité issu des migrations constitue aujourd’hui un frein majeur à toute promesse commerciale.
