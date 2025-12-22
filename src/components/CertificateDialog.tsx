import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCertificate, CERTIFICATE_TYPES, CertificateInsert } from "@/hooks/useCertificates";
import { format, addDays } from "date-fns";

interface CertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
}

export const CertificateDialog = ({
  open,
  onOpenChange,
  patientId,
  patientName,
}: CertificateDialogProps) => {
  const createCertificate = useCreateCertificate();
  
  const [formData, setFormData] = useState({
    type: 'repos' as keyof typeof CERTIFICATE_TYPES,
    date: format(new Date(), 'yyyy-MM-dd'),
    duree_jours: 3,
    date_debut: format(new Date(), 'yyyy-MM-dd'),
    motif: '',
    contenu: '',
    notes: '',
  });

  useEffect(() => {
    if (formData.date_debut && formData.duree_jours) {
      // Date fin is calculated automatically
    }
  }, [formData.date_debut, formData.duree_jours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const date_fin = formData.type === 'repos' && formData.date_debut && formData.duree_jours
      ? format(addDays(new Date(formData.date_debut), formData.duree_jours - 1), 'yyyy-MM-dd')
      : null;

    const certificateData: CertificateInsert = {
      patient_id: patientId,
      type: formData.type,
      date: formData.date,
      duree_jours: formData.type === 'repos' ? formData.duree_jours : null,
      date_debut: formData.type === 'repos' ? formData.date_debut : null,
      date_fin,
      motif: formData.motif || null,
      contenu: formData.type === 'custom' ? formData.contenu : null,
      notes: formData.notes || null,
    };

    await createCertificate.mutateAsync(certificateData);
    onOpenChange(false);
    
    // Reset form
    setFormData({
      type: 'repos',
      date: format(new Date(), 'yyyy-MM-dd'),
      duree_jours: 3,
      date_debut: format(new Date(), 'yyyy-MM-dd'),
      motif: '',
      contenu: '',
      notes: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau certificat médical</DialogTitle>
          <p className="text-sm text-muted-foreground">Pour {patientName}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type de certificat</Label>
            <Select
              value={formData.type}
              onValueChange={(value: keyof typeof CERTIFICATE_TYPES) => 
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CERTIFICATE_TYPES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <p className="font-medium">{value.label}</p>
                      <p className="text-xs text-muted-foreground">{value.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date du certificat</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          {formData.type === 'repos' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Input
                    type="date"
                    value={formData.date_debut}
                    onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Durée (jours)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.duree_jours}
                    onChange={(e) => setFormData({ ...formData, duree_jours: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              {formData.date_debut && formData.duree_jours > 0 && (
                <p className="text-sm text-muted-foreground">
                  Repos du {format(new Date(formData.date_debut), 'dd/MM/yyyy')} au{' '}
                  {format(addDays(new Date(formData.date_debut), formData.duree_jours - 1), 'dd/MM/yyyy')}
                </p>
              )}
            </>
          )}

          {formData.type === 'aptitude' && (
            <div className="space-y-2">
              <Label>Motif / Activité</Label>
              <Input
                placeholder="Ex: Pratique du football en compétition"
                value={formData.motif}
                onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
              />
            </div>
          )}

          {formData.type === 'custom' && (
            <div className="space-y-2">
              <Label>Contenu du certificat</Label>
              <Textarea
                placeholder="Rédigez le contenu du certificat..."
                value={formData.contenu}
                onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
                rows={6}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes internes (optionnel)</Label>
            <Textarea
              placeholder="Notes privées, non visibles sur le certificat..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createCertificate.isPending}>
              {createCertificate.isPending ? "Création..." : "Créer le certificat"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
