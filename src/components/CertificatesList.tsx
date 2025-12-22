import { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText, Download, Trash2, Eye, Loader2, FileBadge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useCertificates, useDeleteCertificate, CERTIFICATE_TYPES, Certificate } from "@/hooks/useCertificates";
import { CertificatePreview } from "./CertificatePreview";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";

interface CertificatesListProps {
  patientId: string;
}

export const CertificatesList = ({ patientId }: CertificatesListProps) => {
  const { data: certificates = [], isLoading } = useCertificates(patientId);
  const deleteCertificate = useDeleteCertificate();
  const { getSettingValue } = useSettings();
  const [previewCertificate, setPreviewCertificate] = useState<Certificate | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPdf = async (certificate: Certificate) => {
    setDownloadingId(certificate.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-certificate-pdf', {
        body: { 
          certificate,
          settings: {
            doctorName: getSettingValue("doctor_name"),
            doctorNameArabic: getSettingValue("doctor_name_arabic"),
            specialty: getSettingValue("specialty"),
            cabinetName: getSettingValue("cabinet_name"),
            cabinetAddress: getSettingValue("cabinet_address"),
            cabinetPhone: getSettingValue("cabinet_phone"),
            customLogo: getSettingValue("custom_logo"),
          }
        },
      });

      if (error) throw error;

      // Download the PDF
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${data.pdf}`;
      link.download = `certificat_${certificate.type}_${certificate.patient?.nom || 'patient'}_${format(parseISO(certificate.date), 'yyyy-MM-dd')}.pdf`;
      link.click();

      toast({
        title: "PDF téléchargé",
        description: "Le certificat a été téléchargé avec succès.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteCertificate.mutateAsync({ id, patientId });
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'repos': return 'bg-amber-100 text-amber-700';
      case 'aptitude': return 'bg-green-100 text-green-700';
      case 'bonne_sante': return 'bg-blue-100 text-blue-700';
      case 'custom': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileBadge className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun certificat</h3>
          <p className="text-muted-foreground">
            Créez un certificat médical pour ce patient.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {certificates.map((certificate) => {
          const certType = CERTIFICATE_TYPES[certificate.type as keyof typeof CERTIFICATE_TYPES];
          
          return (
            <Card key={certificate.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{certType?.label || certificate.type}</h4>
                        <Badge className={getTypeBadgeColor(certificate.type)}>
                          {certificate.type === 'repos' && certificate.duree_jours 
                            ? `${certificate.duree_jours} jour${certificate.duree_jours > 1 ? 's' : ''}`
                            : certificate.type
                          }
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(certificate.date), "d MMMM yyyy", { locale: fr })}
                      </p>
                      {certificate.motif && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {certificate.motif}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPreviewCertificate(certificate)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownloadPdf(certificate)}
                      disabled={downloadingId === certificate.id}
                    >
                      {downloadingId === certificate.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ce certificat ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. Le certificat sera définitivement supprimé.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(certificate.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewCertificate} onOpenChange={() => setPreviewCertificate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Aperçu du certificat</DialogTitle>
          </DialogHeader>
          {previewCertificate && (
            <div className="flex justify-center p-4 bg-gray-100 rounded-lg overflow-auto">
              <CertificatePreview certificate={previewCertificate} scale={0.8} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
