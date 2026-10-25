export type AllergyAlertLevel =
  | "CRITICAL"
  | "HIGH"
  | "MODERATE"
  | "LOW"
  | "CONTEXT_DEPENDENT"
  | "NONE";

export type PatientAllergyReactionType =
  | "ANAPHYLAXIS"
  | "ANGIOEDEMA"
  | "URTICARIA"
  | "SJS"
  | "TEN"
  | "DRESS"
  | "MACULOPAPULAR_RASH"
  | "GI_SYMPTOMS"
  | "UNKNOWN";

export type PatientAllergySeverity = "CRITICAL" | "SEVERE" | "MODERATE" | "MILD" | "UNKNOWN";
export type PatientAllergyCertainty = "CONFIRMED" | "PROBABLE" | "SUSPECTED" | "UNKNOWN";

export interface PatientAllergy {
  allergenCode: string;
  reactionType: PatientAllergyReactionType;
  severity: PatientAllergySeverity;
  certainty: PatientAllergyCertainty;
}

export interface AllergyAlert {
  level: AllergyAlertLevel;
  type: "DIRECT" | "CROSS";
  allergenCode: string;
  drugId: string;
  drugName: string;
  message: string;
  requiresConfirmation: boolean;
}

export interface AllergyReferenceCsv {
  allergens: string;
  drugAllergenMap: string;
  crossReactivity: string;
}

interface Allergen {
  code: string;
  nameFr: string;
  nameEn: string;
  severity: Exclude<AllergyAlertLevel, "CONTEXT_DEPENDENT" | "NONE"> | "LOW";
  description: string;
}

interface DrugAllergen {
  drugId: string;
  drugName: string;
  dci: string;
  allergenCode: string;
}

interface CrossReaction {
  allergenA: string;
  allergenB: string;
  riskLevel: AllergyAlertLevel;
  clinicalNote: string;
}

interface AlertCandidate extends AllergyAlert {
  riskWeight: number;
}

export interface MedicationForAllergyCheck {
  id: string | null;
  name: string;
  dci?: string | null;
}

export interface MedicationAllergyCheck {
  alerts: AllergyAlert[];
  referenceFound: boolean;
}

const ALERT_WEIGHTS: Record<AllergyAlertLevel, number> = {
  NONE: 0,
  CONTEXT_DEPENDENT: 1,
  LOW: 2,
  MODERATE: 3,
  HIGH: 4,
  CRITICAL: 5,
};

const LOW_RISK_MESSAGE = "Vérifier formulation / avis médical";
const NON_SULFONAMIDE_SULFUR_CODES = new Set(["SULFATE", "SULFITE"]);

const normalizeCode = (value: string) => value.trim().toLocaleUpperCase("en");

const normalizeMedicationIdentity = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const ALLERGEN_SYNONYMS: Record<string, string[]> = {
  PENICILLIN: ["penicilline", "penicillines"],
  CEPHALOSPORIN: ["cephalosporine", "cephalosporines"],
  SULFONAMIDE_ANTIBIOTIC: ["sulfamide", "sulfamides"],
  NSAID: ["ains"],
};

const parseCsv = (csv: string, sourceName: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let insideQuotes = false;
  let afterQuote = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];

    if (insideQuotes) {
      if (character === '"') {
        if (csv[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          insideQuotes = false;
          afterQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (afterQuote && character !== "," && character !== "\r" && character !== "\n" && character !== " " && character !== "\t") {
      throw new Error(`${sourceName}: caractère inattendu après un champ entre guillemets (position ${index + 1})`);
    }

    if (character === '"') {
      if (field.length > 0 || afterQuote) {
        throw new Error(`${sourceName}: guillemet CSV inattendu (position ${index + 1})`);
      }
      insideQuotes = true;
    } else if (character === ",") {
      row.push(field.trim());
      field = "";
      afterQuote = false;
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
      afterQuote = false;
    } else if (!afterQuote) {
      field += character;
    }
  }

  if (insideQuotes) throw new Error(`${sourceName}: champ CSV entre guillemets non terminé`);
  if (field.length > 0 || row.length > 0 || afterQuote) {
    row.push(field.trim());
    if (row.some((value) => value.length > 0)) rows.push(row);
  }

  if (rows.length === 0) throw new Error(`${sourceName}: fichier CSV vide`);
  rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");
  return rows;
};

const recordsFromCsv = (
  csv: string,
  sourceName: string,
  requiredHeaders: string[],
): Array<{ values: Record<string, string>; line: number }> => {
  const rows = parseCsv(csv, sourceName);
  const headers = rows[0].map((header) => header.trim());
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`${sourceName}: colonnes manquantes : ${missingHeaders.join(", ")}`);
  }

  return rows.slice(1).map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`${sourceName}, ligne ${index + 2}: ${values.length} champs reçus, ${headers.length} attendus`);
    }
    return {
      values: Object.fromEntries(headers.map((header, column) => [header, values[column]])),
      line: index + 2,
    };
  });
};

const requiredValue = (value: string | undefined, column: string, source: string, line: number) => {
  if (!value?.trim()) throw new Error(`${source}, ligne ${line}: valeur manquante pour ${column}`);
  return value.trim();
};

const parseAlertLevel = (value: string, source: string, line: number): AllergyAlertLevel => {
  const level = normalizeCode(value);
  if (Object.prototype.hasOwnProperty.call(ALERT_WEIGHTS, level)) return level as AllergyAlertLevel;
  throw new Error(`${source}, ligne ${line}: niveau d'alerte inconnu « ${value} »`);
};

export class AllergyAlertService {
  private readonly allergens = new Map<string, Allergen>();
  private readonly drugsById = new Map<string, DrugAllergen[]>();
  private readonly knownDrugIds = new Set<string>();
  private readonly drugIdsByIdentity = new Map<string, string>();
  private readonly crossReactions = new Map<string, CrossReaction[]>();

  constructor(csv: AllergyReferenceCsv) {
    this.loadAllergens(csv.allergens);
    this.loadDrugAllergenMap(csv.drugAllergenMap);
    this.loadCrossReactivity(csv.crossReactivity);
  }

  parsePatientAllergies(text: string | null | undefined): PatientAllergy[] {
    const normalizedText = ` ${normalizeMedicationIdentity(text || "")} `;
    if (!normalizedText.trim()) return [];

    return [...this.allergens.values()]
      .filter((allergen) => {
        const terms = [
          allergen.code,
          allergen.nameFr,
          allergen.nameEn,
          ...(ALLERGEN_SYNONYMS[allergen.code] || []),
        ]
          .map(normalizeMedicationIdentity)
          .filter((term) => term.length > 2);
        return terms.some((term) => normalizedText.includes(` ${term} `));
      })
      .map(({ code }) => ({
        allergenCode: code,
        reactionType: "UNKNOWN",
        severity: "UNKNOWN",
        certainty: "UNKNOWN",
      }));
  }

  checkMedication(
    patientAllergies: PatientAllergy[],
    medication: MedicationForAllergyCheck,
  ): MedicationAllergyCheck {
    const referenceId = medication.id && this.knownDrugIds.has(medication.id)
      ? medication.id
      : [medication.name, medication.dci || ""]
        .map(normalizeMedicationIdentity)
        .map((identity) => this.drugIdsByIdentity.get(identity))
        .find((id): id is string => Boolean(id));

    if (!referenceId) return { alerts: [], referenceFound: false };

    const alerts = this.checkAllergies(patientAllergies, [referenceId]).map((alert) => ({
      ...alert,
      drugId: medication.id || alert.drugId,
      drugName: medication.name,
    }));
    return { alerts, referenceFound: true };
  }

  checkAllergies(patientAllergies: PatientAllergy[], prescribedDrugIds: string[]): AllergyAlert[] {
    const allergiesByCode = new Map<string, PatientAllergy>();
    for (const allergy of patientAllergies) {
      const code = normalizeCode(allergy.allergenCode);
      if (!code) throw new Error("Une allergie patient ne contient pas de code allergène");
      if (!this.allergens.has(code)) throw new Error(`Code allergène absent du référentiel : ${code}`);
      if (!allergiesByCode.has(code)) allergiesByCode.set(code, allergy);
    }

    const candidatesByDrugAndAllergy = new Map<string, AlertCandidate>();
    const prescribedIds = [...new Set(prescribedDrugIds.map((id) => id.trim()).filter(Boolean))];

    for (const drugId of prescribedIds) {
      const drugIngredients = this.drugsById.get(drugId);
      if (!drugIngredients && !this.knownDrugIds.has(drugId)) {
        throw new Error(`Aucune donnée allergologique chargée pour le médicament ${drugId}`);
      }
      if (!drugIngredients) continue;

      for (const [patientAllergenCode] of allergiesByCode) {
        const directMatch = drugIngredients.find((ingredient) => {
          if (ingredient.allergenCode !== patientAllergenCode) return false;
          return !(
            patientAllergenCode === "SULFONAMIDE_ANTIBIOTIC"
            && NON_SULFONAMIDE_SULFUR_CODES.has(ingredient.allergenCode)
          );
        });
        const candidateKey = `${drugId}\u0000${patientAllergenCode}`;

        if (directMatch) {
          const allergen = this.allergens.get(directMatch.allergenCode);
          if (!allergen) throw new Error(`Référentiel incomplet pour l'allergène ${directMatch.allergenCode}`);
          candidatesByDrugAndAllergy.set(candidateKey, {
            level: allergen.severity,
            type: "DIRECT",
            allergenCode: patientAllergenCode,
            drugId,
            drugName: directMatch.drugName,
            message: allergen.description,
            requiresConfirmation: allergen.severity === "CRITICAL",
            riskWeight: ALERT_WEIGHTS[allergen.severity],
          });
          continue;
        }

        if (
          patientAllergenCode === "SULFONAMIDE_ANTIBIOTIC"
          && drugIngredients.some((ingredient) => NON_SULFONAMIDE_SULFUR_CODES.has(ingredient.allergenCode))
        ) {
          continue;
        }

        const crossMatches = drugIngredients
          .flatMap((ingredient) =>
            (this.crossReactions.get(patientAllergenCode) || [])
              .filter((reaction) => reaction.allergenB === ingredient.allergenCode && reaction.riskLevel !== "NONE"),
          );
        const bestCrossMatch = crossMatches.reduce<CrossReaction | null>(
          (best, current) =>
            !best || ALERT_WEIGHTS[current.riskLevel] > ALERT_WEIGHTS[best.riskLevel] ? current : best,
          null,
        );

        if (!bestCrossMatch) continue;
        const drugName = drugIngredients[0].drugName;
        candidatesByDrugAndAllergy.set(candidateKey, {
          level: bestCrossMatch.riskLevel,
          type: "CROSS",
          allergenCode: patientAllergenCode,
          drugId,
          drugName,
          message: bestCrossMatch.riskLevel === "LOW" || bestCrossMatch.riskLevel === "CONTEXT_DEPENDENT"
            ? LOW_RISK_MESSAGE
            : bestCrossMatch.clinicalNote,
          requiresConfirmation: bestCrossMatch.riskLevel === "CRITICAL",
          riskWeight: ALERT_WEIGHTS[bestCrossMatch.riskLevel],
        });
      }
    }

    return [...candidatesByDrugAndAllergy.values()]
      .sort((a, b) => ALERT_WEIGHTS[b.level] - ALERT_WEIGHTS[a.level])
      .map(({ riskWeight: _riskWeight, ...alert }) => alert);
  }

  private loadAllergens(csv: string) {
    for (const { values, line } of recordsFromCsv(
      csv,
      "allergens.csv",
      ["id", "code", "name_fr", "name_en", "category", "type", "severity_default", "description"],
    )) {
      const code = normalizeCode(requiredValue(values.code, "code", "allergens.csv", line));
      const nameFr = requiredValue(values.name_fr, "name_fr", "allergens.csv", line);
      const nameEn = requiredValue(values.name_en, "name_en", "allergens.csv", line);
      const severity = parseAlertLevel(
        requiredValue(values.severity_default, "severity_default", "allergens.csv", line),
        "allergens.csv",
        line,
      );
      if (severity === "CONTEXT_DEPENDENT" || severity === "NONE") {
        throw new Error(`allergens.csv, ligne ${line}: severity_default invalide « ${severity} »`);
      }
      if (this.allergens.has(code)) throw new Error(`allergens.csv, ligne ${line}: code allergène dupliqué « ${code} »`);
      this.allergens.set(code, {
        code,
        nameFr,
        nameEn,
        severity,
        description: requiredValue(values.description, "description", "allergens.csv", line),
      });
    }
  }

  private loadDrugAllergenMap(csv: string) {
    for (const { values, line } of recordsFromCsv(
      csv,
      "drug_allergen_map.csv",
      ["drug_id", "drug_name", "dci", "allergen_code", "relationship", "confidence", "evidence_level"],
    )) {
      const relationship = normalizeCode(requiredValue(
        values.relationship,
        "relationship",
        "drug_allergen_map.csv",
        line,
      ));
      if (relationship !== "DIRECT_ACTIVE") continue;

      const drugId = requiredValue(values.drug_id, "drug_id", "drug_allergen_map.csv", line);
      this.knownDrugIds.add(drugId);
      const allergenCode = normalizeCode(requiredValue(
        values.allergen_code,
        "allergen_code",
        "drug_allergen_map.csv",
        line,
      ));
      if (NON_SULFONAMIDE_SULFUR_CODES.has(allergenCode)) continue;
      if (!this.allergens.has(allergenCode)) {
        throw new Error(`drug_allergen_map.csv, ligne ${line}: allergène inconnu « ${allergenCode} »`);
      }

      const entries = this.drugsById.get(drugId) || [];
      const duplicate = entries.some((entry) => entry.allergenCode === allergenCode);
      if (!duplicate) {
        const drugName = requiredValue(values.drug_name, "drug_name", "drug_allergen_map.csv", line);
        const dci = requiredValue(values.dci, "dci", "drug_allergen_map.csv", line);
        entries.push({
          drugId,
          drugName,
          dci,
          allergenCode,
        });
        this.drugsById.set(drugId, entries);
        for (const identity of [drugName, dci].map(normalizeMedicationIdentity).filter(Boolean)) {
          if (!this.drugIdsByIdentity.has(identity)) this.drugIdsByIdentity.set(identity, drugId);
        }
      }
    }
  }

  private loadCrossReactivity(csv: string) {
    for (const { values, line } of recordsFromCsv(
      csv,
      "cross_reactivity.csv",
      ["allergen_a", "allergen_b", "relationship", "risk_level", "clinical_note"],
    )) {
      const allergenA = normalizeCode(requiredValue(values.allergen_a, "allergen_a", "cross_reactivity.csv", line));
      const allergenB = normalizeCode(requiredValue(values.allergen_b, "allergen_b", "cross_reactivity.csv", line));
      if (!this.allergens.has(allergenA) || !this.allergens.has(allergenB)) {
        throw new Error(`cross_reactivity.csv, ligne ${line}: allergène inconnu (${allergenA}, ${allergenB})`);
      }

      const reaction: CrossReaction = {
        allergenA,
        allergenB,
        riskLevel: parseAlertLevel(
          requiredValue(values.risk_level, "risk_level", "cross_reactivity.csv", line),
          "cross_reactivity.csv",
          line,
        ),
        clinicalNote: requiredValue(values.clinical_note, "clinical_note", "cross_reactivity.csv", line),
      };
      this.addCrossReaction(allergenA, reaction);
      if (allergenA !== allergenB) {
        this.addCrossReaction(allergenB, {
          ...reaction,
          allergenA: allergenB,
          allergenB: allergenA,
        });
      }
    }
  }

  private addCrossReaction(sourceCode: string, reaction: CrossReaction) {
    const reactions = this.crossReactions.get(sourceCode) || [];
    reactions.push(reaction);
    this.crossReactions.set(sourceCode, reactions);
  }
}
