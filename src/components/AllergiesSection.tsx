import { useState } from "react";
import { Edit, Plus, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { allergiesCommon } from "@/data/medicalTemplates";

interface AllergiesSectionProps {
  value: string;
  onSave: (value: string) => void;
  isEditing: boolean;
  onEditToggle: () => void;
}

export const AllergiesSection = ({
  value,
  onSave,
  isEditing,
  onEditToggle,
}: AllergiesSectionProps) => {
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(
    value ? value.split("\n").map(a => a.replace("• ", "").trim()).filter(Boolean) : []
  );
  const [customAllergy, setCustomAllergy] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSave = () => {
    const allergiesText = selectedAllergies.map(a => `• ${a}`).join("\n");
    onSave(allergiesText);
    onEditToggle();
  };

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(allergy)
        ? prev.filter((a) => a !== allergy)
        : [...prev, allergy]
    );
  };

  const addCustomAllergy = () => {
    if (customAllergy.trim() && !selectedAllergies.includes(customAllergy.trim())) {
      setSelectedAllergies((prev) => [...prev, customAllergy.trim()]);
      setCustomAllergy("");
    }
  };

  const removeAllergy = (allergy: string) => {
    setSelectedAllergies((prev) => prev.filter((a) => a !== allergy));
  };

  const filteredAllergies = allergiesCommon.filter((allergy) =>
    allergy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="p-6 border-l-4 border-l-[hsl(var(--medical-allergies))] transition-all duration-300 hover:shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[hsl(var(--medical-allergies-light))] animate-scale-in">
            <AlertTriangle className="w-5 h-5 text-[hsl(var(--medical-allergies))]" />
          </div>
          <h3 className="text-lg font-semibold">Allergies et Contre-indications</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onEditToggle} className="hover-scale">
          <Edit className="w-4 h-4" />
        </Button>
      </div>

      {isEditing ? (
        <div className="space-y-4 animate-fade-in">
          {/* Selected Allergies */}
          {selectedAllergies.length > 0 && (
            <div className="p-4 bg-[hsl(var(--medical-allergies-light))] border-2 border-[hsl(var(--medical-allergies))] rounded-lg animate-scale-in">
              <p className="text-sm font-semibold mb-3 text-[hsl(var(--medical-allergies))] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Allergies sélectionnées ({selectedAllergies.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedAllergies.map((allergy, idx) => (
                  <Badge
                    key={idx}
                    className="cursor-pointer hover-scale bg-[hsl(var(--medical-allergies))] hover:bg-[hsl(var(--medical-allergies))]/80 text-white"
                    onClick={() => removeAllergy(allergy)}
                  >
                    {allergy}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div>
            <Input
              type="text"
              placeholder="Rechercher une allergie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-3"
            />
          </div>

          {/* Common Allergies */}
          <div className="p-4 rounded-lg bg-muted/30">
            <p className="text-sm font-medium mb-3 text-muted-foreground">
              Allergies courantes (cliquez pour ajouter):
            </p>
            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
              {filteredAllergies.map((allergy, idx) => (
                <Badge
                  key={idx}
                  variant={selectedAllergies.includes(allergy) ? "default" : "outline"}
                  className="cursor-pointer hover-scale transition-all duration-200"
                  style={selectedAllergies.includes(allergy) ? {
                    backgroundColor: 'hsl(var(--medical-allergies))',
                    borderColor: 'hsl(var(--medical-allergies))',
                    color: 'white'
                  } : {
                    borderColor: 'hsl(var(--medical-allergies) / 0.3)'
                  }}
                  onClick={() => toggleAllergy(allergy)}
                >
                  {selectedAllergies.includes(allergy) && "✓ "}
                  {allergy}
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom Allergy */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Ajouter une allergie personnalisée:</p>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Autre allergie..."
                value={customAllergy}
                onChange={(e) => setCustomAllergy(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomAllergy()}
              />
              <Button onClick={addCustomAllergy} size="sm" className="shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} size="sm">
              Enregistrer
            </Button>
            <Button
              onClick={() => {
                setSelectedAllergies(
                  value ? value.split("\n").map(a => a.replace("• ", "").trim()).filter(Boolean) : []
                );
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
          {value || "Aucune allergie enregistrée"}
        </div>
      )}
    </Card>
  );
};
