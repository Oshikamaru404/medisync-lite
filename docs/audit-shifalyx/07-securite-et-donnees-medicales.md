# 7. Sécurité et données médicales

## 7.1 Portée

Il s’agit d’une analyse statique des contrôles présents dans les fichiers locaux. **Aucun pentest, test d’accès inter-cabinets, contrôle de production ou vérification distante n’a été réalisé.** Les risques dépendant de l’application effective des migrations sont explicitement conditionnels. Aucune valeur de secret ni donnée de patient n’est incluse.

## 7.2 Modèle d’accès observé

- `AuthContext` stocke un jeton applicatif sous `medical_erp_session` dans `localStorage`, le vérifie via `auth-pin`, expose l’utilisateur et les rôles, et gère le verrouillage local ([AuthContext.tsx](../../src/contexts/AuthContext.tsx#L32), lignes 89–115, 179–226).
- Le client Supabase persiste aussi son état Auth dans `localStorage` ([client.ts](../../src/integrations/supabase/client.ts#L11)).
- `ProtectedRoute` vérifie l’authentification et le rôle dans le React client ([ProtectedRoute.tsx](../../src/components/auth/ProtectedRoute.tsx)); ce contrôle ne remplace pas RLS ou une autorisation serveur.
- Plusieurs hooks lisent et modifient directement des tables sensibles. Ils ne transmettent pas tous le jeton métier à chaque appel; les RPC et Edge Functions qui vérifient une session sont les contrôles importants.
- Les documents passent par une fonction de session et un bucket dont le nom indique une intention privée; l’état réel des politiques Storage n’est pas certifié.

## 7.3 Registre des risques

Les niveaux décrivent l’impact potentiel et la priorité de vérification, non une preuve d’exploitation en production.

| ID | Gravité / probabilité | Constat et preuve | Statut de preuve | Priorité et mesure |
|---|---|---|---|---|
| S1 | **Critique** / probabilité inconnue | Une migration locale restaure `GRANT` CRUD à `anon` et des policies `TO public` sans prédicat sur `patients`, `consultations`, `queue`, `appointments`, `prescriptions`, `invoices` et `follow_up_tasks` après une migration de durcissement. [Migration d’ouverture](../../supabase/migrations/20261008185502_restore_prototype_open_access.sql#L1) ; [durcissement antérieur](../../supabase/migrations/20261008184807_lock_down_public_clinical_tables.sql#L1). Le snapshot racine contient aussi des policies `USING (true)` ([supabase-schema.sql](../../supabase-schema.sql#L64)). | Confirmé dans SQL local; application et exploitabilité distante **non vérifiées** | **P0 conditionnel** : en staging, obtenir la liste des migrations appliquées, test anonyme et authentifié sans toucher à des patients réels; conserver uniquement le modèle d’accès intentionnel, puis revalider les grants/RLS |
| S2 | **Élevée** / probable si fonction déployée | Les fonctions `generate-certificate-pdf` et `generate-prescription-pdf` sont configurées sans vérification JWT et leur code audité n’affiche pas de contrôle de session applicative avant l’acceptation du contenu. Le certificat transmet du HTML à PDFLayer. | Constat statique fort; impact réel dépend du code intégral, du déploiement et de l’exposition réseau | **P0** : vérifier toutes branches/actions, exiger session/autorisation médecin et ownership du patient, limiter débit et données; tester en staging |
| S3 | **Élevée** / inconnue | `check_in_appointment` est une fonction `SECURITY DEFINER` et l’exécution est accordée à `anon` et `authenticated` sans argument de session/rôle signalé dans la migration locale. [Migration](../../supabase/migrations/20261009034428_manual_appointment_check_in.sql#L11). | Confirmé dans le SQL local; fonction présente à distance non vérifiée | **P0/P1** : justifier l’exposition; basculer vers une RPC vérifiant acteur et droits; réduire grants et tester les scénarios d’accès |
| S4 | **Élevée** / dépend de XSS ou poste partagé | Jeton métier et session Supabase stockés dans `localStorage`; un script exécuté dans la même origine peut potentiellement les lire. Session applicative distincte à révoquer et changement d’utilisateur à contrôler. | Présence confirmée; absence de XSS non prouvée par cet audit | **P1** : revue XSS/CSP, purge de cache et jetons au logout, vérifier isolation React Query lors de changement d’utilisateur, étudier cookie sécurisé si architecture le permet |
| S5 | **Élevée** / attaque hors ligne possible si fuite de hash | PIN numérique de 4–6 caractères et hachage SHA-256 unique plutôt qu’un KDF lent; expression de sel observée dans `auth-pin` peut concaténer `"undefined"` plutôt que déclencher le fallback si le secret manque. [auth-pin](../../supabase/functions/auth-pin/index.ts#L10). | Code et formats observés; force du sel, débit, exposition des hashes et lockout distant non vérifiés | **P1** : KDF adapté avec sel individuel, secrets de qualité, rate-limit côté serveur, temporisation/monitoring et procédure de récupération sûre |
| S6 | **Élevée** / conditionnelle | Les fonctions PDF qui acceptent les données documentaires du client pourraient rendre des documents à partir d’identifiants/contenu non autorisés si l’autorisation n’est pas vérifiée. | Risque plausible à valider | **P0** : autoriser côté serveur sur session + ressource et reconstruire les données depuis la base; ne pas faire confiance à un payload client comme preuve d’ownership |
| S7 | **Élevée** / inconnue | OCR envoie des images médicales à Groq; PDF certificat envoie du HTML à PDFLayer. | Flux code confirmé; régions, rétention, contrat, sous-traitance et chiffrement des fournisseurs non confirmés | **P1** : revue juridique/DP, minimisation, information et consentement, DPA/contrat, politique de conservation et désactivation si non conforme |
| S8 | **Moyenne** / plausible | Séquence client ordonnance/items puis nettoyage compensatoire; synchronisation traitements ensuite indépendante. La mutation peut réussir partiellement lors d’une panne ou d’un cleanup impossible. [usePrescriptions.ts](../../src/hooks/usePrescriptions.ts#L280). | Code confirmé | **P1** : transaction serveur unique, idempotence, tests d’échec intermédiaire et réconciliation |
| S9 | **Moyenne** / plausible | Création d’ordre de file par lecture de maximum puis incrément côté client, sans sérialisation visible. [useQueue.ts](../../src/hooks/useQueue.ts#L249). | Code confirmé; contrainte et fréquence réelle non établies | **P1** : compteur quotidien serveur avec contrainte et allocation atomique |
| S10 | **Moyenne** / inconnue | Logs `console` et notifications peuvent contenir `error.message`; l’absence de filtrage central de données sensibles n’est pas établie. | Risque à vérifier | **P1** : politique de redaction, interdiction d’inclure patient/jeton/payload et outil de journalisation avec accès limité |
| S11 | **Moyenne** / inconnue | L’isolement multi-cabinet n’est pas démontré par le frontend; plusieurs requêtes filtrent par patient ID fourni. | Insuffisance de preuve, pas vulnérabilité confirmée | **P0** pour tout SaaS multi-cabinet : établir ownership tenant à chaque table, FK, RPC, fichier, canal Realtime et test IDOR |
| S12 | **Moyenne** / inconnue | Sauvegarde, restauration, chiffrement au repos, réplication et RPO/RTO ne sont pas prouvés par le dépôt. | Non vérifié | **P1** : prouver sauvegarde/restauration et PRA avant pilote réel |

## 7.4 Contrôles recommandés avant pilote réel

1. Geler toute mise en production ou toute exposition de nouveaux dossiers tant que la migration `restore_prototype_open_access` n’a pas été comparée à la base de staging et aux migrations appliquées.
2. Établir un modèle d’autorisation explicite : utilisateur actif → rôle → cabinet → dossier, appliqué dans RLS et/ou des fonctions serveur vérifiables.
3. Tester en staging l’accès anonyme, rôles secrétaire/assistant/médecin, patient appartenant à un autre cabinet, accès par ID direct, liens Storage et Realtime.
4. Auditer chacune des sept Edge Functions : JWT Supabase désactivé, donc session applicative, ownership et validation doivent être spécifiques à chaque opération.
5. Faire valider par un professionnel compétent les obligations marocaines de traitement, stockage et sous-traitance des données de santé. Cet audit ne constitue pas un avis juridique ni une certification.

