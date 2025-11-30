import { useState } from "react";
import { Edit, Plus, X, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface MedicalRecordSectionProps {
  title: string;
  value: string;
  onSave: (value: string) => void;
  placeholder: string;
  templates?: { label: string; value: string }[];
  isEditing: boolean;
  onEditToggle: () => void;
  icon?: LucideIcon;
  colorClass?: string;
}

export const MedicalRecordSection = ({
  title,
  value,
  onSave,
  placeholder,
  templates,
  isEditing,
  onEditToggle,
  icon: Icon,
  colorClass = "medical-antecedents",
}: MedicalRecordSectionProps) => {
  const [localValue, setLocalValue] = useState(value);

  const handleSave = () => {
    onSave(localValue);
    onEditToggle();
  };

  const handleAddTemplate = (templateValue: string) => {
    const currentText = localValue.trim();
    if (currentText) {
      setLocalValue(currentText + "\n• " + templateValue);
    } else {
      setLocalValue("• " + templateValue);
    }
  };

  return (
    <Card className={`p-6 border-l-4 transition-all duration-300 hover:shadow-lg ${isEditing ? 'shadow-lg' : ''}`} style={{ borderLeftColor: `hsl(var(--${colorClass}))` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 rounded-lg animate-scale-in" style={{ backgroundColor: `hsl(var(--${colorClass}-light))` }}>
              <Icon className="w-5 h-5" style={{ color: `hsl(var(--${colorClass}))` }} />
            </div>
          )}
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onEditToggle}
          className="hover-scale"
        >
          <Edit className="w-4 h-4" />
        </Button>
      </div>

      {isEditing ? (
        <div className="space-y-4 animate-fade-in">
          {templates && templates.length > 0 && (
            <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: `hsl(var(--${colorClass}-light))` }}>
              <p className="text-sm font-medium mb-3" style={{ color: `hsl(var(--${colorClass}))` }}>
                Templates rapides:
              </p>
              <div className="flex flex-wrap gap-2">
                {templates.map((template, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="cursor-pointer hover-scale transition-all duration-200 border-2"
                    style={{ 
                      borderColor: `hsl(var(--${colorClass}) / 0.3)`,
                      backgroundColor: 'hsl(var(--card))'
                    }}
                    onClick={() => handleAddTemplate(template.value)}
                  >
                    <Plus className="w-3 h-3 mr-1" style={{ color: `hsl(var(--${colorClass}))` }} />
                    {template.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={placeholder}
            rows={8}
            className="font-mono text-sm"
          />

          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm">
              Enregistrer
            </Button>
            <Button
              onClick={() => {
                setLocalValue(value);
                onEditToggle();
              }}
              variant="outline"
              size="sm"
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="whitespace-pre-wrap text-muted-foreground">
          {value || "Aucune information enregistrée"}
        </div>
      )}
    </Card>
  );
};
