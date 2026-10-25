import { createContext } from "react";

export const REMINDER_OPTIONS = [5, 15, 30] as const;

export type ReminderMinutes = typeof REMINDER_OPTIONS[number];
export type NotificationPermissionState = NotificationPermission | "unsupported";

export interface ReminderPreferences {
  enabled: boolean;
  reminderMinutes: ReminderMinutes;
}

export interface AppointmentReminderContextValue extends ReminderPreferences {
  isSupported: boolean;
  preferencesReady: boolean;
  permission: NotificationPermissionState;
  enableReminders: () => Promise<boolean>;
  disableReminders: () => void;
  setReminderMinutes: (minutes: number) => void;
  sendTestNotification: () => Promise<boolean>;
}

export const AppointmentReminderContext = createContext<AppointmentReminderContextValue | null>(null);
