export const SESSION_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

export const SESSION_INACTIVITY_TIMEOUT_MINUTES_OPTIONS = [5, 10, 15] as const;

const isSupportedTimeoutMinutes = (
  minutes: number,
): minutes is typeof SESSION_INACTIVITY_TIMEOUT_MINUTES_OPTIONS[number] =>
  SESSION_INACTIVITY_TIMEOUT_MINUTES_OPTIONS.some((option) => option === minutes);

export function getSessionInactivityTimeoutMs(settingValue: string): number {
  const minutes = Number(settingValue);
  return isSupportedTimeoutMinutes(minutes)
    ? minutes * 60 * 1000
    : SESSION_INACTIVITY_TIMEOUT_MS;
}
