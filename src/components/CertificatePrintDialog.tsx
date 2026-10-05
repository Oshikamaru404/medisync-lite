import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Certificate } from "@/hooks/useCertificates";
import { CertificatePreview } from "@/components/CertificatePreview";

interface CertificatePrintDialogProps {
  open: boolean;
  certificate: Certificate | null;
  onOpenChange: (open: boolean) => void;
}

export const CertificatePrintDialog = ({
  open,
  certificate,
  onOpenChange,
}: CertificatePrintDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
      <DialogHeader className="flex flex-row items-center justify-between gap-4 pr-8">
        <DialogTitle>Aperçu du certificat</DialogTitle>
        <Button
          type="button"
          onClick={() => window.print()}
          className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
          disabled={!certificate}
        >
          <Printer className="mr-2 h-4 w-4" />
          Imprimer
        </Button>
      </DialogHeader>
      {certificate && (
        <div className="certificate-print-root flex justify-center overflow-auto rounded-lg bg-slate-100 p-4">
          <CertificatePreview certificate={certificate} />
        </div>
      )}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden !important; }
          .certificate-print-root,
          .certificate-print-root * { visibility: visible !important; }
          [role="dialog"] {
            position: static !important;
            inset: auto !important;
            transform: none !important;
            max-width: none !important;
            max-height: none !important;
            overflow: visible !important;
            border: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .certificate-print-root {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            display: block !important;
            width: 210mm !important;
            overflow: visible !important;
            padding: 0 !important;
            background: white !important;
          }
          .certificate-print-root > div {
            width: 210mm !important;
            min-height: 297mm !important;
            transform: none !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </DialogContent>
  </Dialog>
);
