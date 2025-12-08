import { useState } from "react";
import { Activity, AlertTriangle, Pill, StickyNote, ChevronDown, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { antecedentsTemplates, allergiesCommon, medicamentsMaghreb } from "@/data/medicalTemplates";

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
}

interface SectionConfig {
  key: string;
  title: string;
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
const traitementsTemplates = medicamentsMaghreb.slice(0, 20).map(m => ({ 
  label: m.nom, 
  value: `${m.nom} (${m.composition})` 
}));

const SECTIONS: SectionConfig[] = [
  {
    key: "allergies",
    title: "Allergies",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-l-red-500",
    badgeColor: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800",
    placeholder: "Allergies médicamenteuses, alimentaires...",
    templates: allergiesTemplates,
    priority: true,
  },
  {
    key: "traitements",
    title: "Traitements en cours",
    icon: Pill,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    borderColor: "border-l-emerald-500",
    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    placeholder: "Médicaments actuels...",
    templates: traitementsTemplates,
    priority: true,
  },
  {
    key: "antecedents",
    title: "Antécédents",
    icon: Activity,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    borderColor: "border-l-blue-500",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    placeholder: "Historique médical...",
    templates: antecedentsTemplates,
    priority: true,
  },
  {
    key: "notes",
    title: "Notes",
    icon: StickyNote,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-l-amber-500",
    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    placeholder: "Notes libres...",
  },
];

export const MedicalRecordAccordion = ({
  data,
  onSave,
  editingSection,
  onEditToggle,
}: MedicalRecordAccordionProps) => {
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<string[]>(["allergies", "traitements", "antecedents"]);

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
    onSave(key, localValues[key] || data[key as keyof typeof data]);
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

  return (
    <div className="space-y-3">
      {SECTIONS.map((section) => {
        const value = data[section.key as keyof typeof data];
        const isOpen = openSections.includes(section.key);
        const isEditing = editingSection === section.key;
        const Icon = section.icon;
        const hasContent = Boolean(value?.trim());
        const preview = getValuePreview(value);

        return (
          <Collapsible
            key={section.key}
            open={isOpen}
            onOpenChange={() => !isEditing && toggleSection(section.key)}
          >
            <Card className={cn(
              "border-l-4 transition-all",
              section.borderColor,
              isOpen && "shadow-sm"
            )}>
              <CollapsibleTrigger asChild disabled={isEditing}>
                <div className={cn(
                  "flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors",
                  isEditing && "cursor-default hover:bg-transparent"
                )}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn("p-1.5 rounded-md", section.bgColor)}>
                      <Icon className={cn("w-4 h-4", section.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{section.title}</span>
                        {section.priority && hasContent && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {value.split("\n").filter(l => l.trim()).length}
                          </Badge>
                        )}
                      </div>
                      {!isOpen && preview && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {preview}...
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )} />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-4 pb-4 pt-0">
                  {isEditing ? (
                    <div className="space-y-3">
                      {section.templates && section.templates.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium">Templates rapides :</p>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {section.templates.map((template, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="cursor-pointer text-xs hover:bg-muted transition-colors"
                                onClick={() => addTemplate(section.key, template.value)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                {template.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <Textarea
                        value={localValues[section.key] ?? value}
                        onChange={(e) => setLocalValues(prev => ({ ...prev, [section.key]: e.target.value }))}
                        placeholder={section.placeholder}
                        rows={4}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSave(section.key)}>
                          Enregistrer
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleCancel(section.key)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        {hasContent ? (
                          <div className="flex flex-wrap gap-1.5">
                            {parseItems(value).map((item, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className={cn("text-xs font-normal", section.badgeColor)}
                              >
                                {item.replace(/^•\s*/, '')}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Aucune information
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(section.key)}
                        className="shrink-0 h-7 px-2 text-xs"
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
  );
};
