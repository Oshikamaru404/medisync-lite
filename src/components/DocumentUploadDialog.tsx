import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  FileImage,
  FileText,
  FileUp,
  Loader2,
  LockKeyhole,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateDocument, type Document } from "@/hooks/useDocuments";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DocumentUploadDialogProps {
  patientId: string;
  patientName: string;
  children?: React.ReactNode;
  onUploaded?: (document: Document, analyzeAfterUpload: boolean) => void;
}

const DOCUMENT_TYPES = [
  { value: "Analyse", label: "Analyse", detail: "Laboratoire", icon: FileText, tone: "emerald" },
  { value: "Radiologie", label: "Imagerie", detail: "Radio · IRM · écho", icon: FileImage, tone: "violet" },
  { value: "Compte rendu", label: "Compte rendu", detail: "Courrier · suivi", icon: FileText, tone: "blue" },
  { value: "Ordonnance", label: "Ordonnance", detail: "Traitement prescrit", icon: FileText, tone: "amber" },
  { value: "Certificat", label: "Certificat", detail: "Document médical", icon: FileText, tone: "rose" },
  { value: "Courrier", label: "Courrier", detail: "Correspondance", icon: FileText, tone: "cyan" },
  { value: "Autre", label: "Autre pièce", detail: "Autre document", icon: FileText, tone: "slate" },
] as const;

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const TODAY_FR = () => new Date().toLocaleDateString("fr-FR");

const formatFileSize = (size: number) => {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
};

export const DocumentUploadDialog = ({
  patientId,
  patientName,
  children,
  onUploaded,
}: DocumentUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [customName, setCustomName] = useState(false);
  const [analyzeAfterUpload, setAnalyzeAfterUpload] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [formError, setFormError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createDocument = useCreateDocument();

  useEffect(() => {
    if (documentType && patientName && !customName) {
      setDocumentName(`${documentType} · ${patientName} · ${TODAY_FR()}`);
    }
  }, [customName, documentType, patientName]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const resetForm = () => {
    setFile(null);
    setPreview("");
    setDocumentName("");
    setDocumentType("");
    setCustomName(false);
    setAnalyzeAfterUpload(true);
    setIsDragging(false);
    setFormError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectFile = (selectedFile?: File) => {
    if (!selectedFile) return;
    setFormError("");
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setFile(null);
      setPreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFormError("Format non pris en charge. Choisissez un PDF, JPG, PNG ou WebP.");
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setPreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFormError("Ce fichier dépasse 20 Mo. Choisissez une version plus légère.");
      return;
    }
    setFile(selectedFile);
    setPreview("");
    if (selectedFile.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
    }
  };

  const handleUpload = async () => {
    if (!file || !documentName.trim() || !documentType) {
      setFormError("Ajoutez un fichier, choisissez sa catégorie et vérifiez son nom.");
      return;
    }
    setIsUploading(true);
    setFormError("");
    try {
      const uploadedDocument = await createDocument.mutateAsync({
        patient_id: patientId,
        nom: documentName.trim(),
        type: documentType,
        file,
      });
      const shouldAnalyze = analyzeAfterUpload;
      resetForm();
      setOpen(false);
      toast({
        title: shouldAnalyze ? "Pièce enregistrée" : "Pièce ajoutée au dossier",
        description: shouldAnalyze ? "Ouverture de l’aperçu sécurisé et préparation de la lecture Groq." : "Vous pouvez la consulter à tout moment dans les documents du patient.",
      });
      onUploaded?.(uploadedDocument, shouldAnalyze);
    } catch (error) {
      console.error("Unable to upload patient document:", error);
      setFormError(error instanceof Error ? error.message : "L’enregistrement du document a échoué.");
    } finally {
      setIsUploading(false);
    }
  };

  const selectedType = DOCUMENT_TYPES.find((type) => type.value === documentType);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen && !isUploading) resetForm();
    }}>
      <DialogTrigger asChild>
        {children ?? (
          <Button type="button" className="gap-2">
            <Upload className="h-4 w-4" />Ajouter une pièce
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] max-w-3xl gap-0 overflow-hidden rounded-3xl border-slate-200 p-0 shadow-2xl">
        <DialogHeader className="relative overflow-hidden border-b border-white/10 bg-[#173f35] px-6 py-5 text-left text-white sm:px-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-emerald-100">
              <FileUp className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight text-white">Ajouter une pièce au dossier</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-emerald-100/75">
                Import sécurisé pour <span className="font-medium text-white">{patientName}</span>
              </DialogDescription>
            </div>
          </div>
          <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium text-emerald-50/80">
            <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5" />Stockage privé</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Accès médecin autorisé</span>
            <span>PDF, JPG, PNG ou WebP · 20 Mo max</span>
          </div>
        </DialogHeader>

        <div className="min-h-0 space-y-6 overflow-y-auto bg-[#fbfcfb] px-5 py-5 sm:px-8 sm:py-6">
          <section aria-labelledby="document-file-title">
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <h3 id="document-file-title" className="text-sm font-semibold text-slate-900">1. Choisir le fichier</h3>
                <p className="mt-0.5 text-xs text-slate-500">Glissez-déposez une pièce ou parcourez votre appareil.</p>
              </div>
              {file && (
                <button type="button" onClick={() => { setFile(null); setPreview(""); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-xs font-semibold text-slate-500 transition hover:text-rose-700">
                  Remplacer
                </button>
              )}
            </div>

            <div
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
              onDrop={(event) => { event.preventDefault(); setIsDragging(false); selectFile(event.dataTransfer.files[0]); }}
              className={cn(
                "rounded-2xl border border-dashed transition-colors",
                isDragging ? "border-[#23634f] bg-emerald-50" : file ? "border-emerald-200 bg-emerald-50/45" : "border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/30",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(event) => selectFile(event.target.files?.[0])}
                className="hidden"
                aria-label="Choisir un document médical"
              />
              {!file ? (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex min-h-36 w-full flex-col items-center justify-center px-5 py-6 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf3ee] text-[#23634f]">
                    <Upload className="h-5 w-5" />
                  </span>
                  <span className="mt-3 text-sm font-semibold text-slate-800">Déposer le fichier ici</span>
                  <span className="mt-1 text-xs text-slate-500">ou <span className="font-semibold text-[#23634f]">parcourir les fichiers</span></span>
                </button>
              ) : (
                <div className="flex items-center gap-3 p-3 sm:p-4">
                  {preview ? (
                    <img src={preview} alt="Aperçu du fichier sélectionné" className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 bg-white object-cover" />
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#23634f]">
                      <FileText className="h-7 w-7" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{file.type === "application/pdf" ? "Document PDF" : "Image"} · {formatFileSize(file.size)}</p>
                    <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800"><Check className="h-3.5 w-3.5" />Prêt à être enregistré</p>
                  </div>
                  <button type="button" aria-label="Retirer le fichier" onClick={() => { setFile(null); setPreview(""); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="document-category-title">
            <div className="mb-2.5">
              <h3 id="document-category-title" className="text-sm font-semibold text-slate-900">2. Classer la pièce</h3>
              <p className="mt-0.5 text-xs text-slate-500">Une catégorie claire facilite les recherches dans l’historique.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DOCUMENT_TYPES.map(({ value, label, detail, icon: Icon, tone }) => {
                const selected = documentType === value;
                const toneClasses: Record<(typeof DOCUMENT_TYPES)[number]["tone"], string> = {
                  emerald: "bg-emerald-50 text-emerald-800",
                  violet: "bg-violet-50 text-violet-800",
                  blue: "bg-blue-50 text-blue-800",
                  amber: "bg-amber-50 text-amber-800",
                  rose: "bg-rose-50 text-rose-800",
                  cyan: "bg-cyan-50 text-cyan-800",
                  slate: "bg-slate-100 text-slate-700",
                };
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => { setDocumentType(value); setCustomName(false); }}
                    className={cn(
                      "flex min-h-[68px] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition",
                      selected ? "border-[#6da58c] bg-[#edf6f0] ring-2 ring-[#23634f]/10" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", toneClasses[tone])}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-800">{label}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500">{detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="patient-document-name" className="text-sm font-semibold text-slate-900">3. Nom de la pièce</Label>
              <Input
                id="patient-document-name"
                value={documentName}
                onChange={(event) => { setDocumentName(event.target.value); setCustomName(true); }}
                placeholder={selectedType ? `${selectedType.label} · ${patientName}` : "Choisissez d’abord une catégorie"}
                maxLength={140}
                className="h-11 rounded-xl border-slate-200 bg-white"
              />
            </div>
            <div className="pb-1 text-[11px] text-slate-500 sm:text-right">{documentName.length}/140 caractères</div>
          </section>

          {file && (
            <section
              className={cn(
                "overflow-hidden rounded-2xl border transition-colors",
                analyzeAfterUpload ? "border-[#b9d8c7] bg-[linear-gradient(135deg,#f4faf6_0%,#edf6f0_100%)]" : "border-slate-200 bg-white",
              )}
              aria-label="Option de rapport documentaire par IA"
            >
              <label className="flex cursor-pointer items-start gap-3.5 p-4 sm:p-5">
                <span className={cn(
                  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  analyzeAfterUpload ? "bg-[#dceee3] text-[#23634f]" : "bg-slate-100 text-slate-500",
                )}>
                  <Sparkles className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">Lancer l’analyse augmentée par IA</span>
                    <span className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                      analyzeAfterUpload ? "bg-white/80 text-[#23634f]" : "bg-slate-100 text-slate-600",
                    )}>
                      {analyzeAfterUpload ? "Activé par défaut" : "Désactivé"}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-xs leading-relaxed text-slate-600">
                    Un résumé concis, un compte rendu factuel et, si présents, les résultats de laboratoire structurés. Le rapport restera attaché à cette pièce pour les prochaines consultations.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={analyzeAfterUpload}
                  onChange={(event) => setAnalyzeAfterUpload(event.target.checked)}
                  disabled={isUploading}
                  className="mt-1 h-4 w-4 shrink-0 accent-[#23634f]"
                  aria-label="Activer le rapport de lecture IA après l’ajout"
                />
              </label>
              <div className="flex items-start gap-2.5 border-t border-[#d9e9df] bg-white/60 px-4 py-3 text-[11px] leading-relaxed text-slate-600 sm:px-5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#39745e]" />
                <p>
                  {analyzeAfterUpload
                    ? "Si activé, les pages du document seront envoyées à Groq (jusqu’aux 3 premières pages d’un PDF). Le rapport est une aide de lecture non validée : le médecin doit contrôler chaque élément sur l’original. Désactivez cette option si l’envoi externe n’est pas autorisé."
                    : "Aucune page ne sera envoyée à Groq. Le document sera simplement ajouté au dossier."}
                </p>
              </div>
            </section>
          )}

          {formError && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-relaxed text-rose-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{formError}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="hidden items-center gap-1.5 text-[11px] text-slate-500 sm:flex"><LockKeyhole className="h-3.5 w-3.5" />Document chiffré et accessible aux personnes autorisées</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)} disabled={isUploading}>Annuler</Button>
            <Button
              type="button"
              onClick={() => void handleUpload()}
              disabled={!file || !documentType || !documentName.trim() || isUploading}
              className="gap-2 rounded-xl bg-[#23634f] text-white shadow-sm hover:bg-[#194d40]"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : analyzeAfterUpload ? <ScanSearch className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              {isUploading ? "Enregistrement sécurisé…" : analyzeAfterUpload ? "Enregistrer et analyser" : "Enregistrer la pièce"}
              {!isUploading && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
