# 7. Consultation

## Ouvrir le bon contexte

Une consultation s’ouvre depuis la file d’attente. Vérifiez le patient, l’épisode ouvert et le résumé du dossier avant toute saisie. Si le patient n’est pas le bon, quittez la consultation et faites corriger l’entrée de file.

## Progression par étapes

La consultation présente une progression en étapes. Selon le parcours activé, les étapes couvrent notamment :

1. Motif / informations d’accueil
2. Anamnèse et symptômes
3. Examen clinique
4. Évaluation / diagnostic
5. Conduite à tenir et plan
6. Médicaments, ordonnances et documents
7. Relecture et finalisation

Les libellés ou l’ordre peuvent varier selon la version. Les étapes déjà parcourues ne garantissent pas que leur contenu est enregistré; surveillez l’indicateur de sauvegarde.

### Choisir le mode de saisie

Le contrôle segmenté de l’en-tête permet de basculer à tout moment entre :

- **Mode Rapide :** formulaire clinique condensé regroupant motif, interrogatoire, examen, évaluation et conduite à tenir sur une vue. Il réduit les suggestions et questionnaires guidés.
- **Mode complet :** parcours guidé avec motifs, questions, références, constantes et outils de documentation détaillés.

Le mode d’ouverture par défaut se règle dans **Paramètres du cabinet → Identité du cabinet → Mode de consultation par défaut**. Cette préférence est propre au compte médecin; le mode complet est le choix par défaut. Dans une consultation en cours, le contrôle segmenté permet de changer temporairement de mode. Changer de mode ne remplace pas les notes déjà saisies : les notes structurées du mode complet restent conservées et consultables dans le mode rapide. Les deux modes utilisent le même brouillon et la même sauvegarde.

Le fil d’étapes est unique : trois jalons en mode rapide (**Clinique, Ordonnance, Clôture**) et quatre en mode complet (**Motif, Examen, Ordonnance, Clôture & honoraires**). En mode rapide, **Continuer vers l’ordonnance** enregistre d’abord le brouillon. **Ctrl/Cmd + Entrée** déclenche l’action principale de l’étape, y compris la clôture lorsque le dossier est prêt. Le champ clinique principal reçoit le focus à l’ouverture de la saisie.

Le mode rapide n’automatise ni diagnostic ni décision médicale. Le panneau d’aide clinique à droite peut être masqué puis réaffiché avec le bouton dédié de l’en-tête. L’identité et l’alerte allergies restent dans le bandeau patient; elles ne sont pas répétées dans le panneau d’aide.

## Saisie clinique

- Complétez les sections pertinentes au cas, sous la responsabilité du médecin.
- Utilisez les champs dédiés plutôt qu’un texte libre lorsqu’ils existent.
- Les allergies et antécédents peuvent être signalés en haut du parcours; consultez la fiche si nécessaire.
- Les valeurs proposées par l’application sont des options à vérifier, pas des décisions médicales automatiques.
- Ne saisissez pas de données de démonstration dans un dossier réel.

## Sauvegarde et statut

Un indicateur visible distingue les états de sauvegarde, par exemple en cours et sauvegardé. Si une erreur est signalée, conservez le contexte, réessayez seulement après avoir vérifié que la dernière modification n’a pas déjà été enregistrée, et ne fermez pas avant d’avoir obtenu un état confirmé.

Les contenus peuvent être sauvegardés progressivement. La confirmation de sauvegarde n’équivaut pas forcément à une consultation finalisée.

## Relecture et clôture

1. Utilisez la vue de relecture pour contrôler motif, examen, évaluation, plan et documents.
2. Vérifiez la bonne identité et les allergies.
3. Corrigez toute incohérence avant la finalisation.
4. Choisissez l’action de finalisation proposée uniquement lorsque la consultation est prête.
5. Vérifiez le statut final et le dossier patient après retour.

Une consultation terminée peut être verrouillée ou soumise à une procédure de correction. Ne modifiez pas directement des éléments finalisés si le workflow ne le permet pas.

Dans **Suite à prévoir**, **Aucune suite** est sélectionnée par défaut et signalée en vert. Choisissez **Prévoir un RDV** lorsqu’un suivi doit être organisé.

Dans **Actes & tarification**, le tarif de consultation est prérempli depuis l’acte actif correspondant à la spécialité du cabinet; à défaut, un tarif générique de consultation est utilisé s’il existe. Un montant positif déjà enregistré pour la consultation reste prioritaire; un montant nul est traité comme non renseigné et remplacé par le tarif du catalogue. Vérifiez et modifiez le montant si nécessaire avant de clôturer.

## Préparer une suite

La décision de suivi ou d’orientation peut créer un suivi à organiser. Confirmez qu’il est visible dans **Suivis** et communiquez à l’équipe ce qui doit être planifié, sans considérer ce suivi comme un rendez-vous déjà confirmé.

Les captures des étapes de consultation, de relecture clinique et de finalisation restent à réaliser : aucune consultation active n’était disponible dans la session observée. Aucun contenu clinique n’a été créé pour illustrer ces états.
