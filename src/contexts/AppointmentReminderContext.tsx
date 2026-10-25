import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  AppointmentReminderContext,
  REMINDER_OPTIONS,
  type AppointmentReminderContextValue,
  type NotificationPermissionState,
  type ReminderMinutes,
  type ReminderPreferences,
} from "@/contexts/appointmentReminderStore";
import { useAppointmentReminders } from "@/hooks/useAppointmentReminders";
import { getDueAppointmentReminders } from "@/lib/appointmentReminders";
import { toast } from "sonner";

const REMINDER_PREFERENCES_PREFIX = "shifalyx:appointment-reminders:";

interface ReminderAppointment {
  id: string;
  date: string;
  heure_debut: string;
  statut: string | null;
}

const DEFAULT_PREFERENCES: ReminderPreferences = {
  enabled: false,
  reminderMinutes: 15,
};

const isReminderMinutes = (value: number): value is ReminderMinutes =>
  REMINDER_OPTIONS.some((option) => option === value);

const readReminderPreferences = (stored: string | null): ReminderPreferences => {
  if (!stored) return DEFAULT_PREFERENCES;

  const parsed: unknown = JSON.parse(stored);
  if (
    typeof parsed === "object"
    && parsed !== null
    && "enabled" in parsed
    && typeof parsed.enabled === "boolean"
    && "reminderMinutes" in parsed
    && typeof parsed.reminderMinutes === "number"
    && isReminderMinutes(parsed.reminderMinutes)
  ) {
    return {
      enabled: parsed.enabled,
      reminderMinutes: parsed.reminderMinutes,
    };
  }
  throw new Error("Invalid appointment reminder preferences.");
};

const isNotificationSupported = () =>
  typeof window !== "undefined"
  && window.isSecureContext
  && "Notification" in window;

const getLocalDateKey = (date: Date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0"),
].join("-");

const reminderStorageKey = (userId: string) => `${REMINDER_PREFERENCES_PREFIX}${userId}`;

const sentReminderStorageKey = (userId: string) => `${REMINDER_PREFERENCES_PREFIX}sent:${userId}`;

const readSentReminderIds = (userId: string, dateKey: string) => {
  const raw = localStorage.getItem(sentReminderStorageKey(userId));
  if (!raw) return new Set<string>();

  const value: unknown = JSON.parse(raw);
  if (
    typeof value !== "object"
    || value === null
    || !("date" in value)
    || !("appointmentIds" in value)
    || typeof value.date !== "string"
    || !Array.isArray(value.appointmentIds)
    || !value.appointmentIds.every((id) => typeof id === "string")
  ) throw new Error("Invalid sent appointment reminder history.");

  if (value.date !== dateKey) return new Set<string>();

  return new Set(value.appointmentIds);
};

const ReminderEngine = () => {
  const { currentUser, isLocked } = useAuth();
  const { enabled, reminderMinutes, permission, preferencesReady } = useAppointmentReminders();
  const [now, setNow] = useState(() => new Date());
  const attemptedReminders = useRef(new Set<string>());
  const storageErrorShown = useRef(false);
  const lastQueryError = useRef<unknown>(null);
  const todayKey = getLocalDateKey(now);
  const canCheckReminders = Boolean(
    currentUser
    && !isLocked
    && preferencesReady
    && enabled
    && permission === "granted",
  );

  const {
    data: appointments = [],
    error,
  } = useQuery({
    queryKey: ["appointments", todayKey, "reminders"],
    enabled: canCheckReminders,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, date, heure_debut, statut")
        .eq("date", todayKey)
        .in("statut", ["pending", "confirmed"]);

      if (error) throw error;
      return data as ReminderAppointment[];
    },
  });

  useEffect(() => {
    if (!canCheckReminders) return;
    const interval = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(interval);
  }, [canCheckReminders]);

  useEffect(() => {
    if (!error) {
      lastQueryError.current = null;
      return;
    }
    if (lastQueryError.current === error) return;

    lastQueryError.current = error;
    console.error("Unable to check upcoming appointment reminders:", error);
    toast.error("Les rappels d’agenda n’ont pas pu être vérifiés. Vérifiez la connexion du cabinet.");
  }, [error]);

  useEffect(() => {
    if (!canCheckReminders || !currentUser) return;

    let sentIds: Set<string>;
    try {
      sentIds = readSentReminderIds(currentUser.id, todayKey);
      storageErrorShown.current = false;
    } catch (storageError) {
      console.error("Unable to read sent appointment reminders:", storageError);
      if (!storageErrorShown.current) {
        storageErrorShown.current = true;
        toast.error("L’historique local des rappels est inaccessible. Aucun rappel ne sera envoyé pour éviter les doublons.");
      }
      return;
    }

    const alreadyNotifiedIds = new Set([...sentIds, ...attemptedReminders.current]);
    const dueAppointments = getDueAppointmentReminders(
      appointments,
      now,
      reminderMinutes,
      alreadyNotifiedIds,
    );

    for (const appointment of dueAppointments) {
      attemptedReminders.current.add(appointment.id);
      let notification: Notification;
      try {
        notification = new Notification("Shifalyx · Rappel d’agenda", {
          body: `Un rendez-vous commence à ${appointment.heure_debut.slice(0, 5)}. Ouvrez l’agenda pour consulter les détails.`,
          tag: `shifalyx-appointment-${appointment.id}`,
        });
        notification.onclick = () => {
          window.focus();
          window.location.assign("/agenda");
          notification.close();
        };
        window.setTimeout(() => notification.close(), 15_000);
      } catch (notificationError) {
        console.error("Unable to display an appointment reminder:", notificationError);
        toast.error("Une notification de rappel n’a pas pu être affichée sur cet appareil.");
        continue;
      }

      sentIds.add(appointment.id);
      try {
        localStorage.setItem(
          sentReminderStorageKey(currentUser.id),
          JSON.stringify({ date: todayKey, appointmentIds: [...sentIds] }),
        );
      } catch (storageError) {
        console.error("Unable to persist the sent appointment reminder:", storageError);
        toast.error("Le rappel a été affiché, mais son historique n’a pas pu être conservé sur cet appareil.");
      }
    }
  }, [
    appointments,
    canCheckReminders,
    currentUser,
    now,
    reminderMinutes,
    todayKey,
  ]);

  return null;
};

export function AppointmentReminderProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [preferencesOwnerId, setPreferencesOwnerId] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermissionState>(
    () => isNotificationSupported() ? Notification.permission : "unsupported",
  );
  const userId = currentUser?.id ?? null;
  const isSupported = permission !== "unsupported";

  useEffect(() => {
    setPreferencesOwnerId(null);
    if (!userId) {
      setPreferences(DEFAULT_PREFERENCES);
      return;
    }

    const loadPreferences = () => {
      try {
        setPreferences(readReminderPreferences(localStorage.getItem(reminderStorageKey(userId))));
      } catch (storageError) {
        console.error("Unable to load appointment reminder preferences:", storageError);
        setPreferences(DEFAULT_PREFERENCES);
        toast.error("Les préférences de rappel n’ont pas pu être lues sur cet appareil.");
      } finally {
        setPreferencesOwnerId(userId);
      }
    };
    const synchronizeOtherTabs = (event: StorageEvent) => {
      if (event.key === reminderStorageKey(userId) || event.key === null) loadPreferences();
    };

    loadPreferences();
    window.addEventListener("storage", synchronizeOtherTabs);
    return () => window.removeEventListener("storage", synchronizeOtherTabs);
  }, [userId]);

  useEffect(() => {
    const updatePermission = () => {
      setPermission(isNotificationSupported() ? Notification.permission : "unsupported");
    };
    window.addEventListener("focus", updatePermission);
    return () => window.removeEventListener("focus", updatePermission);
  }, []);

  const persistPreferences = useCallback((nextPreferences: ReminderPreferences) => {
    if (!userId) return false;
    try {
      localStorage.setItem(reminderStorageKey(userId), JSON.stringify(nextPreferences));
      setPreferences(nextPreferences);
      setPreferencesOwnerId(userId);
      return true;
    } catch (storageError) {
      console.error("Unable to save appointment reminder preferences:", storageError);
      toast.error("Les préférences de rappel n’ont pas pu être enregistrées sur cet appareil.");
      return false;
    }
  }, [userId]);

  const requestPermission = useCallback(async () => {
    if (!isNotificationSupported()) {
      setPermission("unsupported");
      toast.error("Les notifications navigateur ne sont pas disponibles dans ce contexte.");
      return false;
    }

    try {
      const nextPermission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        toast.error(nextPermission === "denied"
          ? "Les notifications sont bloquées par le navigateur. Autorisez-les dans les réglages du site."
          : "L’autorisation de notification n’a pas été accordée.");
        return false;
      }
      return true;
    } catch (permissionError) {
      console.error("Unable to request browser notification permission:", permissionError);
      toast.error("La demande d’autorisation des notifications a échoué.");
      return false;
    }
  }, []);

  const enableReminders = useCallback(async () => {
    if (!await requestPermission()) return false;
    return persistPreferences({ ...preferences, enabled: true });
  }, [persistPreferences, preferences, requestPermission]);

  const disableReminders = useCallback(() => {
    persistPreferences({ ...preferences, enabled: false });
  }, [persistPreferences, preferences]);

  const setReminderMinutes = useCallback((minutes: number) => {
    if (!isReminderMinutes(minutes)) {
      toast.error("Choisissez un délai de rappel proposé.");
      return;
    }
    persistPreferences({ ...preferences, reminderMinutes: minutes });
  }, [persistPreferences, preferences]);

  const sendTestNotification = useCallback(async () => {
    if (!await requestPermission()) return false;
    try {
      const notification = new Notification("Shifalyx · Notification test", {
        body: "Les notifications de cet appareil sont opérationnelles.",
        tag: "shifalyx-notification-test",
      });
      window.setTimeout(() => notification.close(), 8_000);
      return true;
    } catch (notificationError) {
      console.error("Unable to display a test browser notification:", notificationError);
      toast.error("La notification test n’a pas pu être affichée.");
      return false;
    }
  }, [requestPermission]);

  const value = useMemo<AppointmentReminderContextValue>(() => ({
    ...preferences,
    isSupported,
    preferencesReady: Boolean(userId && preferencesOwnerId === userId),
    permission,
    enableReminders,
    disableReminders,
    setReminderMinutes,
    sendTestNotification,
  }), [
    disableReminders,
    enableReminders,
    isSupported,
    permission,
    preferencesOwnerId,
    preferences,
    sendTestNotification,
    setReminderMinutes,
    userId,
  ]);

  return (
    <AppointmentReminderContext.Provider value={value}>
      {children}
      <ReminderEngine />
    </AppointmentReminderContext.Provider>
  );
}
