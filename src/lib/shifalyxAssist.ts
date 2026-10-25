export interface HelpGuide {
  title: string;
  steps: string[];
  keywords: string[];
}

export interface HelpTroubleshooting {
  question: string;
  answer: string;
  keywords: string[];
}

export interface HelpContextDefinition {
  routePattern: string;
  title: string;
  description: string;
  suggestedGuides: HelpGuide[];
  usefulDestinations: string[];
  contextualSearchHints: string[];
  troubleshooting: HelpTroubleshooting[];
  prerequisites?: string[];
}

const helpContexts: HelpContextDefinition[] = [
  {
    routePattern: "/consultations/:queueId",
    title: "Consultation",
    description: "Documentez la visite au fil de l’échange, puis vérifiez les décisions avant de la clôturer.",
    suggestedGuides: [
      { title: "Documenter une consultation", steps: ["Complétez le motif et l’interrogatoire avec les éléments rapportés.", "Consignez l’examen et votre évaluation dans les rubriques adaptées.", "Relisez le résumé avant de passer à l’ordonnance ou à la clôture."], keywords: ["motif", "interrogatoire", "examen", "diagnostic", "relecture"] },
      { title: "Créer une ordonnance ou un document", steps: ["Passez à l’étape Ordonnance après la documentation clinique.", "Choisissez le type de document et ajoutez les lignes nécessaires.", "Vérifiez le contenu et les alertes avant de créer le document."], keywords: ["ordonnance", "prescription", "document", "allergie"] },
      { title: "Clôturer et organiser la suite", steps: ["Vérifiez les rubriques cliniques et les documents.", "Choisissez explicitement une suite de soins ou « Aucune suite nécessaire ».", "Vérifiez le tarif et la consigne de règlement avant de confirmer."], keywords: ["clôture", "tarif", "paiement", "suivi", "contrôle"] },
    ],
    usefulDestinations: ["/file-attente", "/patients", "/suivis", "/agenda"],
    contextualSearchHints: ["documenter une consultation", "créer une ordonnance", "clôturer la visite", "organiser un contrôle"],
    troubleshooting: [
      { question: "La consultation ne se clôture pas.", answer: "Vérifiez les messages affichés, choisissez une décision pour la suite de soins et réessayez après l’enregistrement des informations.", keywords: ["clôture", "enregistrer", "erreur"] },
      { question: "Une rubrique clinique semble vide.", answer: "Les suggestions ne remplacent pas une saisie médicale. Revenez à l’étape Compte rendu et renseignez les éléments utiles à cette visite.", keywords: ["rubrique", "vide", "clinique", "saisie"] },
    ],
    prerequisites: ["La consultation doit être ouverte depuis une entrée de la file d’attente."],
  },
  {
    routePattern: "/patients/:id",
    title: "Dossier patient",
    description: "Consultez l’identité et l’historique du dossier. Vérifiez le patient avant toute modification.",
    suggestedGuides: [
      { title: "Retrouver une information du dossier", steps: ["Vérifiez l’identité affichée en haut du dossier.", "Parcourez les rubriques du dossier et son historique de soins.", "Ouvrez une consultation ou un document pour en consulter les détails."], keywords: ["historique", "dossier", "document", "consultation"] },
      { title: "Mettre à jour le dossier", steps: ["Ouvrez la rubrique concernée.", "Modifiez uniquement les informations confirmées.", "Enregistrez et vérifiez le résultat dans le dossier."], keywords: ["modifier", "identité", "coordonnées", "enregistrer"] },
    ],
    usefulDestinations: ["/patients", "/file-attente", "/agenda"],
    contextualSearchHints: ["historique patient", "modifier un dossier", "retrouver un document"],
    troubleshooting: [
      { question: "Le dossier patient ne se charge pas.", answer: "Vérifiez la connexion puis revenez à la liste Patients et rouvrez le dossier. Si le problème persiste, préparez une demande au support sans y inclure de données médicales.", keywords: ["chargement", "indisponible", "erreur"] },
    ],
  },
  {
    routePattern: "/patients",
    title: "Patients",
    description: "Retrouvez les dossiers du cabinet et ouvrez le dossier correspondant au patient recherché.",
    suggestedGuides: [
      { title: "Rechercher un patient", steps: ["Utilisez la recherche de la liste pour filtrer les dossiers.", "Vérifiez les éléments d’identité avant d’ouvrir un résultat.", "Sélectionnez le patient pour consulter son dossier."], keywords: ["recherche", "patient", "dossier"] },
      { title: "Accéder rapidement à un dossier", steps: ["Ouvrez la recherche globale avec Ctrl+K ou ⌘K.", "Saisissez un nom, un téléphone ou un CIN.", "Sélectionnez le résultat après vérification de l’identité."], keywords: ["recherche globale", "raccourci", "CIN", "téléphone"] },
    ],
    usefulDestinations: ["/file-attente", "/agenda"],
    contextualSearchHints: ["rechercher un patient", "ouvrir un dossier", "créer un patient"],
    troubleshooting: [
      { question: "Aucun résultat ne correspond à la recherche.", answer: "Vérifiez l’orthographe et essayez un autre élément d’identification. La recherche globale Ctrl+K permet également de retrouver les dossiers accessibles.", keywords: ["aucun résultat", "recherche", "patient"] },
    ],
  },
  {
    routePattern: "/agenda",
    title: "Agenda",
    description: "Consultez les rendez-vous, leur présence et les actions de confirmation du cabinet.",
    suggestedGuides: [
      { title: "Consulter les rendez-vous", steps: ["Choisissez la date ou la période à afficher.", "Ouvrez un rendez-vous pour consulter ses informations.", "Vérifiez le statut et les éventuelles actions de présence."], keywords: ["planning", "date", "rendez-vous"] },
      { title: "Confirmer une présence", steps: ["Repérez le rendez-vous concerné et vérifiez l’identité.", "Utilisez l’action adaptée au statut communiqué par l’équipe.", "Vérifiez que la présence ou l’absence est reflétée dans l’agenda."], keywords: ["présence", "arrivée", "confirmation", "retard"] },
    ],
    usefulDestinations: ["/file-attente", "/suivis", "/patients"],
    contextualSearchHints: ["rendez-vous du jour", "confirmer une présence", "ouvrir la file d’attente"],
    troubleshooting: [
      { question: "Un rendez-vous n’apparaît pas.", answer: "Vérifiez la date sélectionnée et les filtres de l’agenda, puis actualisez la vue.", keywords: ["rendez-vous", "date", "filtre", "agenda"] },
    ],
  },
  {
    routePattern: "/file-attente",
    title: "File d’attente",
    description: "Suivez l’arrivée des patients et leur progression dans le parcours du cabinet.",
    suggestedGuides: [
      { title: "Accueillir un patient", steps: ["Recherchez ou sélectionnez le patient concerné.", "Vérifiez son identité et les informations de passage.", "Ajoutez-le à la file selon le parcours prévu par le cabinet."], keywords: ["accueil", "arrivée", "patient", "check-in"] },
      { title: "Démarrer une consultation", steps: ["Repérez le patient dans la file et confirmez son identité.", "Ouvrez l’action de consultation depuis sa ligne.", "Complétez le compte rendu puis relisez-le avant clôture."], keywords: ["consultation", "démarrer", "file"] },
    ],
    usefulDestinations: ["/agenda", "/patients", "/suivis"],
    contextualSearchHints: ["accueillir un patient", "démarrer une consultation", "rechercher un dossier"],
    troubleshooting: [
      { question: "Le patient n’est pas dans la file.", answer: "Vérifiez d’abord l’agenda et la date du passage. Un rendez-vous planifié n’est pas nécessairement enregistré comme une arrivée.", keywords: ["absent", "file", "rendez-vous", "arrivée"] },
    ],
  },
  {
    routePattern: "/suivis",
    title: "Suivis",
    description: "Retrouvez les suites de soins à organiser ou à finaliser après une consultation.",
    suggestedGuides: [
      { title: "Traiter un suivi à organiser", steps: ["Filtrez les tâches selon leur statut et leur échéance.", "Ouvrez la tâche pour relire son contexte non sensible.", "Planifiez ou mettez à jour son statut selon la décision de l’équipe."], keywords: ["tâche", "contrôle", "échéance", "statut"] },
      { title: "Organiser un contrôle", steps: ["Vérifiez que le patient souhaite et peut planifier le contrôle.", "Choisissez une date disponible dans l’agenda.", "Confirmez la création du rendez-vous avec l’équipe."], keywords: ["contrôle", "agenda", "rendez-vous", "planifier"] },
    ],
    usefulDestinations: ["/agenda", "/file-attente", "/patients"],
    contextualSearchHints: ["contrôles à organiser", "planifier un suivi", "suivi en attente"],
    troubleshooting: [
      { question: "Un suivi n’apparaît pas dans l’agenda.", answer: "Une suite de soins à organiser n’est pas un rendez-vous confirmé. Elle apparaît dans les suivis jusqu’à sa planification.", keywords: ["agenda", "suivi", "rendez-vous", "confirmé"] },
    ],
  },
  {
    routePattern: "/comptabilite",
    title: "Comptabilité",
    description: "Consultez les règlements et soldes, puis associez chaque paiement à la bonne facture.",
    suggestedGuides: [
      { title: "Retrouver un règlement", steps: ["Choisissez la période ou le filtre adapté.", "Recherchez la facture ou le patient à l’aide des informations disponibles.", "Vérifiez le montant et le solde avant toute action."], keywords: ["paiement", "règlement", "facture", "solde"] },
      { title: "Enregistrer un encaissement", steps: ["Ouvrez la facture concernée et vérifiez le solde restant.", "Saisissez le montant effectivement reçu.", "Confirmez l’encaissement et vérifiez le nouveau solde."], keywords: ["encaisser", "montant", "facture"] },
    ],
    usefulDestinations: ["/patients", "/file-attente", "/statistiques"],
    contextualSearchHints: ["règlements reçus", "encaisser une facture", "consulter un solde"],
    troubleshooting: [
      { question: "Le solde semble incorrect.", answer: "Vérifiez les encaissements associés et la période sélectionnée. Ne créez pas un second paiement avant d’avoir contrôlé l’historique de la facture.", keywords: ["solde", "paiement", "facture", "doublon"] },
    ],
  },
  {
    routePattern: "/statistiques",
    title: "Statistiques",
    description: "Suivez l’activité du cabinet à partir des consultations, rendez-vous et données disponibles.",
    suggestedGuides: [
      { title: "Lire les indicateurs", steps: ["Choisissez la période pertinente.", "Vérifiez les filtres actifs et les libellés des indicateurs.", "Comparez des périodes équivalentes avant de tirer une conclusion."], keywords: ["indicateur", "rapport", "activité", "période"] },
    ],
    usefulDestinations: ["/agenda", "/comptabilite", "/file-attente"],
    contextualSearchHints: ["activité du cabinet", "indicateurs de période", "statistiques rendez-vous"],
    troubleshooting: [
      { question: "Les chiffres sont incomplets.", answer: "Vérifiez la période sélectionnée et l’état de chargement. Les indicateurs reflètent les données enregistrées dans l’application.", keywords: ["chiffres", "données", "période", "chargement"] },
    ],
  },
  {
    routePattern: "/parametres",
    title: "Paramètres du cabinet",
    description: "Configurez l’identité, l’équipe et les règles de fonctionnement du cabinet.",
    suggestedGuides: [
      { title: "Modifier un réglage du cabinet", steps: ["Ouvrez la rubrique de paramètres concernée.", "Vérifiez les champs avant de les modifier.", "Enregistrez explicitement et contrôlez le résultat affiché."], keywords: ["configuration", "réglage", "enregistrer"] },
      { title: "Gérer les accès de l’équipe", steps: ["Ouvrez la rubrique de gestion de l’équipe.", "Vérifiez le rôle et le statut du compte concerné.", "Appliquez uniquement les changements autorisés pour votre rôle."], keywords: ["équipe", "utilisateur", "rôle", "accès"] },
    ],
    usefulDestinations: ["/actes-medicaux", "/modeles-prescription", "/agenda"],
    contextualSearchHints: ["configurer le cabinet", "gérer les accès", "modifier les horaires"],
    troubleshooting: [
      { question: "Un réglage n’est pas conservé.", answer: "Vérifiez que l’enregistrement a été confirmé et que le champ est valide. Si une erreur apparaît, copiez son message dans la demande au support.", keywords: ["enregistrement", "réglage", "erreur"] },
    ],
  },
  {
    routePattern: "/actes-medicaux",
    title: "Actes médicaux",
    description: "Gérez les actes proposés par le cabinet et leurs tarifs.",
    suggestedGuides: [
      { title: "Créer ou modifier un acte", steps: ["Recherchez l’acte avant d’en créer un nouveau.", "Vérifiez son libellé et son tarif.", "Enregistrez puis contrôlez sa disponibilité dans le parcours de soins."], keywords: ["acte", "catalogue", "tarif", "créer"] },
    ],
    usefulDestinations: ["/parametres", "/modeles-prescription"],
    contextualSearchHints: ["modifier le tarif d’un acte", "créer un acte", "catalogue d’actes"],
    troubleshooting: [
      { question: "Un acte n’est pas proposé pendant la consultation.", answer: "Vérifiez que l’acte est enregistré et actif dans le catalogue, puis actualisez le parcours de consultation.", keywords: ["acte", "consultation", "catalogue"] },
    ],
  },
  {
    routePattern: "/modeles-prescription",
    title: "Modèles d’ordonnance",
    description: "Préparez des modèles réutilisables, puis vérifiez chaque prescription pour le patient concerné.",
    suggestedGuides: [
      { title: "Utiliser un modèle d’ordonnance", steps: ["Choisissez un modèle adapté à la situation clinique.", "Vérifiez et personnalisez chaque ligne avant utilisation.", "Contrôlez les allergies et les instructions avant de valider le document."], keywords: ["modèle", "ordonnance", "prescription", "allergie"] },
      { title: "Créer un modèle", steps: ["Composez une prescription représentative des usages du cabinet.", "Enregistrez-la comme modèle avec un libellé explicite.", "Relisez le modèle avant sa prochaine utilisation."], keywords: ["créer", "enregistrer", "modèle"] },
    ],
    usefulDestinations: ["/file-attente", "/actes-medicaux", "/parametres"],
    contextualSearchHints: ["créer un modèle", "utiliser une ordonnance", "prescription"],
    troubleshooting: [
      { question: "Un modèle enregistré est introuvable.", answer: "Vérifiez la catégorie et le libellé du modèle, puis actualisez la page. Les modèles locaux peuvent être liés à cet appareil.", keywords: ["modèle", "introuvable", "enregistré"] },
    ],
  },
  {
    routePattern: "/",
    title: "Accueil",
    description: "Le tableau de bord rassemble les priorités du jour et les accès aux espaces du cabinet.",
    suggestedGuides: [
      { title: "Commencer la journée", steps: ["Consultez les rendez-vous prévus dans l’agenda.", "Vérifiez les patients présents ou en attente.", "Ouvrez le dossier ou le suivi qui nécessite une action."], keywords: ["journée", "agenda", "file", "priorité"] },
      { title: "Retrouver une rubrique ou un patient", steps: ["Ouvrez la recherche globale avec Ctrl+K ou ⌘K.", "Saisissez le nom d’une rubrique ou les informations du dossier.", "Sélectionnez une destination autorisée par votre rôle."], keywords: ["recherche", "raccourci", "patient", "navigation"] },
    ],
    usefulDestinations: ["/agenda", "/file-attente", "/patients", "/suivis"],
    contextualSearchHints: ["priorités du jour", "rechercher un patient", "ouvrir l’agenda"],
    troubleshooting: [
      { question: "Une rubrique n’est pas visible dans le menu.", answer: "Les rubriques disponibles dépendent du rôle associé au compte. Contactez l’administrateur du cabinet si cet accès est nécessaire.", keywords: ["rubrique", "menu", "rôle", "accès"] },
    ],
  },
];

export const getHelpContext = (pathname: string): HelpContextDefinition => {
  const pathSegments = pathname.split("/").filter(Boolean);
  const context = helpContexts.find(({ routePattern }) => {
    const patternSegments = routePattern.split("/").filter(Boolean);
    return patternSegments.length === pathSegments.length
      && patternSegments.every((segment, index) => segment.startsWith(":") || segment === pathSegments[index]);
  });
  return context ?? {
    routePattern: "*",
    title: "Espace de travail",
    description: "Retrouvez des repères d’utilisation et les accès correspondant à votre rôle.",
    suggestedGuides: [{ title: "Naviguer dans Shifalyx", steps: ["Utilisez le menu latéral ou mobile pour ouvrir une rubrique.", "La recherche globale Ctrl+K ou ⌘K donne accès aux rubriques et dossiers autorisés."], keywords: ["navigation", "recherche"] }],
    usefulDestinations: ["/", "/agenda", "/file-attente"],
    contextualSearchHints: ["rechercher une rubrique", "naviguer dans Shifalyx"],
    troubleshooting: [],
  };
};
