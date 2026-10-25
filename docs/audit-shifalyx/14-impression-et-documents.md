# 14. Impression et documents

## 14.1 Flux d’ordonnance observé

Le composant métier [PrescriptionPreview.tsx](../../src/components/PrescriptionPreview.tsx) construit une ordonnance à partir du patient, de la prescription, des items, des réglages du cabinet et d’un QR code lorsque le mode complet est actif. Le contrôle de page rejette l’impression ou l’export si le contenu dépasse la zone disponible.

| Action | Fonctionnement dans le code | Limites |
|---|---|---|
| Imprimer | `window.print()` après vérification du document/QR et débordement; CSS `@media print` et `@page` spécifie le format et le portrait | Le navigateur/OS ouvre le dialogue d’impression; l’application ne peut pas imposer un périphérique par le Web |
| Télécharger PDF | Capture la page par `html2canvas` à une échelle liée à 300 dpi, puis compose un PDF via `jsPDF` et télécharge le fichier | Résultat dépend du rendu CSS et des polices; capture HTML rasterisée, pas PDF vectoriel natif |
| A5 | 148 × 210 mm | Format compact configuré par défaut |
| A4 | 210 × 297 mm, contenu agrandi au facteur `297/210` depuis la composition A5 | Agrandissement uniforme, pas une mise en page indépendante optimisée pour A4 |
| En-tête pré-imprimé | Bascule entre mise en page complète et pré-imprimée; le mode pré-imprimé masque l’en-tête et les coordonnées et ajoute des marges verticales | Le comportement du pied de page et le calage réel dépendent du CSS et doivent être contrôlés sur papier |
| Impression d’essai | Imprime une ordonnance de démonstration distincte en image, avec l’exemple A5 ou A4 correspondant au format sélectionné | Utilise la boîte système; vérifier sur les modèles d’imprimante pilotes; il s’agit d’un visuel de démonstration, pas des réglages réels du cabinet |
| Partage | Flux séparé, liens temporaires avec code, durée, révocation et événements d’audit via `prescription-share` | Activation, délivrance/transmission sécurisée du code et usage réel non testés |

**Preuves :** [PrescriptionPreview.tsx](../../src/components/PrescriptionPreview.tsx#L111) (modes), lignes 115–119 (dimensions et facteur), 381–425 (capture de rendu), 429–468 (impression/PDF), 525–535 (bascule complète/pré-imprimée), 1000+ (CSS d’impression); [Parametres.tsx](../../src/pages/Parametres.tsx#L566) (options A5/A4, test et aperçu).

## 14.2 Aperçu des paramètres : distinction importante

L’écran Paramètres affiche une **image de démonstration statique** : [PrescriptionStationeryPreview.tsx](../../src/components/PrescriptionStationeryPreview.tsx) importe une illustration différente pour A5 et A4 puis les rend selon leur surface relative. Le bouton d’impression utilise désormais cette ordonnance de démonstration (l’image correspondante au format choisi), sur une page au format physique A5 ou A4. Cet aperçu :

- ne génère pas la véritable ordonnance depuis le formulaire;
- ne reflète pas les coordonnées, logo, nom ou préférences courantes du cabinet;
- représente la différence physique A4/A5, mais ne valide ni le rendu final ni l’impression réelle.

L’impression de test ne constitue pas l’ordonnance réelle du patient ni un rendu personnalisé du cabinet.

## 14.3 En-tête, pied, polices et sauts

Les réglages du cabinet sont lus par l’ordonnance réelle, et la feuille d’impression fixe le format portrait; le flux de capture contrôle le débordement sur la page A5. Les règles précises d’en-tête/pied, variation complète/pré-imprimée, polices embarquées, métriques de coupe et compatibilité d’imprimante doivent être vérifiées sur imprimantes réelles. Le code ne fournit pas d’accès universel au choix du périphérique.

## 14.4 Certificats et documents patient

- Les pièces utilisent un upload signé vers un bucket nommé privé; la liste, suppression, URL signée et opérations de rapport passent par `patient-documents`.
- Le PDF certificat passe par l’Edge Function `generate-certificate-pdf`, qui envoie du HTML à PDFLayer selon l’inspection backend; l’autorisation et la minimisation de données sont prioritaires.
- Les liens de partage d’ordonnance sont distincts des liens de pièces; ne pas réutiliser ou exposer l’URL Storage comme partage public.
- Un document qui n’est pas chargé, vérifié ou signé doit être clairement distingué d’un PDF réellement téléchargé ou imprimé.

## 14.5 Recommandations de validation

1. Tester le rendu navigateur avec contenu synthétique, formats A5/A4, navigateur à zoom 100 %, polices chargées et imprimantes cabinet.
2. Vérifier absence de coupure, marges non imprimables, QR lisible, page unique, orientation et contraste en niveaux de gris.
3. Ajouter un test de rendu navigateur/PDF plutôt que conclure à partir du seul DOM.
4. Remplacer ou renommer l’aperçu statique pour dire explicitement « exemple de format »; pour un aperçu fidèle, rendre le composant réel avec fixtures strictement synthétiques.
5. Documenter les champs incorporés et vérifier qu’aucune donnée sensible n’est envoyée à un tiers pendant export.
