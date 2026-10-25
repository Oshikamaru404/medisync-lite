# MediCare ERP 
## À propos

MediCare ERP est un système de gestion médicale moderne pour coordonner le cabinet et ses données hébergées dans le cloud.

> **Rapport de changements :** [Évolutions locales depuis le dernier push — bilan détaillé des changements majeurs et mineurs](./docs/README-EVOLUTIONS-DEPUIS-DERNIER-PUSH.md).

## Fonctionnalités

- Gestion d'agenda et rendez-vous
- Gestion des patients et dossiers médicaux
- File d'attente intelligente
- Comptabilité et facturation
- Accès cloud aux données du cabinet

## Technologies utilisées

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## PWA et disponibilité hors connexion

Shifalyx peut être installée depuis un navigateur compatible sous Windows ou macOS. Le service worker met en cache le shell applicatif et ses ressources statiques versionnées afin d'accélérer les ouvertures suivantes et de charger l'interface après une première visite.

Ce cache ne contient pas les réponses Supabase ni les dossiers, rendez-vous, ordonnances, factures ou documents des patients. L'application nécessite une connexion pour charger et enregistrer les données médicales ; le message hors connexion le précise. Aucune modification clinique n'est mise en file localement pour une synchronisation ultérieure. Le statut réseau reflète la connectivité signalée par le navigateur et ne garantit pas à lui seul que Supabase est joignable.

Les nouvelles versions sont proposées dans l'interface et ne se rechargent qu'après l'action explicite de l'utilisateur. Avant d'actualiser, enregistrer tout brouillon en cours.

## Partage sécurisé des ordonnances

Depuis l'aperçu d'une ordonnance, le médecin peut créer un lien de lecture seule valable 24 heures, 3 jours ou 7 jours au maximum. Un code aléatoire à 8 chiffres est affiché une seule fois ; transmettre le lien et le code par deux canaux distincts. Le lien peut être révoqué depuis l'historique de partage de l'ordonnance. Après cinq codes incorrects, l'accès est verrouillé. Chaque ouverture réussie est comptabilisée.

Le partage expose uniquement le document prescrit, l'identité minimale du patient (nom, prénom, âge et sexe) et les coordonnées professionnelles sélectionnées du cabinet. Il n'ouvre pas le dossier patient. Le contenu n'est pas enregistré dans la table des partages : une empreinte du document est conservée afin de bloquer le lien si l'ordonnance change ; le médecin doit alors en créer un nouveau. Les réponses du point d'accès sont privées et non mises en cache.

L'envoi du code par SMS, e-mail ou WhatsApp n'est pas automatisé. Le cabinet transmet le lien et le code séparément. La migration `prescription_secure_shares` et la fonction Edge `prescription-share` doivent être appliquées/déployées ensemble dans Supabase avant activation en production. Le test pgTAP `supabase/tests/prescription_secure_shares_rls.test.sql` vérifie que les tables et fonctions de partage ne sont pas accessibles aux rôles API `anon` et `authenticated`.

## Impression des ordonnances

Le bouton **Imprimer** ouvre uniquement la fenêtre d'impression native du navigateur. **Télécharger PDF** génère et télécharge directement un PDF sans ouvrir cette fenêtre. Le format est réglable dans Paramètres > Impression : A5 (148 × 210 mm) est proposé par défaut ; A4 place l'ordonnance à sa taille A5 au centre d'une feuille A4. La page de test permet de vérifier le rendu et de choisir une imprimante dans la fenêtre native. Une application web ne peut pas sélectionner ni détecter directement une imprimante physique.

## Navigation du cabinet

Les espaces authentifiés partagent une navigation cohérente : menu latéral rétractable sur ordinateur, barre d’accès mobile, fil d’Ariane et retour vers la rubrique précédente ou son parent. Les rubriques affichées respectent le rôle de l’utilisateur. `Ctrl+K` (ou `⌘K` sur Mac) ouvre la navigation rapide, qui permet aussi au médecin de rechercher un dossier patient par nom, téléphone ou CIN.

Le retour navigateur restaure la position de défilement. Les recherches et vues de travail de la file, de l’agenda, des patients et des onglets de dossier sont conservées uniquement en mémoire pendant la session de l’application : aucune donnée de navigation clinique n’est écrite dans le stockage local du navigateur. Depuis une consultation, les changements de rubrique via la navigation commune passent d’abord par la sauvegarde du brouillon.

## Shifalyx Assist

Le centre d’aide contextuel adapte ses guides, accès utiles et conseils de dépannage à la route courante, y compris aux routes de détail dynamiques. Il respecte les rubriques disponibles pour le rôle connecté et réutilise la recherche globale `Ctrl+K` / `⌘K` pour retrouver les pages et dossiers. Le panneau est accessible depuis l’icône d’aide de la barre supérieure et peut être fermé avec `Échap`.

En l’absence de canal de support intégré, l’aide permet de préparer puis copier un résumé à transmettre au canal habituel du cabinet. Aucun ticket n’est envoyé automatiquement ; le formulaire rappelle de ne pas inclure de données patient ou d’informations médicales.

La cloche de la barre supérieure ouvre un centre d’actions adapté au rôle : le médecin y voit uniquement la file de soins, tandis que le secrétariat et l’assistance y retrouvent les rendez-vous à confirmer, arrivées à vérifier après 15 minutes, patients en attente, suites de soins à organiser et règlements explicitement dus à l’accueil. Les paiements différés ne sont pas présentés comme des encaissements à faire. Le compteur bleu, réduit et discret, représente les actions encore actives, pas des messages non lus. Les résumés ne chargent que les champs nécessaires et les listes se mettent à jour depuis leurs espaces de référence ; aucune action n’est masquée par un bouton « lu », aucune absence n’est déclarée automatiquement et aucune notification sonore ou navigateur n’est envoyée par défaut.

## Paramètres du cabinet

La page Paramètres regroupe l’identité du praticien et du cabinet, le logo des documents, les coordonnées, les horaires, la gestion de l’équipe, les contrôles de session et les règles de planification. Le verrouillage automatique est configurable à 5, 10 ou 15 minutes et ne peut pas dépasser la limite de 15 minutes déjà appliquée. La durée proposée, le pas des créneaux et les jours de consultation s’appliquent aux nouveaux rendez-vous actifs ; les chevauchements et les horaires d’ouverture sont vérifiés avant l’enregistrement. Les réglages du cabinet sont enregistrés explicitement et restent modifiables avant validation.

Des rappels de rendez-vous facultatifs peuvent être activés dans le navigateur (5, 15 ou 30 minutes avant). Ils sont configurés localement par compte et par appareil, exigent l’autorisation du navigateur et ne fonctionnent que lorsque Shifalyx est ouvert et la session déverrouillée. Le contenu reste générique, sans identité ni donnée médicale, et aucun SMS, e-mail ou message patient n’est envoyé. L’authentification à deux facteurs et la synchronisation manuelle ne sont pas disponibles.

La clôture de consultation propose une seule rangée de tarifs standards : 100, 150, 200, 250, 300, 400, 500, 600, 800 et 1 000 DH, en plus des éventuels tarifs personnalisés enregistrés par le cabinet. Leur sélection met à jour le montant brut choisi pour la consultation, sans clôturer ni enregistrer automatiquement la facture ; le médecin vérifie le total et valide ensuite la clôture.

## Présence et retards des rendez-vous

L'agenda distingue le rendez-vous planifié, la présence et le passage dans la file. Pour un rendez-vous confirmé sans arrivée, un indicateur apparaît 15 minutes après l'heure prévue ; l'équipe choisit ensuite d'enregistrer une tentative d'appel, un retard annoncé (avec heure estimée facultative), une absence confirmée ou une annulation. Aucun no-show n'est automatique : l'absence reste visible dans l'agenda, n'est pas ajoutée à la file et chaque décision est horodatée avec le membre connecté. Une arrivée tardive reste possible et est ajoutée à la file par l'action de check-in.

Pour activer ce parcours sur Supabase, appliquez dans l'ordre les migrations `20261009034428_manual_appointment_check_in.sql`, `20261009152000_prevent_active_appointment_overlaps.sql` et `20261009164000_appointment_attendance_workflow.sql`. Les migrations ne sont pas appliquées par l'application.

## Installation locale

```sh
# Cloner le repository
git clone <YOUR_GIT_URL>

# Accéder au répertoire du projet
cd <YOUR_PROJECT_NAME>

# Installer les dépendances
npm i

# Démarrer le serveur de développement
npm run dev
```

## Catalogue CIM-11 de motifs

La recherche de motifs interroge directement le catalogue officiel [CIM-11 de l'OMS](https://icd.who.int/icdapi), édition MMS 2026-01, en français. Elle passe par la fonction Supabase `icd11-search`, afin que les identifiants API ne soient jamais exposés au navigateur. Après déploiement, configurez `ICD_API_CLIENT_ID` et `ICD_API_CLIENT_SECRET` dans les secrets de fonctions Edge du tableau de bord Supabase, avec une clé créée depuis le portail API de l'OMS. Ne collez jamais ces secrets dans le chat, le code ou un fichier `.env` versionné.

La recherche en direct donne des résultats à la demande sans copier toute la classification dans la base de données ; un CSV peut toujours être importé pour conserver localement une sélection.

Après sélection d'un motif, la fiche propose des trames d'interrogatoire et d'examen à adapter. Cliquer sur un élément ajoute uniquement un intitulé vide dans le champ correspondant ; aucune donnée clinique ni conclusion n'est générée. Pour un résultat OMS, le code et la fiche de classification sont affichés lorsqu'ils sont fournis par l'API. Le bouton de proposition ajoute explicitement le libellé et le code au champ diagnostic avec la mention « à valider ».

Le parcours de consultation comporte trois étapes guidées : compte rendu, ordonnance facultative avec les alertes d'allergies visibles, puis clôture de la consultation. Cette dernière étape rassemble le tarif, la décision explicite sur la suite de soins (suivi ou aucun suivi nécessaire) et la finalisation. La consultation ne peut pas être clôturée tant qu'une décision n'a pas été choisie. Les tarifs standards vont de 100 à 1 000 DH ; un tarif personnalisé ajouté à la liste est conservé dans les paramètres du cabinet. Dans « Actes & tarifs », sept chips de montants usuels (150, 200, 250, 300, 350, 500 et 700 DH) sous le champ de tarif remplissent uniquement le montant de l'acte en cours ; le médecin vérifie puis enregistre celui-ci dans le catalogue. Lors de l'encaissement manuel, les tarifs usuels associés à la spécialité servent de suggestions de règlement partiel lorsqu'ils ne dépassent pas le solde dû ; une suggestion ne modifie jamais le montant de la facture. Les réductions en pourcentage ou en montant fixe sont calculées avant affichage du net à facturer. Appliquez aussi la migration `20261005000100_add_consultation_pricing.sql` à Supabase avant d'utiliser la finalisation du tarif : elle enregistre le montant brut et la réduction sur la facture, synchronise le net avec la file d'attente et évite de créer une deuxième facture.

Les prescriptions de biologie et d’imagerie disposent d’un dictionnaire de 200 références et de 92 paniers de bilans issus des fichiers fournis pour le Maroc. Les paniers de biologie et d’imagerie sont accessibles depuis « Paniers de référence » dans l’éditeur de modèles et les modèles rapides du formulaire de prescription. Ils peuvent être adaptés avant utilisation, mais ne constituent pas des protocoles automatiques. Par défaut, les références NABM/NGAP restent masquées et ne figurent pas sur le document remis au patient. Le mode « Facturation avancée », proposé aux rôles d’accueil disponibles (`secretaire` et `assistant`), affiche le code et, lorsqu’il est connu, le coefficient/unité. Ces coefficients ne sont pas des montants en DH : aucun calcul ou tarif automatique n’est effectué. Vérifiez la nomenclature et les conditions de facturation applicables auprès des sources professionnelles compétentes.

À la clôture, le médecin choisit explicitement « Prévoir une suite » ou « Aucune suite nécessaire ». Les choix couvrent le contrôle (y compris la revue de résultats biologiques ou d'imagerie), l'examen au cabinet, la référence à un confrère et la préparation chirurgicale. La référence propose la liste des spécialités du cabinet; le nom du confrère est facultatif et aucune date n'est imposée. La chirurgie peut être consignée sans date tant qu'elle n'est pas confirmée. Ces décisions deviennent des tâches « à organiser », jamais des rendez-vous confirmés ou une entrée dans la file du jour. L'équipe peut planifier un contrôle ou un examen après accord du patient, ce qui crée alors le rendez-vous dans l'agenda, ou marquer une référence transmise / une suite chirurgicale prise en charge. Appliquez dans l'ordre les migrations `20261007180000_create_follow_up_tasks.sql`, `20261007193000_require_follow_up_decision.sql`, `20261007200000_expand_follow_up_actions.sql` et `20261007201000_add_referral_specialty_and_contact.sql`.

### Alertes d'allergies médicamenteuses

Le service TypeScript `src/services/AllergyAlertService.ts` analyse un patient et les identifiants de médicaments prescrits à partir des trois référentiels CSV versionnés dans `src/data/allergy-reference/`. Le singleton `src/services/allergyAlertData.ts` les charge et valide au démarrage du module qui l'importe. Le parcours d'ordonnance utilise ce service dès la recherche et le contrôle à nouveau les médicaments sélectionnés avant l'enregistrement. Les allergies saisies en texte libre sont rapprochées prudemment des codes et noms du référentiel (avec les synonymes français pris en charge); les médicaments sont retrouvés par identifiant ou, si l'identifiant du catalogue diffère, par nom/DCI exact normalisé.

```ts
import { allergyAlertService } from "@/services/allergyAlertData";
import type { PatientAllergy } from "@/services/AllergyAlertService";

const patientAllergies: PatientAllergy[] = [{
  allergenCode: "PENICILLIN",
  reactionType: "ANAPHYLAXIS",
  severity: "CRITICAL",
  certainty: "CONFIRMED",
}];

const alerts = allergyAlertService.checkAllergies(patientAllergies, ["<medication-id>"]);
const requiresClinicianConfirmation = alerts.some((alert) => alert.requiresConfirmation);
```

Un match direct reprend `severity_default` et `description` de `allergens.csv`; une relation croisée reprend son `risk_level` et sa note clinique. `NONE` ne produit aucune alerte; `LOW` et `CONTEXT_DEPENDENT` restent non bloquants et affichent seulement « Vérifier formulation / avis médical ». Seul un niveau `CRITICAL` demande confirmation explicite avant l'enregistrement de l'ordonnance. Un médicament ou un texte d'allergie qui ne peut pas être rapproché du référentiel est signalé pour vérification manuelle, jamais présenté comme une vérification sans risque. Le service n'infère pas de relation pénicilline–céphalosporine en l'absence d'une ligne dans le référentiel, et ignore les mappings `SULFATE` / `SULFITE` pour éviter de les assimiler aux sulfamides antibiotiques. La méthode `checkAllergies` lève une erreur pour tout identifiant médicament ou allergène non chargé.

Les allergies des dossiers patients restent saisies en texte libre; leur rapprochement automatique ne remplace pas la validation clinique et n'enrichit pas le dossier avec un diagnostic allergologique. Lancez `npm run test:allergy` pour les tests des règles critiques, y compris pénicilline/Augmentin et le rapprochement par DCI.

Appliquez la migration `20261004232000_create_clinical_terms.sql` seulement si vous souhaitez aussi conserver un catalogue CSV local. L'import CSV de secours requiert les colonnes `code` et `label`; `category_id`, `synonyms` et `source_release` sont facultatives et les synonymes sont séparés par `|`. Configurez `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans l'environnement sécurisé du terminal, puis lancez :

```sh
npm run import:icd11 -- chemin/vers/icd11.csv
```

L'import fait des upserts par code, en lots de 500. Gardez la clé `service_role` uniquement dans l'environnement local sécurisé ; ne la mettez jamais dans le code du navigateur ni dans un fichier versionné. La recherche de consultation interroge ensuite les entrées importées à partir de deux caractères.

### Documents patients et stockage privé

Les pièces importées dans un dossier patient sont stockées dans le bucket privé `patient-documents-private`. Leur dépôt, ouverture et suppression passent par la fonction Edge `patient-documents`, qui revalide la session PIN du médecin et remet uniquement une URL signée temporaire de 15 minutes, renouvelable à la demande. Les métadonnées de la table `documents` ne sont plus accessibles directement depuis les clients publics. Les logos du cabinet utilisent le bucket public distinct `cabinet-assets`.

Pour déployer cette évolution, publiez d'abord la fonction Edge `patient-documents` et la version frontend correspondante, puis appliquez `20261010210840_secure_patient_document_storage.sql`. Cette migration désactive l'accès public à l'ancien bucket `patient-documents` : les anciens liens directs cessent donc de fonctionner. Les anciennes pièces sont récupérées par le service sécurisé lors de leur première ouverture et transférées vers le bucket privé. Si un ancien logo est encore configuré, ouvrez les paramètres ou l'espace Documents pour le migrer vers `cabinet-assets`.

L'analyse OCR est réservée à une session médecin valide. À l'import, l'option de rapport IA est activée par défaut mais peut être désactivée avant l'enregistrement. Si elle reste active, le modèle multimodal Groq `qwen/qwen3.8-27b` reçoit une image ou jusqu'à trois pages préparées d'un PDF. L'interface indique cet envoi avant l'import. Le résumé concis, le compte rendu descriptif, les résultats structurés, le texte extrait et les avertissements sont conservés dans `documents.ai_analysis`, avec un statut « à vérifier par le médecin ». Ce rapport ne modifie pas le dossier clinique. Appliquez `20261010220924_add_document_ai_analysis.sql` avant de déployer la fonction Edge `patient-documents` et le frontend mis à jour. Les pages préparées sont plafonnées à 3 Mo chacune et les fichiers déposés à 20 Mo. Vérifiez toujours les transcriptions et résultats extraits sur l'original.

Configurez `GROQ_API_KEY` dans les secrets Edge Functions du projet Supabase avant d'utiliser l'analyse. La clé ne doit jamais être ajoutée au frontend, au dépôt, ou partagée dans le chat. Le contenu transmis est une donnée médicale traitée par un fournisseur externe : activez cette fonction uniquement si le cabinet est autorisé à lui transmettre les documents concernés.

## Licence

Propriétaire - Tous droits réservés
