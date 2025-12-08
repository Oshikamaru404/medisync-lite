import { useState } from "react";
import { Activity, AlertTriangle, Pill, StickyNote, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { antecedentsTemplates, allergiesCommon } from "@/data/medicalTemplates";

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
  placeholder: string;
  templates?: { label: string; value: string }[];
  priority?: boolean;
}

const allergiesTemplates = allergiesCommon.slice(0, 10).map(a => ({ label: a, value: a }));

const SECTIONS: SectionConfig[] = [
  {
    key: "allergies",
    title: "Allergies",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-l-red-500",
    placeholder: "Allergies médicamenteuses, alimentaires...",
    templates: allergiesTemplates,
    priority: true,
  },
  {
    key: "traitements",
    title: "Traitements en cours",
    icon: Pill,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-l-emerald-500",
    placeholder: "Médicaments actuels...",
    priority: true,
  },
  {
    key: "antecedents",
    title: "Antécédents",
    icon: Activity,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-l-blue-500",
    placeholder: "Historique médical...",
    templates: antecedentsTemplates,
  },
  {
    key: "notes",
    title: "Notes",
    icon: StickyNote,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-l-amber-500",
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
  const [openSections, setOpenSections] = useState<string[]>(["allergies", "traitements"]);

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
                        <div className="flex flex-wrap gap-1.5">
                          {section.templates.slice(0, 6).map((template, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="cursor-pointer text-xs hover:bg-muted transition-colors"
                              onClick={() => addTemplate(section.key, template.value)}
                            >
                              + {template.label}
                            </Badge>
                          ))}
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
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {value}
                          </p>
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
