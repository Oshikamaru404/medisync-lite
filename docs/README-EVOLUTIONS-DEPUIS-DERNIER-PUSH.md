# Rapport des évolutions depuis le dernier push

## Synthèse

Ce rapport compare le répertoire de travail local au dernier commit de la branche distante `origin/main`.

| Indicateur | Résultat |
|---|---:|
| Branche examinée | `main` |
| Dernier commit poussé | `52739b5d0e698c319db5307e4749bb6dd38521e5` |
| Sujet du commit | `Upgraded version with CIM auto coding medical DB` |
| Date du dernier commit distant | 5 octobre 2026 |
| Commits locaux en avance sur `origin/main` | **0** |
| Fichiers suivis modifiés localement | **55** |
| Nouveaux fichiers non suivis | **152** |
| Chemins modifiés ou ajoutés au total | **207** |
| Migrations Supabase ajoutées | **24** |
| Fichiers Markdown ajoutés sous `docs/` | **33** |
| Fichiers de test ajoutés | **8** |

### Combien de changements ?

En regroupant les fichiers par fonctionnalité plutôt qu’en comptant chaque fichier séparément, le delta représente :

- **18 évolutions majeures** : nouveaux parcours métier, modules ou capacités importantes;
- **15 améliorations mineures et de finition** : ergonomie, contrôles, retours d’état, cohérence et qualité;
- **33 sujets de changement documentés** au total.

Ces nombres sont un **comptage éditorial par lots cohérents**, et non un nombre de commits, de tickets ou de lignes. Plusieurs sujets touchent simultanément l’interface, les hooks, les Edge Functions et les migrations.

> **Important :** aucun de ces changements n’est inclus dans le dernier push observé. Les fichiers listés ici sont des modifications locales (non poussées); vérifier leur contenu et leur état avant de les committer ou de les déployer.

## 1. Évolutions majeures — 18

| # | Évolution majeure | Détail |
|---:|---|---|
| 1 | Parcours de consultation guidé | Progression par étapes, saisie clinique structurée, relecture et sauvegarde progressive; le parcours de clôture recueille aussi le tarif et une décision explicite sur la suite. |
| 2 | Tâches de suivi après consultation | Nouveau module de suivis pour les contrôles, examens, orientations et préparations chirurgicales à organiser. Une tâche n’est pas confondue avec un rendez-vous confirmé; l’équipe peut ensuite consigner l’issue ou organiser un créneau dans l’agenda. |
| 3 | Cycle de vie des rendez-vous | Gestion de la présence et de l’arrivée, confirmation de check-in, détection des chevauchements actifs et traitement des retards/absences sans marquer automatiquement un patient absent. |
| 4 | File d’attente enrichie pour l’accueil | Synthèse préconsultation, actions d’accueil et d’encaissement, priorités configurables selon les droits et réorganisation manuelle des entrées. |
| 5 | Dossier patient et historique consolidés | Évolutions de l’annuaire, des éléments d’identité et des sections du dossier; ajout de composants pour les résumés, l’historique et les médicaments structurés. |
| 6 | Vérifications liées aux allergies médicamenteuses | Nouveau service de rapprochement allergènes/médicaments et alertes dans le parcours de prescription, avec niveaux de risque et confirmation clinique requise pour les alertes critiques. Cela assiste la vérification et ne remplace pas le jugement du médecin. |
| 7 | Demandes d’examens et références marocaines | Catalogue de références et paniers de demandes de biologie/imagerie intégrés au flux de prescription et aux modèles. Les références et coefficients ne sont pas présentés comme des tarifs automatiques. |
| 8 | Modèles de prescription | Nouveau module et flux associés pour consulter, créer et gérer des modèles réutilisables. |
| 9 | Catalogue des actes et tarifs du cabinet | Nouveau module médecin pour sélectionner des suggestions, enregistrer des actes personnalisés, renseigner un tarif et un code facultatif, puis modifier ou archiver les actes. |
| 10 | Encaissements et calculs de facturation | Nouvelles actions d’encaissement, prise en compte du payeur et du solde, modes de règlement différé/libre, calcul de réductions et suggestions de montants sans modifier automatiquement une facture. |
| 11 | Documents patients en stockage privé | Nouveau parcours de dépôt, lecture et suppression des documents via une fonction Edge sécurisée et des URL signées temporaires; migration prévue depuis l’ancien stockage public. |
| 12 | Analyse OCR assistée des documents | Ajout d’une analyse de documents importés, avec extraction et rapport signalés comme devant être vérifiés par le médecin. Cette capacité dépend de la configuration du fournisseur externe et des autorisations de traitement des données. |
| 13 | Partage sécurisé d’ordonnances | Nouveau flux de partage en lecture seule avec lien temporaire, code d’accès distinct, révocation et contrôles anti-essais répétés. Le lien expose le document partagé, pas l’ensemble du dossier patient. |
| 14 | Documents imprimables et aperçu A4/A5 | Composants de papier à en-tête et d’aperçu, génération PDF, aperçu d’ordonnance test et distinction entre l’impression native du navigateur et le téléchargement PDF. A4 et A5 ont des rendus adaptés. |
| 15 | Gestion des accès et des sessions | Évolutions de l’authentification, des rôles et des contrôles d’accès, ainsi que de l’interface de sélection/gestion des utilisateurs et des sessions protégées. |
| 16 | Shell de navigation et aide contextuelle | Nouvelle navigation commune, menu latéral rétractable, navigation mobile, retour/fil d’Ariane, recherche rapide, aide contextuelle et centre d’actions adapté au rôle. |
| 17 | Paramètres, rappels et expérience PWA | Refonte/extension des paramètres du cabinet, rappels locaux facultatifs, état réseau et informations de mise à jour PWA, icônes de marque et configuration d’installation. Le cache PWA ne signifie pas que les dossiers cliniques sont disponibles hors ligne. |
| 18 | Pilotage et documentation de livraison | Ajustements des vues d’accueil et statistiques; ajout d’un audit technique, d’un guide utilisateur illustré et d’un guide de recette destiné à un testeur externe. |

## 2. Améliorations mineures et de finition — 15

| # | Axe | Détail |
|---:|---|---|
| 1 | Cohérence visuelle | Harmonisation des composants, espacements, titres, couleurs et boutons entre les vues concernées. |
| 2 | Responsive | Adaptations des formulaires, listes, cartes et panneaux pour ordinateur, tablette et téléphone. |
| 3 | Navigation compacte | Ajustements du menu rétracté, de la largeur réservée au contenu et du comportement fixe/scroll; correction d’un bandeau fixe de consultation qui pouvait chevaucher la zone latérale. |
| 4 | Recherche et filtres | Améliorations des recherches, filtres, sélecteurs et états de liste pour retrouver plus directement les rendez-vous, patients et éléments de catalogue. |
| 5 | États de chargement | Retours plus explicites lors du chargement, de l’absence de résultat, d’une erreur ou d’une action en cours. |
| 6 | Prévention des doublons | Contrôles et retours de flux pour encourager la vérification d’une action déjà enregistrée avant de la répéter, notamment sur les actions sensibles. |
| 7 | Formulaires | Validations de champs, limites de saisie et messages d’erreur plus explicites pour les parcours touchés. |
| 8 | Règles d’agenda | Prise en compte des jours de travail et vérifications de disponibilité/chevauchement, avec des utilitaires dédiés. |
| 9 | Présentation des tarifs | Formatage en dirhams et aides de saisie séparées des montants effectivement enregistrés ou encaissés. |
| 10 | Navigation retour et états de vue | Conservation en mémoire de certains filtres et vues de travail pendant la session, ainsi que restauration de défilement selon le parcours. |
| 11 | Utilisation clavier et accessibilité | Ajustements de libellés, commandes, focus et interactions accessibles pour les composants modifiés. |
| 12 | Documents et aperçus | Dialogues de prévisualisation et composants réutilisables pour certains documents; indication plus claire des actions d’impression/téléchargement. |
| 13 | Marque et métadonnées PWA | Favicon, icônes, assets de marque, informations d’application et configuration Vite/PWA. |
| 14 | Dépendances et typage | Modifications du manifeste/lockfile et ajustements de types liés aux nouvelles fonctions. Le détail doit être relu avant une mise à jour ou un déploiement. |
| 15 | Tests ciblés | Nouveaux tests unitaires pour rappels, jours ouvrés, routes de médicaments, tarifs, catalogues d’examens, sécurité de session et règles d’allergie; test SQL pour les partages sécurisés. |

## 3. Principaux changements de base de données et Supabase

Les fichiers ajoutés ou modifiés comprennent des migrations, des fonctions Edge et des tests SQL. Les sujets couverts incluent :

- **Consultation et tarification :** stockage du tarif et des règles de règlement de consultation.
- **Suivis :** création et évolution des tâches, décision obligatoire à la clôture, actions possibles, informations de spécialité/contact et restriction d’accès.
- **Agenda et file :** check-in manuel, chevauchements, état de présence, actions réservées au personnel, priorités et réorganisation.
- **Catalogue des actes :** stockage du catalogue de chaque médecin.
- **Médicaments et dossier :** médicaments structurés, permissions et trace de validation.
- **Documents :** stockage privé et informations d’analyse documentaire.
- **Partage d’ordonnances :** migration dédiée aux liens sécurisés et test d’accès SQL.
- **Termes cliniques :** modification d’une migration de catalogue clinique.

Les migrations Supabase ajoutées doivent être appliquées dans l’ordre requis et les fonctions Edge correspondantes doivent être déployées de manière cohérente. Leur présence dans le répertoire ne prouve **ni leur application sur le projet distant, ni leur succès en production**.

Les migrations de sécurité/de rôles nécessitent une attention particulière : les politiques, fonctions RPC, autorisations Storage et accès Data API doivent être vérifiés dans l’environnement cible avant activation. La migration `20261008185502_restore_prototype_open_access.sql` est notamment à relire avec le responsable Supabase avant tout déploiement, car son nom indique une modification des contrôles d’accès. Ne pas appliquer aveuglément une migration ou un script manuel.

### Fonctions Edge concernées

- `patient-documents` : opérations documentaires sécurisées et accès temporaire;
- `prescription-share` : création et lecture des partages d’ordonnance;
- `generate-prescription-pdf` : génération du document PDF;
- `ocr-extract` : extraction/analyse documentaire;
- fonctions déjà présentes, notamment l’authentification PIN, les certificats et la recherche CIM-11, également ajustées dans certains fichiers.

Les fonctions dépendant de secrets externes exigent une configuration dans les secrets du projet Supabase. Aucune clé ne doit être ajoutée au frontend, au dépôt ou au rapport.

## 4. Documentation et tests ajoutés

Les nouveaux documents comprennent :

- **Audit Shifalyx :** identité/stack, cartographie, architecture, modules, base de données, sécurité, PWA/déploiement, impression, dette technique et plan d’action;
- **Guide utilisateur :** procédures par module, avec inventaire et captures d’écran;
- **Guide de recette :** scénarios numérotés, prérequis, résultats attendus, matrice des rôles et modèle de rapport d’anomalie.

Huit fichiers de test sont également ajoutés : sept suites ciblant le code TypeScript/les services et un test SQL de sécurité du partage. Leur présence ne signifie pas que ces tests ont tous été exécutés dans cette comparaison.

## 5. Ce que ce rapport ne confirme pas

- Il ne signifie pas que les changements sont commités ou poussés.
- Il ne garantit pas que les migrations ont été appliquées à Supabase.
- Il ne confirme pas le déploiement des Edge Functions ni la configuration des secrets externes.
- Il ne vaut pas audit de sécurité, validation clinique ou recette complète.
- Les tests nouvellement ajoutés doivent être lancés dans un environnement adapté avant livraison.

Pour toute diffusion, confirmer d’abord l’état réel du dépôt et de Supabase, relire les migrations et exécuter la suite de validation convenue. Les opérations de migration, partage, OCR, facturation et stockage de documents doivent être validées sans données patient réelles.

## 6. Vérification Git effectuée

La comparaison a été faite avec `HEAD` local et `origin/main` dans le dépôt au moment de la rédaction. Les deux références pointaient sur le même SHA `52739b5d0e698c319db5307e4749bb6dd38521e5`, et `git rev-list origin/main..HEAD` renvoyait `0`.

Commandes utiles pour refaire le point avant commit/push :

```sh
git fetch origin
git status --short
git rev-parse HEAD
git rev-parse origin/main
git log --oneline origin/main..HEAD
git diff --stat origin/main
```

Les nouveaux fichiers non suivis ne sont pas inclus dans `git diff --stat` tant qu’ils ne sont pas ajoutés à l’index; les totaux de ce rapport les comptent à part à partir de `git ls-files --others --exclude-standard`.
