import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const data = JSON.parse(
  readFileSync(new URL("../data/moroccanPrescriptionOrders.json", import.meta.url), "utf8"),
) as {
  catalog: { type: string; code: string; name: string }[];
  baskets: { id: string; type: string; name: string; items: { name: string; references?: { code: string }[] }[] }[];
};

test("le dictionnaire marocain complet est inclus et réparti entre biologie et imagerie", () => {
  assert.equal(data.catalog.length, 200);
  assert.equal(data.catalog.filter((item) => item.type === "laboratory").length, 146);
  assert.equal(data.catalog.filter((item) => item.type === "imaging").length, 54);
  assert.ok(data.catalog.every((item) => item.name.trim() && item.code.trim()));
});

test("les paniers biologiques et d’imagerie sont complets et ne contiennent pas de doublons d’identifiant", () => {
  assert.equal(data.baskets.filter((basket) => basket.type === "laboratory").length, 53);
  assert.equal(data.baskets.filter((basket) => basket.type === "imaging").length, 39);
  assert.equal(new Set(data.baskets.map((basket) => basket.id)).size, data.baskets.length);
  assert.ok(data.baskets.every((basket) => basket.name.trim() && basket.items.length > 0));
  assert.ok(data.baskets.every((basket) => basket.items.every((item) => item.name.trim())));
});

test("les références de nomenclature importées dans les paniers comportent un code", () => {
  const references = data.baskets.flatMap((basket) => basket.items.flatMap((item) => item.references ?? []));
  assert.ok(references.length > 0);
  assert.ok(references.every((reference) => reference.code.trim()));
});
