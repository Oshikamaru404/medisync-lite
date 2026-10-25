import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPersonName(name: string | null | undefined): string {
  return (name || "")
    .trim()
    .toLocaleLowerCase("fr")
    .replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr"));
}

export function formatPatientName(lastName: string | null | undefined, firstName: string | null | undefined): string {
  return [formatPersonName(lastName), formatPersonName(firstName)].filter(Boolean).join(" ");
}

export function formatPhoneNumber(phone: string | null | undefined): string {
  const value = phone?.trim();
  if (!value) return "";

  const compact = value.replace(/[\s().-]/g, "");
  const moroccanPrefix = compact.match(/^(?:\+212|00212|212)(\d{9})$/);
  if (moroccanPrefix) {
    const [first, ...remaining] = moroccanPrefix[1];
    return `+212 ${first} ${remaining.join("").match(/\d{2}/g)?.join(" ") || ""}`.trim();
  }

  const digits = compact.replace(/\D/g, "");
  if (/^\d{10}$/.test(digits)) {
    return digits.match(/\d{2}/g)?.join(" ") || value;
  }

  return value;
}

export function normalizeMoroccanPhoneInput(phone: string | null | undefined): string {
  const value = phone || "";
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("00212") && digits.length === 14) {
    return `0${digits.slice(5)}`;
  }
  if (digits.startsWith("212") && digits.length === 12) {
    return `0${digits.slice(3)}`;
  }

  return digits.length > 10 ? value : digits;
}

export function sanitizeMoroccanPhoneInput(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("00212") && digits.length === 14) {
    return `0${digits.slice(5)}`;
  }
  if (digits.startsWith("212") && digits.length === 12) {
    return `0${digits.slice(3)}`;
  }

  return digits.slice(0, 10);
}

export function isValidMoroccanPhone(phone: string | null | undefined): boolean {
  if (!phone?.trim()) return true;
  return /^0\d{9}$/.test(phone.replace(/\D/g, ""));
}

export function getMoroccanPhoneDigits(phone: string | null | undefined): string {
  return (phone || "").replace(/\D/g, "");
}

export function toMoroccanInternationalPhone(phone: string | null | undefined): string {
  const digits = getMoroccanPhoneDigits(phone);
  if (!/^0\d{9}$/.test(digits)) return "";
  return `+212${digits.slice(1)}`;
}
