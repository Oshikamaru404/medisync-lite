import moroccanOrderData from "@/data/moroccanPrescriptionOrders.json";

export interface NomenclatureReference {
  code: string;
  coefficient?: string;
  unit?: string;
  source?: string;
}

export interface RequestCatalogItem {
  category: string;
  name: string;
  modality?: string;
  references?: NomenclatureReference[];
}

export interface PrescriptionOrderBasketItem {
  name: string;
  references?: NomenclatureReference[];
  modality?: string;
}

export interface PrescriptionOrderBasket {
  id: string;
  type: "laboratory" | "imaging";
  name: string;
  section: string;
  items: PrescriptionOrderBasketItem[];
}

type ImportedCatalogEntry = {
  type: "laboratory" | "imaging";
  code: string;
  name: string;
  coefficient: string;
  unit: string;
};

type ImportedBasket = PrescriptionOrderBasket;

const importedData = moroccanOrderData as {
  catalog: ImportedCatalogEntry[];
  baskets: ImportedBasket[];
};

const normalizeCatalogName = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const getLaboratoryCategory = (name: string) => {
  const normalized = normalizeCatalogName(name);
  if (/coag|prothrombine|fibrinogene|antithrombine|anticoagulant|saignement/.test(normalized)) return "Hémostase";
  if (/nfs|hemato|reticulocyte|plaquette|myelogramme|hemoglobine|hematocrite|coombs|groupage/.test(normalized)) return "Hématologie";
  if (/urine|urinaire|ecbu|proteinurie|albuminurie|calciurie|clairance|ur[eé]e urinaire/.test(normalized)) return "Urines";
  if (/culture|bacter|parasito|mycolog|hemoculture|antibiogramme|bk /.test(normalized)) return "Microbiologie";
  if (/hepatite|hiv|vih|syphilis|serologie|toxoplasmose|rub[eé]ole|rougeole|brucellose|chlamydia|helicobacter|salmonellose/.test(normalized)) return "Sérologies";
  if (/thyro|tsh|t3 libre|t4 libre|oestradiol|cortisol|insuline|progest|prolactine|testosterone|lh\\b/.test(normalized)) return "Hormones";
  if (/anticorps|anti-|auto-immun|complement|rhumato|ana |aan|immunoglobuline/.test(normalized)) return "Immunologie";
  if (/crp|vitesse de sedimentation|\\bvs\\b|inflamm/.test(normalized)) return "Inflammation";
  if (/fer|ferritine|vitamine|folate|carence/.test(normalized)) return "Carences";
  if (/cholesterol|triglyceride|lipoproteine|lipid/.test(normalized)) return "Lipides";
  return "Biochimie";
};

const getImagingModality = (name: string) => {
  const normalized = normalizeCatalogName(name);
  if (/irm|resonance magnetique/.test(normalized)) return "IRM";
  if (/scanner|tdm|angioscanner/.test(normalized)) return "Scanner (TDM)";
  if (/doppler/.test(normalized)) return "Doppler";
  if (/echograph|echographie/.test(normalized)) return "Échographie";
  if (/mammograph/.test(normalized)) return "Mammographie";
  if (/osteodensitometr/.test(normalized)) return "Ostéodensitométrie";
  if (/panoramique|cone beam|retro alveolaire/.test(normalized)) return "Imagerie dentaire";
  if (/radiograph|telethorax|thorax|abdomen sans preparation|\\basp\\b|urographie|transit|lavement/.test(normalized)) return "Radiologie";
  return "Autre imagerie";
};

const importedCatalog = importedData.catalog.map((entry): RequestCatalogItem => {
  const reference: NomenclatureReference = {
    code: entry.code,
    coefficient: entry.coefficient,
    unit: entry.unit,
  };
  return entry.type === "laboratory"
    ? { category: getLaboratoryCategory(entry.name), name: entry.name, references: [reference] }
    : { category: getImagingModality(entry.name), modality: getImagingModality(entry.name), name: entry.name, references: [reference] };
});

const curatedLaboratoryCatalog: RequestCatalogItem[] = [
  { category: "Hématologie", name: "NFS - plaquettes" },
  { category: "Hématologie", name: "Réticulocytes" },
  { category: "Hématologie", name: "Frottis sanguin" },
  { category: "Hémostase", name: "TP / INR" },
  { category: "Hémostase", name: "TCA" },
  { category: "Hémostase", name: "Fibrinogène" },
  { category: "Inflammation", name: "CRP" },
  { category: "Inflammation", name: "VS" },
  { category: "Biochimie", name: "Glycémie à jeun" },
  { category: "Biochimie", name: "HbA1c" },
  { category: "Biochimie", name: "Urée, créatinine, DFG estimé" },
  { category: "Biochimie", name: "Ionogramme sanguin (Na, K, Cl)" },
  { category: "Biochimie", name: "Calcémie, phosphorémie" },
  { category: "Biochimie", name: "Bilan hépatique (ASAT, ALAT, PAL, GGT, bilirubine)" },
  { category: "Biochimie", name: "Albumine, protéines totales" },
  { category: "Biochimie", name: "Acide urique" },
  { category: "Lipides", name: "Bilan lipidique (CT, HDL, LDL, triglycérides)" },
  { category: "Cardiologie", name: "Troponine" },
  { category: "Cardiologie", name: "BNP / NT-proBNP" },
  { category: "Thyroïde", name: "TSH" },
  { category: "Thyroïde", name: "T4 libre" },
  { category: "Thyroïde", name: "T3 libre" },
  { category: "Carences", name: "Ferritine" },
  { category: "Carences", name: "Fer sérique, transferrine, CST" },
  { category: "Carences", name: "Vitamine B12, folates" },
  { category: "Carences", name: "Vitamine D (25-OH)" },
  { category: "Urines", name: "Bandelette urinaire" },
  { category: "Urines", name: "ECBU avec antibiogramme si indiqué" },
  { category: "Urines", name: "Protéinurie / albuminurie" },
  { category: "Urines", name: "Rapport albumine / créatinine urinaire" },
  { category: "Microbiologie", name: "Hémocultures (préciser le nombre de paires)" },
  { category: "Microbiologie", name: "Prélèvement de gorge (préciser le test)" },
  { category: "Microbiologie", name: "Prélèvement de plaie (préciser le site)" },
  { category: "Microbiologie", name: "Examen cytobactériologique des selles" },
  { category: "Microbiologie", name: "Parasitologie des selles" },
  { category: "Sérologies", name: "Sérologie VIH (avec information et consentement selon le cadre applicable)" },
  { category: "Sérologies", name: "Sérologie hépatite B" },
  { category: "Sérologies", name: "Sérologie hépatite C" },
  { category: "Sérologies", name: "Sérologie syphilis" },
  { category: "Grossesse", name: "β-hCG" },
  { category: "Immunologie", name: "Facteur rhumatoïde" },
  { category: "Immunologie", name: "Anti-CCP" },
  { category: "Immunologie", name: "ANA (anticorps antinucléaires)" },
  { category: "Autres", name: "Groupe sanguin ABO-Rhésus (préciser le contexte)" },
  { category: "Autres", name: "Électrophorèse des protéines sériques" },
];

const curatedImagingCatalog: RequestCatalogItem[] = [
  { category: "Radiographie", modality: "Radiographie", name: "Radiographie thoracique" },
  { category: "Radiographie", modality: "Radiographie", name: "Radiographie du rachis" },
  { category: "Radiographie", modality: "Radiographie", name: "Radiographie du bassin / hanche" },
  { category: "Radiographie", modality: "Radiographie", name: "Radiographie d’un membre / articulation" },
  { category: "Radiographie", modality: "Radiographie", name: "Radiographie des sinus / massif facial" },
  { category: "Échographie", modality: "Échographie", name: "Échographie abdominale" },
  { category: "Échographie", modality: "Échographie", name: "Échographie pelvienne" },
  { category: "Échographie", modality: "Échographie", name: "Échographie rénale et des voies urinaires" },
  { category: "Échographie", modality: "Échographie", name: "Échographie thyroïdienne" },
  { category: "Échographie", modality: "Échographie", name: "Échographie des parties molles" },
  { category: "Doppler", modality: "Doppler", name: "Écho-Doppler veineux d’un membre" },
  { category: "Doppler", modality: "Doppler", name: "Écho-Doppler artériel d’un membre" },
  { category: "Doppler", modality: "Doppler", name: "Écho-Doppler des troncs supra-aortiques" },
  { category: "Doppler", modality: "Doppler", name: "Échocardiographie transthoracique" },
  { category: "Scanner", modality: "Scanner (TDM)", name: "TDM cérébrale" },
  { category: "Scanner", modality: "Scanner (TDM)", name: "TDM thoracique" },
  { category: "Scanner", modality: "Scanner (TDM)", name: "TDM abdomino-pelvienne" },
  { category: "Scanner", modality: "Scanner (TDM)", name: "TDM du rachis" },
  { category: "IRM", modality: "IRM", name: "IRM cérébrale" },
  { category: "IRM", modality: "IRM", name: "IRM du rachis" },
  { category: "IRM", modality: "IRM", name: "IRM articulaire" },
  { category: "IRM", modality: "IRM", name: "IRM pelvienne" },
  { category: "Autres", modality: "Mammographie", name: "Mammographie bilatérale" },
  { category: "Autres", modality: "Ostéodensitométrie", name: "Ostéodensitométrie (DEXA)" },
  { category: "Autres", modality: "Autre", name: "Autre examen d’imagerie (à préciser)" },
];

const mergeCatalog = (curated: RequestCatalogItem[], imported: RequestCatalogItem[]) => {
  const importedByName = new Map(imported.map((item) => [normalizeCatalogName(item.name), item]));
  const merged = curated.map((item) => ({
    ...item,
    references: importedByName.get(normalizeCatalogName(item.name))?.references,
  }));
  const names = new Set(merged.map((item) => normalizeCatalogName(item.name)));
  for (const item of imported) {
    const key = normalizeCatalogName(item.name);
    if (!names.has(key)) {
      merged.push(item);
      names.add(key);
    }
  }
  return merged;
};

export const LAB_REQUEST_CATALOG = mergeCatalog(
  curatedLaboratoryCatalog,
  importedCatalog.filter((item) => item.references?.[0]?.code.startsWith("B")),
);

export const IMAGING_REQUEST_CATALOG = mergeCatalog(
  curatedImagingCatalog,
  importedCatalog.filter((item) => !item.references?.[0]?.code.startsWith("B")),
);

export const MOROCCAN_ORDER_BASKETS = importedData.baskets;
