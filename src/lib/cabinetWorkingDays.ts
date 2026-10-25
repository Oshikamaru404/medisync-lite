export const DEFAULT_CABINET_WORKING_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export function parseCabinetWorkingDays(value: string): number[] {
  if (!value) return [...DEFAULT_CABINET_WORKING_DAYS];

  const parsed: unknown = JSON.parse(value);
  if (
    !Array.isArray(parsed)
    || !parsed.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  ) {
    throw new Error("Invalid cabinet working days setting.");
  }

  return [...new Set(parsed)].sort((first, second) => first - second);
}
