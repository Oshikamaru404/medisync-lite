import { useState } from "react";
import { Plus, X, Pill, Search, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMedications, useCreatePrescription, PrescriptionItem } from "@/hooks/usePrescriptions";

interface PrescriptionDialogProps {
  patientId: string;
  patientName: string;
  children?: React.ReactNode;
}

const POSOLOGIES = [
  "1 comprimé matin",
  "1 comprimé matin et soir",
  "1 comprimé 3 fois par jour",
  "1 comprimé au coucher",
  "2 comprimés matin",
  "1 gélule matin",
  "1 gélule matin et soir",
  "1 sachet matin",
  "1 sachet 3 fois par jour",
  "2 bouffées matin et soir",
  "1 cuillère à soupe 3 fois par jour",
  "10 gouttes 3 fois par jour",
  "1 injection par jour",
  "Selon prescription",
];

const DUREES = [
  "3 jours",
  "5 jours",
  "7 jours",
  "10 jours",
  "14 jours",
  "21 jours",
  "1 mois",
  "2 mois",
  "3 mois",
  "6 mois",
  "Traitement continu",
];

export const PrescriptionDialog = ({
  patientId,
  patientName,
  children,
}: PrescriptionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Omit<PrescriptionItem, "id" | "prescription_id">[]>([]);
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [medicationPopoverOpen, setMedicationPopoverOpen] = useState(false);

  const { data: medications = [] } = useMedications();
  const createPrescription = useCreatePrescription();

  const filteredMedications = medications.filter(
    (m) =>
      m.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.dci && m.dci.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addMedication = (medication: typeof medications[0]) => {
    const newItem: Omit<PrescriptionItem, "id" | "prescription_id"> = {
      medication_id: medication.id,
      nom_medicament: medication.nom,
      dosage: medication.dosage_defaut ? `${medication.dosage_defaut} ${medication.unite || ""}`.trim() : null,
      posologie: "1 comprimé matin et soir",
      duree: "7 jours",
      instructions: null,
      ordre: items.length,
    };
    setItems([...items, newItem]);
    setSearchQuery("");
    setMedicationPopoverOpen(false);
  };

  const addCustomMedication = () => {
    if (!searchQuery.trim()) return;
    const newItem: Omit<PrescriptionItem, "id" | "prescription_id"> = {
      medication_id: null,
      nom_medicament: searchQuery,
      dosage: null,
      posologie: "Selon prescription",
      duree: null,
      instructions: null,
      ordre: items.length,
    };
    setItems([...items, newItem]);
    setSearchQuery("");
    setMedicationPopoverOpen(false);
  };

  const updateItem = (index: number, updates: Partial<PrescriptionItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (items.length === 0) return;

    createPrescription.mutate(
      { patientId, items, notes: notes || undefined },
      {
        onSuccess: () => {
          setOpen(false);
          setItems([]);
          setNotes("");
        },
      }
    );
  };

  const resetForm = () => {
    setItems([]);
    setNotes("");
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle ordonnance
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-600" />
            Nouvelle ordonnance pour {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6 py-4">
          {/* Medication Search */}
          <div className="space-y-2">
            <Label>Ajouter un médicament</Label>
            <Popover open={medicationPopoverOpen} onOpenChange={setMedicationPopoverOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un médicament (nom ou DCI)..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setMedicationPopoverOpen(true);
                    }}
                    onFocus={() => setMedicationPopoverOpen(true)}
                    className="pl-10"
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <ScrollArea className="h-[300px]">
                  {filteredMedications.length > 0 ? (
                    <div className="p-2 space-y-1">
                      {filteredMedications.slice(0, 20).map((med) => (
                        <button
                          key={med.id}
                          onClick={() => addMedication(med)}
                          className="w-full text-left px-3 py-2 hover:bg-muted rounded-md transition-colors"
                        >
                          <div className="font-medium">{med.nom}</div>
                          <div className="text-sm text-muted-foreground flex gap-2">
                            {med.dci && <span>{med.dci}</span>}
                            {med.forme && <span>• {med.forme}</span>}
                            {med.dosage_defaut && (
                              <span>• {med.dosage_defaut} {med.unite}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery ? (
                    <div className="p-4 text-center">
                      <p className="text-muted-foreground text-sm mb-3">
                        Aucun médicament trouvé
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addCustomMedication}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter "{searchQuery}"
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Tapez pour rechercher un médicament
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="space-y-3">
              <Label>Médicaments prescrits ({items.length})</Label>
              {items.map((item, index) => (
                <Card key={index} className="p-4 relative">
                  <div className="flex gap-3">
                    <div className="flex items-center text-muted-foreground cursor-move">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{item.nom_medicament}</div>
                          {item.dosage && (
                            <Badge variant="secondary" className="mt-1">
                              {item.dosage}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeItem(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Posologie</Label>
                          <Select
                            value={item.posologie}
                            onValueChange={(v) => updateItem(index, { posologie: v })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {POSOLOGIES.map((p) => (
                                <SelectItem key={p} value={p}>
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Durée</Label>
                          <Select
                            value={item.duree || ""}
                            onValueChange={(v) => updateItem(index, { duree: v })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Durée..." />
                            </SelectTrigger>
                            <SelectContent>
                              {DUREES.map((d) => (
                                <SelectItem key={d} value={d}>
                                  {d}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Instructions spéciales</Label>
                        <Input
                          placeholder="Ex: À prendre pendant les repas..."
                          value={item.instructions || ""}
                          onChange={(e) =>
                            updateItem(index, { instructions: e.target.value })
                          }
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes / Recommandations</Label>
            <Textarea
              placeholder="Conseils au patient, régime alimentaire, suivi..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={items.length === 0 || createPrescription.isPending}
          >
            {createPrescription.isPending ? "Création..." : "Créer l'ordonnance"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
