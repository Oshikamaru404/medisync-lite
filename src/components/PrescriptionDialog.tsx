import { useEffect, useState } from "react";
import { Plus, X, Pill, Search, GripVertical, AlertTriangle } from "lucide-react";
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
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMedications, useCreatePrescription, PrescriptionItem } from "@/hooks/usePrescriptions";

interface PrescriptionDialogProps {
  patientId: string;
  patientName: string;
  patientAllergies?: string | null;
  children?: React.ReactNode;
}

const normalizeClinicalTerm = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const findMedicationAllergyMatch = (
  medication: { nom: string; dci: string | null },
  allergies: string,
) => {
  const medicationTerms = normalizeClinicalTerm(`${medication.nom} ${medication.dci || ""}`);
  const allergyTerms = allergies
    .split(/[\n;•,]+/)
    .map((allergy) =>
      normalizeClinicalTerm(allergy)
        .replace(/^(allergies?|allergique|allergic)(\s+(a|au|aux|to))?\s*/, "")
        .replace(/^(a la|a l|au|aux)\s+/, "")
        .trim(),
    )
    .filter((allergy) => allergy.length >= 4);

  return allergyTerms.find((allergy) => medicationTerms.includes(allergy)) || null;
};

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
  patientAllergies = "",
  children,
}: PrescriptionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Omit<PrescriptionItem, "id" | "prescription_id">[]>([]);
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [medicationPopoverOpen, setMedicationPopoverOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const {
    data: medications = [],
    isFetching: medicationsLoading,
    isError: medicationsError,
  } = useMedications(debouncedSearchQuery);
  const createPrescription = useCreatePrescription();

  const normalizedSearch = debouncedSearchQuery.toLocaleLowerCase();
  const filteredMedications = medications;

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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-white p-0 text-slate-900 shadow-lg">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <Pill className="w-5 h-5 text-blue-600" />
            Nouvelle ordonnance pour {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6 p-6">
          {/* Medication Search */}
          <div className="space-y-2">
            <Label>Ajouter un médicament</Label>
            {patientAllergies.trim() && (
              <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="note">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Allergies déclarées</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{patientAllergies}</p>
                  <p className="mt-1 text-xs">Les correspondances affichées sont textuelles et doivent être vérifiées par le médecin.</p>
                </div>
              </div>
            )}
            <Popover open={medicationPopoverOpen} onOpenChange={setMedicationPopoverOpen}>
              <PopoverAnchor asChild>
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
                    className="h-11 pl-10"
                  />
                </div>
              </PopoverAnchor>
              <PopoverContent
                portalled={false}
                className="w-[min(50rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] p-0"
                align="start"
                onOpenAutoFocus={(event) => event.preventDefault()}
              >
                <ScrollArea className="h-[min(350px,calc(100dvh-12rem))]">
                  {normalizedSearch.length < 2 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Saisissez au moins 2 caractères pour rechercher
                    </div>
                  ) : medicationsLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground" role="status">
                      Recherche en cours…
                    </div>
                  ) : medicationsError ? (
                    <div className="p-4 text-center text-sm text-destructive" role="status">
                      La recherche est momentanément indisponible
                    </div>
                  ) : filteredMedications.length > 0 ? (
                    <div className="grid gap-2 p-2 md:grid-cols-2">
                      {filteredMedications.map((med) => (
                        (() => {
                          const allergyMatch = findMedicationAllergyMatch(med, patientAllergies);
                          return (
                            <button
                              key={med.id}
                              type="button"
                              onClick={() => addMedication(med)}
                              className="w-full rounded-lg border border-transparent bg-background px-3 py-3 text-left transition-all hover:border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-medium">{med.nom}</div>
                              {med.dci && (
                                <div className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">
                                  {med.dci}
                                </div>
                              )}
                            </div>
                            {med.dosage_defaut && (
                              <Badge variant="secondary" className="shrink-0">
                                {[med.dosage_defaut, med.unite].filter(Boolean).join(" ")}
                              </Badge>
                            )}
                          </div>
                          {med.forme && (
                            <div className="mt-1.5 break-words text-xs text-muted-foreground">
                              {med.forme}
                            </div>
                          )}
                              {allergyMatch && (
                                <div className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-800" role="alert">
                                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                  Correspondance possible avec « {allergyMatch} » : vérification médicale requise
                                </div>
                              )}
                            </button>
                          );
                        })()
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="mb-3 text-sm text-muted-foreground">
                        Aucun médicament trouvé
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addCustomMedication}
                      >
                        Ajouter "{searchQuery}"
                      </Button>
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
                          {findMedicationAllergyMatch({ nom: item.nom_medicament, dci: null }, patientAllergies) && (
                            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-800" role="alert">
                              <AlertTriangle className="h-3.5 w-3.5" />Correspondance avec une allergie déclarée
                            </p>
                          )}
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

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
        <div className="flex justify-end gap-3 border-t px-6 py-4">
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
