export interface AppointmentReminderSchedule {
  id: string;
  date: string;
  heure_debut: string;
}

export function getDueAppointmentReminders(
  appointments: AppointmentReminderSchedule[],
  now: Date,
  reminderMinutes: number,
  alreadyNotifiedIds: ReadonlySet<string>,
) {
  const nowTimestamp = now.getTime();
  const reminderWindowMs = reminderMinutes * 60_000;

  return appointments.filter((appointment) => {
    if (alreadyNotifiedIds.has(appointment.id)) return false;

    const startsAt = new Date(`${appointment.date}T${appointment.heure_debut.slice(0, 5)}:00`);
    const startsAtTimestamp = startsAt.getTime();
    return Number.isFinite(startsAtTimestamp)
      && nowTimestamp >= startsAtTimestamp - reminderWindowMs
      && nowTimestamp < startsAtTimestamp;
  });
}
