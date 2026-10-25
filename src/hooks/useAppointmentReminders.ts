import { useContext } from "react";
import { AppointmentReminderContext } from "@/contexts/appointmentReminderStore";

export function useAppointmentReminders() {
  const context = useContext(AppointmentReminderContext);
  if (!context) {
    throw new Error("useAppointmentReminders must be used within AppointmentReminderProvider");
  }
  return context;
}
