import { useRef } from "react";
import { X, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePrescription } from "@/hooks/usePrescriptions";
import { useSettings } from "@/hooks/useSettings";
import { usePatient } from "@/hooks/usePatients";
import { format, differenceInYears } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getSpecialtyLogo } from "@/data/specialties";

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

  const doctorName = getSettingValue("doctor_name") || "Dr. Nom";
  const specialty = getSettingValue("cabinet_specialty") || "Médecin Généraliste";
  const specialtyArabic = getSettingValue("cabinet_specialty_arabic") || "";
  const specialtyIcon = getSettingValue("cabinet_specialty_icon") || "stethoscope";
  const orderNumber = getSettingValue("order_number") || "";
  const address = getSettingValue("cabinet_address") || "";
  const city = getSettingValue("cabinet_city") || "";
  const phone = getSettingValue("cabinet_phone") || "";
  const email = getSettingValue("cabinet_email") || getSettingValue("doctor_email") || "";

  const patientAge = patient?.date_naissance 
    ? differenceInYears(new Date(), new Date(patient.date_naissance))
    : null;

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
            name: `Cabinet ${specialty}`,
            doctor: doctorName,
            specialty,
            specialtyArabic,
            specialtyIcon,
            orderNumber,
            address,
            city,
            phone,
            email,
          },
        },
      });

      if (error) throw error;

      // Open HTML in new window for print/save
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
      }

      toast.success("Ordonnance générée avec succès");
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
              Ouvrir PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Printable Content - Moroccan Style */}
        <div ref={printRef} className="p-8 print:p-4" style={{ color: "#1a365d" }}>
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="text-left flex-1">
              <h1 className="text-xl font-bold" style={{ color: "#1a365d" }}>Dr {doctorName}</h1>
              <p className="text-sm text-gray-700">{specialty}</p>
              {orderNumber && <p className="text-xs text-gray-500">N° d'ordre : {orderNumber}</p>}
            </div>
            <div className="flex-shrink-0 mx-4">
              <div 
                className="w-20 h-20"
                style={{ color: "#c05621" }}
                dangerouslySetInnerHTML={{ __html: getSpecialtyLogo(specialtyIcon) }}
              />
            </div>
            {specialtyArabic && (
              <div className="text-right flex-1" style={{ direction: "rtl" }}>
                <p className="text-sm font-semibold" style={{ color: "#c05621" }}>{specialtyArabic}</p>
              </div>
            )}
          </div>

          {/* Patient Info */}
          <div className="mb-4">
            <div className="flex justify-between items-baseline mb-1">
              <p className="text-sm">
                Nom & Prénom : <span className="font-bold">{patientName}</span>
              </p>
              <p className="text-sm text-gray-500">
                {city ? `${city}, le : ` : "Le : "}
                {format(new Date(prescription.date), "dd/MM/yyyy")}
              </p>
            </div>
            {patientAge && <p className="text-sm">Age : {patientAge} ans</p>}
          </div>

          {/* Divider */}
          <div className="flex items-center my-5">
            <div className="flex-1 h-0.5 bg-[#1a365d]"></div>
            <div className="w-2.5 h-2.5 bg-[#1a365d] transform rotate-45 mx-2"></div>
            <div className="flex-1 h-0.5 bg-[#1a365d]"></div>
          </div>

          {/* Title */}
          <h2 className="text-center text-2xl font-bold tracking-widest uppercase mb-8" style={{ color: "#1a365d" }}>
            ORDONNANCE
          </h2>

          {/* Medications */}
          <div className="space-y-6 mb-8 min-h-[200px]">
            {prescription.items?.map((item, index) => (
              <div key={item.id || index} className="flex justify-between items-start pl-8">
                <div className="flex-1">
                  <div className="text-sm uppercase" style={{ color: "#1a365d" }}>
                    <span className="font-bold mr-4 inline-block min-w-[25px]">{index + 1}.</span>
                    {item.nom_medicament.toUpperCase()}
                    {item.dosage && ` ${item.dosage}`}
                  </div>
                  <p className="text-sm font-bold ml-10 mt-1" style={{ color: "#1a365d" }}>
                    {item.posologie}
                  </p>
                </div>
                {item.duree && (
                  <span className="text-sm font-semibold whitespace-nowrap" style={{ color: "#1a365d" }}>
                    Pendant {item.duree}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Notes */}
          {prescription.notes && (
            <div className="bg-gray-50 rounded p-4 mb-6 border-l-4 border-[#1a365d]">
              <p className="text-sm font-semibold mb-1" style={{ color: "#1a365d" }}>Recommandations :</p>
              <p className="text-sm text-gray-600">{prescription.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-16 pt-4 border-t border-[#1a365d]">
            <div className="flex items-center mb-3">
              <div className="w-2 h-2 border-2 border-[#1a365d] rounded-full"></div>
              <div className="flex-1 h-px bg-[#1a365d] mx-1"></div>
              <div className="w-2 h-2 border-2 border-[#1a365d] rounded-full"></div>
            </div>
            <p className="text-center text-xs mb-3" style={{ direction: "rtl", color: "#c05621" }}>
              لا تتركوا الأدوية في متناول الأطفال
            </p>
            <div className="flex justify-between items-center text-xs text-gray-500">
              {email && <span>✉ {email}</span>}
              {phone && <span>📞 {phone}</span>}
            </div>
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
