import { useState } from "react";
import { Activity, AlertTriangle, StickyNote, ChevronDown, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { antecedentsTemplates, allergiesCommon } from "@/data/medicalTemplates";
import { StructuredMedicationManager } from "@/components/StructuredMedicationManager";
import type { StructuredMedication } from "@/lib/structuredMedications";

interface MedicalRecordAccordionProps {
  data: {
    antecedents: string;
    allergies: string;
    traitements: string;
    notes: string;
  };
  onSave: (section: string, value: string) => void;
  editingSection: string | null;
  onEditToggle: (section: string | null) => void;
  medications: StructuredMedication[];
  onSaveMedications: (medications: StructuredMedication[]) => Promise<unknown>;
  savingMedications: boolean;
}

interface SectionConfig {
  key: string;
  title: string;
  description: string;
  icon: typeof Activity;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
  placeholder: string;
  templates?: { label: string; value: string }[];
  priority?: boolean;
}

const allergiesTemplates = allergiesCommon.map(a => ({ label: a, value: a }));
const SECTIONS: SectionConfig[] = [
  {
    key: "allergies",
    title: "Allergies",
    description: "À vérifier avant toute prescription",
    icon: AlertTriangle,
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    badgeColor: "bg-rose-50 text-rose-800 border-rose-200",
    placeholder: "Allergies médicamenteuses, alimentaires...",
    templates: allergiesTemplates,
    priority: true,
  },
  {
    key: "antecedents",
    title: "Antécédents",
    description: "Repères médicaux à connaître",
    icon: Activity,
    color: "text-sky-700",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    badgeColor: "bg-sky-50 text-sky-800 border-sky-200",
    placeholder: "Historique médical...",
    templates: antecedentsTemplates,
    priority: true,
  },
  {
    key: "notes",
    title: "Notes",
    description: "Informations complémentaires",
    icon: StickyNote,
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    badgeColor: "bg-violet-50 text-violet-800 border-violet-200",
    placeholder: "Notes libres...",
  },
];

export const MedicalRecordAccordion = ({
  data,
  onSave,
  editingSection,
  onEditToggle,
  medications,
  onSaveMedications,
  savingMedications,
}: MedicalRecordAccordionProps) => {
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<string[]>(["allergies", "antecedents"]);

  const toggleSection = (key: string) => {
    setOpenSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleEdit = (key: string) => {
    setLocalValues(prev => ({ ...prev, [key]: data[key as keyof typeof data] }));
    onEditToggle(key);
    if (!openSections.includes(key)) {
      setOpenSections(prev => [...prev, key]);
    }
  };

  const handleSave = (key: string) => {
    onSave(key, localValues[key] ?? data[key as keyof typeof data]);
    onEditToggle(null);
  };

  const handleCancel = (key: string) => {
    setLocalValues(prev => ({ ...prev, [key]: data[key as keyof typeof data] }));
    onEditToggle(null);
  };

  const addTemplate = (key: string, templateValue: string) => {
    const current = localValues[key]?.trim() || "";
    const newValue = current ? `${current}\n• ${templateValue}` : `• ${templateValue}`;
    setLocalValues(prev => ({ ...prev, [key]: newValue }));
  };

  const parseItems = (value: string): string[] => {
    if (!value) return [];
    return value
      .split(/[\n,•]/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  };

  const getValuePreview = (value: string) => {
    if (!value) return null;
    const lines = value.split("\n").filter(l => l.trim());
    return lines.slice(0, 2).join(", ").substring(0, 100);
  };

  const filledSections = SECTIONS.filter((section) => Boolean(data[section.key as keyof typeof data]?.trim())).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[#cfe3d9] bg-[linear-gradient(115deg,#f0f7f3_0%,#ffffff_62%,#edf6f1_100%)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#54806d]">Repères médicaux</p>
          <p className="mt-1 text-xs text-[#557166]">Informations déclarées, à confirmer avec le patient.</p>
        </div>
        <Badge variant="outline" className="w-fit rounded-full border-[#c5ddd0] bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-[#28624f]">
          {filledSections}/{SECTIONS.length} rubriques renseignées
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
      <StructuredMedicationManager
        medications={medications}
        legacyText={data.traitements}
        onSave={onSaveMedications}
        onSaveLegacy={(value) => onSave("traitements", value)}
        saving={savingMedications}
      />
      {SECTIONS.map((section) => {
        const value = data[section.key as keyof typeof data];
        const isOpen = openSections.includes(section.key);
        const isEditing = editingSection === section.key;
        const Icon = section.icon;
        const hasContent = Boolean(value?.trim());
        const itemCount = parseItems(value).length;
        const preview = getValuePreview(value);

        return (
          <Collapsible
            key={section.key}
            open={isOpen}
            onOpenChange={() => !isEditing && toggleSection(section.key)}
          >
            <Card className={cn(
              "overflow-hidden rounded-2xl border bg-white shadow-sm transition-all",
              section.borderColor,
              (section.key === "allergies" || section.key === "notes") && "md:col-span-2",
              isOpen && "shadow-md shadow-[#184a43]/[0.04]",
            )}>
              <CollapsibleTrigger asChild disabled={isEditing}>
                <button type="button" className={cn(
                  "flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-[#f7faf8] sm:px-5",
                  isEditing && "cursor-default hover:bg-white"
                )}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", section.bgColor)}>
                      <Icon className={cn("h-[18px] w-[18px]", section.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#183c35]">{section.title}</span>
                        {section.priority && (
                          <Badge variant="outline" className={cn("rounded-full px-2 py-0 text-[10px] font-semibold", hasContent ? section.badgeColor : "border-slate-200 bg-slate-50 text-slate-500")}>
                            {hasContent ? `${itemCount} élément${itemCount === 1 ? "" : "s"}` : "À renseigner"}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-[#6b8177]">{!isOpen && preview ? `${preview} · ` : ""}{section.description}</p>
                    </div>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 shrink-0 text-[#648276] transition-transform",
                    isOpen && "rotate-180"
                  )} />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t border-[#edf2ef] px-4 pb-4 pt-3.5 sm:px-5">
                  {isEditing ? (
                    <div className="space-y-3">
                      {section.templates && section.templates.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold text-[#5c7469]">Suggestions rapides</p>
                          <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                            {section.templates.map((template, idx) => (
                              <button
                                type="button"
                                key={idx}
                                className="inline-flex items-center rounded-full border border-[#d9e8e0] bg-[#f7faf8] px-2.5 py-1 text-[11px] font-medium text-[#315d4d] transition-colors hover:border-[#a9c9b8] hover:bg-[#edf6f1]"
                                onClick={() => addTemplate(section.key, template.value)}
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                {template.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <Textarea
                        value={localValues[section.key] ?? value}
                        onChange={(e) => setLocalValues(prev => ({ ...prev, [section.key]: e.target.value }))}
                        placeholder={section.placeholder}
                        rows={4}
                        className="min-h-28 rounded-xl border-[#d7e4dc] text-sm focus-visible:ring-[#4e8a70]"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => handleSave(section.key)} className="rounded-lg bg-[#23634f] text-white hover:bg-[#194d40]">
                          Enregistrer
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleCancel(section.key)} className="rounded-lg border-[#c9d9d0] text-[#45675a]">
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        {hasContent ? (
                          <div className="flex flex-wrap gap-1.5">
                            {parseItems(value).map((item, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className={cn("max-w-full whitespace-normal rounded-lg px-2.5 py-1 text-xs font-medium leading-5", section.badgeColor)}
                              >
                                {item.replace(/^•\s*/, '')}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="rounded-xl border border-dashed border-[#dce7e1] bg-[#fafcfb] px-3 py-2.5 text-xs leading-5 text-[#71847a]">
                            {section.key === "allergies"
                              ? "Aucune allergie consignée. À confirmer avec le patient avant toute prescription."
                              : "Aucune information consignée pour le moment."}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(section.key)}
                        className="h-8 shrink-0 rounded-lg border-[#d5e3dc] px-3 text-xs text-[#28624f] hover:bg-[#f0f7f3]"
                      >
                        Modifier
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
      </div>
    </div>
  );
};
