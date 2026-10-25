import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getMoroccanCabinetTariffProfile,
  getSuggestedPaymentAmounts,
} from "./moroccanCabinetTariffs.ts";

test("le profil généraliste propose les tarifs de cabinet et distingue le repère de remboursement", () => {
  const profile = getMoroccanCabinetTariffProfile("general");

  assert.deepEqual(profile.presets.map(({ amount }) => amount), [150, 200]);
  assert.equal(profile.referenceAmount, 80);
  assert.ok(profile.presets.every(({ group }) => group === "cabinet"));
});

test("le profil spécialiste propose les paliers spécifiques en cardiologie et dermatologie", () => {
  for (const specialtyId of ["cardiology", "dermatology"]) {
    const profile = getMoroccanCabinetTariffProfile(specialtyId);

    assert.deepEqual(profile.presets.map(({ amount }) => amount), [200, 250, 300, 350, 500, 700]);
    assert.equal(profile.referenceAmount, 150);
    assert.ok(profile.presets.slice(3).every(({ group }) => group === "specialty"));
  }
});

test("les autres spécialités conservent les paliers spécialistes sans supposer de tarif spécifique", () => {
  const profile = getMoroccanCabinetTariffProfile("pediatrics");

  assert.deepEqual(profile.presets.map(({ amount }) => amount), [200, 250, 300]);
  assert.equal(profile.referenceAmount, 150);
});

test("les suggestions d’encaissement excluent zéro, les montants négatifs et ceux supérieurs au solde", () => {
  const presets = getMoroccanCabinetTariffProfile("general").presets;
  assert.deepEqual(getSuggestedPaymentAmounts(presets, 175), [150]);
  assert.deepEqual(getSuggestedPaymentAmounts(presets, 0), []);
});
