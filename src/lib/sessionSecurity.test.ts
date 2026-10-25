import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getSessionInactivityTimeoutMs,
  SESSION_INACTIVITY_TIMEOUT_MS,
  SESSION_INACTIVITY_TIMEOUT_MINUTES_OPTIONS,
} from "./sessionSecurity.ts";

test("le verrouillage configurable ne dépasse jamais les 15 minutes de la politique actuelle", () => {
  for (const minutes of SESSION_INACTIVITY_TIMEOUT_MINUTES_OPTIONS) {
    assert.equal(getSessionInactivityTimeoutMs(String(minutes)), minutes * 60_000);
  }
  assert.equal(Math.max(...SESSION_INACTIVITY_TIMEOUT_MINUTES_OPTIONS), SESSION_INACTIVITY_TIMEOUT_MS / 60_000);
});

test("une préférence invalide conserve le délai sécurisé de 15 minutes", () => {
  assert.equal(getSessionInactivityTimeoutMs(""), SESSION_INACTIVITY_TIMEOUT_MS);
  assert.equal(getSessionInactivityTimeoutMs("30"), SESSION_INACTIVITY_TIMEOUT_MS);
  assert.equal(getSessionInactivityTimeoutMs("nope"), SESSION_INACTIVITY_TIMEOUT_MS);
});
