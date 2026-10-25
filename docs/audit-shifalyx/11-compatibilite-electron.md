# 11. Préparation à Electron

## 11.1 État observé

Le frontend est une SPA Vite/React, avec appels web à Supabase et APIs navigateur. Le code utilise `localStorage`, `navigator.onLine`, `Notification`, `navigator.clipboard`, `window.print`, `URL.createObjectURL`, ainsi que génération PDF/canvas (`html2canvas`, `jsPDF`). Aucun dossier Electron/Tauri, processus principal, IPC ou dépendance native n’a été identifié dans le dépôt inspecté.

## 11.2 Matrice de faisabilité

| Capacité | Réutilisation possible | Travail/risque |
|---|---|---|
| UI React et routes | Élevée | Adapter base URL, routage en fichier, navigation système |
| Supabase/API | Élevée si réseau | Electron ne donne pas le mode offline ni ne corrige auth/RLS |
| Auth et stockage local | Partielle | Réexaminer stockage jeton; ne pas exposer API de privilèges au renderer |
| Impression | Potentiel plus contrôlable | Implémenter IPC borné + dialogues/imprimantes; valider OS et imprimantes marocaines |
| Téléchargement/choix du fichier | Possible via dialogues natifs | Remplacer les comportements Web ciblés avec APIs sûres |
| Notifications | Dépend du système | Adaptateur natif et consentement |
| Matériel | Possible via modules natifs | Surface d’attaque, signatures de build et maintenance |
| Offline complet | Non acquis | Requiert cache chiffré, conflits, règles, purge et consentement; projet séparé |
| Déploiement | Nouvel effort | Signature code, auto-update, Windows/macOS, artefacts et support des versions |

## 11.3 Recommandation

**Rester PWA aujourd’hui.** Le besoin concret d’imprimer avec choix d’imprimante peut ne pas justifier l’installation Electron : le navigateur ouvre la boîte d’impression native et l’utilisateur choisit son imprimante. Electron est pertinent uniquement si un pilote/matériel, une file d’impression silencieuse réellement nécessaire ou un offline complet validé par les utilisateurs devient un avantage payant.

Si le seuil est atteint, conserver le backend et la logique métier partagés, isoler les dépendances dans des adaptateurs `print`, `download`, `notification` et `secureStorage`, et garder le renderer sans Node (`contextIsolation`, sandbox, CSP stricte, IPC allow-list, aucune API arbitraire). Concevoir un protocole de mise à jour, signatures et récupération avant pilote.

## 11.4 Critères de décision future

1. Au moins trois cabinets pilotes décrivent un problème impossible à résoudre en PWA.
2. Une preuve technique montre que le navigateur ne peut pas fournir l’imprimante/périphérique demandé.
3. Le coût annuel de packaging, signature, support et mises à jour est financé par une valeur commerciale mesurée.
4. La sécurité de session et l’isolation des données sont déjà certifiées dans le backend.
5. Une stratégie mise à jour/rollback/offline a été acceptée cliniquement et testée.

