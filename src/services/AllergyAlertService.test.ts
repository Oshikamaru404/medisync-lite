import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { AllergyAlertService, type PatientAllergy } from "./AllergyAlertService.ts";

const fixtureAllergens = `id,code,name_fr,name_en,category,type,severity_default,description
ALG001,PENICILLIN,Pénicillines,Penicillins,antibiotic,class,CRITICAL,"Allergie déclarée aux pénicillines."
ALG002,CEPHALOSPORIN,Céphalosporines,Cephalosporins,antibiotic,class,HIGH,"Allergie déclarée aux céphalosporines."
ALG003,AMOXICILLIN,Amoxicilline,Amoxicillin,antibiotic,molecule,CRITICAL,"Amoxicilline."
ALG004,SULFONAMIDE_ANTIBIOTIC,Sulfamides,Sulfonamides,antibiotic,class,CRITICAL,"Sulfamides antibiotiques uniquement."
ALG005,NSAID,AINS,NSAIDs,antiinflammatory,class,HIGH,"Allergie aux AINS."
ALG006,ASPIRIN,Aspirine,Aspirin,antiinflammatory,molecule,HIGH,"Allergie à l’aspirine."
ALG007,CARBAPENEM,Carbapénèmes,Carbapenems,antibiotic,class,HIGH,"Carbapénèmes."
`;

const fixtureDrugMap = `drug_id,drug_name,dci,allergen_code,relationship,confidence,evidence_level
drug-ceph,Ceftriaxone,Ceftriaxone,CEPHALOSPORIN,DIRECT_ACTIVE,HIGH,PATTERN_MATCH
drug-amox,Amoxil,Amoxicilline,PENICILLIN,DIRECT_ACTIVE,HIGH,PATTERN_MATCH
drug-amox,Amoxil,Amoxicilline,AMOXICILLIN,DIRECT_ACTIVE,HIGH,PATTERN_MATCH
drug-sulfate,Sulfate médical,Sodium sulfate,SULFATE,DIRECT_ACTIVE,HIGH,PATTERN_MATCH
drug-sulfite,Sulfite médical,Sodium sulfite,SULFITE,DIRECT_ACTIVE,HIGH,PATTERN_MATCH
drug-nsaid,Prodol,Ibufropène,NSAID,DIRECT_ACTIVE,HIGH,PATTERN_MATCH
drug-aspirin,Aspirine,Acide acétylsalicylique,ASPIRIN,DIRECT_ACTIVE,HIGH,PATTERN_MATCH
drug-carb,Carbapénème,Carbapénème,CARBAPENEM,DIRECT_ACTIVE,HIGH,PATTERN_MATCH
`;

const fixtureCrossReactivity = `allergen_a,allergen_b,relationship,risk_level,clinical_note
PENICILLIN,CEPHALOSPORIN,CROSS_REACTIVITY,CONTEXT_DEPENDENT,"Réactivité variable selon les chaînes latérales."
PENICILLIN,AMOXICILLIN,DIRECT,CRITICAL,"L’amoxicilline est une pénicilline."
PENICILLIN,CARBAPENEM,CROSS_REACTIVITY,LOW,"Réactivité croisée limitée."
SULFONAMIDE_ANTIBIOTIC,NSAID,NONE,NONE,"Aucune réactivité croisée."
ASPIRIN,NSAID,CROSS_REACTIVITY,HIGH,"Distinguer allergie sélective et hypersensibilité de classe."
`;

const fixtureService = () => new AllergyAlertService({
  allergens: fixtureAllergens,
  drugAllergenMap: fixtureDrugMap,
  crossReactivity: fixtureCrossReactivity,
});

const allergy = (allergenCode: string): PatientAllergy => ({
  allergenCode,
  reactionType: "UNKNOWN",
  severity: "UNKNOWN",
  certainty: "UNKNOWN",
});

const readReference = (fileName: string) =>
  readFileSync(new URL(`../data/allergy-reference/${fileName}`, import.meta.url), "utf8");

test("pénicilline et céphalosporine : avertit sans généraliser ni bloquer", () => {
  const alerts = fixtureService().checkAllergies([allergy("PENICILLIN")], ["drug-ceph"]);

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "CROSS");
  assert.equal(alerts[0].level, "CONTEXT_DEPENDENT");
  assert.equal(alerts[0].message, "Vérifier formulation / avis médical");
  assert.equal(alerts[0].requiresConfirmation, false);
});

test("match direct pénicilline : applique la gravité du référentiel et requiert confirmation si critique", () => {
  const alerts = fixtureService().checkAllergies([allergy("PENICILLIN")], ["drug-amox"]);

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "DIRECT");
  assert.equal(alerts[0].level, "CRITICAL");
  assert.equal(alerts[0].message, "Allergie déclarée aux pénicillines.");
  assert.equal(alerts[0].requiresConfirmation, true);
});

test("une allergie textuelle à la pénicilline déclenche une alerte critique pour Augmentin", () => {
  const service = new AllergyAlertService({
    allergens: readReference("allergens.csv"),
    drugAllergenMap: readReference("drug_allergen_map.csv"),
    crossReactivity: readReference("cross_reactivity.csv"),
  });
  const patientAllergies = service.parsePatientAllergies("Allergie déclarée : pénicilline");

  assert.deepEqual(patientAllergies.map(({ allergenCode }) => allergenCode), ["PENICILLIN"]);
  const result = service.checkMedication(patientAllergies, {
    id: "072b87b9-14d0-4d41-9b2c-4504490a4df7",
    name: "Augmentin",
    dci: "Amoxicilline // acide clavulanique",
  });

  assert.equal(result.referenceFound, true);
  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].level, "CRITICAL");
  assert.equal(result.alerts[0].type, "DIRECT");
  assert.equal(result.alerts[0].message, "Classe des pénicillines. Réactivité croisée possible avec certaines céphalosporines selon chaînes latérales.");
  assert.equal(result.alerts[0].requiresConfirmation, true);
});

test("un médicament retrouvé par DCI reste contrôlé même si son identifiant de catalogue diffère", () => {
  const service = new AllergyAlertService({
    allergens: readReference("allergens.csv"),
    drugAllergenMap: readReference("drug_allergen_map.csv"),
    crossReactivity: readReference("cross_reactivity.csv"),
  });
  const patientAllergies = service.parsePatientAllergies("Allergie aux pénicillines");
  const result = service.checkMedication(patientAllergies, {
    id: "catalogue-augmentin-id",
    name: "Augmentin",
    dci: "Amoxicilline // acide clavulanique",
  });

  assert.equal(result.referenceFound, true);
  assert.equal(result.alerts[0]?.drugId, "catalogue-augmentin-id");
  assert.equal(result.alerts[0]?.level, "CRITICAL");
  assert.equal(result.alerts[0]?.requiresConfirmation, true);
});

test("un nom de médicament non référencé est signalé comme non vérifiable", () => {
  const result = fixtureService().checkMedication([allergy("PENICILLIN")], {
    id: "custom-drug",
    name: "Médicament saisi manuellement",
  });

  assert.deepEqual(result, { alerts: [], referenceFound: false });
});

test("allergie aux sulfamides : ignore explicitement les mappings sulfate et sulfite", () => {
  const alerts = fixtureService().checkAllergies(
    [allergy("SULFONAMIDE_ANTIBIOTIC")],
    ["drug-sulfate", "drug-sulfite"],
  );

  assert.deepEqual(alerts, []);
});

test("aspirine et AINS : signale la réactivité croisée forte sans confirmation critique", () => {
  const alerts = fixtureService().checkAllergies([allergy("ASPIRIN")], ["drug-nsaid"]);

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "CROSS");
  assert.equal(alerts[0].level, "HIGH");
  assert.equal(alerts[0].message, "Distinguer allergie sélective et hypersensibilité de classe.");
  assert.equal(alerts[0].requiresConfirmation, false);
});

test("un risque croisé NONE ne produit aucune alerte", () => {
  const alerts = fixtureService().checkAllergies(
    [allergy("SULFONAMIDE_ANTIBIOTIC")],
    ["drug-nsaid"],
  );

  assert.deepEqual(alerts, []);
});

test("un risque croisé LOW affiche uniquement le conseil de vérification", () => {
  const alerts = fixtureService().checkAllergies([allergy("PENICILLIN")], ["drug-carb"]);

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].level, "LOW");
  assert.equal(alerts[0].message, "Vérifier formulation / avis médical");
  assert.equal(alerts[0].requiresConfirmation, false);
});

test("les CSV fournis chargent les 36 allergènes, 1719 mappings et 18 réactivités", () => {
  const allergensCsv = readReference("allergens.csv");
  const drugAllergenMapCsv = readReference("drug_allergen_map.csv");
  const crossReactivityCsv = readReference("cross_reactivity.csv");
  const service = new AllergyAlertService({
    allergens: allergensCsv,
    drugAllergenMap: drugAllergenMapCsv,
    crossReactivity: crossReactivityCsv,
  });

  const penicillinToCephalosporin = service.checkAllergies(
    [allergy("PENICILLIN")],
    ["011560cc-c0da-4205-b6e9-3ef5ec9a9f11"],
  );
  const aspirinToNsaid = service.checkAllergies(
    [allergy("ASPIRIN")],
    ["002694bd-7973-4cea-95b0-c5ee5605e98c"],
  );
  const sulfonamideToSulfateFormulation = service.checkAllergies(
    [allergy("SULFONAMIDE_ANTIBIOTIC")],
    ["1e8ffe23-7cda-4722-a059-8cc618f46b5b"],
  );

  assert.equal(penicillinToCephalosporin[0]?.level, "CONTEXT_DEPENDENT");
  assert.equal(penicillinToCephalosporin[0]?.requiresConfirmation, false);
  assert.equal(aspirinToNsaid[0]?.level, "HIGH");
  assert.deepEqual(sulfonamideToSulfateFormulation, []);
  assert.equal(allergensCsv.trim().split(/\r?\n/).length - 1, 36);
  assert.equal(drugAllergenMapCsv.trim().split(/\r?\n/).length - 1, 1719);
  assert.equal(crossReactivityCsv.trim().split(/\r?\n/).length - 1, 18);
});

test("les identifiants non référencés font échouer explicitement le contrôle", () => {
  assert.throws(
    () => fixtureService().checkAllergies([allergy("PENICILLIN")], ["unknown-drug-id"]),
    /Aucune donnée allergologique chargée/,
  );
});

test("un code allergène patient non référencé fait échouer explicitement le contrôle", () => {
  assert.throws(
    () => fixtureService().checkAllergies([allergy("UNKNOWN_ALLERGEN")], ["drug-ceph"]),
    /Code allergène absent du référentiel/,
  );
});
