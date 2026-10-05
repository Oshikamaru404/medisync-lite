export interface ConsultationMotifEntry {
  id: string;
  categoryId: string;
  label: string;
  synonyms: string[];
  symptomSuggestions: string[];
  questions: string[];
  code?: string;
  sourceUrl?: string;
  source?: string;
}

export const CONSULTATION_CATEGORIES = [
  { id: "general", label: "Général" },
  { id: "neurologique", label: "Neurologie" },
  { id: "ophtalmologie", label: "Yeux" },
  { id: "orl", label: "ORL" },
  { id: "cardiologie", label: "Cœur et circulation" },
  { id: "respiratoire", label: "Respiration" },
  { id: "digestif", label: "Digestion" },
  { id: "urologie", label: "Urinaire" },
  { id: "gynecologie", label: "Gynécologie" },
  { id: "musculosquelettique", label: "Os, muscles et articulations" },
  { id: "dermatologie", label: "Peau" },
  { id: "endocrinologie", label: "Hormones et métabolisme" },
  { id: "psychique", label: "Humeur et sommeil" },
  { id: "hematologie", label: "Sang" },
  { id: "pediatrie", label: "Pédiatrie" },
  { id: "dentaire", label: "Bouche et dents" },
  { id: "traumatisme", label: "Traumatologie" },
  { id: "prevention", label: "Prévention et suivi" },
] as const;

const CATEGORY_LABELS = Object.fromEntries(
  CONSULTATION_CATEGORIES.map((category) => [category.id, category.label]),
);

const CORE_CONSULTATION_MOTIFS: ConsultationMotifEntry[] = [
  {
    id: "headache",
    categoryId: "neurologique",
    label: "Céphalée / mal de tête",
    synonyms: ["migraine", "mal de tête", "douleur à la tête", "céphalées"],
    symptomSuggestions: ["Nausées", "Vomissements", "Photophobie", "Phonophobie", "Troubles visuels", "Vertiges"],
    questions: ["Depuis quand et comment la douleur a-t-elle commencé ?", "Où se situe-t-elle et quelle est son intensité ?", "Est-elle inhabituelle, brutale ou accompagnée d’un signe neurologique ?"],
  },
  {
    id: "abdominal-pain",
    categoryId: "digestif",
    label: "Douleur abdominale",
    synonyms: ["mal au ventre", "douleur abdominale", "crampe abdominale"],
    symptomSuggestions: ["Nausées", "Vomissements", "Diarrhée", "Constipation", "Ballonnements", "Perte d’appétit"],
    questions: ["Où se situe la douleur et depuis quand ?", "Est-elle continue ou par crises ?", "Quels symptômes digestifs ou urinaires l’accompagnent ?"],
  },
  {
    id: "fever",
    categoryId: "general",
    label: "Fièvre",
    synonyms: ["température", "état fébrile", "hyperthermie"],
    symptomSuggestions: ["Frissons", "Fatigue", "Maux de tête", "Douleurs musculaires", "Toux", "Éruption cutanée"],
    questions: ["Quelle température a été mesurée et à quel moment ?", "Depuis quand et avec quelle évolution ?", "Quels autres symptômes sont présents ?"],
  },
  {
    id: "cough",
    categoryId: "respiratoire",
    label: "Toux",
    synonyms: ["toux sèche", "toux grasse", "toux persistante"],
    symptomSuggestions: ["Expectorations", "Fièvre", "Essoufflement", "Douleur thoracique", "Sifflements", "Mal de gorge"],
    questions: ["Depuis quand ? La toux est-elle sèche ou productive ?", "Y a-t-il des facteurs déclenchants ou une exposition récente ?", "Existe-t-il une gêne respiratoire ou une douleur associée ?"],
  },
  {
    id: "dyspnea",
    categoryId: "respiratoire",
    label: "Essoufflement / gêne respiratoire",
    synonyms: ["dyspnée", "difficulté à respirer", "manque d’air"],
    symptomSuggestions: ["Toux", "Sifflements", "Douleur thoracique", "Fièvre", "Palpitations", "Œdèmes"],
    questions: ["Quand l’essoufflement apparaît-il et comment évolue-t-il ?", "Survient-il au repos, à l’effort ou en position couchée ?", "Quels symptômes associés et antécédents respiratoires sont rapportés ?"],
  },
  {
    id: "chest-pain",
    categoryId: "cardiologie",
    label: "Douleur thoracique",
    synonyms: ["douleur à la poitrine", "oppression thoracique", "gêne thoracique"],
    symptomSuggestions: ["Essoufflement", "Palpitations", "Nausées", "Sueurs", "Toux", "Douleur à l’effort"],
    questions: ["Où se situe la douleur, depuis quand et dans quelles circonstances ?", "Comment la décririez-vous et combien de temps dure-t-elle ?", "Quels signes associés sont présents ?"],
  },
  {
    id: "back-pain",
    categoryId: "musculosquelettique",
    label: "Douleur du dos",
    synonyms: ["mal au dos", "lombalgie", "dorsalgie", "cervicalgie"],
    symptomSuggestions: ["Raideur", "Douleur irradiée", "Fourmillements", "Engourdissement", "Faiblesse", "Limitation des mouvements"],
    questions: ["Quelle zone est douloureuse et depuis quand ?", "La douleur irradie-t-elle ou varie-t-elle avec les mouvements ?", "Y a-t-il eu un traumatisme ou des symptômes neurologiques associés ?"],
  },
  {
    id: "dizziness",
    categoryId: "neurologique",
    label: "Vertiges / étourdissements",
    synonyms: ["vertige", "étourdissement", "tête qui tourne", "malaise vagal"],
    symptomSuggestions: ["Nausées", "Vomissements", "Perte d’équilibre", "Vision trouble", "Palpitations", "Perte de connaissance"],
    questions: ["S’agit-il d’une sensation rotatoire, d’un déséquilibre ou d’un malaise ?", "Dans quelles circonstances et combien de temps dure l’épisode ?", "Y a-t-il eu une perte de connaissance ou un symptôme associé ?"],
  },
  {
    id: "nausea-vomiting",
    categoryId: "digestif",
    label: "Nausées / vomissements",
    synonyms: ["nausée", "envie de vomir", "vomissement"],
    symptomSuggestions: ["Douleur abdominale", "Diarrhée", "Fièvre", "Vertiges", "Perte d’appétit", "Signes de déshydratation"],
    questions: ["Depuis quand et combien d’épisodes ont été observés ?", "Les symptômes sont-ils liés aux repas ou à une prise médicamenteuse ?", "Quels symptômes associés ou signes de déshydratation sont présents ?"],
  },
  {
    id: "joint-pain",
    categoryId: "musculosquelettique",
    label: "Douleur articulaire",
    synonyms: ["arthralgie", "articulation douloureuse", "douleur du genou", "douleur de l’épaule"],
    symptomSuggestions: ["Gonflement", "Rougeur", "Chaleur locale", "Raideur matinale", "Limitation des mouvements", "Fièvre"],
    questions: ["Quelle articulation est concernée et depuis quand ?", "La douleur est-elle mécanique, inflammatoire ou liée à un traumatisme ?", "Existe-t-il un gonflement ou une limitation fonctionnelle ?"],
  },
  {
    id: "skin-rash",
    categoryId: "dermatologie",
    label: "Éruption cutanée / démangeaisons",
    synonyms: ["rash", "boutons", "plaques rouges", "prurit", "démangeaison"],
    symptomSuggestions: ["Démangeaisons", "Douleur", "Fièvre", "Gonflement", "Extension de l’éruption", "Nouveau produit ou médicament"],
    questions: ["Depuis quand et où l’éruption a-t-elle commencé ?", "Comment a-t-elle évolué et quels symptômes l’accompagnent ?", "Y a-t-il eu une nouvelle exposition, un produit ou un médicament ?"],
  },
  {
    id: "urinary-symptoms",
    categoryId: "urologie",
    label: "Symptômes urinaires",
    synonyms: ["brûlure en urinant", "difficulté à uriner", "pollakiurie", "dysurie"],
    symptomSuggestions: ["Brûlure mictionnelle", "Envies fréquentes", "Urgence mictionnelle", "Douleur lombaire", "Fièvre", "Sang dans les urines"],
    questions: ["Quels symptômes urinaires et depuis quand ?", "Y a-t-il de la fièvre, une douleur lombaire ou une anomalie visible des urines ?", "Les symptômes sont-ils déjà survenus auparavant ?"],
  },
  {
    id: "fatigue",
    categoryId: "general",
    label: "Fatigue / asthénie",
    synonyms: ["fatigue persistante", "manque d’énergie", "épuisement"],
    symptomSuggestions: ["Troubles du sommeil", "Essoufflement", "Perte d’appétit", "Perte de poids", "Douleurs", "Baisse de moral"],
    questions: ["Depuis quand et avec quelle évolution ?", "Quel est l’impact sur les activités et le sommeil ?", "Quels symptômes associés ou changements récents sont rapportés ?"],
  },
  {
    id: "trauma",
    categoryId: "traumatisme",
    label: "Traumatisme / blessure",
    synonyms: ["chute", "contusion", "blessure", "choc"],
    symptomSuggestions: ["Douleur", "Gonflement", "Hématome", "Plaie", "Limitation des mouvements", "Perte de connaissance"],
    questions: ["Quand et dans quelles circonstances le traumatisme est-il survenu ?", "Quelle zone est touchée et quels symptômes sont présents ?", "Quels soins ou gestes ont déjà été réalisés ?"],
  },
];

interface ConsultationMotifSeed {
  id: string;
  label: string;
  synonyms: string[];
  symptomSuggestions: string[];
}

const MOTIF_SEEDS_BY_CATEGORY: Record<string, ConsultationMotifSeed[]> = {
  general: [
    { id: "malaise", label: "Malaise", synonyms: ["sensation de malaise", "faiblesse soudaine"], symptomSuggestions: ["Vertiges", "Sueurs", "Nausées", "Palpitations", "Vision trouble"] },
    { id: "chills", label: "Frissons", synonyms: ["tremblements de froid", "sensation de froid"], symptomSuggestions: ["Fièvre", "Sueurs", "Fatigue", "Douleurs musculaires"] },
    { id: "night-sweats", label: "Sueurs nocturnes", synonyms: ["transpiration la nuit", "sueurs pendant le sommeil"], symptomSuggestions: ["Fièvre", "Perte de poids", "Fatigue", "Troubles du sommeil"] },
    { id: "appetite-loss", label: "Perte d’appétit", synonyms: ["diminution de l’appétit", "anorexie"], symptomSuggestions: ["Nausées", "Perte de poids", "Douleur abdominale", "Fatigue"] },
    { id: "weight-change", label: "Variation de poids", synonyms: ["perte de poids", "prise de poids", "amaigrissement"], symptomSuggestions: ["Modification de l’appétit", "Fatigue", "Soif inhabituelle", "Œdèmes"] },
    { id: "generalized-pain", label: "Douleurs diffuses", synonyms: ["douleurs généralisées", "courbatures", "douleurs partout"], symptomSuggestions: ["Fièvre", "Fatigue", "Raideur", "Maux de tête"] },
    { id: "allergy-symptoms", label: "Symptômes allergiques", synonyms: ["allergie saisonnière", "réaction allergique rapportée", "rhinite allergique"], symptomSuggestions: ["Éternuements", "Démangeaisons", "Yeux larmoyants", "Éruption cutanée", "Gonflement rapporté"] },
    { id: "swelling", label: "Gonflement / œdème", synonyms: ["jambes gonflées", "rétention d’eau", "œdème"], symptomSuggestions: ["Douleur", "Rougeur", "Essoufflement", "Variation de poids"] },
    { id: "general-follow-up", label: "Consultation de suivi", synonyms: ["visite de contrôle", "suivi médical", "renouvellement de suivi"], symptomSuggestions: ["Évolution depuis la dernière visite", "Tolérance du traitement", "Nouveau symptôme", "Résultats à revoir"] },
  ],
  neurologique: [
    { id: "syncope", label: "Perte de connaissance", synonyms: ["syncope", "évanouissement", "perte de connaissance brève"], symptomSuggestions: ["Palpitations", "Douleur thoracique", "Malaise préalable", "Confusion après l’épisode"] },
    { id: "seizure", label: "Épisode de convulsions", synonyms: ["convulsion", "crise convulsive", "crise épileptique rapportée"], symptomSuggestions: ["Perte de connaissance", "Mouvements involontaires", "Confusion après l’épisode", "Blessure associée"] },
    { id: "weakness", label: "Faiblesse / perte de force", synonyms: ["faiblesse musculaire", "perte de force", "déficit moteur rapporté"], symptomSuggestions: ["Fourmillements", "Engourdissement", "Trouble de la parole", "Trouble de l’équilibre"] },
    { id: "numbness", label: "Engourdissement / fourmillements", synonyms: ["paresthésie", "picotements", "membre endormi"], symptomSuggestions: ["Faiblesse", "Douleur irradiée", "Trouble de l’équilibre", "Zone concernée"] },
    { id: "tremor", label: "Tremblements", synonyms: ["tremblement des mains", "secousses", "mouvements involontaires"], symptomSuggestions: ["Raideur", "Faiblesse", "Trouble de l’équilibre", "Lien avec un médicament"] },
    { id: "memory", label: "Trouble de la mémoire", synonyms: ["oubli", "perte de mémoire", "difficulté de concentration"], symptomSuggestions: ["Désorientation", "Troubles du sommeil", "Baisse de moral", "Début et évolution"] },
    { id: "gait", label: "Trouble de l’équilibre ou de la marche", synonyms: ["instabilité à la marche", "difficulté à marcher", "trouble de l’équilibre"], symptomSuggestions: ["Chute", "Vertiges", "Faiblesse", "Engourdissement"] },
    { id: "sleep-disorder", label: "Trouble du sommeil", synonyms: ["insomnie", "réveils nocturnes", "sommeil non réparateur"], symptomSuggestions: ["Fatigue diurne", "Ronflements", "Anxiété", "Somnolence"] },
  ],
  ophtalmologie: [
    { id: "vision-loss", label: "Baisse ou trouble de la vision", synonyms: ["vision floue", "baisse visuelle", "vision double", "diplopie"], symptomSuggestions: ["Douleur oculaire", "Rougeur", "Photophobie", "Début brutal ou progressif"] },
    { id: "red-eye", label: "Œil rouge", synonyms: ["rougeur oculaire", "yeux rouges", "conjonctive rouge"], symptomSuggestions: ["Douleur", "Larmoiement", "Sécrétions", "Photophobie"] },
    { id: "eye-pain", label: "Douleur oculaire", synonyms: ["mal aux yeux", "douleur de l’œil", "gêne oculaire"], symptomSuggestions: ["Vision floue", "Rougeur", "Photophobie", "Larmoiement"] },
    { id: "eye-discharge", label: "Larmoiement ou sécrétions oculaires", synonyms: ["œil qui coule", "écoulement de l’œil", "larmoiement"], symptomSuggestions: ["Rougeur", "Démangeaison", "Douleur", "Vision trouble"] },
    { id: "dry-eye", label: "Sécheresse oculaire / gêne visuelle", synonyms: ["yeux secs", "sensation de sable", "fatigue visuelle"], symptomSuggestions: ["Picotements", "Rougeur", "Larmoiement", "Gêne à l’écran"] },
    { id: "eyelid", label: "Paupière gonflée ou douloureuse", synonyms: ["orgelet", "boule à la paupière", "gonflement de la paupière"], symptomSuggestions: ["Rougeur", "Douleur locale", "Sécrétions", "Évolution du gonflement"] },
  ],
  orl: [
    { id: "ear-pain", label: "Douleur de l’oreille", synonyms: ["otalgie", "mal à l’oreille", "oreille douloureuse"], symptomSuggestions: ["Baisse d’audition", "Fièvre", "Écoulement", "Vertiges"] },
    { id: "hearing-loss", label: "Baisse de l’audition", synonyms: ["surdité", "difficulté à entendre", "oreille bouchée"], symptomSuggestions: ["Acouphènes", "Vertiges", "Douleur", "Début soudain ou progressif"] },
    { id: "tinnitus", label: "Acouphènes", synonyms: ["bourdonnement d’oreille", "sifflement dans l’oreille", "bruit dans l’oreille"], symptomSuggestions: ["Baisse d’audition", "Vertiges", "Douleur", "Unilatéral ou bilatéral"] },
    { id: "nasal-congestion", label: "Nez bouché ou écoulement nasal", synonyms: ["rhinite", "nez qui coule", "congestion nasale"], symptomSuggestions: ["Éternuements", "Démangeaisons", "Fièvre", "Perte d’odorat"] },
    { id: "sore-throat", label: "Mal de gorge", synonyms: ["angine ressentie", "gorge douloureuse", "odynophagie"], symptomSuggestions: ["Difficulté à avaler", "Fièvre", "Toux", "Voix enrouée"] },
    { id: "swallowing", label: "Difficulté à avaler", synonyms: ["dysphagie", "gêne à la déglutition", "douleur en avalant"], symptomSuggestions: ["Douleur de gorge", "Toux pendant les repas", "Voix modifiée", "Perte de poids"] },
    { id: "voice-change", label: "Voix enrouée ou modifiée", synonyms: ["dysphonie", "extinction de voix", "voix rauque"], symptomSuggestions: ["Mal de gorge", "Toux", "Difficulté à avaler", "Durée de l’enrouement"] },
    { id: "nosebleed", label: "Saignement de nez", synonyms: ["épistaxis", "nez qui saigne", "saignement nasal"], symptomSuggestions: ["Saignement abondant", "Récidive", "Traumatisme", "Traitement anticoagulant"] },
  ],
  cardiologie: [
    { id: "palpitations", label: "Palpitations", synonyms: ["cœur qui bat vite", "battements irréguliers", "tachycardie ressentie"], symptomSuggestions: ["Essoufflement", "Malaise", "Douleur thoracique", "Début et durée des épisodes"] },
    { id: "leg-swelling", label: "Jambes lourdes ou gonflées", synonyms: ["œdème des jambes", "chevilles gonflées", "jambes enflées"], symptomSuggestions: ["Douleur", "Rougeur", "Essoufflement", "Unilatéral ou bilatéral"] },
    { id: "blood-pressure-followup", label: "Suivi de tension artérielle", synonyms: ["contrôle tension", "tension élevée", "hypertension à contrôler"], symptomSuggestions: ["Mesures à domicile", "Maux de tête", "Vertiges", "Tolérance du traitement"] },
    { id: "exercise-intolerance", label: "Intolérance à l’effort", synonyms: ["essoufflement à l’effort", "baisse de capacité physique", "fatigue à l’effort"], symptomSuggestions: ["Essoufflement", "Douleur thoracique", "Palpitations", "Évolution récente"] },
    { id: "cold-extremities", label: "Extrémités froides ou changement de couleur", synonyms: ["mains froides", "pieds froids", "doigts qui blanchissent"], symptomSuggestions: ["Douleur", "Fourmillements", "Changement de couleur", "Déclenchement par le froid"] },
    { id: "leg-pain-walking", label: "Douleur de jambe à la marche", synonyms: ["douleur à la marche", "crampe à l’effort", "claudication"], symptomSuggestions: ["Distance de marche", "Douleur au repos", "Plaie", "Unilatéral ou bilatéral"] },
  ],
  respiratoire: [
    { id: "wheezing", label: "Sifflements respiratoires", synonyms: ["sibilants", "respiration sifflante", "sifflement dans la poitrine"], symptomSuggestions: ["Toux", "Essoufflement", "Oppression thoracique", "Exposition déclenchante"] },
    { id: "sputum", label: "Expectorations", synonyms: ["crachats", "glaires", "expectorations"], symptomSuggestions: ["Toux", "Fièvre", "Essoufflement", "Aspect et évolution"] },
    { id: "hemoptysis", label: "Présence de sang dans les crachats", synonyms: ["hémoptysie", "crachats sanglants", "sang en toussant"], symptomSuggestions: ["Toux", "Essoufflement", "Fièvre", "Quantité et récidive"] },
    { id: "sleep-snoring", label: "Ronflements ou pauses respiratoires rapportées", synonyms: ["ronflement", "apnées du sommeil rapportées", "pauses respiratoires nocturnes"], symptomSuggestions: ["Somnolence diurne", "Fatigue au réveil", "Maux de tête matinaux", "Témoignage de l’entourage"] },
    { id: "respiratory-infection", label: "Symptômes respiratoires récents", synonyms: ["rhume", "infection respiratoire", "syndrome grippal"], symptomSuggestions: ["Toux", "Fièvre", "Nez qui coule", "Mal de gorge"] },
    { id: "breathing-noise", label: "Bruit respiratoire ou gêne à l’inspiration", synonyms: ["stridor", "respiration bruyante", "gêne inspiratoire"], symptomSuggestions: ["Essoufflement", "Voix modifiée", "Toux", "Début et évolution"] },
  ],
  digestif: [
    { id: "reflux", label: "Brûlures d’estomac / reflux", synonyms: ["reflux gastro-œsophagien", "remontées acides", "pyrosis"], symptomSuggestions: ["Régurgitations", "Douleur après repas", "Toux nocturne", "Difficulté à avaler"] },
    { id: "diarrhea", label: "Diarrhée", synonyms: ["selles liquides", "transit accéléré", "gastro-entérite ressentie"], symptomSuggestions: ["Douleur abdominale", "Fièvre", "Vomissements", "Signes de déshydratation"] },
    { id: "constipation", label: "Constipation", synonyms: ["difficulté à aller à la selle", "selles rares", "transit ralenti"], symptomSuggestions: ["Ballonnements", "Douleur abdominale", "Efforts à la selle", "Modification récente du transit"] },
    { id: "bloating", label: "Ballonnements", synonyms: ["ventre gonflé", "distension abdominale", "gaz intestinaux"], symptomSuggestions: ["Douleur abdominale", "Constipation", "Diarrhée", "Lien avec les repas"] },
    { id: "rectal-bleeding", label: "Saignement rectal", synonyms: ["sang dans les selles", "rectorragie", "saignement anal"], symptomSuggestions: ["Douleur anale", "Constipation", "Modification du transit", "Aspect du saignement"] },
    { id: "anal-pain", label: "Douleur anale", synonyms: ["douleur à la selle", "gêne anale", "douleur rectale"], symptomSuggestions: ["Saignement", "Constipation", "Démangeaison", "Gonflement local"] },
    { id: "swallowing-digestive", label: "Gêne digestive à la déglutition", synonyms: ["blocage alimentaire", "dysphagie digestive", "aliment qui reste coincé"], symptomSuggestions: ["Douleur en avalant", "Reflux", "Toux pendant les repas", "Perte de poids"] },
    { id: "jaundice", label: "Coloration jaune de la peau ou des yeux", synonyms: ["jaunisse", "ictère", "yeux jaunes"], symptomSuggestions: ["Urines foncées", "Selles décolorées", "Démangeaisons", "Douleur abdominale"] },
    { id: "stool-change", label: "Modification du transit ou des selles", synonyms: ["changement des selles", "transit inhabituel", "selles anormales"], symptomSuggestions: ["Diarrhée", "Constipation", "Douleur abdominale", "Sang ou glaires"] },
    { id: "indigestion", label: "Digestion difficile", synonyms: ["dyspepsie", "lourdeur après repas", "gêne digestive"], symptomSuggestions: ["Nausées", "Ballonnements", "Reflux", "Satiété précoce"] },
    { id: "abdominal-distension", label: "Augmentation du volume abdominal", synonyms: ["ventre distendu", "abdomen gonflé", "distension du ventre"], symptomSuggestions: ["Douleur", "Ballonnements", "Modification du transit", "Évolution du volume"] },
  ],
  urologie: [
    { id: "hematuria", label: "Sang dans les urines", synonyms: ["hématurie", "urines rouges", "urines rosées"], symptomSuggestions: ["Brûlure mictionnelle", "Douleur lombaire", "Fièvre", "Caillots visibles"] },
    { id: "frequency-urination", label: "Envies fréquentes d’uriner", synonyms: ["pollakiurie", "uriner souvent", "mictions fréquentes"], symptomSuggestions: ["Urgence mictionnelle", "Brûlure", "Réveils nocturnes", "Soif inhabituelle"] },
    { id: "incontinence", label: "Fuites urinaires", synonyms: ["incontinence urinaire", "perte d’urine", "fuite à l’effort"], symptomSuggestions: ["Urgence", "Fuite à l’effort", "Réveils nocturnes", "Retentissement quotidien"] },
    { id: "urinary-retention", label: "Difficulté à vider la vessie", synonyms: ["rétention urinaire", "jet faible", "difficulté à uriner"], symptomSuggestions: ["Besoin fréquent", "Jet interrompu", "Douleur sus-pubienne", "Sensation de vidange incomplète"] },
    { id: "flank-pain", label: "Douleur du flanc ou lombaire", synonyms: ["douleur du rein", "douleur du côté", "colique néphrétique ressentie"], symptomSuggestions: ["Nausées", "Sang dans les urines", "Fièvre", "Irradiation de la douleur"] },
    { id: "genital-discharge", label: "Écoulement génital", synonyms: ["écoulement urétral", "sécrétion génitale", "pertes génitales"], symptomSuggestions: ["Brûlure", "Douleur", "Démangeaison", "Début et évolution"] },
    { id: "genital-pain", label: "Douleur génitale ou testiculaire", synonyms: ["douleur testiculaire", "douleur génitale", "gêne scrotale"], symptomSuggestions: ["Gonflement", "Rougeur", "Fièvre", "Début brutal ou progressif"] },
  ],
  gynecologie: [
    { id: "pelvic-pain", label: "Douleur pelvienne", synonyms: ["douleur du bas-ventre", "douleur gynécologique", "pesanteur pelvienne"], symptomSuggestions: ["Saignement", "Pertes vaginales", "Fièvre", "Lien avec le cycle"] },
    { id: "menstrual-pain", label: "Douleurs de règles", synonyms: ["dysménorrhée", "règles douloureuses", "crampes menstruelles"], symptomSuggestions: ["Douleur pelvienne", "Nausées", "Fatigue", "Retentissement sur les activités"] },
    { id: "irregular-periods", label: "Règles irrégulières ou absentes", synonyms: ["retard de règles", "aménorrhée", "cycle irrégulier"], symptomSuggestions: ["Date des dernières règles", "Douleur pelvienne", "Saignement inhabituel", "Changement récent du cycle"] },
    { id: "heavy-periods", label: "Règles abondantes ou prolongées", synonyms: ["ménorragie", "saignement menstruel important", "règles longues"], symptomSuggestions: ["Fatigue", "Vertiges", "Douleur", "Durée et abondance rapportées"] },
    { id: "vaginal-discharge", label: "Pertes vaginales", synonyms: ["leucorrhées", "écoulement vaginal", "sécrétions vaginales"], symptomSuggestions: ["Démangeaison", "Odeur inhabituelle", "Douleur", "Brûlure urinaire"] },
    { id: "breast-pain", label: "Douleur ou gêne mammaire", synonyms: ["mastalgie", "douleur du sein", "sensibilité mammaire"], symptomSuggestions: ["Masse ressentie", "Écoulement", "Rougeur", "Lien avec le cycle"] },
    { id: "breast-lump", label: "Masse ou changement du sein", synonyms: ["boule au sein", "nodule mammaire", "changement mammaire"], symptomSuggestions: ["Douleur", "Écoulement", "Changement de peau", "Date de découverte"] },
    { id: "pregnancy-follow-up", label: "Suivi de grossesse", synonyms: ["consultation prénatale", "suivi prénatal", "grossesse à contrôler"], symptomSuggestions: ["Terme de grossesse", "Mouvements fœtaux rapportés", "Douleur", "Saignement"] },
    { id: "contraception", label: "Contraception / suivi contraceptif", synonyms: ["conseil contraceptif", "contraception", "effets contraceptifs"], symptomSuggestions: ["Méthode actuelle", "Tolérance", "Effets indésirables rapportés", "Projet de grossesse"] },
    { id: "menopause", label: "Symptômes liés à la ménopause", synonyms: ["bouffées de chaleur", "ménopause", "symptômes climatériques"], symptomSuggestions: ["Troubles du sommeil", "Sueurs", "Sécheresse", "Retentissement sur le quotidien"] },
  ],
  musculosquelettique: [
    { id: "neck-pain", label: "Douleur cervicale", synonyms: ["cervicalgie", "mal à la nuque", "nuque raide"], symptomSuggestions: ["Raideur", "Douleur irradiée", "Fourmillements", "Limitation des mouvements"] },
    { id: "shoulder-pain", label: "Douleur de l’épaule", synonyms: ["épaule douloureuse", "omalgie", "douleur à lever le bras"], symptomSuggestions: ["Limitation du mouvement", "Douleur nocturne", "Traumatisme", "Faiblesse du bras"] },
    { id: "knee-pain", label: "Douleur du genou", synonyms: ["gonalgie", "genou douloureux", "mal au genou"], symptomSuggestions: ["Gonflement", "Blocage", "Instabilité", "Douleur à la marche"] },
    { id: "hip-pain", label: "Douleur de la hanche", synonyms: ["coxalgie", "douleur de l’aine", "hanche douloureuse"], symptomSuggestions: ["Boiterie", "Limitation", "Douleur à l’appui", "Traumatisme"] },
    { id: "muscle-pain", label: "Douleur musculaire", synonyms: ["myalgie", "muscle douloureux", "courbature localisée"], symptomSuggestions: ["Faiblesse", "Crampes", "Fièvre", "Effort ou traumatisme récent"] },
    { id: "muscle-cramps", label: "Crampes musculaires", synonyms: ["crampe", "spasme musculaire", "contraction involontaire"], symptomSuggestions: ["Douleur", "Faiblesse", "Effort récent", "Fréquence des épisodes"] },
    { id: "joint-swelling", label: "Articulation gonflée", synonyms: ["gonflement articulaire", "articulation chaude", "épanchement ressenti"], symptomSuggestions: ["Douleur", "Rougeur", "Chaleur locale", "Fièvre"] },
    { id: "limb-pain", label: "Douleur d’un membre", synonyms: ["douleur du bras", "douleur de la jambe", "membre douloureux"], symptomSuggestions: ["Gonflement", "Fourmillements", "Faiblesse", "Traumatisme récent"] },
    { id: "mobility", label: "Difficulté de mobilité", synonyms: ["mobilité réduite", "difficulté à se déplacer", "raideur générale"], symptomSuggestions: ["Douleur", "Chute", "Faiblesse", "Retentissement quotidien"] },
  ],
  dermatologie: [
    { id: "acne", label: "Acné", synonyms: ["boutons", "poussée d’acné", "lésions acnéiques"], symptomSuggestions: ["Douleur", "Inflammation", "Cicatrices", "Évolution et soins essayés"] },
    { id: "skin-lesion", label: "Lésion ou tache cutanée", synonyms: ["grain de beauté modifié", "tache sur la peau", "lésion cutanée"], symptomSuggestions: ["Changement de taille", "Changement de couleur", "Saignement", "Démangeaison"] },
    { id: "dry-skin", label: "Sécheresse ou irritation cutanée", synonyms: ["peau sèche", "eczéma ressenti", "irritation de la peau"], symptomSuggestions: ["Démangeaison", "Rougeur", "Fissures", "Exposition ou produit récent"] },
    { id: "hair-loss", label: "Chute de cheveux", synonyms: ["alopécie", "perte de cheveux", "cheveux qui tombent"], symptomSuggestions: ["Début progressif ou soudain", "Zone localisée ou diffuse", "Démangeaison", "Événement récent"] },
    { id: "nail-change", label: "Changement des ongles", synonyms: ["ongle déformé", "ongle cassant", "modification de l’ongle"], symptomSuggestions: ["Douleur", "Changement de couleur", "Épaississement", "Un ou plusieurs ongles"] },
    { id: "wound", label: "Plaie cutanée", synonyms: ["coupure", "plaie", "lésion ouverte"], symptomSuggestions: ["Saignement", "Douleur", "Rougeur", "Date et circonstances"] },
    { id: "bruising", label: "Ecchymoses ou bleus inhabituels", synonyms: ["bleus fréquents", "ecchymoses", "hématomes spontanés"], symptomSuggestions: ["Saignement", "Traumatisme", "Médicaments associés", "Fréquence d’apparition"] },
    { id: "skin-infection", label: "Rougeur ou inflammation cutanée", synonyms: ["peau rouge et chaude", "inflammation de la peau", "zone cutanée douloureuse"], symptomSuggestions: ["Douleur", "Chaleur locale", "Fièvre", "Extension de la zone"] },
    { id: "sweating", label: "Transpiration excessive", synonyms: ["hyperhidrose", "transpiration importante", "sueurs excessives"], symptomSuggestions: ["Sueurs nocturnes", "Déclenchement", "Retentissement", "Médicament récent"] },
  ],
  endocrinologie: [
    { id: "excessive-thirst", label: "Soif inhabituelle", synonyms: ["polydipsie", "soif excessive", "boire beaucoup"], symptomSuggestions: ["Uriner fréquemment", "Fatigue", "Bouche sèche", "Début récent"] },
    { id: "frequent-urination", label: "Augmentation des urines", synonyms: ["polyurie", "uriner beaucoup", "mictions abondantes"], symptomSuggestions: ["Soif excessive", "Réveils nocturnes", "Fatigue", "Changement récent"] },
    { id: "heat-intolerance", label: "Intolérance à la chaleur ou au froid", synonyms: ["sensation de chaleur inhabituelle", "frilosité", "sensibilité au froid"], symptomSuggestions: ["Variation de poids", "Palpitations", "Fatigue", "Transpiration"] },
    { id: "glycemia-followup", label: "Suivi glycémique", synonyms: ["contrôle du diabète", "suivi du diabète", "glycémie à contrôler"], symptomSuggestions: ["Mesures récentes", "Traitement actuel", "Tolérance", "Symptômes ressentis"] },
    { id: "thyroid-followup", label: "Suivi thyroïdien", synonyms: ["contrôle de la thyroïde", "suivi hormonal thyroïdien", "bilan thyroïde"], symptomSuggestions: ["Fatigue", "Variation de poids", "Palpitations", "Résultats récents"] },
    { id: "hair-growth-change", label: "Modification de la pilosité", synonyms: ["pilosité modifiée", "perte de pilosité", "pilosité excessive"], symptomSuggestions: ["Changement cutané", "Variation de poids", "Cycle menstruel modifié", "Début du changement"] },
    { id: "metabolic-followup", label: "Suivi métabolique ou lipidique", synonyms: ["contrôle du cholestérol", "bilan lipidique", "suivi métabolique"], symptomSuggestions: ["Résultats récents", "Traitement actuel", "Tolérance", "Habitudes de vie"] },
  ],
  psychique: [
    { id: "anxiety", label: "Anxiété / inquiétude", synonyms: ["angoisse", "anxiété persistante", "nervosité"], symptomSuggestions: ["Tension", "Troubles du sommeil", "Palpitations", "Retentissement quotidien"] },
    { id: "low-mood", label: "Baisse de moral", synonyms: ["tristesse", "humeur basse", "perte d’intérêt"], symptomSuggestions: ["Fatigue", "Troubles du sommeil", "Appétit modifié", "Difficulté de concentration"] },
    { id: "stress", label: "Stress ou surcharge", synonyms: ["stress important", "tension émotionnelle", "épuisement lié au stress"], symptomSuggestions: ["Anxiété", "Troubles du sommeil", "Tension musculaire", "Retentissement professionnel ou familial"] },
    { id: "panic-episode", label: "Épisodes de peur intense", synonyms: ["attaque de panique rapportée", "crise d’angoisse", "peur soudaine"], symptomSuggestions: ["Palpitations", "Essoufflement", "Tremblements", "Durée et contexte"] },
    { id: "concentration", label: "Difficulté de concentration", synonyms: ["trouble de l’attention", "difficulté à se concentrer", "baisse de concentration"], symptomSuggestions: ["Fatigue", "Troubles du sommeil", "Stress", "Début et retentissement"] },
    { id: "substance-use", label: "Question autour d’une consommation", synonyms: ["consommation d’alcool", "tabac", "usage de substances"], symptomSuggestions: ["Fréquence", "Quantité rapportée", "Retentissement", "Souhait d’accompagnement"] },
    { id: "emotional-support", label: "Demande de soutien psychologique", synonyms: ["besoin de parler", "soutien psychologique", "difficulté émotionnelle"], symptomSuggestions: ["Événement déclencheur", "Ressources disponibles", "Retentissement", "Attente du patient"] },
    { id: "sleepiness", label: "Somnolence diurne", synonyms: ["fatigue dans la journée", "envie de dormir", "endormissement diurne"], symptomSuggestions: ["Sommeil nocturne", "Ronflements", "Traitements en cours", "Retentissement sur activités"] },
  ],
  hematologie: [
    { id: "bleeding", label: "Saignement inhabituel", synonyms: ["saignement spontané", "saignement prolongé", "tendance à saigner"], symptomSuggestions: ["Ecchymoses", "Saignement de nez", "Saignement gingival", "Traitement anticoagulant"] },
    { id: "pallor", label: "Pâleur ou fatigue persistante", synonyms: ["pâleur", "fatigue inexpliquée", "teint pâle"], symptomSuggestions: ["Essoufflement à l’effort", "Vertiges", "Palpitations", "Résultats sanguins disponibles"] },
    { id: "lymph-node", label: "Ganglion palpable", synonyms: ["ganglion gonflé", "adénopathie ressentie", "boule au cou"], symptomSuggestions: ["Douleur locale", "Fièvre", "Infection récente", "Localisation et durée"] },
    { id: "anemia-followup", label: "Suivi d’anémie ou de bilan sanguin", synonyms: ["contrôle de l’anémie", "bilan sanguin à revoir", "hémoglobine basse rapportée"], symptomSuggestions: ["Fatigue", "Essoufflement", "Vertiges", "Résultats et traitement"] },
    { id: "transfusion-followup", label: "Suivi après traitement sanguin", synonyms: ["suivi hématologique", "contrôle après traitement", "bilan hématologie"], symptomSuggestions: ["Tolérance", "Fatigue", "Saignement", "Résultats récents"] },
  ],
  pediatrie: [
    { id: "child-checkup", label: "Consultation de suivi enfant", synonyms: ["visite pédiatrique", "suivi pédiatrique", "contrôle de l’enfant"], symptomSuggestions: ["Croissance", "Alimentation", "Sommeil", "Vaccinations", "Développement rapporté"] },
    { id: "child-feeding", label: "Difficulté d’alimentation chez l’enfant", synonyms: ["refus alimentaire", "difficulté à manger", "trouble alimentaire enfant"], symptomSuggestions: ["Hydratation", "Vomissements", "Variation de poids", "Durée du changement"] },
    { id: "child-growth", label: "Question sur la croissance", synonyms: ["croissance enfant", "taille ou poids à contrôler", "courbe de croissance"], symptomSuggestions: ["Évolution du poids", "Évolution de la taille", "Appétit", "Courbe ou mesures précédentes"] },
    { id: "child-development", label: "Question sur le développement de l’enfant", synonyms: ["développement psychomoteur", "acquisitions de l’enfant", "retard de développement suspecté"], symptomSuggestions: ["Acquisitions rapportées", "Communication", "Motricité", "Préoccupation de l’entourage"] },
    { id: "child-sleep", label: "Trouble du sommeil chez l’enfant", synonyms: ["sommeil enfant", "réveils nocturnes enfant", "difficulté d’endormissement enfant"], symptomSuggestions: ["Réveils", "Ronflements", "Somnolence diurne", "Changement récent"] },
    { id: "child-enuresis", label: "Problème de continence chez l’enfant", synonyms: ["énurésie", "pipi au lit", "fuites urinaires enfant"], symptomSuggestions: ["Fréquence", "Symptômes urinaires", "Constipation", "Changement récent"] },
  ],
  dentaire: [
    { id: "toothache", label: "Douleur dentaire", synonyms: ["mal de dent", "rage de dent", "dent douloureuse"], symptomSuggestions: ["Sensibilité au chaud ou froid", "Gonflement", "Fièvre", "Douleur à la mastication"] },
    { id: "gum-bleeding", label: "Saignement ou douleur des gencives", synonyms: ["gencive qui saigne", "gingivorragie", "gencive douloureuse"], symptomSuggestions: ["Gonflement", "Rougeur", "Mauvaise haleine", "Saignement au brossage"] },
    { id: "mouth-ulcer", label: "Lésion ou ulcération buccale", synonyms: ["aphte", "plaie dans la bouche", "ulcère buccal"], symptomSuggestions: ["Douleur", "Difficulté à manger", "Fièvre", "Nombre et durée des lésions"] },
    { id: "jaw-pain", label: "Douleur de la mâchoire", synonyms: ["douleur mandibulaire", "mâchoire douloureuse", "douleur à l’ouverture de la bouche"], symptomSuggestions: ["Limitation d’ouverture", "Craquement", "Douleur dentaire", "Lien avec la mastication"] },
    { id: "mouth-dryness", label: "Sécheresse de la bouche", synonyms: ["bouche sèche", "xérostomie", "manque de salive"], symptomSuggestions: ["Difficulté à avaler", "Soif", "Lésion buccale", "Traitement récent"] },
  ],
  traumatisme: [
    { id: "fall", label: "Chute", synonyms: ["chute accidentelle", "chute de hauteur", "chute de plain-pied"], symptomSuggestions: ["Douleur", "Traumatisme crânien", "Perte de connaissance", "Difficulté à se relever"] },
    { id: "head-trauma", label: "Choc à la tête", synonyms: ["traumatisme crânien", "coup à la tête", "choc crânien"], symptomSuggestions: ["Perte de connaissance", "Maux de tête", "Vomissements", "Confusion rapportée"] },
    { id: "burn", label: "Brûlure", synonyms: ["brûlure thermique", "brûlure chimique", "peau brûlée"], symptomSuggestions: ["Douleur", "Rougeur", "Cloques", "Circonstances et heure"] },
    { id: "sprain", label: "Entorse ou torsion", synonyms: ["faux mouvement", "cheville tordue", "entorse ressentie"], symptomSuggestions: ["Douleur", "Gonflement", "Hématome", "Appui possible ou non"] },
    { id: "foreign-body", label: "Corps étranger ou piqûre", synonyms: ["écharde", "piqûre", "corps étranger dans la peau"], symptomSuggestions: ["Douleur locale", "Rougeur", "Gonflement", "Date et circonstances"] },
    { id: "work-injury", label: "Blessure liée à une activité ou au travail", synonyms: ["accident de travail", "blessure sportive", "traumatisme pendant activité"], symptomSuggestions: ["Zone atteinte", "Douleur", "Limitation fonctionnelle", "Circonstances précises"] },
  ],
  prevention: [
    { id: "routine-checkup", label: "Bilan de santé / consultation préventive", synonyms: ["bilan général", "visite préventive", "contrôle de santé"], symptomSuggestions: ["Antécédents à actualiser", "Traitements à revoir", "Préoccupations du patient", "Examens antérieurs"] },
    { id: "vaccination", label: "Vaccination ou conseil vaccinal", synonyms: ["vaccin", "rappel vaccinal", "carnet de vaccination"], symptomSuggestions: ["Vaccins déjà reçus", "Date du dernier rappel", "Allergie déclarée", "Voyage ou exposition prévue"] },
    { id: "screening", label: "Dépistage / prévention", synonyms: ["dépistage", "examen de prévention", "prévention santé"], symptomSuggestions: ["Dépistage antérieur", "Antécédents familiaux", "Facteurs de risque rapportés", "Préférences du patient"] },
    { id: "results-review", label: "Revue de résultats d’examens", synonyms: ["résultats d’analyse", "bilan à interpréter", "résultat d’imagerie à revoir"], symptomSuggestions: ["Date de l’examen", "Résultat disponible", "Symptôme ayant motivé l’examen", "Suite déjà proposée"] },
    { id: "treatment-review", label: "Réévaluation d’un traitement", synonyms: ["renouvellement de traitement", "revue médicamenteuse", "tolérance du traitement"], symptomSuggestions: ["Traitement actuel", "Observance rapportée", "Effets ressentis", "Objectif du suivi"] },
    { id: "administrative-visit", label: "Demande administrative ou certificat", synonyms: ["certificat médical", "document médical", "formalité de santé"], symptomSuggestions: ["Objet de la demande", "Document attendu", "Éléments cliniques nécessaires", "Échéance"] },
  ],
};

const buildMotif = (categoryId: string, seed: ConsultationMotifSeed): ConsultationMotifEntry => ({
  ...seed,
  categoryId,
  questions: [
    `Depuis quand « ${seed.label.toLocaleLowerCase("fr")} » est-il présent et comment a-t-il débuté ?`,
    "Quelle est son évolution, sa fréquence, son intensité et son retentissement ?",
    "Quels symptômes associés, facteurs déclenchants ou éléments de contexte sont rapportés ?",
  ],
});

export const CONSULTATION_MOTIFS: ConsultationMotifEntry[] = [
  ...CORE_CONSULTATION_MOTIFS,
  ...Object.entries(MOTIF_SEEDS_BY_CATEGORY).flatMap(([categoryId, seeds]) =>
    seeds.map((seed) => buildMotif(categoryId, seed)),
  ),
];

export const inferConsultationCategoryId = (label: string) => {
  const normalizedLabel = normalizeConsultationTerm(label);
  const matchingMotif = CONSULTATION_MOTIFS.find((entry) =>
    [entry.label, ...entry.synonyms].some((term) => normalizeConsultationTerm(term) === normalizedLabel),
  );
  if (matchingMotif) return matchingMotif.categoryId;

  const categoryTerms: [string, string[]][] = [
    ["orl", ["oreille", "otite", "audition", "acouphene", "sinus", "rhinite", "nasal", "pharyng", "laryng", "gorge"]],
    ["ophtalmologie", ["oeil", "oculaire", "retine", "vision", "paupiere", "conjonctiv"]],
    ["cardiologie", ["cardiaque", "cardiologie", "hypertension", "arythmie", "infarctus", "palpitation", "angine de poitrine"]],
    ["respiratoire", ["respiratoire", "pulmonaire", "bronch", "asthme", "toux", "dyspnee", "pneumonie"]],
    ["digestif", ["digestif", "gastr", "intestin", "colon", "abdominal", "foie", "pancreas", "diarrhee", "constipation"]],
    ["urologie", ["urinaire", "urine", "rein", "vessie", "prostate", "miction"]],
    ["gynecologie", ["gynec", "menstru", "grossesse", "uter", "vaginal", "ovaire"]],
    ["musculosquelettique", ["articulation", "muscul", "osseux", "fracture", "tendon", "lombalg", "arthr"]],
    ["dermatologie", ["peau", "cutane", "dermat", "eczema", "psoriasis", "eruption"]],
    ["endocrinologie", ["diabete", "thyroid", "endocrin", "metabol", "glycemie"]],
    ["neurologique", ["neurolog", "migraine", "epilep", "convulsion", "parkinson", "paralys", "cephalee"]],
    ["psychique", ["psych", "anxiete", "depression", "insomnie", "trouble mental"]],
    ["hematologie", ["sang", "hematolog", "anemie", "coagulation"]],
    ["pediatrie", ["pediatr", "nouveau ne", "nourrisson"]],
    ["dentaire", ["dent", "dentaire", "gingiv", "buccal"]],
    ["traumatisme", ["traumatis", "blessure", "fracture", "contusion"]],
  ];
  return categoryTerms.find(([, terms]) => terms.some((term) => normalizedLabel.includes(term)))?.[0] || "general";
};

export const normalizeConsultationTerm = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const getConsultationCategoryLabel = (categoryId: string) =>
  CATEGORY_LABELS[categoryId] || "Autre";

export const getConsultationDocumentationGuide = (entry: ConsultationMotifEntry) => {
  const normalizedLabel = normalizeConsultationTerm(entry.label);

  if (normalizedLabel.includes("otite moyenne aigue") || normalizedLabel.includes("acute otitis media")) {
    return {
      history: [
        "Oreille concernée et côté (droite, gauche ou les deux)",
        "Début, durée et évolution de la douleur",
        "Intensité et retentissement sur le sommeil ou les activités",
        "Fièvre rapportée et température mesurée, si disponible",
        "Baisse d’audition, écoulement, acouphènes ou vertiges rapportés",
        "Symptômes récents du nez ou de la gorge",
        "Épisodes antérieurs, traitements déjà pris et réponse rapportée",
      ],
      examination: [
        "État général et constantes mesurées",
        "Oreille droite : conduit auditif et tympan (observations)",
        "Oreille gauche : conduit auditif et tympan (observations)",
        "Écoulement ou autre constatation otologique observée",
        "Région péri-auriculaire et mastoïdienne (observations)",
        "Autres constatations ORL pertinentes",
      ],
    };
  }

  const categoryExamPrompts: Record<string, string[]> = {
    ophtalmologie: ["Acuité visuelle ou évaluation rapportée", "Aspect des yeux et des paupières", "Pupilles et mouvements oculaires", "Autres constatations oculaires pertinentes"],
    orl: ["Côté et région examinés", "Conduit auditif et tympan, si concernés", "Nez, bouche et gorge selon le motif", "Aires ganglionnaires et autres constatations ORL"],
    cardiologie: ["Constantes mesurées, notamment tension et fréquence cardiaque", "Auscultation et constatations cardiovasculaires", "Pouls périphériques et œdèmes, si examinés", "Autres constatations pertinentes"],
    respiratoire: ["Fréquence respiratoire et saturation, si mesurées", "Effort respiratoire observé", "Auscultation pulmonaire", "Autres constatations respiratoires pertinentes"],
    digestif: ["Constantes mesurées", "Aspect général et hydratation observés", "Examen abdominal : inspection, palpation et autres manœuvres réalisées", "Autres constatations digestives pertinentes"],
    neurologique: ["État de vigilance et orientation, si évalués", "Examen neurologique ciblé et constatations observées", "Marche, équilibre ou force, si évalués", "Autres constatations neurologiques pertinentes"],
    musculosquelettique: ["Région et côté examinés", "Inspection, mobilité et amplitudes observées", "Douleur provoquée ou sensibilité constatée", "Examen neurovasculaire distal, si réalisé"],
    dermatologie: ["Localisation et distribution des lésions", "Aspect, taille et évolution observée", "Peau et muqueuses examinées", "Autres constatations dermatologiques pertinentes"],
    gynecologie: ["Constantes mesurées", "Examen réalisé et consentement documenté selon les pratiques du cabinet", "Constatations observées", "Examens complémentaires disponibles"],
    urologie: ["Constantes mesurées", "Examen ciblé réalisé et constatations observées", "Région lombaire ou sus-pubienne, si examinée", "Autres constatations pertinentes"],
    pediatrie: ["Constantes et mesures disponibles, interprétées selon l’âge", "État général et comportement observés", "Examen ciblé selon le motif", "Informations rapportées par l’accompagnant, si pertinent"],
  };
  const defaultExamination = [
    "Constantes mesurées et contexte de mesure",
    "Examen ciblé sur la région concernée : constatations observées",
    "Signes présents ou absents effectivement recherchés",
    "Résultats d’examens disponibles, avec date si pertinente",
  ];

  return {
    history: entry.questions.length > 0
      ? entry.questions
      : [
        "Début, durée et évolution du motif",
        "Localisation, intensité, fréquence et retentissement rapportés",
        "Symptômes associés, facteurs déclenchants et éléments de contexte",
        "Antécédents pertinents, épisodes antérieurs et traitements déjà pris",
      ],
    examination: categoryExamPrompts[entry.categoryId] || defaultExamination,
  };
};

export const searchConsultationMotifs = (query: string, categoryId = "all") => {
  const normalizedQuery = normalizeConsultationTerm(query);
  const entries = CONSULTATION_MOTIFS.map((entry) => ({
    entry,
    searchText: normalizeConsultationTerm([
      entry.label,
      getConsultationCategoryLabel(entry.categoryId),
      ...entry.synonyms,
      ...entry.symptomSuggestions,
      ...entry.questions,
    ].join(" ")),
  })).filter(({ entry }) => categoryId === "all" || entry.categoryId === categoryId);

  if (!normalizedQuery) return entries.slice(0, 6).map(({ entry }) => entry);

  return entries
    .filter(({ searchText }) => searchText.includes(normalizedQuery) || normalizedQuery.split(" ").every((word) => searchText.includes(word)))
    .slice(0, 6)
    .map(({ entry }) => entry);
};
