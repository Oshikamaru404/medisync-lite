import type { Json } from "@/integrations/supabase/types";

export type MedicationStatus =
  | "prescribed"
  | "needs_confirmation"
  | "active"
  | "suspended"
  | "stopped"
  | "completed"
  | "not_started";
export type MedicationDuration = "short_term" | "long_term" | "unknown";
export type MedicationSource = "patient_report" | "clinician_verified" | "clinic_prescription";
export type MedicationOrigin =
  | "unknown"
  | "clinic_prescription"
  | "external_prescription"
  | "self_medication"
  | "other";

export interface MedicationStatusChange {
  [key: string]: Json | undefined;
  status: MedicationStatus;
  changed_at: string;
  reason_code?: string;
  reason_label?: string;
  reason_comment?: string | null;
  decided_by?: "clinician" | "patient" | "both";
}

export interface MedicationPrescriptionReference {
  [key: string]: Json | undefined;
  prescription_id: string;
  prescription_item_id?: string;
}

export interface StructuredMedication {
  [key: string]: Json | undefined;
  id: string;
  name: string;
  dose: string | null;
  units_per_intake?: number | null;
  intake_unit?: "comprimé" | "gélule" | null;
  route: string | null;
  frequency: string | null;
  indication: string | null;
  duration: MedicationDuration;
  status: MedicationStatus;
  source: MedicationSource;
  origin?: MedicationOrigin;
  validated_by_user_id?: string | null;
  validated_by_name?: string | null;
  validated_at?: string | null;
  started_on: string | null;
  planned_end_on: string | null;
  confirmed_at: string | null;
  status_history?: MedicationStatusChange[];
  ended_on?: string | null;
  prescription_id?: string;
  prescription_item_id?: string;
  prescription_item_order?: number;
  prescribed_duration_text?: string | null;
  prescribed_regimen?: string | null;
  prescription_refs?: MedicationPrescriptionReference[];
  created_at: string;
  updated_at: string;
}

const STATUSES: MedicationStatus[] = ["prescribed", "needs_confirmation", "active", "suspended", "stopped", "completed", "not_started"];
const DURATIONS: MedicationDuration[] = ["short_term", "long_term", "unknown"];
const SOURCES: MedicationSource[] = ["patient_report", "clinician_verified", "clinic_prescription"];
const ORIGINS: MedicationOrigin[] = ["unknown", "clinic_prescription", "external_prescription", "self_medication", "other"];

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isMedicationStatusHistory = (value: unknown): value is MedicationStatusChange[] =>
  Array.isArray(value) && value.every((entry) =>
    typeof entry === "object" &&
    entry !== null &&
    "status" in entry &&
    typeof entry.status === "string" &&
    STATUSES.includes(entry.status as MedicationStatus) &&
    "changed_at" in entry &&
    typeof entry.changed_at === "string" &&
    (!("reason_code" in entry) || typeof entry.reason_code === "string") &&
    (!("reason_label" in entry) || typeof entry.reason_label === "string") &&
    (!("reason_comment" in entry) || isNullableString(entry.reason_comment)) &&
    (!("decided_by" in entry) || ["clinician", "patient", "both"].includes(String(entry.decided_by)))
  );

const isMedicationPrescriptionReferences = (value: unknown): value is MedicationPrescriptionReference[] =>
  Array.isArray(value) && value.every((reference) =>
    typeof reference === "object"
    && reference !== null
    && "prescription_id" in reference
    && typeof reference.prescription_id === "string"
    && (!("prescription_item_id" in reference) || typeof reference.prescription_item_id === "string")
  );

export const isStructuredMedicationList = (value: unknown): value is StructuredMedication[] =>
  Array.isArray(value) && value.every((item) =>
    typeof item === "object" &&
    item !== null &&
    "id" in item && typeof item.id === "string" &&
    "name" in item && typeof item.name === "string" &&
    "dose" in item && isNullableString(item.dose) &&
    (!("units_per_intake" in item) || item.units_per_intake === null || (typeof item.units_per_intake === "number" && Number.isFinite(item.units_per_intake) && item.units_per_intake > 0)) &&
    (!("intake_unit" in item) || item.intake_unit === null || item.intake_unit === "comprimé" || item.intake_unit === "gélule") &&
    "route" in item && isNullableString(item.route) &&
    "frequency" in item && isNullableString(item.frequency) &&
    "indication" in item && isNullableString(item.indication) &&
    "duration" in item && typeof item.duration === "string" && DURATIONS.includes(item.duration as MedicationDuration) &&
    "status" in item && typeof item.status === "string" && STATUSES.includes(item.status as MedicationStatus) &&
    "source" in item && typeof item.source === "string" && SOURCES.includes(item.source as MedicationSource) &&
    (!("origin" in item) || (typeof item.origin === "string" && ORIGINS.includes(item.origin as MedicationOrigin))) &&
    (!("validated_by_user_id" in item) || isNullableString(item.validated_by_user_id)) &&
    (!("validated_by_name" in item) || isNullableString(item.validated_by_name)) &&
    (!("validated_at" in item) || isNullableString(item.validated_at)) &&
    "started_on" in item && isNullableString(item.started_on) &&
    "planned_end_on" in item && isNullableString(item.planned_end_on) &&
    "confirmed_at" in item && isNullableString(item.confirmed_at) &&
    (!("status_history" in item) || isMedicationStatusHistory(item.status_history)) &&
    (!("ended_on" in item) || isNullableString(item.ended_on)) &&
    (!("prescription_id" in item) || typeof item.prescription_id === "string") &&
    (!("prescription_item_id" in item) || typeof item.prescription_item_id === "string") &&
    (!("prescription_item_order" in item) || typeof item.prescription_item_order === "number") &&
    (!("prescribed_duration_text" in item) || isNullableString(item.prescribed_duration_text)) &&
    (!("prescribed_regimen" in item) || isNullableString(item.prescribed_regimen)) &&
    (!("prescription_refs" in item) || isMedicationPrescriptionReferences(item.prescription_refs)) &&
    "created_at" in item && typeof item.created_at === "string" &&
    "updated_at" in item && typeof item.updated_at === "string"
  );
