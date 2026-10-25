# 10. Tests, qualité et dette technique

## 10.1 Tests trouvés et exécutés

Sept fichiers de tests ont été recensés : tests d’allergies, rappels, jours ouvrés, routes des médicaments, tarifs marocains, catalogues de prescription et sécurité de session. Un fichier SQL/pgTAP cible les partages de prescriptions.

**Exécution locale non destructive :** la commande Node `--test` a été lancée sur les sept fichiers TypeScript; résultat **28 réussites, 0 échec**. Aucun projet Supabase, jeu de données réel, appel d’API, import CIM-11 ou environnement de production n’a été utilisé. Cette réussite ne certifie pas le build ni l’application complète.

Le seul script de test déclaré dans `package.json` est `test:allergy`; les autres tests sont exécutables directement avec le runner Node dans l’environnement inspecté, mais ne sont pas exposés par une commande projet unique. Les tests SQL n’ont pas été exécutés.

## 10.2 Carte de couverture

| Type | Présence constatée | Lacunes |
|---|---|---|
| Unitaires | Plusieurs règles métier locales | Beaucoup de hooks/pages sans couverture |
| Base/RLS | Un test SQL de partage sécurisé | Pas de couverture du retour de politiques ouvertes cliniques |
| Edge Functions | Tests non identifiés | Autorisation, validation, tailles, quotas, erreurs |
| Intégration | Non identifiée | Mutations multi-étapes, transactions, Realtime |
| E2E | Non identifiée | Fil accueil → file → consultation → suivi → facturation |
| Accessibilité | Non identifiée | Clavier, focus, lecteurs d’écran, contraste |
| Impression | Pas de test navigateur repéré | A5/A4, sauts, téléchargement, variations d’imprimante |
| Performance | Pas de mesures repérées | Gros volumes patients/historique, Realtime, bundle |
| Compatibilité | Non documentée | Navigateur et systèmes d’impression réels |

## 10.3 Dette et risques techniques

| Constat | Preuve / conséquence | Recommandation |
|---|---|---|
| Migrations et snapshot SQL contradictoires | Policies de base permissives versus migrations ultérieures de verrouillage/réouverture | Source unique de vérité, projection de migration depuis base isolée et test de RLS |
| Hook `useQueue.ts` long et numérotation client | Allocation concurrente et erreurs de lecture ignorées dans l’obtention du prochain numéro | Procédure atomique côté serveur + contrainte unique + test de concurrence |
| Création/modification d’ordonnance multi-appels | Risque d’état partiel quand un appel échoue; cleanup best effort | RPC/transaction atomique, idempotence et test d’échec |
| Consultations volumineuses | Fichier UI long, nombreux états et sections | Découper à terme par étape fonctionnelle sans casser le flux; tests d’intégration en amont |
| Auth custom + Supabase Auth | Deux notions/session stores à maintenir et purger | Décrire source d’identité officielle, durée, révocation, rotation et invalidation cache |
| Feedback hétérogène | Toast Radix/Sonner, traductions et détails d’erreur variables | Composant/contrat de feedback unifié, erreurs techniques redacted |
| Lockfiles multiples | Incertitude sur le gestionnaire de référence | Fixer un gestionnaire par sous-projet et CI reproduisible |
| Documentation de marque historique | README/docs racine mentionnent une ancienne marque | Revoir l’actualité/ownership des docs de racine |
| Pas de pipeline CI établi | Aucun workflow de déploiement trouvé | Ajouter plus tard lint/test/typecheck/build et RLS staging comme garde-fous |
| Données de démonstration dans snapshot initial | Risque de réutilisation accidentelle de données fixtures | Supprimer ces données du chemin de déploiement et imposer fixtures manifestement synthétiques |

## 10.4 Ordre de qualité recommandé

Ne pas multiplier les abstractions avant d’assurer : (1) accès isolés, (2) migrations reproductibles, (3) intégrité atomique des flux, (4) preuve de sauvegarde/restauration, (5) E2E des parcours. Après cela, traiter les fichiers longs et normaliser le design system.

