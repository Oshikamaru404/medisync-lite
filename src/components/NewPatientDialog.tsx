import { useState } from "react";
import { UserRound, Phone, ShieldCheck, UserRoundPlus, Ruler, Scale, Mail, MapPin, CreditCard, Heart } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePatient } from "@/hooks/usePatients";

interface NewPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (patientId: string, patientName: string) => void | Promise<void>;
}

const NewPatientDialog = ({ open, onOpenChange, onCreated }: NewPatientDialogProps) => {
  const createPatient = useCreatePatient();
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    cin: "",
    date_naissance: "",
    sexe: "",
    poids: "",
    taille: "",
    telephone: "",
    email: "",
    adresse: "",
    mutuelle: "",
    numero_mutuelle: "",
    personne_contact: "",
    lien_personne_contact: "",
    telephone_personne_contact: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom || !formData.prenom || !formData.sexe) return;

    try {
      const patient = await createPatient.mutateAsync({
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        cin: formData.cin || null,
        date_naissance: formData.date_naissance || null,
        sexe: formData.sexe,
        poids: formData.poids ? Number(formData.poids) : null,
        taille: formData.taille ? Number(formData.taille) : null,
        telephone: formData.telephone || null,
        email: formData.email || null,
        adresse: formData.adresse || null,
        mutuelle: formData.mutuelle || null,
        numero_mutuelle: formData.numero_mutuelle || null,
        personne_contact: formData.personne_contact || null,
        lien_personne_contact: formData.lien_personne_contact || null,
        telephone_personne_contact: formData.telephone_personne_contact || null,
      });

      await onCreated?.(patient.id, `${formData.prenom} ${formData.nom}`.trim());

      setFormData({
        nom: "",
        prenom: "",
        cin: "",
        date_naissance: "",
        sexe: "",
        poids: "",
        taille: "",
        telephone: "",
        email: "",
        adresse: "",
        mutuelle: "",
        numero_mutuelle: "",
        personne_contact: "",
        lien_personne_contact: "",
        telephone_personne_contact: "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Unable to create patient:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden border-slate-200 bg-white p-0 shadow-2xl">
        <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50/70 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl text-slate-900">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                <UserRoundPlus className="h-5 w-5" />
              </span>
              Nouveau dossier patient
            </DialogTitle>
            <DialogDescription className="pl-14 text-slate-600">
              Renseignez l’identité et les coordonnées. Les informations médicales seront complétées par le médecin.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-wrap gap-2 pl-14 text-xs font-medium">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">01 · Identité</span>
            <span className="rounded-full bg-teal-100 px-3 py-1 text-teal-800">02 · Coordonnées</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">03 · Couverture</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex max-h-[calc(92vh-6rem)] flex-col">
          <div className="grid flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-2 md:p-6">
            <section className="space-y-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-sm">
              <div className="flex items-center gap-3 border-b border-blue-100 pb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><UserRound className="h-4 w-4" /></span>
                <div><h3 className="text-sm font-semibold text-blue-950">Identité du patient</h3><p className="text-xs text-blue-800/70">Les champs marqués * sont requis</p></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input id="prenom" autoFocus value={formData.prenom} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input id="nom" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_naissance">Date de naissance</Label>
                  <Input id="date_naissance" type="date" value={formData.date_naissance} onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sexe">Sexe *</Label>
                  <Select value={formData.sexe} onValueChange={(sexe) => setFormData({ ...formData, sexe })} required>
                    <SelectTrigger id="sexe" className="border-blue-200 bg-white"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="F">Femme</SelectItem>
                      <SelectItem value="M">Homme</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cin">CIN / Identifiant</Label>
                  <Input id="cin" placeholder="Ex. AB123456" value={formData.cin} onChange={(e) => setFormData({ ...formData, cin: e.target.value })} />
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/80 to-white p-4 shadow-sm">
              <div className="flex items-center gap-3 border-b border-teal-100 pb-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-700"><Phone className="h-4 w-4" /></span><div><h3 className="text-sm font-semibold text-teal-950">Coordonnées</h3><p className="text-xs text-teal-800/70">Pour joindre le patient</p></div></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="telephone">Téléphone</Label><Input id="telephone" type="tel" autoComplete="tel" value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="email" className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-teal-700" />E-mail</Label><Input id="email" type="email" autoComplete="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="adresse" className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-teal-700" />Adresse</Label><Input id="adresse" autoComplete="street-address" value={formData.adresse} onChange={(e) => setFormData({ ...formData, adresse: e.target.value })} /></div>
            </section>

            <section className="space-y-4 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/80 to-white p-4 shadow-sm">
              <div className="flex items-center gap-3 border-b border-amber-100 pb-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><ShieldCheck className="h-4 w-4" /></span><div><h3 className="text-sm font-semibold text-amber-950">Couverture sociale</h3><p className="text-xs text-amber-800/70">Informations d’adhésion</p></div></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="mutuelle">Mutuelle</Label><Input id="mutuelle" value={formData.mutuelle} onChange={(e) => setFormData({ ...formData, mutuelle: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="numero_mutuelle" className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-amber-700" />N° d’adhérent</Label><Input id="numero_mutuelle" value={formData.numero_mutuelle} onChange={(e) => setFormData({ ...formData, numero_mutuelle: e.target.value })} /></div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/80 to-white p-4 shadow-sm">
              <div className="flex items-center gap-3 border-b border-rose-100 pb-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-700"><Heart className="h-4 w-4" /></span><div><h3 className="text-sm font-semibold text-rose-950">Contact d’urgence</h3><p className="text-xs text-rose-800/70">Personne à joindre si besoin</p></div></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="personne_contact">Nom du contact</Label><Input id="personne_contact" value={formData.personne_contact} onChange={(e) => setFormData({ ...formData, personne_contact: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="lien_personne_contact">Lien avec le patient</Label><Input id="lien_personne_contact" placeholder="Parent, conjoint..." value={formData.lien_personne_contact} onChange={(e) => setFormData({ ...formData, lien_personne_contact: e.target.value })} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="telephone_personne_contact">Téléphone du contact</Label><Input id="telephone_personne_contact" type="tel" value={formData.telephone_personne_contact} onChange={(e) => setFormData({ ...formData, telephone_personne_contact: e.target.value })} /></div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-white p-4 shadow-sm md:col-span-2">
              <div className="flex items-center gap-3 border-b border-violet-100 pb-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Ruler className="h-4 w-4" /></span><div><h3 className="text-sm font-semibold text-violet-950">Repères physiques</h3><p className="text-xs text-violet-800/70">Facultatifs, à actualiser lors des consultations</p></div></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="poids" className="flex items-center gap-1.5"><Scale className="h-3.5 w-3.5 text-violet-700" />Poids</Label>
                  <div className="relative"><Input id="poids" type="number" min="0.1" step="0.1" placeholder="Ex. 68,5" value={formData.poids} onChange={(e) => setFormData({ ...formData, poids: e.target.value })} className="border-violet-200 bg-white pr-12" /><span className="absolute inset-y-0 right-3 flex items-center text-xs font-medium text-violet-700">kg</span></div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taille">Taille</Label>
                  <div className="relative"><Input id="taille" type="number" min="1" step="1" placeholder="Ex. 172" value={formData.taille} onChange={(e) => setFormData({ ...formData, taille: e.target.value })} className="border-violet-200 bg-white pr-12" /><span className="absolute inset-y-0 right-3 flex items-center text-xs font-medium text-violet-700">cm</span></div>
                </div>
              </div>
            </section>
          </div>

          <div className="flex justify-end gap-3 border-t bg-white px-6 py-4 shadow-[0_-8px_20px_rgba(15,23,42,0.04)]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={!formData.nom || !formData.prenom || !formData.sexe || createPatient.isPending} className="bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700">
              {createPatient.isPending ? "Création..." : onCreated ? "Créer et ajouter à la file" : "Créer le dossier patient"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewPatientDialog;
