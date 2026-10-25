import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_CABINET_WORKING_DAYS, parseCabinetWorkingDays } from "./cabinetWorkingDays.ts";

test("les jours non configurés préservent le comportement existant en ouvrant toute la semaine", () => {
  assert.deepEqual(parseCabinetWorkingDays(""), [...DEFAULT_CABINET_WORKING_DAYS]);
});

test("les jours configurés sont dédupliqués et triés", () => {
  assert.deepEqual(parseCabinetWorkingDays("[6,1,1,4]"), [1, 4, 6]);
});

test("les jours mal formés sont rejetés au lieu d’être appliqués silencieusement", () => {
  assert.throws(() => parseCabinetWorkingDays("[1,7]"), /Invalid cabinet working days setting/);
  assert.throws(() => parseCabinetWorkingDays("{invalid"), SyntaxError);
});
