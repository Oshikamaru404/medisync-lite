import type { PrescriptionItem, PrescriptionType } from "@/hooks/usePrescriptions";

export interface LocalPrescriptionTemplate {
  id: string;
  name: string;
  tags: string[];
  prescriptionType: PrescriptionType;
  items: PrescriptionItem[];
  createdAt: string;
}

export const prescriptionTemplateStorageKey = (userId: string) => `prescription-templates:${userId}`;

const isPrescriptionType = (value: unknown): value is PrescriptionType =>
  value === "medication" || value === "laboratory" || value === "imaging";

const isPrescriptionItem = (item: unknown): item is PrescriptionItem =>
  typeof item === "object"
  && item !== null
  && "nom_medicament" in item
  && typeof item.nom_medicament === "string"
  && "posologie" in item
  && typeof item.posologie === "string"
  && "request_type" in item
  && (item.request_type === "medication" || item.request_type === "laboratory" || item.request_type === "imaging");

export const parsePrescriptionTemplates = (data: unknown): LocalPrescriptionTemplate[] => {
  if (!Array.isArray(data)) return [];
  return data.flatMap((template): LocalPrescriptionTemplate[] => {
    if (typeof template !== "object" || template === null
      || !("id" in template) || typeof template.id !== "string"
      || !("name" in template) || typeof template.name !== "string"
      || !("tags" in template) || !Array.isArray(template.tags)
      || !("items" in template) || !Array.isArray(template.items)
      || !template.items.every(isPrescriptionItem)) {
      return [];
    }
    const items = template.items.map((item, index) => ({ ...item, ordre: index }));
    const inferredType = items[0]?.request_type || "medication";
    const prescriptionType = "prescriptionType" in template && isPrescriptionType(template.prescriptionType)
      ? template.prescriptionType
      : inferredType;
    return [{
      id: template.id,
      name: template.name,
      tags: template.tags.filter((tag): tag is string => typeof tag === "string"),
      prescriptionType,
      items,
      createdAt: "createdAt" in template && typeof template.createdAt === "string" ? template.createdAt : new Date(0).toISOString(),
    }];
  });
};

export const readPrescriptionTemplates = (userId: string): LocalPrescriptionTemplate[] => {
  const stored = localStorage.getItem(prescriptionTemplateStorageKey(userId));
  return stored ? parsePrescriptionTemplates(JSON.parse(stored)) : [];
};

export const writePrescriptionTemplates = (userId: string, templates: LocalPrescriptionTemplate[]) => {
  localStorage.setItem(prescriptionTemplateStorageKey(userId), JSON.stringify(templates));
};
