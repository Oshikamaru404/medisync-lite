import assert from "node:assert/strict";
import { test } from "node:test";
import { getRouteFromPharmaceuticalForm } from "./medicationRoutes.ts";

test("maps common Moroccan medication catalog forms to their routes", () => {
  const examples = [
    ["COMPRIME PELLICULE", "Orale"],
    ["Gélule gastro-résistante", "Orale"],
    ["SUSPENSION BUVABLE", "Orale"],
    ["SPRAY CUTANÉ", "Cutanée"],
    ["POMMADE OPHTALMIQUE", "Oculaire"],
    ["GOUTTES AURICULAIRES", "Auriculaire"],
    ["POMMADE NASALE", "Nasale"],
    ["SUPPOSITOIRE", "Rectale"],
    ["CAPSULE VAGINALE", "Vaginale"],
    ["POUDRE ET SOLVANT POUR SOLUTION INJECTABLE", "Injectable"],
    ["SOLUTION POUR PERFUSION", "Injectable"],
    ["SERINGUE PRÉ-REMPLIE", "Injectable"],
    ["IMPLANT SOUS-CUTANÉ", "Injectable"],
    ["POUDRE POUR INHALATION", "Inhalée"],
    ["Solution pour bain de bouche", "Buccale"],
  ] as const;

  for (const [form, expectedRoute] of examples) {
    assert.equal(getRouteFromPharmaceuticalForm(form), expectedRoute, form);
  }
});

test("maps buccal spray to the buccal route and does not guess unknown forms", () => {
  assert.equal(getRouteFromPharmaceuticalForm("Spray buccal"), "Buccale");
  assert.equal(getRouteFromPharmaceuticalForm("Forme pharmaceutique inconnue"), null);
  assert.equal(getRouteFromPharmaceuticalForm(null), null);
});
