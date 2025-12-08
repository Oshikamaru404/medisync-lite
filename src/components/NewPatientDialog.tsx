import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePatient } from "@/hooks/usePatients";

interface NewPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewPatientDialog = ({ open, onOpenChange }: NewPatientDialogProps) => {
  const createPatient = useCreatePatient();
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    date_naissance: "",
    telephone: "",
    email: "",
    adresse: "",
    mutuelle: "",
    personne_contact: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom || !formData.prenom) return;

    await createPatient.mutateAsync({
      nom: formData.nom,
      prenom: formData.prenom,
      date_naissance: formData.date_naissance || null,
      telephone: formData.telephone || null,
      email: formData.email || null,
      adresse: formData.adresse || null,
      mutuelle: formData.mutuelle || null,
      personne_contact: formData.personne_contact || null,
      poids: null,
      taille: null,
    });

    setFormData({
      nom: "",
      prenom: "",
      date_naissance: "",
      telephone: "",
      email: "",
      adresse: "",
      mutuelle: "",
      personne_contact: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau Patient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom *</Label>
              <Input
                id="prenom"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_naissance">Date de naissance</Label>
            <Input
              id="date_naissance"
              type="date"
              value={formData.date_naissance}
              onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                type="tel"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input
              id="adresse"
              value={formData.adresse}
              onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mutuelle">Mutuelle</Label>
              <Input
                id="mutuelle"
                value={formData.mutuelle}
                onChange={(e) => setFormData({ ...formData, mutuelle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personne_contact">Personne à contacter</Label>
              <Input
                id="personne_contact"
                value={formData.personne_contact}
                onChange={(e) => setFormData({ ...formData, personne_contact: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!formData.nom || !formData.prenom || createPatient.isPending}>
              {createPatient.isPending ? "Création..." : "Créer le patient"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewPatientDialog;
