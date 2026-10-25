import assert from "node:assert/strict";
import { test } from "node:test";
import { getDueAppointmentReminders, type AppointmentReminderSchedule } from "./appointmentReminders.ts";

const localDateKey = (date: Date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0"),
].join("-");

const appointmentAt = (id: string, date: Date): AppointmentReminderSchedule => ({
  id,
  date: localDateKey(date),
  heure_debut: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00`,
});

test("un rappel est émis à l’intérieur de la fenêtre configurée, sans révéler de donnée patient", () => {
  const start = new Date(2026, 9, 11, 10, 0);
  const appointment = appointmentAt("appointment-1", start);
  const now = new Date(2026, 9, 11, 9, 45);

  assert.deepEqual(getDueAppointmentReminders([appointment], now, 15, new Set()), [appointment]);
});

test("le rappel respecte les bornes temporelles et ne répète pas un rendez-vous déjà notifié", () => {
  const start = new Date(2026, 9, 11, 10, 0);
  const appointment = appointmentAt("appointment-1", start);

  assert.deepEqual(
    getDueAppointmentReminders([appointment], new Date(2026, 9, 11, 9, 44), 15, new Set()),
    [],
  );
  assert.deepEqual(
    getDueAppointmentReminders([appointment], new Date(2026, 9, 11, 10, 0), 15, new Set()),
    [],
  );
  assert.deepEqual(
    getDueAppointmentReminders([appointment], new Date(2026, 9, 11, 9, 45), 15, new Set(["appointment-1"])),
    [],
  );
});
