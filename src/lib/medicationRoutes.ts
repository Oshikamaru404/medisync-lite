export const MEDICATION_ROUTES = [
  "Orale",
  "Cutanée",
  "Oculaire",
  "Auriculaire",
  "Nasale",
  "Rectale",
  "Vaginale",
  "Injectable",
  "Inhalée",
  "Buccale",
] as const;

export type MedicationRoute = typeof MEDICATION_ROUTES[number];

const normalizeForm = (form: string) =>
  form
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const matches = (form: string, patterns: RegExp[]) =>
  patterns.some((pattern) => pattern.test(form));

export const getRouteFromPharmaceuticalForm = (form: string | null): MedicationRoute | null => {
  if (!form) return null;
  const normalized = normalizeForm(form);

  if (matches(normalized, [
    /\bcollyre\b/,
    /\bophtalmique\b/,
  ])) return "Oculaire";

  if (matches(normalized, [
    /\bauriculaires?\b/,
    /\botique\b/,
  ])) return "Auriculaire";

  if (matches(normalized, [
    /\bnasal(?:e|es)?\b/,
  ])) return "Nasale";

  if (matches(normalized, [
    /\brectal(?:e|es)?\b/,
    /\bsuppositoire\b/,
  ])) return "Rectale";

  if (matches(normalized, [
    /\bvaginal(?:e|es)?\b/,
    /\bovule\b/,
  ])) return "Vaginale";

  if (matches(normalized, [
    /\binjectable\b/,
    /\binjecteur\b/,
    /\binjectee?\b/,
    /\bperfusion\b/,
    /\bseringue pre remplie\b/,
    /\bimplant sous cutane\b/,
  ])) return "Injectable";

  if (matches(normalized, [
    /\binhalateur\b/,
    /\baerosol doseur\b/,
    /\bpoudre pour inhalation\b/,
    /\bsolution pour nebulisation\b/,
    /\binhalation\b/,
  ])) return "Inhalée";

  if (matches(normalized, [
    /\bbain de bouche\b/,
    /\bpate dentifrice medicamenteuse\b/,
    /\bspray buccal\b/,
  ])) return "Buccale";

  if (matches(normalized, [
    /\bcreme\b/,
    /\bpommade\b/,
    /\bgel\b/,
    /\blotion\b/,
    /\bpate\b/,
    /\bspray cutane\b/,
    /\bpatch\b/,
    /\btimbre transdermique\b/,
    /\bemplatre\b/,
    /\bcutanee?\b/,
  ])) return "Cutanée";

  if (matches(normalized, [
    /\bcomprime\b/,
    /\bgelule\b/,
    /\bcapsule molle\b/,
    /\bsachet\b/,
    /\bgranules\b/,
    /\bsirop\b/,
    /\bsuspension buvable\b/,
    /\bsolution buvable\b/,
    /\bgouttes buvables\b/,
    /\blyophilisat oral\b/,
    /\bgomme a macher\b/,
    /\bfilm orodispersible\b/,
  ])) return "Orale";

  return null;
};
