# 1. Identité, stack et proposition de valeur

## 1.1 Fiche d’identité

| Élément | État constaté |
|---|---|
| Nom utilisé actuellement | Shifalyx, dans le titre HTML et le manifeste PWA |
| Nature | Application monopage web de gestion opérationnelle d’un cabinet médical |
| Utilisateurs visibles | Médecin, secrétaire et assistant ; les écrans médicaux sont en majorité réservés au médecin |
| Problème adressé (déduction) | Réduire la fragmentation entre agenda, accueil, dossier, consultation, documents, suivi et encaissement |
| Langue et marché | Interface française, devise DH et nomenclatures/tarifs marocains repérés |
| Architecture | React côté navigateur, Supabase pour données, fonctions Edge et stockage |
| Maturité apparente | Prototype évolué / produit en consolidation : périmètre fonctionnel riche, mais sécurité, cohérence des migrations, exploitation et tests système à certifier |

**Preuves :** [App.tsx](../../src/App.tsx#L61), [package.json](../../package.json#L1), [vite.config.ts](../../vite.config.ts#L19), [moroccanCabinetTariffs.ts](../../src/lib/moroccanCabinetTariffs.ts), [consultationDictionary.ts](../../src/data/consultationDictionary.ts).

## 1.2 Stack réellement déclarée et utilisée

| Couche | Technologie / rôle | Preuve | État |
|---|---|---|---|
| Langage | TypeScript/TSX, JavaScript de configuration | `src/**/*.ts(x)`, [tsconfig](../../tsconfig.json) | Présent |
| UI | React 18, React DOM, Vite, plugin React SWC | [package.json](../../package.json#L14), [vite.config.ts](../../vite.config.ts#L1) | Présent |
| Design / composants | Tailwind CSS, shadcn/ui, Radix UI, Lucide | [tailwind.config.ts](../../tailwind.config.ts), [components.json](../../components.json) | Présent ; composants UI déclarés dans `src/components/ui/` |
| Navigation | React Router DOM 6 | [App.tsx](../../src/App.tsx#L5) | Présent |
| État serveur/cache | TanStack Query 5 | [App.tsx](../../src/App.tsx#L6), hooks `src/hooks/` | Présent |
| Formulaires/validation | React Hook Form, Zod et resolvers déclarés | [package.json](../../package.json#L14) | Présence confirmée ; couverture d’usage globale non inventoriée |
| Dates | date-fns et locales, plus logique de dates de cabinet | [package.json](../../package.json#L14), `src/lib/` | Présent |
| Graphiques | Recharts | [package.json](../../package.json#L14) | Déclaré ; usage de statistiques dans `src/pages/Statistiques.tsx` |
| Backend | Supabase JS, Postgres, fonctions Edge Deno | [client.ts](../../src/integrations/supabase/client.ts), `supabase/functions/` | Configuré ; distant non vérifié |
| Auth | PIN/session applicative personnalisée `auth-pin`, client Supabase persistant | [AuthContext.tsx](../../src/contexts/AuthContext.tsx#L32), [client.ts](../../src/integrations/supabase/client.ts#L11) | Code présent ; sécurité opérationnelle non certifiée |
| Fichiers | Supabase Storage ; bucket privé visible dans le code | [useDocuments.ts](../../src/hooks/useDocuments.ts#L127) | Code présent |
| Documents | `html2canvas`, `jspdf`, `pdfjs-dist`, `qrcode` | [package.json](../../package.json#L14), [PrescriptionPreview.tsx](../../src/components/PrescriptionPreview.tsx#L381) | Dépendances et flux identifiés |
| PWA | `vite-plugin-pwa`, Workbox | [vite.config.ts](../../vite.config.ts#L3) | Configuré |
| Tests | Node test runner dans les tests TypeScript repérés | [package.json](../../package.json#L10) | 28 tests locaux exécutés avec succès |
| Qualité | ESLint/TypeScript | [package.json](../../package.json#L8), `eslint.config.js`, `tsconfig*.json` | Configuré ; audit global de tous les diagnostics non réalisé |
| Déploiement/CI | Aucun workflow ou cible de déploiement repéré dans le périmètre contrôlé | fichiers de dépôt | Non démontré |

Les versions de dépendances sont en partie déclarées avec des plages `^`; les bibliothèques de rendu et certaines dépendances sont épinglées précisément. Il existe plusieurs lockfiles (npm, Bun, Deno) : l’équipe doit documenter quel gestionnaire fait autorité pour chaque couche afin de garder des installations reproductibles.

## 1.3 Proposition de valeur : ce qui existe vs ce qui reste à prouver

### Proposition actuelle appuyée par le code

> **Shifalyx aide un cabinet à faire circuler la journée de travail — agenda, accueil et file, dossier et consultation, documents, suite de soins et règlement — dans un même espace.**

Cette formule décrit des modules présents, pas un gain de temps mesuré. La mission évoquée par le produit se lit dans la file active, les tâches de suivi planifiées depuis la clôture de consultation, les factures et le dossier patient. Voir [FileAttente.tsx](../../src/pages/FileAttente.tsx), [useConsultations.ts](../../src/hooks/useConsultations.ts#L188), [useFollowUpTasks.ts](../../src/hooks/useFollowUpTasks.ts#L177) et [useInvoiceEncashment.ts](../../src/hooks/useInvoiceEncashment.ts).

### Valeur ajoutée déjà distincte (hypothèse à valider en usage)

1. **Continuité post-consultation** : la décision de suivi devient une tâche à contacter/organiser, puis peut être convertie en rendez-vous.
2. **Travail d’équipe** : file, arrivée, présence et encaissement ont des surfaces accessibles aux rôles d’accueil, tandis que la rédaction clinique demeure médecin.
3. **Adaptation clinique et locale** : structures d’ordonnances médicaments/laboratoire/imagerie, alertes allergiques, données de tarifs et repères de nomenclature marocains.
4. **Sortie documentaire** : ordonnances PDF/impression, certificats, pièces du dossier, partage temporaire de prescription.

### Différenciation marché marocain — comparaison prudente

Les pages publiques consultées pour [DabaDoc](https://www.dabadoc.com/ma) et [Med.ma](https://www.med.ma/) mettent en avant les médecins et la prise de rendez-vous en ligne (le titre et les métadonnées de Med.ma citent explicitement l’annuaire et la réservation). Ce constat permet de comparer les **promesses de façade** : acquisition/prise de rendez-vous d’un côté, opérations internes du cabinet de l’autre. Il ne prouve pas l’absence de modules de gestion chez ces opérateurs, et aucune démonstration produit, contrat ou grille tarifaire n’a été étudiée.

| Axe | Shifalyx, preuves locales | Place de marché médicale (pages publiques consultées) | Opportunité de démarcation |
|---|---|---|---|
| Travail interne de l’équipe | Agenda, présence, file, consultation, tâches de suivi, encaissement | Non établi par les pages marketing consultées | Faire du flux complet une démonstration en 3 minutes |
| Continuité des soins | Follow-up `control/exam/referral/surgery`, association optionnelle à un rendez-vous | Non établi | « Aucun suivi clinique ne se perd après la consultation » ; mesurer le taux de suivi organisé |
| Adaptation marocaine | DH, tarifs et référentiels marqués Maroc | Localité marocaine annoncée par les annuaires | Langue FR/AR, usages téléphoniques et imprimantes locales à valider avec cabinets |
| Patientèle / acquisition | Pas de preuve d’annuaire public ou de réservation patient | Promesse visible de recherche et prise de RDV | Complémentarité / intégration éventuelle plutôt que concurrence frontale |
| Sécurité & confiance | Architecture locale détectée, mais risque critique de politiques SQL à certifier | Comparaison technique indisponible | En faire un prérequis de vente, pas un slogan avant audit indépendant |

**Sources web consultées le 12 octobre 2026 :** [dabadoc.com/ma](https://www.dabadoc.com/ma) (titre de la page), [med.ma](https://www.med.ma/) (titre et métadonnées de la page d’accueil). Les pages ont été récupérées sans inscription ni interaction. Cette comparaison n’est pas une étude exhaustive du marché.

## 1.4 Branding et stratégie de marque

**Faits :** le nom courant Shifalyx est visible dans les écrans/PWA ; le manifeste décrit un ERP médical intelligent. Toutefois, certains documents de racine ont encore l’ancienne marque « MediCare ERP » ([README.md](../../README.md#L1), [DOCUMENTATION.md](../../DOCUMENTATION.md#L1)). Cela crée un écart de marque et d’onboarding.

**Recommandations :**

- stabiliser l’orthographe du nom, le descripteur, la promesse et la voix de marque ; retirer ou archiver les docs obsolètes;
- privilégier une identité de **cabinet coordonné** (humain, calme, fiable), pas une promesse d’« IA médicale »;
- rendre cohérentes page de connexion, documents, icônes, manifeste, partage et pages publiques;
- prouver chaque argument de confiance par des contrôles techniques vérifiables : séparation des données, restauration, chiffrement, gestion des accès.

