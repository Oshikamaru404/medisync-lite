import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  FileImage,
  FileText,
  Loader2,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  TableProperties,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getDocumentAnalysis,
  getDocumentSignedUrl,
  saveDocumentAnalysis,
  type Document,
  type DocumentAnalysis,
} from "@/hooks/useDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MAX_ANALYSIS_FILE_SIZE = 20 * 1024 * 1024;
const MAX_RENDERED_PAGES = 3;
const MAX_RENDERED_IMAGE_SIZE = 1800;

const reportInlinePattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

const renderInlineMarkdown = (text: string) =>
  text.split(reportInlinePattern).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });

const parseReportBlocks = (lines: string[]) => {
  const blocks: string[][] = [];
  let current: string[] = [];
  lines.forEach((line) => {
    if (!line.trim()) {
      if (current.length) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  });
  if (current.length) blocks.push(current);
  return blocks;
};

const ReportBlock = ({ lines }: { lines: string[] }) => {
  const content = lines.join("\n");
  const trimmed = content.trim();
  if (/^\|.*\|$/.test(trimmed)) {
    const rows = lines
      .filter((line) => !/^\|[\s:|-]+\|$/.test(line.trim()))
      .map((line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
    const [headers, ...body] = rows;
    if (headers?.length) {
      return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-max text-left text-xs">
            <thead className="bg-[#edf4f0] text-[10px] uppercase tracking-wide text-[#45695a]">
              <tr>{headers.map((cell, index) => <th key={index} className="px-3 py-2 font-semibold">{renderInlineMarkdown(cell)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {body.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((_, cellIndex) => <td key={cellIndex} className="px-3 py-2 align-top font-medium text-slate-900">{renderInlineMarkdown(row[cellIndex] ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }

  if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
    return (
      <ul className="space-y-1.5 pl-5 text-[13px] leading-6 marker:text-[#5b927b]">
        {lines.map((line, index) => <li key={index}>{renderInlineMarkdown(line.replace(/^\s*[-*]\s+/, ""))}</li>)}
      </ul>
    );
  }

  const isLabComment = /^\*\*(?:Commentaire|Validation|Conclusion|Observation)[^*]*\*\*:/i.test(trimmed);
  return (
    <div className={isLabComment
      ? "rounded-xl border border-[#d8e6dc] bg-[#f4f8f5] px-4 py-3 text-sm leading-7 text-slate-900"
      : "text-sm leading-7 text-slate-900"}>
      {lines.map((line, index) => {
        const labelMatch = line.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
        return (
          <p key={index} className={index > 0 ? "mt-1" : ""}>
            {labelMatch ? (
              <>
                <span className="font-bold text-[#194d40]">{labelMatch[1]} :</span>
                {labelMatch[2] && <> {renderInlineMarkdown(labelMatch[2])}</>}
              </>
            ) : renderInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
};

const DetailedReport = ({ content }: { content: string }) => {
  const lines = content.replace(/\r\n/g, "\n").trim().split("\n");
  const titleIndex = lines.findIndex((line) => /^#\s+/.test(line.trim()));
  const title = titleIndex >= 0 ? lines[titleIndex].trim().replace(/^#\s+/, "") : "Compte rendu détaillé";
  const reportLines = titleIndex >= 0 ? lines.slice(titleIndex + 1) : lines;
  const separatorIndex = reportLines.findIndex((line) => /^---+$/.test(line.trim()));
  const metadataLines = separatorIndex >= 0
    ? reportLines.slice(0, separatorIndex)
    : reportLines.slice(0, reportLines.findIndex((line) => /^##\s+/.test(line.trim())) < 0
      ? reportLines.length
      : reportLines.findIndex((line) => /^##\s+/.test(line.trim())));
  const bodyLines = separatorIndex >= 0 ? reportLines.slice(separatorIndex + 1) : reportLines.slice(metadataLines.length);
  const metadata = metadataLines
    .map((line) => line.trim().match(/^\*\*([^*]+):\*\*\s*(.+)$/))
    .filter((match): match is RegExpMatchArray => !!match)
    .map((match) => ({ label: match[1].trim(), value: match[2].trim() }));
  const blocks = parseReportBlocks(bodyLines);
  const sections: Array<{
    title: string;
    parts: Array<{ subtitle?: string; blocks: string[][] }>;
  }> = [];
  const openingBlocks: string[][] = [];
  let currentSection: (typeof sections)[number] | undefined;

  blocks.forEach((block) => {
    const heading = block[0]?.trim().match(/^(#{2,3})\s+(.+)$/);
    if (heading?.[1].length === 2) {
      currentSection = { title: heading[2], parts: [] };
      sections.push(currentSection);
      return;
    }
    if (heading?.[1].length === 3 && currentSection) {
      currentSection.parts.push({ subtitle: heading[2], blocks: [] });
      return;
    }
    if (!currentSection) {
      openingBlocks.push(block);
      return;
    }
    const lastPart = currentSection.parts[currentSection.parts.length - 1];
    if (lastPart) lastPart.blocks.push(block);
    else currentSection.parts.push({ blocks: [block] });
  });

  return (
    <article className="overflow-hidden rounded-2xl border border-[#dce8df] bg-white shadow-[0_12px_32px_-24px_rgba(25,77,64,0.45)]">
      <header className="relative overflow-hidden border-b border-[#dce8df] bg-gradient-to-br from-[#f1f7f3] via-white to-[#edf5f0] px-5 py-5 sm:px-6">
        <div aria-hidden="true" className="absolute -right-8 -top-12 h-36 w-36 rounded-full border-[20px] border-white/60" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#39745e] ring-1 ring-[#dce8df]">
              <FileText className="h-3 w-3" />Lecture documentaire
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
              <AlertTriangle className="h-3 w-3" />À vérifier sur l’original
            </span>
          </div>
          <h2 className="mt-3 max-w-2xl text-lg font-bold leading-snug tracking-tight text-[#194d40] sm:text-xl">
            {renderInlineMarkdown(title)}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Retranscription structurée des éléments lisibles · sans interprétation médicale indépendante
          </p>
          {metadata.length > 0 && (
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {metadata.map(({ label, value }, index) => (
                <div key={`${label}-${index}`} className="min-w-0 rounded-xl border border-white/90 bg-white/80 px-3 py-2 shadow-sm">
                  <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#71877c]">{label}</dt>
                  <dd className="mt-0.5 break-words text-[13px] font-semibold leading-5 text-slate-700">{renderInlineMarkdown(value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </header>

      <div className="space-y-4 bg-[#fbfcfb] p-4 sm:p-5">
        {openingBlocks.map((block, index) => <ReportBlock key={`opening-${index}`} lines={block} />)}
        {sections.map((section, sectionPosition) => {
          const numberedHeading = section.title.match(/^(\d+)\.\s+(.+)$/);
          const isSummary = /synth[eè]se/i.test(section.title);
          return (
            <section
              key={`section-${sectionPosition}`}
              className={isSummary
                ? "rounded-xl border border-[#cfe1d6] bg-[#f1f7f3] p-4 sm:p-5"
                : "rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_18px_-18px_rgba(15,23,42,0.55)] sm:p-5"}
            >
              <h3 className="mb-3 flex items-start gap-2.5 text-sm font-extrabold leading-6 text-[#123d33]">
                {numberedHeading && (
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#e8f2ec] text-[11px] font-bold text-[#39745e]">
                    {numberedHeading[1]}
                  </span>
                )}
                <span>{renderInlineMarkdown(numberedHeading ? numberedHeading[2] : section.title)}</span>
              </h3>
              <div className="space-y-3">
                {section.parts.map((part, partIndex) => (
                  <div key={`part-${partIndex}`} className={part.subtitle ? "space-y-2.5" : "space-y-3"}>
                    {part.subtitle && (
                      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.09em] text-[#365d4c]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#6d9a82]" />
                        {renderInlineMarkdown(part.subtitle)}
                      </h4>
                    )}
                    {part.blocks.map((block, blockIndex) => <ReportBlock key={`block-${blockIndex}`} lines={block} />)}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        {blocks.length === 0 && <p className="text-sm text-slate-500">Aucun détail n’est disponible pour cette pièce.</p>}
      </div>
      <footer className="border-t border-[#e7eee9] bg-white px-5 py-3 sm:px-6">
        <p className="text-[10px] leading-relaxed text-slate-500">
          Les valeurs, unités, commentaires et intervalles de référence doivent être contrôlés sur le document original.
        </p>
      </footer>
    </article>
  );
};

const renderImageBlob = async (blob: Blob) => {
  const image = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, MAX_RENDERED_IMAGE_SIZE / Math.max(image.width, image.height));
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Impossible de préparer l’image pour l’OCR.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
    if (dataUrl.length > 3 * 1024 * 1024) {
      throw new Error("Cette image reste trop volumineuse après optimisation. Réduisez sa taille avant de relancer l’analyse.");
    }
    return dataUrl;
  } finally {
    image.close();
  }
};

const renderPdfPages = async (blob: Blob, onProgress: (message: string) => void) => {
  const [{ getDocument, GlobalWorkerOptions }, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const pageCount = Math.min(pdf.numPages, MAX_RENDERED_PAGES);
  const images: string[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    onProgress(`Préparation de la page ${pageNumber} sur ${pageCount}…`);
    const page = await pdf.getPage(pageNumber);
    const initialViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, MAX_RENDERED_IMAGE_SIZE / initialViewport.width, MAX_RENDERED_IMAGE_SIZE / initialViewport.height);
    const viewport = page.getViewport({ scale });
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Impossible de préparer le PDF pour l’OCR.");
    await page.render({ canvasContext: context, viewport }).promise;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
    if (dataUrl.length > 3 * 1024 * 1024) {
      throw new Error(`La page ${pageNumber} est trop lourde après préparation. Réduisez sa résolution ou utilisez une image plus légère.`);
    }
    images.push(dataUrl);
    canvas.width = 0;
    canvas.height = 0;
  }

  return {
    images,
    notice: pdf.numPages > MAX_RENDERED_PAGES
      ? `Le document comporte ${pdf.numPages} pages. Groq accepte au plus ${MAX_RENDERED_PAGES} images par analyse : seules les ${MAX_RENDERED_PAGES} premières pages seront traitées.`
      : "",
  };
};

const getAnalysisImages = async (blob: Blob, extension: string, onProgress: (message: string) => void) => {
  if (blob.size > MAX_ANALYSIS_FILE_SIZE) {
    throw new Error("La pièce dépasse la limite de 20 Mo pour l’analyse.");
  }
  if (extension === "pdf") return renderPdfPages(blob, onProgress);
  if (["jpg", "jpeg", "png", "webp"].includes(extension)) {
    onProgress("Optimisation de l’image…");
    return { images: [await renderImageBlob(blob)], notice: "" };
  }
  throw new Error("L’analyse accepte les fichiers PDF, JPG, PNG et WebP.");
};

interface PatientDocumentPreviewDialogProps {
  document: Document | null;
  patientId: string;
  autoAnalyze?: boolean;
  onClose: () => void;
}

const getDocumentExtension = (url: string) => {
  const path = url.startsWith("private:")
    ? url.slice("private:".length)
    : new URL(url, window.location.origin).pathname;
  return path.split("/").pop()?.split(".").pop()?.toLowerCase() ?? "";
};

export const PatientDocumentPreviewDialog = ({
  document,
  patientId,
  autoAnalyze = false,
  onClose,
}: PatientDocumentPreviewDialogProps) => {
  const { sessionToken } = useAuth();
  const documentId = document?.id;
  const extension = document ? getDocumentExtension(document.url) : "";
  const [signedUrl, setSignedUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisConsent, setAnalysisConsent] = useState(autoAnalyze);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(!!document);
  const [analysisLoadError, setAnalysisLoadError] = useState("");
  const [analysisSaveError, setAnalysisSaveError] = useState("");
  const [analysisProgress, setAnalysisProgress] = useState("");
  const [pageNotice, setPageNotice] = useState("");
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [showDetailedReport, setShowDetailedReport] = useState(true);
  const autoAnalyzeStartedFor = useRef<string | null>(null);

  const loadSignedUrl = useCallback(async () => {
    if (!documentId || !sessionToken) {
      setError("Votre session a expiré. Reconnectez-vous pour accéder à cette pièce.");
      return;
    }
    setIsLoading(true);
    setError("");
    setSignedUrl("");
    try {
      const url = await getDocumentSignedUrl(documentId, patientId, sessionToken);
      setSignedUrl(url);
    } catch (loadError) {
      console.error("Unable to preview patient document:", loadError);
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger cette pièce.");
    } finally {
      setIsLoading(false);
    }
  }, [documentId, patientId, sessionToken]);

  const fetchDocumentBlob = useCallback(async () => {
    if (!documentId || !sessionToken || !signedUrl) {
      throw new Error("Le lien sécurisé n’est pas prêt. Actualisez-le puis réessayez.");
    }
    const fetchFile = async (url: string) => {
      try {
        return await fetch(url);
      } catch (fetchError) {
        console.error("Unable to reach patient document storage:", fetchError);
        throw new Error("Connexion au stockage impossible. Vérifiez votre réseau puis réessayez.");
      }
    };
    let response = await fetchFile(signedUrl);
    if (!response.ok) {
      const refreshedUrl = await getDocumentSignedUrl(documentId, patientId, sessionToken);
      setSignedUrl(refreshedUrl);
      response = await fetchFile(refreshedUrl);
    }
    if (!response.ok) {
      throw new Error("Le document n’est toujours pas accessible. Vérifiez votre session puis réessayez.");
    }
    return response.blob();
  }, [documentId, patientId, sessionToken, signedUrl]);

  const retryLoadAnalysis = useCallback(async () => {
    if (!documentId || !sessionToken) return;
    setIsLoadingAnalysis(true);
    setAnalysisLoadError("");
    try {
      setAnalysis(await getDocumentAnalysis(documentId, patientId, sessionToken));
    } catch (loadError) {
      console.error("Unable to reload saved document analysis:", loadError);
      setAnalysisLoadError(loadError instanceof Error ? loadError.message : "Le rapport enregistré n’a pas pu être chargé.");
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [documentId, patientId, sessionToken]);

  useEffect(() => {
    if (!documentId) {
      setSignedUrl("");
      setAnalysis(null);
      setAnalysisError("");
      setAnalysisConsent(false);
      setIsLoadingAnalysis(false);
      setAnalysisLoadError("");
      setAnalysisSaveError("");
      setAnalysisProgress("");
      autoAnalyzeStartedFor.current = null;
      return;
    }
    setSignedUrl("");
    setError("");
    setAnalysis(null);
    setAnalysisError("");
    setAnalysisConsent(autoAnalyze);
    setIsLoadingAnalysis(true);
    setAnalysisLoadError("");
    setAnalysisSaveError("");
    setAnalysisProgress("");
    setPageNotice("");
    setShowExtractedText(false);
    setShowDetailedReport(true);
    autoAnalyzeStartedFor.current = null;
    void loadSignedUrl();
    if (!documentId || !sessionToken) {
      setIsLoadingAnalysis(false);
      return;
    }
    let cancelled = false;
    void getDocumentAnalysis(documentId, patientId, sessionToken)
      .then((savedAnalysis) => {
        if (!cancelled) setAnalysis(savedAnalysis);
      })
      .catch((loadError) => {
        if (!cancelled) {
          console.error("Unable to load saved document analysis:", loadError);
          setAnalysisLoadError(loadError instanceof Error ? loadError.message : "Le rapport enregistré n’a pas pu être chargé.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAnalysis(false);
      });
    return () => { cancelled = true; };
  }, [autoAnalyze, documentId, loadSignedUrl, patientId, sessionToken]);

  const handleDownload = async () => {
    if (!signedUrl || !document) return;
    setIsDownloading(true);
    try {
      const file = await fetchDocumentBlob();
      const downloadUrl = URL.createObjectURL(file);
      const link = window.document.createElement("a");
      link.href = downloadUrl;
      link.download = `${document.nom}.${getDocumentExtension(document.url) || "file"}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (downloadError) {
      console.error("Unable to download patient document:", downloadError);
      toast.error(downloadError instanceof Error ? downloadError.message : "Impossible de télécharger cette pièce.");
    } finally {
      setIsDownloading(false);
    }
  };

  const persistAnalysis = useCallback(async (candidate: DocumentAnalysis) => {
    if (!documentId || !sessionToken) {
      setAnalysisSaveError("Votre session a expiré. Reconnectez-vous avant d’enregistrer le rapport.");
      return;
    }
    setIsSavingAnalysis(true);
    setAnalysisSaveError("");
    try {
      const savedAnalysis = await saveDocumentAnalysis(documentId, patientId, sessionToken, candidate);
      setAnalysis(savedAnalysis);
      toast.success("Rapport associé à la pièce", { description: "Le résumé et les éléments extraits seront disponibles lors des prochaines consultations." });
    } catch (saveError) {
      console.error("Unable to save document analysis:", saveError);
      setAnalysisSaveError(saveError instanceof Error ? saveError.message : "Le rapport n’a pas pu être enregistré.");
    } finally {
      setIsSavingAnalysis(false);
    }
  }, [documentId, patientId, sessionToken]);

  const handleAnalyze = useCallback(async () => {
    if (!document || !signedUrl || !sessionToken || !analysisConsent) return;
    setIsAnalyzing(true);
    setAnalysisError("");
    setAnalysis(null);
    setPageNotice("");
    setAnalysisProgress("Chargement de la pièce sécurisée…");
    try {
      const { images, notice } = await getAnalysisImages(await fetchDocumentBlob(), extension, setAnalysisProgress);
      setPageNotice(notice);
      setAnalysisProgress("Lecture du document et structuration des résultats…");
      const { data, error: invokeError } = await supabase.functions.invoke("ocr-extract", {
        body: { images, sessionToken },
      });
      if (invokeError) {
        let message = invokeError.message;
        if ("context" in invokeError && invokeError.context instanceof Response) {
          const responseBody = await invokeError.context.clone().json().catch(() => null) as { error?: string } | null;
          message = responseBody?.error || message;
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.analysis
        || typeof data.analysis.summary !== "string"
        || typeof data.analysis.detailedReport !== "string"
        || typeof data.analysis.extractedText !== "string") {
        throw new Error("Le service n’a pas renvoyé une analyse structurée exploitable.");
      }
      const nextAnalysis = data.analysis as DocumentAnalysis;
      setAnalysis(nextAnalysis);
      setShowExtractedText(false);
      setShowDetailedReport(true);
      setAnalysisSaveError("");
      await persistAnalysis(nextAnalysis);
    } catch (analysisFailure) {
      console.error("Unable to analyze patient document:", analysisFailure);
      setAnalysisError(analysisFailure instanceof Error ? analysisFailure.message : "L’analyse du document a échoué.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress("");
    }
  }, [analysisConsent, document, extension, fetchDocumentBlob, persistAnalysis, sessionToken, signedUrl]);

  useEffect(() => {
    if (!autoAnalyze || !documentId || !signedUrl || !analysisConsent || isLoadingAnalysis || analysisLoadError || analysis || autoAnalyzeStartedFor.current === documentId) return;
    autoAnalyzeStartedFor.current = documentId;
    void handleAnalyze();
  }, [analysis, analysisConsent, analysisLoadError, autoAnalyze, documentId, handleAnalyze, isLoadingAnalysis, signedUrl]);

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copié.`);
    } catch (copyError) {
      console.error("Unable to copy document analysis:", copyError);
      toast.error("Copie impossible. Vérifiez les autorisations du navigateur.");
    }
  };

  const isPdf = extension === "pdf";
  const isImage = ["jpg", "jpeg", "png", "webp"].includes(extension);

  return (
    <Dialog open={!!document} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex h-[min(94dvh,980px)] w-[98vw] max-w-none flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 pr-14">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ee] text-[#23634f]">
              {isImage ? <FileImage className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base text-[#194d40]">{document?.nom ?? "Pièce du dossier"}</DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span>{document?.type}</span>
                <span aria-hidden="true">·</span>
                <span>{document ? new Date(document.created_at).toLocaleDateString("fr-FR") : ""}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />Lien temporaire sécurisé</span>
              </DialogDescription>
            </div>
            {signedUrl && (
              <div className="flex shrink-0 items-center gap-2">
                <Button type="button" variant="outline" size="icon" className="h-9 w-9" aria-label="Renouveler le lien sécurisé" title="Renouveler le lien sécurisé" onClick={() => void loadSignedUrl()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => window.open(signedUrl, "_blank", "noopener,noreferrer")}>
                  <ExternalLink className="h-4 w-4" /><span className="hidden sm:inline">Nouvel onglet</span>
                </Button>
                <Button type="button" size="sm" className="gap-2 bg-[#23634f] text-white hover:bg-[#194d40]" onClick={() => void handleDownload()} disabled={isDownloading}>
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  <span className="hidden sm:inline">Télécharger</span>
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100 md:flex-row">
          <div className="relative flex min-h-[220px] flex-1 items-center justify-center overflow-auto p-3 sm:p-5 md:min-w-0">
            {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-sm text-slate-600" role="status">
              <Loader2 className="h-7 w-7 animate-spin text-[#23634f]" />
              Préparation de l’accès sécurisé…
            </div>
          ) : error ? (
            <div className="max-w-sm text-center">
              <p className="text-sm font-semibold text-slate-800">Aperçu indisponible</p>
              <p className="mt-1 text-sm text-slate-600">{error}</p>
              <Button type="button" variant="outline" className="mt-4 gap-2" onClick={() => void loadSignedUrl()}>
                <RefreshCw className="h-4 w-4" />Réessayer
              </Button>
            </div>
          ) : signedUrl && isPdf ? (
            <iframe
              key={signedUrl}
              src={signedUrl}
              title={`Aperçu PDF : ${document?.nom ?? "document patient"}`}
              className="h-full min-h-[50vh] w-full rounded-lg border border-slate-200 bg-white"
              referrerPolicy="no-referrer"
            />
          ) : signedUrl && isImage ? (
            <img src={signedUrl} alt={`Aperçu : ${document?.nom ?? "document patient"}`} className="max-h-full max-w-full rounded-lg object-contain shadow-sm" />
          ) : signedUrl ? (
            <div className="max-w-sm text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-3 text-sm text-slate-700">L’aperçu de ce format n’est pas disponible dans le navigateur.</p>
              <Button type="button" className="mt-4 gap-2 bg-[#23634f] text-white hover:bg-[#194d40]" onClick={() => void handleDownload()} disabled={isDownloading}>
                <Download className="h-4 w-4" />Télécharger la pièce
              </Button>
            </div>
            ) : null}
          </div>

          {signedUrl && (
            <section className="max-h-[46%] shrink-0 overflow-y-auto border-t border-slate-200 bg-white p-4 sm:px-6 md:max-h-none md:w-[min(56%,760px)] md:flex-none md:border-l md:border-t-0 md:px-6 md:py-6" aria-label="Analyse documentaire">
              {!analysis && (
                <div className="space-y-3">
                  {isLoadingAnalysis && (
                    <p className="flex items-center gap-2 text-xs text-slate-500" role="status">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#23634f]" />Recherche d’un rapport déjà associé…
                    </p>
                  )}
                  {analysisLoadError && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900" role="alert">
                      <span>{analysisLoadError} L’analyse automatique est suspendue pour éviter de relancer inutilement l’envoi à Groq.</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => void retryLoadAnalysis()} disabled={isLoadingAnalysis}>Réessayer</Button>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#194d40]">
                        <ScanSearch className="h-4 w-4" />Lecture intelligente du document
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        Résumé rapide, compte rendu factuel et tableaux extraits. Le rapport est conservé avec cette pièce ; le médecin doit vérifier les éléments sur l’original.
                      </p>
                    </div>
                    <Button type="button" className="shrink-0 gap-2 bg-[#23634f] text-white hover:bg-[#194d40]" onClick={() => void handleAnalyze()} disabled={!analysisConsent || isAnalyzing || isLoadingAnalysis || !!analysisLoadError}>
                      {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                      {isAnalyzing ? "Analyse en cours…" : "Analyser la pièce"}
                    </Button>
                  </div>
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#d8e6dc] bg-[#f5f9f6] p-3 text-xs leading-relaxed text-slate-700">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#23634f]"
                      checked={analysisConsent}
                      onChange={(event) => setAnalysisConsent(event.target.checked)}
                      disabled={isAnalyzing}
                    />
                    <span>J’autorise l’envoi de cette pièce à Groq pour en générer un rapport de lecture. Je vérifierai chaque élément sur le document original.</span>
                  </label>
                  {analysisProgress && (
                    <p className="flex items-center gap-2 text-xs text-[#23634f]" role="status" aria-live="polite">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />{analysisProgress}
                    </p>
                  )}
                  {pageNotice && <p className="text-xs text-amber-800">{pageNotice}</p>}
                  {analysisError && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900" role="alert">
                      <span>{analysisError}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => void handleAnalyze()} disabled={!analysisConsent || isAnalyzing || !!analysisLoadError}>Réessayer</Button>
                    </div>
                  )}
                </div>
              )}

              {analysis && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-900 ring-1 ring-amber-200">
                        <AlertTriangle className="h-3 w-3" />Rapport IA · à vérifier par le médecin
                      </p>
                      <h3 className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#688276]">Synthèse pour la consultation</h3>
                      <p className="mt-1 text-sm font-semibold text-[#194d40]">{analysis.documentType}{analysis.documentDate ? ` · ${analysis.documentDate}` : ""}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{analysis.summary}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void copyText(analysis.summary, "Synthèse")}>
                      <Copy className="h-3.5 w-3.5" />Copier
                    </Button>
                  </div>

                  {analysis.generatedAt && (
                    <p className="text-[10px] text-slate-500">
                      Rapport associé le {new Date(analysis.generatedAt).toLocaleString("fr-MA")} · {analysis.model ?? "Lecture IA"}
                    </p>
                  )}

                  {analysis.detailedReport && (
                    <div className="overflow-hidden rounded-xl border border-[#dce8df] bg-[#f7faf8]">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
                        aria-expanded={showDetailedReport}
                        onClick={() => setShowDetailedReport((visible) => !visible)}
                      >
                        <span>
                          <span className="block text-xs font-semibold text-[#194d40]">Compte rendu détaillé</span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">Description structurée du contenu visible, sans interprétation médicale.</span>
                        </span>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-[#39745e] transition-transform ${showDetailedReport ? "rotate-180" : ""}`} />
                      </button>
                      {showDetailedReport && (
                        <div className="border-t border-[#dce8df] px-3.5 py-3">
                          <DetailedReport content={analysis.detailedReport} />
                          <Button type="button" variant="ghost" size="sm" className="mt-2 h-8 gap-2 px-2 text-[11px]" onClick={() => void copyText(analysis.detailedReport, "Compte rendu")}>
                            <Copy className="h-3.5 w-3.5" />Copier le compte rendu
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {analysisSaveError && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900" role="alert">
                      <span>Rapport affiché mais non conservé avec la pièce : {analysisSaveError}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => void persistAnalysis(analysis)} disabled={isSavingAnalysis}>
                        {isSavingAnalysis && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Enregistrer le rapport
                      </Button>
                    </div>
                  )}

                  {analysis.keyPoints.length > 0 && (
                    <div className="grid gap-2">
                      {analysis.keyPoints.map((point, index) => (
                        <p key={`${index}-${point}`} className="flex gap-2 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-700">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#39745e]" />{point}
                        </p>
                      ))}
                    </div>
                  )}

                  {analysis.labResults.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                        <TableProperties className="h-4 w-4 text-[#39745e]" />Résultats biologiques extraits ({analysis.labResults.length})
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px] text-left text-xs">
                          <thead className="text-[10px] uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-3 py-2 font-semibold">Analyse</th>
                              <th className="px-3 py-2 font-semibold">Résultat</th>
                              <th className="px-3 py-2 font-semibold">Unité</th>
                              <th className="px-3 py-2 font-semibold">Référence imprimée</th>
                              <th className="px-3 py-2 font-semibold">Lecture</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {analysis.labResults.map((result, index) => (
                              <tr key={`${result.name}-${index}`} className="text-slate-700">
                                <td className="px-3 py-2 font-medium">{result.name}</td>
                                <td className="px-3 py-2 font-semibold">{result.value}</td>
                                <td className="px-3 py-2">{result.unit || "—"}</td>
                                <td className="px-3 py-2">{result.referenceRange || "Non indiquée"}</td>
                                <td className="px-3 py-2">
                                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                    result.flag === "high" || result.flag === "low"
                                      ? "bg-amber-100 text-amber-900"
                                      : result.flag === "normal"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-slate-100 text-slate-600"
                                  }`}>
                                    {result.flag === "high" ? "Au-dessus" : result.flag === "low" ? "En-dessous" : result.flag === "normal" ? "Dans l’intervalle" : "À vérifier"}
                                  </span>
                                  {result.confidence < 0.7 && <span className="ml-1 text-amber-800" title="Confiance de lecture faible">· lecture incertaine</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {analysis.verificationNotes.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <h4 className="flex items-center gap-2 text-xs font-semibold text-amber-950"><AlertTriangle className="h-4 w-4" />À vérifier sur l’original</h4>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-amber-950">
                        {analysis.verificationNotes.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <p className="text-[11px] leading-relaxed text-slate-500">Aide de lecture non validée : confirmer chaque donnée sur l’original avant tout usage. Le document a été transmis à Groq à la demande du cabinet.</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => setShowExtractedText((visible) => !visible)}>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showExtractedText ? "rotate-180" : ""}`} />
                        {showExtractedText ? "Masquer le texte" : "Voir le texte extrait"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void copyText(analysis.extractedText, "Texte extrait")}>
                        <Copy className="h-3.5 w-3.5" />Copier le texte
                      </Button>
                    </div>
                  </div>
                  {showExtractedText && (
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">{analysis.extractedText || "Aucun texte n’a pu être extrait."}</pre>
                  )}
                  {pageNotice && <p className="text-xs text-amber-800">{pageNotice}</p>}
                </div>
              )}
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
