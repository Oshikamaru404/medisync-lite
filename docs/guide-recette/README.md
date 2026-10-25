# Guide de recette fonctionnelle — Shifalyx

Ce document sert à faire tester Shifalyx par une personne qui n’a pas participé au développement. Il indique quoi vérifier, dans quel ordre, ce qui est attendu et comment signaler un problème. Il complète le [guide utilisateur](../guide-utilisateur/README.md), qui explique l’usage des modules.

> **Règle impérative :** effectuer les tests uniquement sur l’environnement de recette fourni par le responsable, avec des comptes et des données synthétiques. Ne jamais tester en production, sur de vrais dossiers patients, avec de vrais paiements ou en envoyant un document à un vrai patient.

## 1. Objectif et périmètre

La recette vérifie que les principaux parcours sont compréhensibles, cohérents et fonctionnels, de la connexion à la consultation et au suivi administratif :

`Connexion → agenda → arrivée → file d’attente → dossier → consultation → ordonnance / suivi → paiement → historique`

Le testeur ne valide pas la justesse d’une décision médicale, d’une prescription, d’un tarif réglementaire ou d’une règle comptable. Ces contenus doivent être vérifiés par les responsables habilités. Le testeur vérifie uniquement que l’interface permet de saisir, relire, enregistrer et retrouver les éléments sans confusion ni perte apparente.

## 2. Avant de commencer

Demander au responsable de recette les éléments suivants :

- l’adresse de l’environnement de test, et la confirmation écrite qu’il ne s’agit pas de la production;
- la version ou la date de déploiement à tester;
- un compte de test par rôle réellement disponible : médecin, secrétaire et/ou assistant;
- les consignes de connexion (profil, PIN temporaire ou autre mécanisme);
- l’autorisation de créer les objets synthétiques nécessaires et la personne chargée de les nettoyer;
- les scénarios ou modules qui sont hors périmètre ou désactivés dans cet environnement;
- le navigateur et les appareils à couvrir, si une configuration précise est demandée.

### Fiche d’exécution

Compléter avant chaque session :

| Champ | Valeur |
|---|---|
| Testeur | |
| Date et heure | |
| Environnement / adresse | |
| Version observée | |
| Navigateur et version | |
| Appareil / résolution approximative | |
| Rôle(s) testé(s) | |
| Préfixe des données de test | `REC-AAAAMMJJ-` |
| Responsable du nettoyage des données | |

### Préparer les données synthétiques

Si le jeu de test ne contient pas déjà les objets utiles, créer uniquement ce qui a été autorisé :

- utiliser un préfixe distinctif tel que `REC-20261016-` dans les noms ou motifs, là où les champs le permettent;
- utiliser une identité entièrement fictive et des coordonnées réservées aux tests ou laissées vides si elles ne sont pas requises;
- ne jamais emprunter le nom, le téléphone, la CIN, l’adresse ou les informations médicales d’une personne réelle;
- pour les tests de consultation, employer du texte clinique explicitement fictif, sans en tirer de conclusion ou conseil médical;
- ne pas déclencher d’envoi réel de SMS, d’appel, de partage de document, de paiement ou d’impression sur une imprimante de production;
- ne pas supprimer, restaurer, importer ou modifier les paramètres globaux sans autorisation explicite.

Si l’environnement ne fournit pas les droits, les données ou un mode sûr pour un cas, noter **Bloqué / Non testable** et demander au responsable la marche à suivre. Ne pas contourner le blocage.

## 3. Comment exécuter et noter les cas

1. Utiliser un seul compte et un seul rôle à la fois. Noter le rôle pour chaque cas.
2. Suivre les étapes dans l’ordre et comparer l’écran au résultat attendu.
3. Après une création ou une modification, vérifier la confirmation, puis rechercher l’objet ou recharger la page pour confirmer qu’il est encore présent.
4. Si une action semble échouer, ne pas cliquer plusieurs fois sur **Enregistrer**, **Confirmer**, **Créer** ou **Finaliser**. Vérifier d’abord si l’objet a déjà été créé.
5. Noter le résultat immédiatement. Ne pas « corriger » un comportement inattendu avant d’avoir conservé les éléments utiles.
6. Utiliser les statuts ci-dessous :

| Statut | Signification |
|---|---|
| **Réussi** | Toutes les étapes et tous les résultats attendus sont conformes. |
| **Échec** | Le résultat diffère, l’action ne fonctionne pas, ou une donnée est perdue/dupliquée. |
| **Bloqué** | Impossible de continuer à cause d’un prérequis, d’un droit, d’un service ou d’une donnée manquante. |
| **Non testé** | Cas non exécuté. Indiquer brièvement pourquoi. |
| **Non applicable** | Fonction ou rôle non compris dans le périmètre convenu. |

Ne pas confondre un écran vide avec une erreur : vérifier s’il s’agit d’un état vide, d’un chargement ou d’un message d’échec.

## 4. Matrice des rôles

Les droits ci-dessous correspondent aux accès configurés dans l’application. Certains accès dépendent aussi du compte de recette.

| Rubrique / action | Médecin | Secrétaire | Assistant |
|---|---:|---:|---:|
| Accueil | Oui | Pas nécessairement | Pas nécessairement |
| Agenda et file d’attente | Oui | Oui | Oui |
| Suivis | Oui | Oui | Oui |
| Démarrer une consultation | Oui | Non | Non |
| Patients et dossiers | Oui | Non | Non |
| Comptabilité | Oui | Oui | Oui |
| Statistiques | Oui | Non | Non |
| Paramètres | Oui | Non | Non |
| Modèles d’ordonnance et actes médicaux | Oui | Non | Non |

Un lien absent ou un refus d’accès doit être évalué selon cette matrice et le rôle attendu, pas selon le rôle d’un autre compte. Tester les accès interdits seulement en entrant manuellement l’URL, avec l’accord du responsable; ne pas tenter de lire ou modifier des données qui ne sont pas autorisées.

## 5. Parcours de recette détaillé

### A. Connexion, navigation et session

#### REC-001 — Connexion à l’application

**Rôle :** chaque compte fourni.

1. Ouvrir l’adresse de recette.
2. Se connecter avec le mécanisme fourni.
3. Repérer le nom/profil affiché dans la navigation.
4. Ouvrir une rubrique autorisée et revenir à l’accueil ou à la rubrique précédente.

**Attendu :** l’accès aboutit sans erreur; le bon profil est identifié; les rubriques correspondent au rôle; la navigation retour ne bloque pas l’application.

#### REC-002 — Accès réservé selon le rôle

**Rôle :** secrétaire ou assistant; médecin pour contrôle comparatif.

1. Vérifier les rubriques visibles dans le menu.
2. Avec l’accord du responsable, essayer une URL médecin réservée, par exemple Patients ou Paramètres.
3. Revenir par le lien prévu à une rubrique accessible.

**Attendu :** le rôle non autorisé ne peut pas consulter le contenu protégé; un message d’accès non autorisé ou une redirection appropriée apparaît; l’application reste utilisable.

#### REC-003 — Réduire et développer la navigation (ordinateur)

**Rôle :** tous.

1. Réduire le menu latéral, puis le développer.
2. Dans chaque état, ouvrir une page et faire défiler son contenu.
3. Vérifier que les icônes et infobulles permettent de comprendre les destinations.

**Attendu :** le menu reste fixe à gauche, ne recouvre pas le contenu principal et le mode compact ne chevauche aucune commande ou information. Le contenu de navigation peut défiler indépendamment si la hauteur de l’écran l’exige.

#### REC-004 — Verrouiller et reprendre une session

**Rôle :** tous.

1. Utiliser **Verrouiller la session**.
2. Vérifier que le contenu protégé n’est plus visible ou accessible.
3. Déverrouiller avec le mécanisme autorisé.

**Attendu :** la session verrouillée exige une reprise d’accès; le bon utilisateur retrouve une session fonctionnelle. Ne pas tester de PIN incorrect à répétition, au risque de déclencher une protection.

#### REC-005 — Aide, recherche globale et navigation

**Rôle :** médecin et rôle accueil.

1. Ouvrir la recherche globale / **Aller à…**.
2. Rechercher un nom de rubrique présente dans le menu.
3. Ouvrir un résultat autorisé; ouvrir ensuite l’aide contextuelle si elle est disponible.

**Attendu :** les résultats sont pertinents, la destination est accessible et la recherche ne révèle pas de données auxquelles le rôle n’a pas droit.

### B. Accueil et organisation de la journée

#### REC-010 — Indicateurs de l’accueil

**Rôle :** médecin.

1. Ouvrir l’accueil.
2. Repérer l’état de chargement, les rendez-vous du jour, la file et les raccourcis disponibles.
3. Ouvrir une rubrique avec un raccourci puis revenir.

**Attendu :** les éléments chargent ou un état vide explicite apparaît. Une erreur ou un indicateur en chargement n’est pas présenté comme un total égal à zéro.

### C. Agenda et rendez-vous

#### REC-020 — Vues Jour et Semaine

**Rôle :** tous.

1. Ouvrir **Agenda** et passer de Jour à Semaine.
2. Utiliser précédent, suivant et **Aujourd’hui**.
3. Rechercher un patient ou motif synthétique et changer les filtres disponibles.

**Attendu :** la période et le titre affichés suivent les commandes; les filtres changent la liste visible sans modifier les statuts réels.

#### REC-021 — Créer un rendez-vous de recette

**Rôle :** secrétaire ou assistant (et médecin en contrôle si souhaité).

1. Choisir **Nouveau rendez-vous**.
2. Rechercher le patient synthétique autorisé ou en créer un selon le protocole du responsable.
3. Saisir une date/heure future de test, le type et les renseignements requis.
4. Relire patient, date et heure; enregistrer.
5. Retrouver le rendez-vous dans l’agenda Jour et Semaine.

**Attendu :** validation des champs requis; le rendez-vous apparaît une seule fois au bon créneau avec les données saisies. Un créneau refusé ou en conflit donne une explication; ne pas essayer de contourner les contraintes.

#### REC-022 — Modifier et filtrer un rendez-vous

**Rôle :** tous.

1. Ouvrir le rendez-vous REC-021.
2. Modifier un détail non sensible convenu (par exemple l’heure ou une note de recette).
3. Enregistrer, puis appliquer les filtres de statut.

**Attendu :** les modifications sont conservées après rechargement; les filtres ne changent pas le statut.

#### REC-023 — Confirmer l’arrivée et éviter les doublons

**Rôle :** secrétaire ou assistant.

1. Depuis le rendez-vous REC-021, enregistrer une arrivée avec l’action prévue.
2. Ouvrir **File d’attente**.
3. Vérifier que le patient figure une seule fois et que le rendez-vous et l’entrée de file sont cohérents.

**Attendu :** l’arrivée est correctement reflétée dans l’agenda et la file; aucune seconde entrée n’est créée automatiquement ou manuellement.

#### REC-024 — Annulation ou statut de présence (optionnel)

**Rôle :** tous.

Exécuter uniquement si le responsable autorise l’utilisation d’un rendez-vous distinct créé pour ce test. Tester un statut ou une annulation, puis vérifier le résultat dans l’agenda et l’historique disponible.

**Attendu :** l’état est explicite et cohérent; l’action n’efface pas silencieusement l’historique attendu. Ne pas annuler un rendez-vous utilisé par une autre personne.

### D. File d’attente

#### REC-030 — Rechercher et lire la file

**Rôle :** tous.

1. Ouvrir la file du jour.
2. Rechercher l’entrée d’arrivée REC-023.
3. Parcourir les filtres et les affichages compacts/détaillés ou colonnes, s’ils sont proposés.

**Attendu :** le bon patient et son état sont retrouvés; le changement de présentation ne modifie pas les données.

#### REC-031 — Appeler et faire avancer une entrée

**Rôle :** secrétaire ou assistant pour l’appel; médecin pour démarrer la consultation.

1. Sur l’entrée de test, utiliser l’action d’appel prévue.
2. Vérifier le statut affiché.
3. Si le flux le permet, revenir à l’attente ou transférer au médecin selon la procédure.
4. Avec le compte médecin, démarrer la consultation de cette entrée.

**Attendu :** le statut suit l’action choisie; une consultation s’ouvre pour la bonne entrée. Le testeur n’active pas un appel téléphonique réel et ne démarre pas de consultation sur un patient réel.

#### REC-032 — File vide et erreurs de chargement

**Rôle :** tous.

1. Utiliser une date/filtre sans entrée, si cela est possible sans supprimer de données.
2. Si un message d’erreur apparaît, lire le message et utiliser **Réessayer** une seule fois, si disponible.

**Attendu :** l’état vide est distingué d’une panne de chargement; les erreurs ne sont pas présentées comme une file vide.

### E. Patients et dossier

#### REC-040 — Recherche et identité

**Rôle :** médecin.

1. Ouvrir **Patients**.
2. Rechercher le patient synthétique de recette avec plusieurs critères disponibles.
3. Ouvrir la fiche et vérifier le nom affiché avant de changer d’onglet.

**Attendu :** les résultats correspondent aux critères; le dossier ouvert correspond au patient sélectionné; les états sans données sont compréhensibles.

#### REC-041 — Création et modification d’une fiche synthétique

**Rôle :** médecin; uniquement si la création est autorisée.

1. Rechercher d’abord la personne de test pour éviter un doublon.
2. Créer une fiche fictive avec les seules valeurs nécessaires.
3. Enregistrer et retrouver cette fiche dans l’annuaire.
4. Modifier un champ de test non sensible et vérifier la persistance.

**Attendu :** les champs obligatoires sont signalés; la fiche peut être retrouvée; les données modifiées persistent. En cas d’échec, vérifier l’annuaire avant de recommencer la création.

#### REC-042 — Onglets du dossier et retour

**Rôle :** médecin.

1. Parcourir les onglets disponibles (vue d’ensemble, antécédents, allergies, consultations, documents, ordonnances, rendez-vous, finances et journal selon les données).
2. Revenir à l’annuaire et rouvrir le même dossier.

**Attendu :** chaque onglet affiche ses informations, un état vide ou une erreur distincte; identité et navigation restent cohérentes.

### F. Consultation, documents et suivi

> Ces cas nécessitent une entrée en file de test et un compte médecin. N’utiliser que des valeurs fictives et un contenu de prescription de démonstration explicitement approuvé par le responsable. Le test ne valide pas la pertinence médicale.

#### REC-050 — Ouvrir la bonne consultation

**Rôle :** médecin.

1. Depuis l’entrée REC-023 en file, démarrer la consultation.
2. Vérifier le nom, l’âge affiché si fourni, les alertes et le résumé du dossier.
3. Ne poursuivre que si l’identité est celle du patient de test.

**Attendu :** la bonne entrée et le bon dossier sont liés; un problème d’identité arrête le test immédiatement.

#### REC-051 — Saisie, autosauvegarde et reprise

**Rôle :** médecin.

1. Saisir une courte note fictive portant clairement la mention « TEST » dans les champs de consultation appropriés.
2. Observer l’état de sauvegarde et attendre la confirmation.
3. Actualiser la page ou quitter puis revenir uniquement après confirmation.
4. Vérifier que la saisie est retrouvée.

**Attendu :** l’état d’enregistrement est explicite; les données confirmées persistent. En cas d’erreur, ne pas répéter aveuglément l’action ni poursuivre la finalisation.

**Complément — Modes rapide et complet :**

1. Activer **Mode Rapide** et saisir des notes fictives distinctes dans le motif, l’interrogatoire, l’examen, l’évaluation et la conduite à tenir.
2. Attendre la confirmation de sauvegarde, puis revenir au **Mode complet**.
3. Vérifier que les notes rapides sont toujours présentes et que les notes guidées déjà saisies (y compris évaluation et plan) n’ont pas été remplacées.
4. Dans **Paramètres du cabinet → Identité du cabinet**, choisir le mode rapide comme défaut et enregistrer les paramètres.
5. Ouvrir une nouvelle consultation de test et vérifier qu’elle s’ouvre en mode rapide; revenir ensuite aux paramètres, choisir **Mode complet**, enregistrer puis vérifier la valeur par défaut à une ouverture ultérieure.

**Attendu :** les deux modes affichent et enregistrent le même brouillon; le changement de mode ne supprime ni ne transforme les notes guidées. Le mode d’ouverture par défaut est enregistré pour le compte médecin et vaut **Mode complet** si aucune préférence n’est définie.

#### REC-052 — Navigation entre les étapes et relecture

**Rôle :** médecin.

1. Vérifier que le mode rapide affiche une seule progression à trois jalons : Clinique, Ordonnance et Clôture.
2. Passer en mode complet et vérifier une seule progression à quatre jalons : Motif, Examen, Ordonnance et Clôture & honoraires.
3. Utiliser le bouton principal, les accès du fil d’étapes et **Ctrl/Cmd + Entrée** pour avancer; vérifier que le focus arrive au champ clinique principal à l’ouverture.
4. Vérifier que les sections déjà saisies restent intactes, puis ouvrir la synthèse/relecture avant toute finalisation.

**Attendu :** un seul fil d’étapes est visible; la progression est compréhensible; les saisies ne sont ni effacées ni associées à une autre section; les champs incomplets nécessaires empêchent ou signalent la progression adéquatement.

#### REC-053 — Alerte d’allergie (si données synthétiques disponibles)

**Rôle :** médecin.

1. Utiliser uniquement un patient synthétique préparé par l’administrateur avec une allergie de démonstration.
2. Ouvrir son dossier et la consultation.
3. Vérifier la visibilité de l’alerte dans le bandeau patient et pendant le défilement.
4. Vérifier que le même bloc d’alerte n’est pas répété dans la colonne d’aide clinique.

**Attendu :** l’information signalée est visible dans un seul emplacement d’alerte et reste lisible. Ce test ne demande pas de saisir une allergie ou de conclure sur un risque clinique.

#### REC-054 — Ordonnance et aperçu

**Rôle :** médecin.

1. Ouvrir le flux de prescription de la consultation de test.
2. Utiliser uniquement le médicament ou contenu fictif de démonstration fourni/validé pour la recette.
3. Examiner les champs présents, l’aperçu, l’enregistrement et le document retrouvé.
4. Vérifier l’impression avec l’aperçu ou un export PDF de test, sans envoyer le document.

**Attendu :** les informations saisies restent associées au patient synthétique; l’aperçu reprend les champs attendus; les formats ne coupent pas le contenu. Aucune prescription réelle n’est créée ni transmise.

#### REC-055 — Décision de suivi

**Rôle :** médecin.

1. Pour l’entrée de test, choisir soit « aucun suivi », soit un suivi à organiser, selon le scénario autorisé.
2. Si un suivi est prévu, saisir seulement la date et la consigne fictives convenues.
3. Finaliser uniquement si le responsable a explicitement autorisé la clôture de la consultation de test.
4. Ouvrir **Suivis** et vérifier le résultat.

**Attendu :** un suivi prévu apparaît comme **à organiser**, et non comme rendez-vous confirmé; le choix « aucun suivi » ne crée pas de tâche; la consultation et le suivi restent liés au bon dossier.

#### REC-056 — Finalisation de consultation (optionnel, autorisation requise)

**Rôle :** médecin.

1. N’exécuter ce cas qu’après accord du responsable et relecture des données synthétiques.
2. Contrôler les étapes obligatoires, le tarif de test et la consigne de règlement fictive.
3. Finaliser une seule fois.
4. Vérifier l’état de la consultation, la file, le dossier et, si créé, le suivi.

**Attendu :** l’application confirme un seul résultat final cohérent dans les vues concernées. Ne pas utiliser un paiement réel; ne pas répéter l’action si la confirmation tarde.

### G. Suivis

#### REC-060 — Affichage et historique des suivis

**Rôle :** médecin, secrétaire ou assistant.

1. Ouvrir **Suivis** et parcourir **À organiser** et **Historique**.
2. Rechercher la tâche fictive créée par REC-055, si le cas a été autorisé.
3. Vérifier type, échéance et consigne disponibles.

**Attendu :** les suivis actifs et historiques sont séparés et identifiables; une absence de tâches est présentée comme un état vide.

#### REC-061 — Organiser ou reporter une suite

**Rôle :** secrétaire ou assistant.

1. Depuis la tâche fictive, ouvrir la planification.
2. Choisir un créneau de test, vérifier le patient et confirmer une seule fois.
3. Contrôler l’agenda et l’état du suivi.

**Attendu :** le rendez-vous apparaît dans l’agenda; le suivi passe à l’état cohérent; il ne crée pas d’entrée dans la file avant l’arrivée du patient.

#### REC-062 — Issues de contact

**Rôle :** secrétaire ou assistant.

Tester uniquement sur une tâche de test : issue organisée, à rappeler/injoignable ou refus, si ces options sont proposées. Vérifier l’historique et la prochaine action.

**Attendu :** l’issue sélectionnée est enregistrée clairement; l’historique reste lisible; aucune issue n’est marquée à tort.

### H. Comptabilité

> Tout règlement de recette doit être fictif, créé dans l’environnement non-production, et réalisé avec l’accord du responsable. Ne pas saisir un numéro de carte, une donnée bancaire réelle ou un paiement effectivement encaissé.

#### REC-070 — Consultation des montants et filtres

**Rôle :** tous.

1. Ouvrir **Comptabilité**.
2. Changer la période ou les filtres disponibles.
3. Comparer les indicateurs au contenu de la liste, en tenant compte des filtres.

**Attendu :** les filtres sont visibles; les totaux évoluent de manière cohérente; une erreur de chargement n’est pas présentée comme un total nul.

#### REC-071 — Saisie d’un règlement de démonstration

**Rôle :** médecin, secrétaire ou assistant selon les droits configurés.

1. Utiliser uniquement une facture ou un solde fictif dédié à la recette.
2. Contrôler patient, payeur, montant et mode de paiement de test.
3. Confirmer une seule fois.
4. Vérifier l’écriture, le solde restant et l’historique après rechargement.

**Attendu :** une seule écriture du montant de test est présente; le solde est recalculé de manière cohérente; le reçu éventuel reprend les bonnes informations.

#### REC-072 — Double clic, délai et prévention des doublons

Ne pas provoquer un paiement réel ou une erreur serveur volontaire. Sur un règlement fictif seulement, vérifier que le bouton empêche les confirmations répétées pendant l’enregistrement et que l’état peut être contrôlé après un délai.

**Attendu :** aucune seconde écriture involontaire. Si le résultat est incertain, arrêter et demander au responsable avant tout nouvel essai.

### I. Actes, modèles et paramètres

#### REC-080 — Catalogue d’actes médicaux

**Rôle :** médecin.

1. Ouvrir **Actes médicaux** et rechercher une suggestion.
2. Tester les filtres de lieu/type disponibles.
3. Créer un acte avec libellé de test et tarif fictif seulement si autorisé.
4. Le retrouver, le modifier, puis consulter l’archive si le responsable autorise l’archivage.

**Attendu :** une suggestion n’est pas enregistrée avant confirmation; l’acte créé figure une seule fois dans le catalogue; le tarif vide et le code facultatif sont gérés explicitement; l’archivage ne fait pas disparaître silencieusement l’historique.

#### REC-082 — Facturation rapide d’un acte à la clôture

**Rôle :** médecin. **Environnement :** recette uniquement, avec un patient et un acte fictifs.

1. Préparer dans le catalogue un acte de test actif avec un tarif connu.
2. Ouvrir une consultation de test et ajouter un acte du catalogue; modifier son tarif unitaire et sa quantité, puis contrôler le recalcul.
3. Ajouter une prestation avec un montant personnalisé, puis vérifier que les raccourcis de consultation et d’actes ajoutent la bonne ligne.
4. Vérifier le total brut, appliquer une réduction fictive et contrôler le net; essayer **À encaisser**, **Différé** et **Gratuit**.
5. Si la clôture est autorisée, terminer la consultation de test et vérifier que les honoraires, l’acte et la ligne libre apparaissent séparément sur la facture.
6. Vérifier que l’ajustement du tarif n’a pas modifié le tarif par défaut du catalogue, puis rouvrir une consultation non finalisée et contrôler la restauration sans doublon.

**Attendu :** les tarifs ajustés ne modifient que la facture en cours; quantités, lignes libres, total brut, réduction et net restent cohérents; les lignes de facture sont persistées et restaurées. Ne pas finaliser un dossier réel ni déclencher d’encaissement réel pendant cette recette.

#### REC-081 — Modèles d’ordonnance

**Rôle :** médecin.

1. Parcourir la liste et utiliser sa recherche/filtres.
2. Si autorisé, créer un modèle explicitement fictif avec un titre `REC-...`.
3. Le rouvrir, vérifier sa persistance et le modifier ou désactiver selon les commandes disponibles.

**Attendu :** la liste distingue les états pertinents; les actions sont confirmées; le modèle de recette ne peut pas être confondu avec un modèle clinique de production.

#### REC-082 — Accueil des paramètres et recherche

**Rôle :** médecin.

1. Ouvrir **Paramètres**.
2. Repérer les groupes Cabinet, Documents et communication, Système.
3. Rechercher un terme et ouvrir le résultat correspondant.

**Attendu :** la recherche mène à la rubrique attendue; les catégories et descriptions sont lisibles; aucun changement n’est enregistré par la seule navigation.

#### REC-083 — Aperçu et impression A5/A4

**Rôle :** médecin; périphérique de test si impression physique autorisée.

1. Ouvrir les réglages d’impression.
2. Sélectionner A5 puis A4 et observer l’aperçu réel pour chaque format.
3. Vérifier que le document tient dans le format et que les éléments importants ne sont pas masqués.
4. Lancer uniquement l’impression test de démonstration; dans la fenêtre native, contrôler papier, orientation et échelle.
5. Préférer une sortie PDF de test ou annuler la boîte de dialogue après vérification si aucune impression n’est demandée.

**Attendu :** l’aperçu change réellement avec A5/A4; l’indicateur de dimensions ne masque pas le document; l’imprimante est choisie par le navigateur/système. Aucun document patient n’est imprimé.

#### REC-084 — Réglage modifiable et persistance (avec autorisation)

Ne modifier qu’une préférence non critique de test, avec la valeur initiale notée et l’accord du responsable. Observer les états modification/enregistrement/enregistré/erreur, recharger, puis restaurer la valeur initiale si cela a été demandé.

**Attendu :** l’état final est explicite et la valeur persiste après rechargement; une erreur ne ressemble pas à une sauvegarde réussie. Ne pas tester l’effacement, la restauration ou l’importation de données.

### J. Statistiques et documents partagés

#### REC-090 — Statistiques

**Rôle :** médecin.

1. Ouvrir **Statistiques**.
2. Changer les dates et filtres disponibles.
3. Comparer l’affichage au périmètre de données synthétiques couvert par la période.

**Attendu :** la période et les filtres sélectionnés sont explicites; les graphiques se mettent à jour ou affichent un état vide/erreur compréhensible. Ne pas interpréter les statistiques comme une certification comptable.

#### REC-091 — Lien partagé d’ordonnance (si activé)

**Rôle :** médecin pour créer un lien de test; navigateur privé/non connecté pour le consulter.

1. Utiliser exclusivement une ordonnance de démonstration dans l’environnement de recette.
2. Générer un partage si cette fonction est activée et copier le lien uniquement dans l’espace de test convenu.
3. Ouvrir le lien dans une fenêtre privée/non connectée.
4. Vérifier les informations visibles, puis révoquer/laisser expirer le lien selon la consigne.

**Attendu :** le lien ouvre uniquement le document prévu; aucun autre dossier ou renseignement n’est exposé; les états invalide/expiré sont explicites. Ne pas transmettre le lien à un vrai destinataire.

### K. Responsive, accessibilité et robustesse

#### REC-100 — Affichage ordinateur, tablette et téléphone

**Rôle :** tous.

1. Ouvrir au minimum Accueil, Agenda, File et une page longue sur grand écran.
2. Réduire ensuite la largeur à tablette puis téléphone, ou utiliser les appareils convenus.
3. Tester menu, recherche, filtres, formulaires, boutons d’action et navigation basse.
4. Faire défiler le contenu jusqu’en bas et revenir en haut.

**Attendu :** aucun contenu essentiel n’est coupé ou recouvert; les actions restent atteignables; le défilement est cohérent; le menu latéral de bureau ne chevauche pas le contenu.

#### REC-101 — Clavier et lisibilité

1. Sans souris, naviguer au clavier par Tab et Maj+Tab.
2. Vérifier un formulaire, un dialogue et une commande de menu.
3. Utiliser Entrée/Espace pour activer un contrôle lorsque c’est naturel; fermer le dialogue avec Échap si applicable.
4. Repérer les champs sans libellé, le focus invisible, les textes coupés ou les boutons sans nom compréhensible.

**Attendu :** le focus reste visible et suit un ordre logique; les contrôles sont activables; l’utilisateur peut fermer les dialogues sans perdre accidentellement une saisie.

#### REC-102 — Validation et messages d’erreur

1. Sur un formulaire de test, essayer d’enregistrer sans remplir un champ obligatoire.
2. Si un champ numérique est présent, saisir une valeur manifestement invalide seulement si le formulaire la rejette sans enregistrer.
3. Lire le message, corriger la valeur et terminer le cas normalement.

**Attendu :** le champ ou l’erreur est identifiable; aucune donnée invalide n’est enregistrée silencieusement; le message indique quoi faire. N’essayez pas d’injection, de scripts, de fichiers hostiles ou de contournement de permissions.

#### REC-103 — Erreur réseau (optionnel, coordination requise)

À effectuer uniquement si le responsable peut fournir une procédure contrôlée sans risque de perte de données. Pendant un écran de lecture, observer le message hors connexion puis rétablir le réseau. Ne pas couper le réseau pendant une sauvegarde ou une finalisation.

**Attendu :** l’indisponibilité est signalée et ne se présente pas comme une sauvegarde confirmée; les données redeviennent accessibles après rétablissement ou une action de reprise sûre.

## 6. Contrôle de fin de parcours

Avant de déclarer la recette terminée, vérifier :

- [ ] tous les cas obligatoires ont un statut;
- [ ] tout échec a un rapport d’anomalie séparé;
- [ ] les créations/modifications de test sont retrouvables et identifiées comme telles;
- [ ] aucune action n’a été répétée sans contrôler son résultat;
- [ ] les tests non autorisés ou bloqués sont notés, pas contournés;
- [ ] les données de test ont été laissées en place ou nettoyées uniquement selon l’instruction du responsable;
- [ ] aucun nom, document clinique, téléphone, CIN, capture ou lien patient réel n’a été inclus dans le compte rendu.

### Synthèse de la session

| Mesure | Nombre |
|---|---:|
| Cas exécutés | |
| Réussis | |
| Échecs | |
| Bloqués | |
| Non testés / non applicables | |
| Anomalies critiques / bloquantes | |

**Conclusion du testeur :**  
`[ ] Acceptable pour le périmètre testé` · `[ ] Acceptable sous réserve` · `[ ] Non acceptable`

**Réserves / modules non testés :**

-

## 7. Fiche de remontée d’une anomalie

Créer une fiche par problème. Décrire les faits, pas une hypothèse sur la cause.

```text
Référence :
Titre court :
Sévérité : Bloquant / Majeur / Modéré / Mineur
Cas de test :
Date et heure :
Environnement / version :
Rôle :
Navigateur / appareil :

Préconditions (sans donnée personnelle) :
Étapes exactes pour reproduire :
Résultat obtenu :
Résultat attendu :
Fréquence : Toujours / Intermittent / Une seule fois

Impact sur le travail :
Message affiché (copie exacte, sans donnée patient) :
Capture jointe : Oui / Non
Contournement éventuel :
```

### Sévérité suggérée

- **Bloquant :** impossible de se connecter ou d’effectuer le parcours essentiel; risque de perte, doublon ou divulgation de données.
- **Majeur :** une fonction centrale est inutilisable ou enregistre un résultat erroné sans contournement raisonnable.
- **Modéré :** un parcours fonctionne avec difficulté ou un contournement sûr existe.
- **Mineur :** défaut visuel, libellé ou détail sans impact notable sur l’action.

Ne jamais joindre une capture contenant une vraie identité, un dossier, un numéro de téléphone, un code d’accès ou un document clinique. Sur un compte rendu non sécurisé, masquer ces éléments avant l’envoi.

## 8. Références du guide utilisateur

- [Démarrer et naviguer](../guide-utilisateur/01-demarrer-et-navigation.md)
- [Agenda](../guide-utilisateur/03-agenda.md)
- [File d’attente](../guide-utilisateur/04-file-attente.md)
- [Suivis](../guide-utilisateur/05-suivis.md)
- [Patients et dossiers](../guide-utilisateur/06-patients-et-dossiers.md)
- [Consultation](../guide-utilisateur/07-consultation.md)
- [Ordonnances et modèles](../guide-utilisateur/08-ordonnances-et-modeles.md)
- [Documents et partage](../guide-utilisateur/09-documents-et-partage.md)
- [Comptabilité](../guide-utilisateur/10-comptabilite.md)
- [Statistiques](../guide-utilisateur/11-statistiques.md)
- [Actes et tarifs](../guide-utilisateur/14-actes-medicaux.md)
- [Paramètres](../guide-utilisateur/12-parametres.md)
- [Sécurité et dépannage](../guide-utilisateur/13-connexion-securite-depannage.md)
