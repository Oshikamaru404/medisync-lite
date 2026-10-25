import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Download, Printer, ZoomIn, ZoomOut, Share2, Copy, ShieldCheck, Check, Sunrise, Sun, Sunset, Moon, CalendarDays, FileText, Clock3, UserRound, Pill, Loader2, Utensils } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePrescription } from "@/hooks/usePrescriptions";
import { useSettings } from "@/hooks/useSettings";
import { usePatient } from "@/hooks/usePatients";
import { format, differenceInYears, addMonths } from "date-fns";
import { toast } from "sonner";
import { PrescriptionLetterhead } from "@/components/PrescriptionLetterhead";

const isUsefulExamDetail = (value: string | undefined) =>
  Boolean(value?.trim() && !/^à préciser/i.test(value.trim()) && value.trim().toLocaleLowerCase() !== "autre" && value.trim() !== "Non précisé");

const FastingIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M7 5v5m-1.5-5v2.5A1.5 1.5 0 0 0 7 9h0a1.5 1.5 0 0 0 1.5-1.5V5M7 9v9" />
    <path d="M16 5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2v6m0-13v7" />
    <path d="m4.8 4.8 14.4 14.4" />
  </svg>
);

const MealSequenceIcon = ({ direction, className }: { direction: "before" | "after"; className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 36 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {direction === "before" ? (
      <>
        <path d="M6 7a4 4 0 0 1 8 0v10a4 4 0 0 1-8 0V7Z" />
        <path d="M6.3 12h7.4" />
        <path d="M18 2.5v19" strokeWidth="2.2" />
        <path d="M25 4v7m-2-7v3.5a2 2 0 0 0 4 0V4m-2 7v9" />
      </>
    ) : (
      <>
        <path d="M9 4v7m-2-7v3.5a2 2 0 0 0 4 0V4m-2 7v9" />
        <path d="M18 2.5v19" strokeWidth="2.2" />
        <path d="M23 7a4 4 0 0 1 8 0v10a4 4 0 0 1-8 0V7Z" />
        <path d="M23.3 12h7.4" />
      </>
    )}
  </svg>
);

interface PrescriptionPreviewProps {
  prescriptionId: string;
  patientName: string;
  onClose: () => void;
  autoPrint?: boolean;
}

interface PrescriptionShare {
  id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  access_count: number;
  last_accessed_at: string | null;
}

export const PrescriptionPreview = ({
  prescriptionId,
  patientName,
  onClose,
  autoPrint = false,
}: PrescriptionPreviewProps) => {
  const { sessionToken } = useAuth();
  const { data: prescription, isLoading, isError, refetch } = usePrescription(prescriptionId);
  const { getSettingValue } = useSettings();
  const { data: patient, isLoading: isPatientLoading, isError: isPatientError } = usePatient(prescription?.patient_id);
  const printRef = useRef<HTMLDivElement>(null);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const didAutoPrint = useRef(false);
    const handlePrintRef = useRef<() => void>(() => {});
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [qrCodeError, setQrCodeError] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewZoomScale, setPreviewZoomScale] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isExportingDocument, setIsExportingDocument] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [shareHistoryError, setShareHistoryError] = useState(false);
  const [shareDuration, setShareDuration] = useState(72);
  const [prescriptionShares, setPrescriptionShares] = useState<PrescriptionShare[]>([]);
  const [createdShare, setCreatedShare] = useState<{ url: string; accessCode: string; expiresAt: string } | null>(null);
  const [copiedShareValue, setCopiedShareValue] = useState<"url" | "code" | null>(null);
  const [printLayout, setPrintLayout] = useState<"complete" | "preprinted">("complete");
  const [validUntil, setValidUntil] = useState("");
  const [visualScheduleEnabled, setVisualScheduleEnabled] = useState(true);

  const paperSize = getSettingValue("prescription_paper_size") === "A4" ? "A4" : "A5";
  const paperDimensions = paperSize === "A4"
    ? { width: 210, height: 297 }
    : { width: 148, height: 210 };
  const paperScale = paperSize === "A4" ? paperDimensions.height / 210 : 1;
  const doctorName = getSettingValue("doctor_name") || "Nom";
  const doctorNameArabic = getSettingValue("doctor_name_arabic") || "";
  const specialty = getSettingValue("cabinet_specialty") || "Médecin Généraliste";
  const specialtyArabic = getSettingValue("cabinet_specialty_arabic") || "";
  const specialtyIcon = getSettingValue("cabinet_specialty_icon") || "stethoscope";
  const customLogo = getSettingValue("custom_logo") || "";
  const orderNumber = getSettingValue("order_number") || "";
  const address = getSettingValue("cabinet_address") || "";
  const city = getSettingValue("cabinet_city") || "";
  const phone = getSettingValue("cabinet_phone") || "";
  const email = getSettingValue("cabinet_email") || getSettingValue("doctor_email") || "";
  const documentTitle = prescription?.prescription_type === "laboratory"
    ? "PRESCRIPTION BIOLOGIQUE"
    : prescription?.prescription_type === "imaging"
      ? "PRESCRIPTION D’IMAGERIE"
      : "ORDONNANCE";
  const prescriptionReference = prescription
    ? `RX-${new Date(prescription.date).getFullYear()}-${prescription.id.replace(/-/g, "").slice(0, 16).toUpperCase()}`
    : "";
  const prescriptionUrl = prescription
    ? new URL(`/patients/${prescription.patient_id}?prescription=${encodeURIComponent(prescription.id)}`, window.location.origin).toString()
    : "";
  const medicationScheduleSlots = [
    { value: "morning", label: "Matin", Icon: Sunrise },
    { value: "noon", label: "Midi", Icon: Sun },
    { value: "evening", label: "Soir", Icon: Sunset },
    { value: "bedtime", label: "Coucher", Icon: Moon },
  ];
  const intakeTimingDetails: Record<string, { label: string; icon: "before" | "during" | "after" | "fasting" | null }> = {
    before_meal: { label: "Avant le repas", icon: "before" },
    with_meal: { label: "Pendant repas", icon: "during" },
    after_meal: { label: "Après le repas", icon: "after" },
    empty_stomach: { label: "Prendre à jeun", icon: "fasting" },
    any_time: { label: "Indifférent", icon: null },
  };

  const getDoseQuantity = (item: NonNullable<typeof prescription>["items"][number]) => {
    const details = item.request_details;
    return details?.doseQuantity === "other"
      ? details.customDoseQuantity
      : details?.doseQuantity;
  };

  const patientAge = patient?.date_naissance 
    ? differenceInYears(new Date(), new Date(patient.date_naissance))
    : null;
  const medicationCount = prescription?.items?.filter((item) => item.request_type === "medication").length ?? 0;
  const compactItems = (prescription?.items?.length ?? 0) > 11;

  useEffect(() => {
    setVisualScheduleEnabled(medicationCount <= 5);
  }, [prescription?.id, medicationCount]);

  useEffect(() => {
    setPrintLayout("complete");
  }, [prescriptionId]);

  useEffect(() => {
    if (prescription?.date) {
      setValidUntil(format(addMonths(new Date(prescription.date), 1), "yyyy-MM-dd"));
    }
  }, [prescription?.id, prescription?.date]);

  const formattedValidUntil = validUntil
    ? format(new Date(`${validUntil}T12:00:00`), "dd/MM/yyyy")
    : "—";

  const invokeShareFunction = async <T,>(body: Record<string, unknown>): Promise<T> => {
    const { data, error } = await supabase.functions.invoke("prescription-share", { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as T;
  };

  const closeShareDialog = () => {
    setIsShareDialogOpen(false);
    setCreatedShare(null);
    setCopiedShareValue(null);
  };

  const loadPrescriptionShares = async () => {
    if (!sessionToken || !prescription) return;
    setIsLoadingShares(true);
    setShareHistoryError(false);
    try {
      const result = await invokeShareFunction<{ shares: PrescriptionShare[] }>({
        action: "list",
        sessionToken,
        prescriptionId: prescription.id,
      });
      setPrescriptionShares(result.shares);
    } catch (error) {
      console.error("Unable to load prescription share history:", error);
      setShareHistoryError(true);
      toast.error("Impossible de charger les liens de partage.", {
        description: "Vérifiez la connexion ainsi que le déploiement de la fonction et de la migration de partage.",
      });
    } finally {
      setIsLoadingShares(false);
    }
  };

  const openShareDialog = async () => {
    setIsShareDialogOpen(true);
    setCreatedShare(null);
    await loadPrescriptionShares();
  };

  const createPrescriptionShare = async () => {
    if (!sessionToken || !prescription) {
      toast.error("Une session médecin valide est nécessaire pour partager cette ordonnance.");
      return;
    }
    setIsCreatingShare(true);
    try {
      const result = await invokeShareFunction<{
        shareId: string;
        token: string;
        accessCode: string;
        expiresAt: string;
      }>({
        action: "create",
        sessionToken,
        prescriptionId: prescription.id,
        expiresInHours: shareDuration,
      });
      setCreatedShare({
        url: `${window.location.origin}/partage-ordonnance/${result.token}`,
        accessCode: result.accessCode,
        expiresAt: result.expiresAt,
      });
      toast.success("Lien sécurisé créé.", {
        description: "Le code ne pourra plus être affiché après la fermeture de cette fenêtre.",
      });
      try {
        const history = await invokeShareFunction<{ shares: PrescriptionShare[] }>({
          action: "list",
          sessionToken,
          prescriptionId: prescription.id,
        });
        setPrescriptionShares(history.shares);
      } catch (historyError) {
        console.error("Unable to refresh prescription share history:", historyError);
        toast.error("Le lien est créé, mais l’historique n’a pas pu être actualisé.");
      }
    } catch (error) {
      console.error("Unable to create prescription share:", error);
      toast.error("Le lien sécurisé n’a pas pu être créé.", {
        description: error instanceof Error ? error.message : "Vérifiez votre connexion et réessayez.",
      });
    } finally {
      setIsCreatingShare(false);
    }
  };

  const copyShareValue = async (value: string, kind: "url" | "code") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedShareValue(kind);
      window.setTimeout(() => setCopiedShareValue((current) => current === kind ? null : current), 1800);
      toast.success(kind === "url" ? "Lien copié." : "Code copié.", {
        description: "Transmettez le lien et le code séparément.",
      });
    } catch (error) {
      console.error("Unable to copy prescription share value:", error);
      toast.error("Copie impossible.", {
        description: "Sélectionnez et copiez le texte manuellement.",
      });
    }
  };

  const revokePrescriptionShare = async (shareId: string) => {
    if (!sessionToken) {
      toast.error("Votre session a expiré. Reconnectez-vous pour révoquer ce lien.");
      return;
    }
    try {
      await invokeShareFunction<{ revoked: boolean }>({ action: "revoke", sessionToken, shareId });
      setPrescriptionShares((current) => current.map((share) => share.id === shareId
        ? { ...share, revoked_at: new Date().toISOString() }
        : share));
      toast.success("Lien de partage révoqué.");
    } catch (error) {
      console.error("Unable to revoke prescription share:", error);
      toast.error("Le lien n’a pas pu être révoqué.", {
        description: "Vérifiez votre connexion puis réessayez.",
      });
    }
  };

  useEffect(() => {
    if (!prescriptionUrl) return;
    let cancelled = false;
    setQrCodeDataUrl("");
    setQrCodeError(false);
    QRCode.toDataURL(prescriptionUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 192,
      color: { dark: "#000000", light: "#FFFFFF" },
    }).then((dataUrl) => {
      if (!cancelled) setQrCodeDataUrl(dataUrl);
    }).catch((error: unknown) => {
      console.error("Error generating prescription QR code:", error);
      if (!cancelled) setQrCodeError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [prescriptionUrl]);

  useEffect(() => {
    const viewport = previewViewportRef.current;
    const page = printRef.current;
    if (!viewport || !page) return;

    const fitPage = () => {
      const availableWidth = viewport.clientWidth;
      const availableHeight = viewport.clientHeight;
      const pageWidth = page.offsetWidth;
      const pageHeight = page.offsetHeight;
      if (!availableWidth || !availableHeight || !pageWidth || !pageHeight) return;

      const scale = Math.min(1, Math.max(0, availableWidth - 12) / pageWidth, Math.max(0, availableHeight - 12) / pageHeight);
      setPreviewScale((currentScale) => Math.abs(currentScale - scale) < 0.005 ? currentScale : scale);
      const zoomScale = Math.min(1, Math.max(0, availableWidth - 24) / pageWidth);
      setPreviewZoomScale((currentScale) => Math.abs(currentScale - zoomScale) < 0.005 ? currentScale : zoomScale);
    };

    const observer = new ResizeObserver(fitPage);
    observer.observe(viewport);
    observer.observe(page);
    fitPage();
    return () => observer.disconnect();
  }, [prescription, qrCodeDataUrl, isPatientError]);

  useEffect(() => {
    if (!autoPrint || isLoading || !prescription || !qrCodeDataUrl || didAutoPrint.current) return;

    const timeoutId = window.setTimeout(() => {
      if (didAutoPrint.current) return;
      didAutoPrint.current = true;
      handlePrintRef.current();
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [autoPrint, isLoading, prescription, qrCodeDataUrl]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented && !isShareDialogOpen) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isShareDialogOpen, onClose]);

  const capturePrescriptionImage = async (): Promise<HTMLCanvasElement> => {
    const page = printRef.current;
    if (!page) {
      throw new Error("L’aperçu de l’ordonnance est indisponible. Fermez puis rouvrez le document.");
    }

    const { default: html2canvas } = await import("html2canvas");
    await document.fonts.ready;
    const sourceCanvas = await html2canvas(page, {
      backgroundColor: "#ffffff",
      logging: false,
      scale: 300 / 96,
      useCORS: true,
      windowWidth: 1024,
      windowHeight: 1200,
      onclone: async (clonedDocument) => {
        const clonedPage = clonedDocument.querySelector<HTMLElement>(".prescription-print-page");
        if (!clonedPage) throw new Error("La page d’ordonnance est introuvable dans la copie image.");
        clonedDocument.body.style.margin = "0";
        clonedPage.classList.add("prescription-print-ready");
        const exportStyles = clonedDocument.createElement("style");
        exportStyles.textContent = `
          .prescription-print-ready {
            display: flex !important;
            box-sizing: border-box !important;
            width: 148mm !important;
            min-width: 148mm !important;
            max-width: 148mm !important;
            height: 210mm !important;
            min-height: 210mm !important;
            max-height: 210mm !important;
            margin: 0 !important;
            transform: none !important;
            box-shadow: none !important;
          }
        `;
        clonedDocument.head.appendChild(exportStyles);
        clonedPage.style.transform = "none";
        clonedPage.style.position = "fixed";
        clonedPage.style.top = "0";
        clonedPage.style.left = "0";
        clonedPage.style.boxShadow = "none";
        clonedDocument.body.appendChild(clonedPage);
        await clonedDocument.fonts.ready;
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        if (clonedPage.scrollHeight > clonedPage.clientHeight + 2) {
          throw new Error("Le contenu dépasse la page A5. Réduisez les recommandations ou désactivez la grille visuelle avant l’export.");
        }
      },
    });
    return sourceCanvas;
  };

  const handlePrint = () => {
    if (!prescription || !patient || (printLayout === "complete" && (!qrCodeDataUrl || qrCodeError))) {
      toast.error("Le document n’est pas prêt. Vérifiez les informations patient et le QR code, puis réessayez.");
      return;
    }
    const page = printRef.current;
    if (!page) {
      toast.error("L’aperçu de l’ordonnance est indisponible. Fermez puis rouvrez le document.");
      return;
    }
    if (page.scrollHeight > page.clientHeight + 2) {
      toast.error("Le contenu dépasse la page de l’ordonnance. Réduisez les recommandations ou désactivez la grille visuelle avant d’imprimer.");
      return;
    }
    window.print();
  };
  handlePrintRef.current = handlePrint;

  const handleDownloadPdf = async () => {
    if (!prescription || !patient) {
      toast.error("Les informations du patient sont indisponibles. Réessayez avant de créer le document.");
      return;
    }

    setIsExportingDocument(true);
    try {
      const pageCanvas = await capturePrescriptionImage();
      const documentFileName = documentTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLocaleLowerCase();
      const baseName = `${documentFileName}-${format(new Date(prescription.date), "yyyy-MM-dd")}`;
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: paperSize.toLowerCase(),
        compress: true,
      });
      pdf.addImage(pageCanvas, "PNG", 0, 0, paperDimensions.width, paperDimensions.height, undefined, "FAST");
      pageCanvas.width = 0;
      pageCanvas.height = 0;
      pdf.save(`${baseName}-${paperSize.toLowerCase()}.pdf`);
      toast.success(`PDF ${paperSize} téléchargé.`);
    } catch (error) {
      console.error("Error exporting prescription PDF:", error);
      toast.error("La création du PDF a échoué.", {
        description: error instanceof Error ? error.message : "Une erreur inattendue est survenue. Réessayez.",
      });
    } finally {
      setIsExportingDocument(false);
    }
  };
  if (isLoading) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm" role="status" aria-live="polite">
        <Card className="rounded-2xl border-slate-200 bg-white p-8 shadow-2xl">
          <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-2 border-[#d8e9df] border-t-[#28664f]" />
          <p className="text-muted-foreground">Chargement...</p>
        </Card>
      </div>,
      document.body,
    );
  }

  if (isError || !prescription) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-label="Document indisponible">
        <Card className="w-full max-w-sm rounded-2xl border-rose-200 bg-white p-6 shadow-2xl">
          <h2 className="text-base font-bold text-slate-900">Aperçu indisponible</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">Le document n’a pas pu être chargé. Vérifiez votre connexion puis réessayez.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl" onClick={onClose}>Fermer</Button>
            <Button className="rounded-xl bg-[#23634f] text-white hover:bg-[#194d40]" onClick={() => void refetch()}>Réessayer</Button>
          </div>
        </Card>
      </div>,
      document.body,
    );
  }

  return createPortal((
    <>
    <div className="prescription-preview-overlay fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/25 p-2 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-label={`Aperçu : ${documentTitle}`}>
      <Card className="prescription-print-card flex h-[96dvh] max-h-[96dvh] w-[min(96vw,900px)] max-w-none flex-col overflow-hidden rounded-3xl border-slate-200 bg-[#f2f6f3] shadow-2xl">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex flex-col gap-2 border-b border-[#dce8e1] bg-white/95 px-3 py-3 backdrop-blur print:hidden sm:px-5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#6b8577]">Document prêt à remettre</p>
              <h2 className="mt-0.5 truncate text-sm font-bold text-[#194d40]">{documentTitle}</h2>
            </div>
            <Button variant="ghost" size="icon" aria-label="Fermer l’aperçu" className="h-9 w-9 shrink-0 rounded-xl text-slate-500 hover:bg-slate-100" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <div className="inline-flex h-9 shrink-0 items-center rounded-xl border border-[#d6e3dc] bg-white p-0.5" role="group" aria-label="Mise en page de l’ordonnance">
              <button
                type="button"
                className={`h-full rounded-lg px-2 text-[10px] font-semibold transition-colors sm:px-3 sm:text-xs ${printLayout === "complete" ? "bg-[#e8f2ec] text-[#194d40]" : "text-[#557064] hover:bg-[#f4f8f5]"}`}
                onClick={() => setPrintLayout("complete")}
                aria-pressed={printLayout === "complete"}
              >
                En-tête + pied
              </button>
              <button
                type="button"
                className={`h-full rounded-lg px-2 text-[10px] font-semibold transition-colors sm:px-3 sm:text-xs ${printLayout === "preprinted" ? "bg-[#e8f2ec] text-[#194d40]" : "text-[#557064] hover:bg-[#f4f8f5]"}`}
                onClick={() => setPrintLayout("preprinted")}
                aria-pressed={printLayout === "preprinted"}
              >
                Feuille pré-imprimée
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 rounded-xl border-[#d6e3dc] bg-white text-[#285944] hover:bg-[#edf6f0]"
              onClick={() => setIsZoomed((current) => !current)}
              aria-label={isZoomed ? "Revenir à l’aperçu global" : "Agrandir l’aperçu"}
              aria-pressed={isZoomed}
              title={isZoomed ? "Revenir à l’aperçu global" : "Agrandir l’aperçu"}
            >
              {isZoomed ? <ZoomOut className="h-4 w-4 sm:mr-2" /> : <ZoomIn className="h-4 w-4 sm:mr-2" />}
              <span className="hidden sm:inline">{isZoomed ? "Vue globale" : "Agrandir"}</span>
            </Button>
            {medicationCount > 0 && (
              <label
                className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#d6e3dc] bg-white px-2 text-[10px] font-semibold text-[#557064] sm:px-3 sm:text-xs"
                title={medicationCount > 5 ? "La grille peut nécessiter une page supplémentaire en cas de polymédication." : "Afficher ou masquer la grille des prises sur l’ordonnance."}
              >
                <input
                  type="checkbox"
                  checked={visualScheduleEnabled}
                  onChange={(event) => setVisualScheduleEnabled(event.target.checked)}
                  className="h-3.5 w-3.5 accent-[#23634f]"
                />
                <span>Grille visuelle</span>
              </label>
            )}
            <label className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#d6e3dc] bg-white px-2 text-[10px] font-semibold text-[#557064] sm:gap-2 sm:px-3 sm:text-xs">
              <span className="hidden sm:inline">Validité</span>
              <input
                type="date"
                value={validUntil}
                onChange={(event) => setValidUntil(event.target.value)}
                aria-label="Modifier la date de validité de l’ordonnance"
                className="w-[104px] bg-transparent text-[11px] text-[#285944] outline-none sm:w-[118px] sm:text-xs"
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 rounded-xl border-[#174d3c] bg-[#174d3c] text-white shadow-sm hover:border-[#103d30] hover:bg-[#103d30]"
              disabled={isExportingDocument || isPatientLoading || isPatientError || !patient || (printLayout === "complete" && (!qrCodeDataUrl || qrCodeError))}
              title="Ouvrir la fenêtre d’impression"
              onClick={handlePrint}
            >
              <Printer className="mr-0 h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Imprimer</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 rounded-xl border-[#d6e3dc] bg-white text-[#285944] hover:bg-[#edf6f0]"
              onClick={() => void openShareDialog()}
              aria-label="Partager l’ordonnance de façon sécurisée"
              title="Créer un lien sécurisé, temporaire et révocable"
            >
              <Share2 className="mr-0 h-4 w-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Partager</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 rounded-xl border-[#d6e3dc] bg-white text-[#285944] hover:bg-[#edf6f0]"
              disabled={isExportingDocument || isPatientLoading || isPatientError || !patient}
              title={isExportingDocument ? "Création du PDF en cours" : isPatientLoading ? "Chargement des informations patient" : isPatientError || !patient ? "Informations patient indisponibles" : `Télécharger l’ordonnance au format PDF ${paperSize}`}
              aria-label={`Télécharger l’ordonnance au format PDF ${paperSize}`}
              onClick={() => void handleDownloadPdf()}
            >
              {isExportingDocument
                ? <Loader2 className="mr-0 h-4 w-4 animate-spin sm:mr-2" />
                : <Download className="mr-0 h-4 w-4 sm:mr-2" />}
              <span className="hidden sm:inline">{isExportingDocument ? "Préparation…" : "PDF"}</span>
            </Button>
          </div>
        </div>
        {isPatientError && (
          <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 print:hidden">
            Les données patient ne sont pas accessibles ; l’aperçu reste imprimable, mais la génération du PDF est désactivée.
          </p>
        )}
        {qrCodeError && printLayout === "complete" && (
          <p className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-900 print:hidden">
            Le QR code n’a pas pu être généré ; réessayez l’aperçu avant d’imprimer ou d’ouvrir le PDF.
          </p>
        )}

        {/* Printable Content - Moroccan Style */}
        <div
          ref={previewViewportRef}
          className={`prescription-preview-viewport flex min-h-0 flex-1 p-2 ${
            isZoomed
              ? "items-start justify-center overflow-auto"
              : "items-center justify-center overflow-hidden"
          }`}
        >
        <div ref={printRef} className={`prescription-print-page box-border mx-auto flex h-[210mm] min-h-[210mm] max-h-[210mm] w-[148mm] max-w-none shrink-0 flex-col overflow-hidden bg-white px-4 py-4 text-[#233b32] shadow-[0_10px_35px_rgba(26,54,93,0.10)] sm:px-5 sm:py-4 print:my-0 print:min-h-0 print:w-full print:max-w-none print:px-0 print:py-0 print:shadow-none ${printLayout === "preprinted" ? "prescription-layout-preprinted" : ""}`} style={{ color: "#1a365d", transform: `scale(${isZoomed ? previewZoomScale : previewScale})`, transformOrigin: isZoomed ? "top center" : "center", ...(printLayout === "preprinted" ? { paddingTop: "20mm", paddingBottom: "20mm" } : {}) }}>
          {/* Header */}
          {printLayout === "complete" && (
            <PrescriptionLetterhead
              doctorName={doctorName}
              specialty={specialty}
              orderNumber={orderNumber}
              doctorNameArabic={doctorNameArabic}
              specialtyArabic={specialtyArabic}
              specialtyIcon={specialtyIcon}
              customLogo={customLogo}
            />
          )}

            {/* Patient and prescription metadata */}
            <div className="prescription-patient mb-2 grid shrink-0 grid-cols-[1.15fr_1fr_0.9fr] items-stretch rounded-lg border border-[#e5ece7] bg-[#fafcfb] px-2 py-1">
                <div className="flex min-w-0 items-stretch pr-2">
                  <div className="prescription-patient-identity flex min-h-full min-w-0 w-full flex-col justify-center rounded-md border border-[#e1e9e4] bg-white/80 px-1 py-0.5">
                    <p className="mb-0.5 text-[7px] font-bold uppercase tracking-wide text-[#39745e]">Patient</p>
                    <p className="truncate text-[12px] font-bold leading-tight text-[#1a365d]">{patientName}</p>
                    {patient?.date_naissance && (
                      <p className="mt-1 text-[9px] leading-tight text-slate-700">
                        <span className="font-semibold">Né(e) :</span> {format(new Date(patient.date_naissance), "dd/MM/yyyy")}
                        {patientAge !== null && ` · ${patientAge} ans`}
                      </p>
                    )}
                    <p className="mt-0.5 text-[9px] leading-tight text-slate-700">
                      <span className="font-semibold">Sexe :</span> {patient?.sexe === "M" ? "Masculin" : patient?.sexe === "F" ? "Féminin" : "Non renseigné"}
                    </p>
                  </div>
                </div>

                <div className="prescription-patient-meta min-w-0 space-y-0.5 border-x border-[#dce4de] px-1.5">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#23634f]" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-[7px] font-semibold uppercase tracking-wide text-[#39745e]">Date de rédaction</p>
                      <p className="text-[10px] font-semibold leading-tight text-[#1a365d]">{format(new Date(prescription.date), "dd/MM/yyyy")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 border-t border-[#e7ece9] pt-1">
                    {prescription.prescription_type === "medication"
                      ? <Pill className="h-3.5 w-3.5 shrink-0 text-[#23634f]" aria-hidden="true" />
                      : <FileText className="h-3.5 w-3.5 shrink-0 text-[#23634f]" aria-hidden="true" />}
                    <div className="min-w-0">
                      <p className="text-[7px] font-semibold uppercase tracking-wide text-[#39745e]">Type de prescription</p>
                      <p className="truncate text-[10px] font-semibold leading-tight text-[#1a365d]">
                      {prescription.prescription_type === "medication" ? "Médicamenteuse" : prescription.prescription_type === "laboratory" ? "Biologique" : "Imagerie"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 items-center pl-2">
                <div className="flex min-h-full min-w-0 w-full items-center gap-1 rounded-md border border-[#e1e9e4] bg-white/80 px-1 py-0.5">
                  <FileText className="h-4 w-4 shrink-0 text-[#23634f]" aria-hidden="true" />
                  <div className="min-w-0">
                  <p className="text-[7px] font-semibold uppercase tracking-wide text-[#39745e]">N° ordonnance</p>
                  <p className="break-all font-mono text-[9px] font-bold leading-snug text-[#1a365d]">{prescriptionReference}</p>
                  </div>
                </div>
              </div>
            </div>

          {/* Divider */}
          <div className="prescription-divider my-2 flex shrink-0 items-center gap-2">
            <div className="h-px flex-1 bg-[#dce9e1]" />
            <span className="h-2 w-2 rotate-45 border border-[#32745a] bg-white" />
            <div className="h-px flex-1 bg-[#dce9e1]" />
          </div>

          {/* Title */}
          <h2 className="prescription-title mb-4 shrink-0 text-center text-base font-bold uppercase tracking-[0.12em] sm:text-lg" style={{ color: "#1a365d" }}>
            {documentTitle}
          </h2>

          {/* Prescribed items */}
          <div className={`prescription-items mb-2 min-h-0 ${compactItems ? "prescription-items-compact flex flex-1 flex-col justify-evenly space-y-0" : "shrink-0 space-y-0.5"}`}>
            {prescription.items?.map((item, index) => (
              <div key={item.id || index} className={`prescription-item flex items-start justify-between gap-1 border-b border-dashed border-[#e5ece7] ${compactItems ? "shrink-0 pb-0.5" : "pb-1"} last:border-0`}>
                <div className="min-w-0 flex-1">
                  <div className={`prescription-medication-name font-bold uppercase leading-tight ${compactItems ? "text-[12px]" : "text-[13px]"}`} style={{ color: "#1a365d" }}>
                    <span className="mr-1.5 inline-block min-w-[18px] font-bold text-[#32745a]">{index + 1}.</span>
                    {item.nom_medicament.toUpperCase()}
                    {item.request_type === "medication" && item.dosage && ` ${item.dosage}`}
                  </div>
                  {item.request_type === "medication" ? (
                    <div className="prescription-posology ml-7 mt-0.5 text-[10px] font-medium leading-tight text-[#111827]">
                      <div className="flex min-w-0 items-center justify-between gap-1.5">
                        <p className="min-w-0 flex-1">{(item.posologie || "").replace(/\s*[·•,;-]?\s*(?:avant\s+(?:le\s+)?repas|pendant\s+(?:le\s+)?repas|apr[eè]s\s+(?:le\s+)?repas|[àa]\s+jeun|indifférent)\s*$/i, "").trim()}</p>
                        {item.request_details?.intakeTiming && intakeTimingDetails[item.request_details.intakeTiming] && (() => {
                          const { label, icon } = intakeTimingDetails[item.request_details.intakeTiming];
                          const iconElement = (
                            <span className="flex h-3.5 w-[18px] shrink-0 items-center justify-center">
                              {icon === "before" && <MealSequenceIcon direction="before" className="h-3.5 w-[21px]" />}
                              {icon === "during" && <Utensils className="h-2.5 w-2.5" aria-hidden="true" />}
                              {icon === "after" && <MealSequenceIcon direction="after" className="h-3.5 w-[21px]" />}
                              {icon === "fasting" && <FastingIcon className="h-3 w-3" />}
                            </span>
                          );
                          return (
                            <span className="prescription-intake-label inline-flex w-[100px] shrink-0 items-center gap-1 whitespace-nowrap rounded border border-[#64736b] bg-white py-px pl-1.5 pr-1 text-[9px] font-semibold text-[#26342c]">
                              {icon === "after" ? (
                                <>
                                  <span>{label}</span>
                                  {iconElement}
                                </>
                              ) : (
                                <>
                                  {iconElement}
                                  <span>{label}</span>
                                </>
                              )}
                            </span>
                          );
                        })()}
                      </div>
                      {visualScheduleEnabled && item.request_details?.timesOfDay?.length ? (
                        <div className="prescription-schedule mt-0.5 grid h-5 grid-cols-4 overflow-hidden rounded-md border border-[#39443c]" role="group" aria-label={`Répartition des prises dans la journée pour ${item.nom_medicament}`}>
                          {medicationScheduleSlots.map(({ value, label, Icon }, slotIndex) => {
                            const selected = item.request_details?.timesOfDay?.includes(value) || false;
                            const doseQuantity = getDoseQuantity(item);
                            return (
                              <div key={value} data-selected={selected} title={label} className={`flex min-w-0 items-center justify-center gap-0.5 border-[#39443c] px-0.5 text-center ${slotIndex > 0 ? "border-l" : ""} ${selected ? "bg-[#edf1ee]" : "bg-white"}`} aria-label={`${label} : ${selected ? doseQuantity || "prise prévue" : "aucune prise prévue"}`}>
                                <Icon className="h-2.5 w-2.5 shrink-0 text-black" strokeWidth={2.75} aria-hidden="true" />
                                <span className={`leading-none ${selected ? "text-[11px] font-black text-black" : "text-[10px] font-bold text-[#303a33]"}`}>{selected ? doseQuantity || "✓" : "—"}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className={`ml-8 ${compactItems ? "mt-0.5 space-y-0 text-xs" : "mt-1.5 space-y-0.5 text-sm"}`} style={{ color: "#1a365d" }}>
                      {item.request_details?.priority && item.request_details.priority !== "routine" && (
                        <p className="font-semibold">{item.request_details.priority === "urgent" ? "URGENT" : "TRÈS URGENT"}</p>
                      )}
                      {isUsefulExamDetail(item.request_details?.modality) && <p>Modalité : {item.request_details?.modality}</p>}
                      {item.request_details?.region && <p>Région / organe : {item.request_details.region}</p>}
                      {item.request_details?.laterality && item.request_details.laterality !== "Non précisé" && <p>Côté : {item.request_details.laterality}</p>}
                      {item.request_details?.contrast && item.request_details.contrast !== "À préciser" && <p>Contraste : {item.request_details.contrast}</p>}
                      {isUsefulExamDetail(item.request_details?.specimen) && <p>Prélèvement : {item.request_details?.specimen}</p>}
                      {item.request_details?.indication && <p>Indication : {item.request_details.indication}</p>}
                      {item.request_details?.preparation && <p>Préparation : {item.request_details.preparation}</p>}
                      {item.instructions && <p>Précisions : {item.instructions}</p>}
                    </div>
                  )}
                </div>
                {item.request_type === "medication" && item.duree && (
                  <span className="prescription-duration ml-1 whitespace-nowrap rounded-full border border-[#cbd8d0] bg-[#f1f5f2] px-1 py-0.5 text-[9px] font-bold text-[#26342c]">
                    Pendant {item.duree}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Notes */}
          {prescription.notes && (
            <div className="prescription-page-notes mb-3 shrink-0 rounded-xl border border-[#e2ebe5] border-l-4 border-l-[#32745a] bg-[#f7faf8] p-2.5">
              <p className="mb-0.5 text-xs font-semibold" style={{ color: "#1a365d" }}>
                {prescription.prescription_type === "medication" ? "Recommandations :" : "Renseignements complémentaires :"}
              </p>
              <p className="whitespace-pre-wrap text-xs leading-snug text-gray-600">{prescription.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="prescription-page-footer mt-auto shrink-0 border-t border-[#dce9e1] pt-1.5">
            <p className="prescription-safety mb-1.5 rounded-lg border border-[#d9e4dc] bg-[#f5f8f5] px-2 py-1 text-center text-[9px] font-semibold leading-tight text-[#303a33]">
              <span className="block" style={{ direction: "rtl" }}>لا تغيروا الجرعة دون استشارة الطبيب</span>
              <span className="block">Ne pas changer la posologie sans avis médical</span>
            </p>

            <div className="prescription-metadata mb-1.5 grid grid-cols-3 divide-x divide-[#e1e7e3] rounded-lg border border-[#e1e7e3] bg-white px-1 py-1">
              <div className="flex min-w-0 items-center justify-center gap-1 px-1">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#285944]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[8px] leading-tight text-slate-500">Date d’émission</p>
                  <p className="text-[9px] font-semibold text-slate-800">{format(new Date(prescription.date), "dd/MM/yyyy")}</p>
                </div>
              </div>
              <div className="flex min-w-0 items-center justify-center gap-1.5 px-1">
                <FileText className="h-3.5 w-3.5 shrink-0 text-[#285944]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[8px] leading-tight text-slate-500">N° ordonnance</p>
                  <p className="truncate font-mono text-[9px] font-semibold text-slate-800">{prescriptionReference}</p>
                </div>
              </div>
              <div className="flex min-w-0 items-center justify-center gap-1.5 px-1">
                <Clock3 className="h-3.5 w-3.5 shrink-0 text-[#285944]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[8px] leading-tight text-slate-500">Valable jusqu’au</p>
                  <p className="text-[9px] font-semibold text-slate-800">{formattedValidUntil}</p>
                </div>
              </div>
            </div>

            <div className="prescription-verification-row mb-1.5 grid grid-cols-[1fr_1fr] items-stretch gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-[#e1e7e3] p-1">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt={`QR code associé à l’ordonnance ${prescriptionReference}`} className="prescription-qr h-[18mm] w-[18mm] shrink-0" />
                ) : (
                  <div className="h-[18mm] w-[18mm] shrink-0 rounded border border-dashed border-slate-300" aria-label="QR code indisponible" />
                )}
                <div className="min-w-0 text-[7px] leading-tight text-slate-700">
                  <p className="font-semibold">Réf. cabinet</p>
                  <p className="break-all font-mono">{prescriptionReference}</p>
                  <p className="mt-1">QR d’identification cabinet · accès réservé au cabinet.</p>
                </div>
              </div>
              <div className="prescription-signature relative flex min-h-[18mm] flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#cbd4ce] px-1.5 py-1 text-center">
                <span className="text-[8px] font-semibold leading-tight text-slate-700">Signature et cachet<br />du médecin</span>
              </div>
            </div>

            {printLayout === "complete" && (
              <div className="prescription-contact-details flex items-start gap-1.5 border-t border-[#dce4de] pt-1 text-[7px] leading-tight text-slate-700">
                <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#285944]" aria-hidden="true" />
                <div className="min-w-0">
                  <p><strong>Dr {doctorName}</strong>{specialty ? ` — ${specialty}` : ""}</p>
                  {address && <p>Adresse : {address}{city ? `, ${city}` : ""}</p>}
                  <p>
                    {phone && <>Tél. : {phone}</>}
                    {phone && orderNumber && <span className="px-2">|</span>}
                    {orderNumber && <>N° Ordre : {orderNumber}</>}
                    {!phone && email && <>Email : {email}</>}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </Card>
      {isShareDialogOpen && (
        <Dialog
          open={isShareDialogOpen}
          onOpenChange={(open) => {
            if (open) setIsShareDialogOpen(true);
            else closeShareDialog();
          }}
        >
          <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-xl overflow-y-auto rounded-3xl border border-[#dce9e1] bg-white p-5 shadow-2xl print:hidden sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf4ed] text-[#23634f]">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6b8577]">Accès confidentiel</p>
                  <DialogTitle className="mt-0.5 text-lg font-bold text-[#194d40]">Partager l’ordonnance</DialogTitle>
                </div>
              </div>
            </div>
            <DialogDescription className="sr-only">Créer, suivre ou révoquer un accès temporaire et protégé par code à cette ordonnance.</DialogDescription>

            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950">
              Le lien expire automatiquement et peut être révoqué. Partagez le lien et le code par deux canaux séparés.
            </div>

            {!createdShare ? (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="min-w-0 flex-1 text-xs font-semibold text-slate-700">
                  Validité du lien
                  <select
                    value={shareDuration}
                    onChange={(event) => setShareDuration(Number(event.target.value))}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-[#39866a] focus:ring-2 focus:ring-[#39866a]/15"
                  >
                    <option value={24}>24 heures</option>
                    <option value={72}>3 jours</option>
                    <option value={168}>7 jours maximum</option>
                  </select>
                </label>
                <Button
                  type="button"
                  onClick={() => void createPrescriptionShare()}
                  disabled={isCreatingShare || !sessionToken}
                  className="h-10 shrink-0 rounded-xl bg-[#23634f] text-white hover:bg-[#194d40]"
                >
                  <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  {isCreatingShare ? "Création…" : "Créer le lien sécurisé"}
                </Button>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                    <Check className="h-4 w-4" aria-hidden="true" /> Lien créé · expire le {format(new Date(createdShare.expiresAt), "dd/MM/yyyy à HH:mm")}
                  </p>
                  <label className="mt-3 block text-xs font-semibold text-emerald-950" htmlFor="prescription-share-url">Lien à envoyer</label>
                  <div className="mt-1 flex gap-2">
                    <input id="prescription-share-url" readOnly value={createdShare.url} className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-2 text-xs text-slate-700" />
                    <Button type="button" variant="outline" size="icon" className="shrink-0 rounded-lg" aria-label="Copier le lien de partage" onClick={() => void copyShareValue(createdShare.url, "url")}>
                      {copiedShareValue === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <label className="mt-3 block text-xs font-semibold text-emerald-950" htmlFor="prescription-share-code">Code à transmettre séparément</label>
                  <div className="mt-1 flex gap-2">
                    <input id="prescription-share-code" readOnly value={createdShare.accessCode} className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-lg tracking-[0.25em] text-slate-900" />
                    <Button type="button" variant="outline" size="icon" className="shrink-0 rounded-lg" aria-label="Copier le code d’accès" onClick={() => void copyShareValue(createdShare.accessCode, "code")}>
                      {copiedShareValue === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-emerald-900">
                    Le code ne sera pas réaffiché après fermeture. Notez-le et communiquez-le par un canal distinct du lien.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-slate-200 pt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-800">Liens créés pour cette ordonnance</h3>
                <span className="text-[10px] text-slate-500">Consultations : ouverture du document</span>
              </div>
              {isLoadingShares ? (
                <p className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Chargement des liens…
                </p>
              ) : shareHistoryError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-4 text-center">
                  <p className="text-xs text-amber-900">Historique inaccessible. Vérifiez le réseau et le déploiement du service de partage.</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3 h-8 rounded-lg border-amber-300 bg-white text-xs text-amber-900" onClick={() => void loadPrescriptionShares()}>
                    Réessayer
                  </Button>
                </div>
              ) : prescriptionShares.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">Aucun lien de partage enregistré.</p>
              ) : (
                <ul className="space-y-2">
                  {prescriptionShares.map((share) => {
                    const expired = new Date(share.expires_at).getTime() <= Date.now();
                    const revoked = Boolean(share.revoked_at);
                    const active = !expired && !revoked;
                    return (
                      <li key={share.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className={`text-xs font-bold ${active ? "text-emerald-800" : "text-slate-500"}`}>
                            {revoked ? "Révoqué" : expired ? "Expiré" : "Actif"}
                            <span className="font-normal text-slate-500"> · expire le {format(new Date(share.expires_at), "dd/MM/yyyy HH:mm")}</span>
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {share.access_count} ouverture{share.access_count === 1 ? "" : "s"}
                            {share.last_accessed_at ? ` · dernière le ${format(new Date(share.last_accessed_at), "dd/MM à HH:mm")}` : ""}
                          </p>
                        </div>
                        {active && (
                          <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 rounded-lg border-rose-200 px-2.5 text-xs text-rose-700 hover:bg-rose-50" onClick={() => void revokePrescriptionShare(share.id)}>
                            Révoquer
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* Print Styles */}
      <style>{`
        @media print {
          @page { size: ${paperSize} portrait; margin: 0; }
          body * { visibility: hidden !important; }
          .prescription-print-card,
          .prescription-print-card * { visibility: visible !important; }
          .prescription-preview-overlay {
            position: static !important;
            display: block !important;
            inset: auto !important;
            width: auto !important;
            height: auto !important;
            padding: 0 !important;
            overflow: visible !important;
            background: transparent !important;
            backdrop-filter: none !important;
          }
          .prescription-print-card {
            position: relative !important;
            inset: auto !important;
            display: block !important;
            width: 128mm !important;
            max-width: 128mm !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            border-radius: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
          .prescription-preview-viewport {
            display: block !important;
            flex: none !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            padding: 0 !important;
          }
          .prescription-print-page {
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 11px !important;
            line-height: 1.25 !important;
            transform: none !important;
            transform-origin: top left !important;
            box-shadow: none !important;
          }
          .prescription-print-page.prescription-layout-preprinted {
            padding: 20mm 0 !important;
          }
          .prescription-print-page.prescription-layout-preprinted .prescription-header,
          .prescription-print-page.prescription-layout-preprinted .prescription-contact-details {
            display: none !important;
          }
          .prescription-print-page > .mb-4.flex {
            margin-bottom: 8px !important;
            padding: 6px 8px !important;
          }
          .prescription-header {
            margin-bottom: 5px !important;
            padding-bottom: 5px !important;
            gap: 6px !important;
          }
          .prescription-header-logo {
            width: 48px !important;
            height: 48px !important;
            padding: 6px !important;
          }
          .prescription-header-name {
            font-size: 14px !important;
          }
          .prescription-header-detail {
            margin-top: 2px !important;
            font-size: 10px !important;
          }
          .prescription-patient {
            margin-bottom: 8px !important;
            padding: 4px 6px !important;
          }
          .prescription-patient-meta {
            gap: 3px !important;
          }
          .prescription-print-page > .my-4 {
            margin-top: 8px !important;
            margin-bottom: 8px !important;
          }
          .prescription-print-page > h2 {
            margin-top: 4px !important;
            margin-bottom: 6px !important;
            font-size: 14px !important;
          }
          .prescription-print-page > .mb-5.min-h-\\[100px\\] {
            min-height: 0 !important;
            margin-bottom: 5px !important;
          }
          .prescription-item {
            margin-top: 0 !important;
            margin-bottom: 2px !important;
            padding-bottom: 2px !important;
          }
          .prescription-item > div.flex-1 > .text-sm {
            font-size: 11px !important;
          }
          .prescription-item .ml-8 > .text-sm {
            font-size: 10px !important;
          }
          .prescription-items {
            min-height: 0 !important;
            margin-bottom: 4px !important;
          }
          .prescription-medication-name {
            font-size: 11px !important;
          }
          .prescription-items-compact .prescription-item {
            flex-shrink: 0 !important;
            margin-bottom: 0 !important;
            padding-bottom: 1px !important;
          }
          .prescription-items-compact .prescription-medication-name {
            font-size: 10px !important;
          }
          .prescription-items-compact .prescription-item > div.flex-1 > div.ml-8 {
            margin-top: 0 !important;
            font-size: 9px !important;
            line-height: 1.1 !important;
          }
          .prescription-posology {
            margin-top: 1px !important;
            font-size: 10px !important;
            line-height: 1.2 !important;
            color: #111 !important;
          }
          .prescription-item .ml-8 {
            margin-top: 1px !important;
          }
          .prescription-schedule,
          .prescription-schedule > div {
            height: 21px !important;
            min-height: 21px !important;
          }
          .prescription-schedule svg {
            width: 11px !important;
            height: 11px !important;
            stroke-width: 3 !important;
          }
          .prescription-schedule span {
            font-size: 10px !important;
            font-weight: 800 !important;
            color: #000 !important;
          }
          .prescription-page-notes {
            margin-top: 8px !important;
            margin-bottom: 8px !important;
            padding: 8px !important;
          }
          .prescription-page-footer {
            margin-top: 4px !important;
            padding-top: 4px !important;
          }
          .prescription-metadata,
          .prescription-verification-row {
            margin-bottom: 4px !important;
          }
          .prescription-safety {
            margin-bottom: 4px !important;
          }
          .prescription-page-footer img {
            width: 18mm !important;
            height: 18mm !important;
          }
          .prescription-signature {
            min-height: 22mm !important;
            border: 1px dashed #777 !important;
          }
          .prescription-safety {
            border: 1px solid #777 !important;
            color: #111 !important;
            font-weight: 700 !important;
          }
          .prescription-item {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .prescription-print-card,
          .prescription-print-card * {
            -webkit-print-color-adjust: economy !important;
            print-color-adjust: economy !important;
          }
          .prescription-schedule,
          .prescription-schedule > div {
            border-color: #333 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .prescription-schedule > div[data-selected="true"] {
            background: #f1f3f1 !important;
          }
          .prescription-schedule svg {
            color: #000 !important;
          }
        }
        @media print {
          @page {
            size: ${paperDimensions.width}mm ${paperDimensions.height}mm;
            margin: 0;
          }
          html,
          body {
            width: ${paperDimensions.width}mm !important;
            height: ${paperDimensions.height}mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          .prescription-preview-overlay {
            position: fixed !important;
            inset: 0 !important;
            width: ${paperDimensions.width}mm !important;
            height: ${paperDimensions.height}mm !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .prescription-print-card {
            position: static !important;
            display: block !important;
            width: ${paperDimensions.width}mm !important;
            max-width: ${paperDimensions.width}mm !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .prescription-print-card > :not(.prescription-preview-viewport) {
            display: none !important;
          }
          .prescription-preview-viewport {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: ${paperDimensions.width}mm !important;
            height: ${paperDimensions.height}mm !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .prescription-print-page {
            box-sizing: border-box !important;
            width: 148mm !important;
            min-width: 148mm !important;
            max-width: 148mm !important;
            height: 210mm !important;
            min-height: 210mm !important;
            max-height: 210mm !important;
            margin: 0 !important;
            padding: 4.2mm 5.3mm !important;
            overflow: hidden !important;
            font-size: 16px !important;
            line-height: normal !important;
            transform: scale(${paperScale}) !important;
            transform-origin: center center !important;
            box-shadow: none !important;
            background: #fff !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .prescription-print-page.prescription-layout-preprinted {
            padding: 20mm 5.3mm !important;
          }
          .prescription-items-compact {
            display: flex !important;
            flex: 1 1 auto !important;
            flex-direction: column !important;
            justify-content: space-evenly !important;
          }
          .prescription-header {
            margin-bottom: 8px !important;
            padding-bottom: 8px !important;
          }
          .prescription-header-name {
            font-size: 16px !important;
          }
          .prescription-patient {
            margin-bottom: 8px !important;
            padding: 4px 8px !important;
          }
          .prescription-divider {
            margin-top: 8px !important;
            margin-bottom: 8px !important;
          }
          .prescription-title {
            margin-top: 0 !important;
            margin-bottom: 16px !important;
          }
          .prescription-items {
            margin-bottom: 8px !important;
          }
          .prescription-item {
            padding-bottom: 4px !important;
          }
          .prescription-medication-name {
            font-size: 13px !important;
          }
          .prescription-page-notes {
            margin-top: 0 !important;
            margin-bottom: 12px !important;
            padding: 10px !important;
          }
          .prescription-page-footer {
            margin-top: auto !important;
            padding-top: 6px !important;
            padding-bottom: 1mm !important;
          }
          .prescription-signature {
            min-height: 18mm !important;
          }
          .prescription-print-page * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
    </>
  ), document.body);
};
