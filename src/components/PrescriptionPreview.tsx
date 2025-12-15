import { useRef } from "react";
import { X, Printer, Download, Phone, MapPin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePrescription } from "@/hooks/usePrescriptions";
import { useSettings } from "@/hooks/useSettings";
import { usePatient } from "@/hooks/usePatients";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PrescriptionPreviewProps {
  prescriptionId: string;
  patientName: string;
  onClose: () => void;
}

export const PrescriptionPreview = ({
  prescriptionId,
  patientName,
  onClose,
}: PrescriptionPreviewProps) => {
  const { data: prescription, isLoading } = usePrescription(prescriptionId);
  const { getSettingValue } = useSettings();
  const { data: patient } = usePatient(prescription?.patient_id);
  const printRef = useRef<HTMLDivElement>(null);

  const cabinetName = getSettingValue("cabinet_name") || "Cabinet Médical";
  const doctorName = getSettingValue("doctor_name") || "Dr. Nom";
  const specialty = getSettingValue("cabinet_specialty") || "Médecin Généraliste";
  const address = getSettingValue("cabinet_address") || "";
  const phone = getSettingValue("cabinet_phone") || "";
  const email = getSettingValue("cabinet_email") || "";

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!prescription || !patient) return;

    try {
      toast.info("Génération du PDF en cours...");

      const { data, error } = await supabase.functions.invoke("generate-prescription-pdf", {
        body: {
          prescription: {
            ...prescription,
            patient: {
              nom: patient.nom,
              prenom: patient.prenom,
              date_naissance: patient.date_naissance,
              adresse: patient.adresse,
            },
          },
          cabinet: {
            name: cabinetName,
            doctor: doctorName,
            specialty,
            address,
            phone,
            email,
          },
        },
      });

      if (error) throw error;

      // Download PDF
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${data.pdf}`;
      link.download = `ordonnance_${patientName.replace(/\s/g, "_")}_${format(new Date(prescription.date), "yyyy-MM-dd")}.pdf`;
      link.click();

      toast.success("PDF téléchargé avec succès");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  if (isLoading || !prescription) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <Card className="p-8">
          <p className="text-muted-foreground">Chargement...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-auto bg-white">
        {/* Toolbar */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center print:hidden">
          <h2 className="font-semibold">Aperçu de l'ordonnance</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Printable Content */}
        <div ref={printRef} className="p-8 print:p-4">
          {/* Header */}
          <div className="border-b-2 border-primary pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-primary">{cabinetName}</h1>
                <p className="text-lg font-medium">{doctorName}</p>
                <p className="text-muted-foreground">{specialty}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {address && (
                  <div className="flex items-center justify-end gap-1">
                    <MapPin className="w-3 h-3" />
                    {address}
                  </div>
                )}
                {phone && (
                  <div className="flex items-center justify-end gap-1">
                    <Phone className="w-3 h-3" />
                    {phone}
                  </div>
                )}
                {email && (
                  <div className="flex items-center justify-end gap-1">
                    <Mail className="w-3 h-3" />
                    {email}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Patient Info & Date */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-sm text-muted-foreground">Patient</p>
              <p className="font-semibold text-lg">{patientName}</p>
              {patient?.date_naissance && (
                <p className="text-sm text-muted-foreground">
                  Né(e) le {format(new Date(patient.date_naissance), "d MMMM yyyy", { locale: fr })}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-semibold">
                {format(new Date(prescription.date), "d MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold tracking-wide uppercase text-primary">
              ORDONNANCE MÉDICALE
            </h2>
          </div>

          {/* Medications */}
          <div className="space-y-6 mb-8">
            {prescription.items?.map((item, index) => (
              <div key={item.id || index} className="border-l-4 border-primary pl-4 py-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-lg">{index + 1}.</span>
                  <span className="font-bold text-lg">{item.nom_medicament}</span>
                  {item.dosage && (
                    <span className="text-muted-foreground">({item.dosage})</span>
                  )}
                </div>
                <div className="ml-6 mt-1 space-y-1">
                  <p className="text-foreground">{item.posologie}</p>
                  {item.duree && (
                    <p className="text-muted-foreground">Durée : {item.duree}</p>
                  )}
                  {item.instructions && (
                    <p className="text-muted-foreground italic">{item.instructions}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {prescription.notes && (
            <div className="bg-muted/30 rounded-lg p-4 mb-8">
              <p className="text-sm font-medium mb-1">Recommandations :</p>
              <p className="text-muted-foreground">{prescription.notes}</p>
            </div>
          )}

          {/* Signature */}
          <div className="flex justify-end mt-12">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-16">Signature et cachet</p>
              <p className="font-medium">{doctorName}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t pt-4 mt-8 text-center text-xs text-muted-foreground">
            <p>Cette ordonnance est valable 3 mois à compter de sa date d'émission</p>
          </div>
        </div>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed {
            position: absolute !important;
          }
          [class*="Card"] {
            box-shadow: none !important;
            border: none !important;
          }
          [class*="Card"] * {
            visibility: visible;
          }
          [class*="Card"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
