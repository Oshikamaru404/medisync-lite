# 8. PWA, build, déploiement et mise à jour

## 8.1 État PWA

| Élément | Statut | Preuve / limite |
|---|---|---|
| Manifest | **Configuré** | Manifeste généré par Vite avec nom Shifalyx, FR, `start_url` et `scope` `/`, mode `standalone`, thème blanc harmonisé à la barre d’application et icônes dans [vite.config.ts](../../vite.config.ts#L19) |
| Icônes | **Présentes** | Icônes PNG 192 et 512 et favicon dans `public/`; présence fichier confirmée, rendu OS non testé |
| Service worker | **Configuré** | `vite-plugin-pwa` et Workbox, génération attendue au build; fichier runtime généré non vérifié |
| Enregistrement | **Implémenté** | [PwaStatus.tsx](../../src/components/PwaStatus.tsx#L3) utilise `useRegisterSW`, avec état d’erreur d’enregistrement loggé |
| Mise à jour | **Implémentée côté UI** | `registerType: prompt`; bouton « Actualiser » appelle `updateServiceWorker(true)`, avec possibilité « Plus tard » |
| Pré-cache | **Configuré** | Workbox inclut JS/CSS/HTML/icônes/images/SVG/WOFF2 jusqu’à 4 MiB; pas de preuve d’un cache dynamique de données médicales |
| Navigation fallback | **Configuré** | `index.html` comme fallback dans config Workbox |
| Offline métier | **Non implémenté pour les données médicales** | Bandeau de [PwaStatus.tsx](../../src/components/PwaStatus.tsx) dit explicitement que dossiers/enregistrements nécessitent Internet |
| Notifications | **Partiellement implémentées côté client** | [AppointmentReminderContext](../../src/contexts/AppointmentReminderContext.tsx#L70) demande la permission navigateur, recharge les RDV du jour toutes les 60 s et peut notifier lorsque l’application est ouverte, la session déverrouillée et la permission accordée. Préférences et IDs notifiés sont locaux. Aucune preuve d’abonnement push serveur / Web Push |
| HTTPS | **À confirmer** | Précondition navigateur/production, aucun domaine hébergé accessible vérifié |
| Installation réelle | **À confirmer** | Pas d’essai sur Windows/macOS/iOS/Android ni audit Lighthouse |

Les utilisateurs sont avertis qu’il faut vérifier si les dernières actions sont enregistrées après retour réseau. Cette conception ne doit pas être commercialisée comme un mode hors ligne clinique.

Le rappel d’agenda n’est pas un canal de confirmation patient : le contenu demande d’ouvrir l’agenda et ne révèle pas le nom du patient. Il n’est pas démontré qu’il s’exécute lorsque l’application est fermée ou lorsque l’appareil est hors connexion.

## 8.2 Build et commandes

Scripts du [package.json](../../package.json#L6) :

| Commande | Fonction |
|---|---|
| `npm run dev` | Serveur Vite; port 8080, host `::` dans [vite.config.ts](../../vite.config.ts#L10) |
| `npm run build` | Build Vite production et génération PWA |
| `npm run build:dev` | Build Vite mode développement |
| `npm run lint` | ESLint sur dépôt |
| `npm run test:allergy` | Test Node déclaré par package |
| `npm run preview` | Prévisualisation du build |
| `npm run import:icd11` | Import d’un référentiel; non exécuté car peut appeler l’externe/modifier données |

Le client attend `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` ([client.ts](../../src/integrations/supabase/client.ts#L5)); leurs valeurs ne sont pas reproduites.

## 8.3 Déploiement et rollback

Aucun workflow CI/CD, conteneur ou cible d’hébergement/déploiement n’a été trouvé dans le périmètre local inspecté. Le déploiement du frontend, l’hébergement des fonctions, l’application de migrations, les environnements et le rollback restent **non documentés/non vérifiés**. Les réglages Supabase locaux ne démontrent pas que les fonctions sont déployées.

### Recommandation de pipeline

1. Lint, tests unitaires et contrôle TypeScript.
2. Tests RLS/RPC pgTAP en base isolée.
3. Build déterministe avec versions lockées et vérification des assets PWA.
4. Déploiement vers staging avec les fonctions et migrations compatibles.
5. Parcours E2E avec données synthétiques explicitement non médicales.
6. Vérification de santé (connexion, login, fichier, PDF) puis promotion contrôlée.
7. Rollback applicatif et procédure additive de rollback de données; sauvegarde restaurable avant schéma destructif.

## 8.4 Mise à jour PWA : risques et stratégie

La mise à jour est présentée avec prompt et demande action. Cela limite une actualisation silencieuse pendant une consultation, mais le composant ne démontre pas un contrôle de brouillons. Risques : bundle ancien face à fonctions ou schéma plus récents, cache de shell incohérent, mise à jour au mauvais moment, impossibilité de revenir à une ancienne version.

**Recommandations :** ajouter un rappel de sauvegarder/quitter les brouillons avant l’activation, versionner le schéma de compatibilité API, déployer d’abord des fonctions rétrocompatibles puis le frontend, mettre en place un canary/monitoring, et conserver un mécanisme de rollback testable.
