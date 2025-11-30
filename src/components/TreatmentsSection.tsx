import { useState } from "react";
import { Edit, Plus, X, Search, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { medicamentsMaghreb } from "@/data/medicalTemplates";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface Treatment {
  medicament: string;
  dosage: string;
  frequence: string;
}

interface TreatmentsSectionProps {
  value: string;
  onSave: (value: string) => void;
  isEditing: boolean;
  onEditToggle: () => void;
}

export const TreatmentsSection = ({
  value,
  onSave,
  isEditing,
  onEditToggle,
}: TreatmentsSectionProps) => {
  const parseTreatments = (text: string): Treatment[] => {
    if (!text) return [];
    return text.split("\n").filter(Boolean).map(line => {
      const cleaned = line.replace("• ", "").trim();
      const parts = cleaned.split(" - ");
      return {
        medicament: parts[0] || "",
        dosage: parts[1] || "",
        frequence: parts[2] || "",
      };
    });
  };

  const [treatments, setTreatments] = useState<Treatment[]>(parseTreatments(value));
  const [currentTreatment, setCurrentTreatment] = useState<Treatment>({
    medicament: "",
    dosage: "",
    frequence: "",
  });
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSave = () => {
    const treatmentsText = treatments
      .map((t) => `• ${t.medicament} - ${t.dosage} - ${t.frequence}`)
      .join("\n");
    onSave(treatmentsText);
    onEditToggle();
  };

  const addTreatment = () => {
    if (currentTreatment.medicament && currentTreatment.dosage && currentTreatment.frequence) {
      setTreatments([...treatments, currentTreatment]);
      setCurrentTreatment({ medicament: "", dosage: "", frequence: "" });
    }
  };

  const removeTreatment = (index: number) => {
    setTreatments(treatments.filter((_, i) => i !== index));
  };

  const filteredMedicaments = medicamentsMaghreb.filter(
    (med) =>
      med.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.composition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.categorie.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="p-6 border-l-4 border-l-[hsl(var(--medical-treatments))] transition-all duration-300 hover:shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[hsl(var(--medical-treatments-light))] animate-scale-in">
            <Pill className="w-5 h-5 text-[hsl(var(--medical-treatments))]" />
          </div>
          <h3 className="text-lg font-semibold">Traitements en Cours</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onEditToggle} className="hover-scale">
          <Edit className="w-4 h-4" />
        </Button>
      </div>

      {isEditing ? (
        <div className="space-y-4 animate-fade-in">
          {/* Current Treatments */}
          {treatments.length > 0 && (
            <div className="p-4 bg-[hsl(var(--medical-treatments-light))] border-2 border-[hsl(var(--medical-treatments))] rounded-lg space-y-2 animate-scale-in">
              <p className="text-sm font-semibold mb-3 text-[hsl(var(--medical-treatments))] flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Traitements actuels ({treatments.length}):
              </p>
              {treatments.map((treatment, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-2 bg-card rounded border"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{treatment.medicament}</p>
                    <p className="text-xs text-muted-foreground">
                      {treatment.dosage} - {treatment.frequence}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTreatment(idx)}
                    className="shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Treatment */}
          <div className="space-y-3 p-4 border-2 rounded-lg bg-muted/30" style={{ borderColor: 'hsl(var(--medical-treatments) / 0.3)' }}>
            <p className="text-sm font-semibold text-[hsl(var(--medical-treatments))] flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Ajouter un traitement:
            </p>

            {/* Medicament Autocomplete */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Médicament</label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    {currentTreatment.medicament || "Sélectionner un médicament..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Rechercher un médicament..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>Aucun médicament trouvé.</CommandEmpty>
                      <CommandGroup>
                        {filteredMedicaments.slice(0, 50).map((med) => (
                          <CommandItem
                            key={med.nom}
                            value={med.nom}
                            onSelect={() => {
                              setCurrentTreatment({
                                ...currentTreatment,
                                medicament: `${med.nom} (${med.composition})`,
                              });
                              setOpen(false);
                              setSearchQuery("");
                            }}
                          >
                            <div>
                              <p className="font-medium">{med.nom}</p>
                              <p className="text-xs text-muted-foreground">
                                {med.composition} - {med.categorie}
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Dosage */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Dosage</label>
              <Input
                placeholder="Ex: 500mg, 1 comprimé, 5ml..."
                value={currentTreatment.dosage}
                onChange={(e) =>
                  setCurrentTreatment({ ...currentTreatment, dosage: e.target.value })
                }
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fréquence</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {["1x/jour", "2x/jour", "3x/jour", "Matin", "Soir", "Matin et soir"].map(
                  (freq) => (
                    <Badge
                      key={freq}
                      variant="outline"
                      className="cursor-pointer hover-scale transition-all duration-200"
                      style={{
                        borderColor: currentTreatment.frequence === freq 
                          ? 'hsl(var(--medical-treatments))' 
                          : 'hsl(var(--medical-treatments) / 0.3)',
                        backgroundColor: currentTreatment.frequence === freq 
                          ? 'hsl(var(--medical-treatments-light))' 
                          : 'transparent'
                      }}
                      onClick={() =>
                        setCurrentTreatment({ ...currentTreatment, frequence: freq })
                      }
                    >
                      {freq}
                    </Badge>
                  )
                )}
              </div>
              <Input
                placeholder="Ou saisir manuellement..."
                value={currentTreatment.frequence}
                onChange={(e) =>
                  setCurrentTreatment({ ...currentTreatment, frequence: e.target.value })
                }
              />
            </div>

            <Button onClick={addTreatment} size="sm" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter ce traitement
            </Button>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} size="sm">
              Enregistrer
            </Button>
            <Button
              onClick={() => {
                setTreatments(parseTreatments(value));
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
          {value || "Aucun traitement en cours"}
        </div>
      )}
    </Card>
  );
};
