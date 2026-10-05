# MediCare ERP 
## À propos

MediCare ERP est un système de gestion médicale moderne, simple et offline-first pour les cabinets médicaux.

## Fonctionnalités

- Gestion d'agenda et rendez-vous
- Gestion des patients et dossiers médicaux
- File d'attente intelligente
- Comptabilité et facturation
- Synchronisation des données

## Technologies utilisées

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

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

Le parcours de consultation comporte trois étapes guidées : compte rendu, ordonnance facultative avec les alertes d'allergies visibles, puis tarification. Les tarifs standards vont de 100 à 1 000 DH ; un tarif personnalisé ajouté à la liste est conservé dans les paramètres du cabinet. Les réductions en pourcentage ou en montant fixe sont calculées avant affichage du net à facturer. Appliquez aussi la migration `20261005000100_add_consultation_pricing.sql` à Supabase avant d'utiliser la finalisation du tarif : elle enregistre le montant brut et la réduction sur la facture, synchronise le net avec la file d'attente et évite de créer une deuxième facture.

Appliquez la migration `20261004232000_create_clinical_terms.sql` seulement si vous souhaitez aussi conserver un catalogue CSV local. L'import CSV de secours requiert les colonnes `code` et `label`; `category_id`, `synonyms` et `source_release` sont facultatives et les synonymes sont séparés par `|`. Configurez `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans l'environnement sécurisé du terminal, puis lancez :

```sh
npm run import:icd11 -- chemin/vers/icd11.csv
```

L'import fait des upserts par code, en lots de 500. Gardez la clé `service_role` uniquement dans l'environnement local sécurisé ; ne la mettez jamais dans le code du navigateur ni dans un fichier versionné. La recherche de consultation interroge ensuite les entrées importées à partir de deux caractères.

## Licence

Propriétaire - Tous droits réservés
