import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addDays, differenceInYears, parseISO, subDays, subHours, subMinutes, subMonths, subWeeks, subYears } from "date-fns";
import { fr } from "date-fns/locale";
import { format } from "date-fns";
import { Activity, AlertTriangle, ArrowLeft, CalendarClock, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Circle, ClipboardCheck, ClipboardList, Clock3, CreditCard, Droplets, ExternalLink, FileBadge, FileHeart, FileText, Gauge, Heart, HeartPulse, History, PanelRightClose, PanelRightOpen, Phone, Pill, Plus, Printer, Ruler, Save, Scissors, Search, Sparkles, Stethoscope, Thermometer, Trash2, UserRound, Weight, Wind, X } from "lucide-react";
import cabinetMedicalDictionary from "@/data/cabinetMedicalDictionary.json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { EditPrescriptionButton, PrescriptionDialog } from "@/components/PrescriptionDialog";
import { CertificateDialog } from "@/components/CertificateDialog";
import { CertificatePrintDialog } from "@/components/CertificatePrintDialog";
import { PrescriptionPreview } from "@/components/PrescriptionPreview";
import type { Certificate } from "@/hooks/useCertificates";
import type { PrescriptionType } from "@/hooks/usePrescriptions";
import type { FollowUpKind } from "@/hooks/useFollowUpTasks";
import { useAuth } from "@/contexts/AuthContext";
import { formatPatientName, formatPersonName, formatPhoneNumber } from "@/lib/utils";
import { useMedicalRecord } from "@/hooks/useMedicalRecords";
import { ConsultationFields, useCompleteConsultation, useConsultation, useConsultationPricingItems, useLatestPatientConsultation, useSaveConsultation, useSaveConsultationPricing } from "@/hooks/useConsultations";
import { useMedicalActTemplates } from "@/hooks/useMedicalActTemplates";
import { useQueueEntry } from "@/hooks/useQueue";
import { useQueueIntakeContext } from "@/hooks/useQueueIntake";
import { useSettings } from "@/hooks/useSettings";
import { useImportedConsultationMotifs } from "@/hooks/useImportedConsultationMotifs";
import { MEDICAL_SPECIALTIES } from "@/data/specialties";
import { CONSULTATION_CATEGORIES, CONSULTATION_MOTIFS, getConsultationCategoryLabel, getConsultationDocumentationGuide, normalizeConsultationTerm, searchConsultationMotifs, type ConsultationMotifEntry } from "@/data/consultationDictionary";
import { APP_NAVIGATION_EVENT } from "@/lib/appNavigation";
import { getConsultationDefaultModeSettingKey } from "@/lib/consultationPreferences";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const EMPTY_FIELDS: ConsultationFields = {
  motif: "",
  histoire: "",
  examen_clinique: "",
  diagnostic: "",
  plan: "",
};

const countMedicalRecordEntries = (value: string | null | undefined) =>
  value?.split(/\n|•/).map((item) => item.trim()).filter(Boolean).length ?? 0;

interface SelectedMotif {
  id: string | null;
  label: string;
  entry?: ConsultationMotifEntry;
}

interface SelectedMedicalAct {
  lineId: string;
  templateId: string | null;
  label: string;
  category: string;
  unitPrice: number;
  quantity: number;
}

const CONSULTATION_SPECIALTY_TERMS: Record<string, string[]> = {
  general: ["medecine generale", "generaliste"],
  orl: ["orl", "oto rhino"],
  cardiology: ["cardiolog"],
  dermatology: ["dermatolog"],
  ophthalmology: ["ophtalmolog", "ophtalm"],
  pediatrics: ["pediatr"],
  gynecology: ["gynecolog"],
  neurology: ["neurolog"],
  orthopedics: ["orthoped"],
  gastroenterology: ["gastro"],
  pulmonology: ["pneumolog"],
  urology: ["urolog"],
  psychiatry: ["psychiatr"],
  rheumatology: ["rheumatolog"],
  endocrinology: ["endocrinolog"],
  nephrology: ["nephrolog"],
  surgery: ["chirurg"],
};

const findDefaultConsultationAct = (
  acts: { label: string; category: string; unit_price: number | null }[],
  specialtyId: string,
  specialtyName: string,
) => {
  const consultationActs = acts.filter((act) =>
    normalizeConsultationTerm(act.label).includes("consultation"),
  );
  const specialtyTerms = [
    ...(CONSULTATION_SPECIALTY_TERMS[specialtyId] ?? []),
    normalizeConsultationTerm(specialtyName),
  ].filter((term) => term.length > 2);
  const specialtyMatch = consultationActs.find((act) => {
    const searchableText = normalizeConsultationTerm(`${act.label} ${act.category}`);
    return specialtyTerms.some((term) => searchableText.includes(term));
  });
  if (specialtyMatch) return specialtyMatch;

  return consultationActs.find((act) => {
    const label = normalizeConsultationTerm(act.label);
    return label === "consultation"
      || label === "consultation au cabinet"
      || label === "consultation en cabinet"
      || (specialtyId !== "general" && label.includes("medecin specialiste"));
  });
};

type DurationUnit = "minutes" | "hours" | "days" | "weeks" | "months" | "years";
interface DurationInput {
  amount: string;
  unit: DurationUnit;
}

type QuestionResponseType =
  | "onset"
  | "frequency"
  | "episode-duration"
  | "intensity"
  | "onset-mode"
  | "evolution"
  | "yes-no"
  | "unusual"
  | "neurologic-signs"
  | "location"
  | "trigger"
  | "associated-symptoms"
  | "impact"
  | "free-text";

const getQuestionResponseTypes = (question: string): QuestionResponseType[] => {
  const normalized = normalizeConsultationTerm(question);
  const types: QuestionResponseType[] = [];
  if (/\bdepuis quand\b|\bdepuis combien de temps\b|\bdebut\b/.test(normalized)) types.push("onset");
  if (/\bfrequence\b|\bcombien d episodes\b|\bcombien de fois\b|\ba quelle frequence\b/.test(normalized)) types.push("frequency");
  if (/\bcombien de temps dure\b|\bduree de l episode\b|\bduree des episodes\b/.test(normalized)) types.push("episode-duration");
  if (/\bintensite\b|\bsur une echelle\b|\bde 0 a 10\b/.test(normalized)) types.push("intensity");
  if (/\bcomment.*commence\b|\bcomment.*debute\b|\bbrutal\b|\bprogressif\b/.test(normalized)) types.push("onset-mode");
  if (/\binhabituel\b|\binhabituelle\b|\batypique\b/.test(normalized)) types.push("unusual");
  if (/\bsigne neurologique\b|\bsignes neurologiques\b|\bsymptome neurologique\b|\bsymptomes neurologiques\b/.test(normalized)) types.push("neurologic-signs");
  if (/\bevolution\b|\baggrave\b|\bameliore\b|\bstable\b/.test(normalized)) types.push("evolution");
  if (/\by a t il\b|\bexiste t il\b|\bavez vous\b|\best ce\b|\bs agit il\b|\bperte de connaissance\b/.test(normalized)) types.push("yes-no");
  if (/\bou se situe\b|\blocalisation\b|\bquel cote\b|\bquelle region\b/.test(normalized)) types.push("location");
  if (/\bcirconstance\b|\bfacteur declenchant\b|\bdeclenche\b/.test(normalized)) types.push("trigger");
  if (/\bsymptome associe\b|\bsymptomes associes\b|\belement de contexte\b/.test(normalized)) types.push("associated-symptoms");
  if (/\bretentissement\b|\bimpact\b|\bactivite\b|\bsommeil\b/.test(normalized)) types.push("impact");
  return types.length ? types : ["free-text"];
};

type ClinicalSectionKind = "Interrogatoire" | "Examen ciblé" | "Évaluation" | "Conduite à tenir";

interface ClinicalNoteSection {
  kind: ClinicalSectionKind;
  motif: string;
  lines: string[];
}

interface DiagnosisSuggestion {
  key: string;
  label: string;
  replacement: string;
  replaceLength: number;
  detail?: string;
}

const getClinicalDictionarySuggestions = (
  value: string,
  cursor: number,
  includeTreatmentTerms = false,
): DiagnosisSuggestion[] => {
  const beforeCursor = value.slice(0, cursor);
  if (!beforeCursor || /\s$/.test(beforeCursor)) return [];

  const boundary = Math.max(
    beforeCursor.lastIndexOf("\n"),
    beforeCursor.lastIndexOf("."),
    beforeCursor.lastIndexOf("?"),
    beforeCursor.lastIndexOf("!"),
    beforeCursor.lastIndexOf(";"),
  );
  const tail = beforeCursor.slice(boundary + 1).trimStart();
  const currentWord = tail.match(/[^\s]+$/)?.[0] || "";
  const normalizedWord = normalizeConsultationTerm(currentWord);
  if (normalizedWord.length < 2) return [];

  const phraseMatch = tail.match(/\S+(?:\s+\S+){1,4}$/);
  const phrase = phraseMatch?.[0] || "";
  const normalizedPhrase = normalizeConsultationTerm(phrase);
  const ranked: { score: number; suggestion: DiagnosisSuggestion }[] = [];

  for (const entry of cabinetMedicalDictionary) {
    const category = normalizeConsultationTerm(entry.category);
    if (category === "administratif" || (!includeTreatmentTerms && ["traitement", "posologie"].includes(category))) continue;

    const abbreviation = entry.abbreviation.trim();
    const term = entry.term.trim();
    const normalizedAbbreviation = normalizeConsultationTerm(abbreviation);
    const normalizedTerm = normalizeConsultationTerm(term);
    const phraseCompletion = Boolean(
      phraseMatch
      && normalizedPhrase.length >= 4
      && (normalizedAbbreviation.startsWith(normalizedPhrase) || normalizedTerm.startsWith(normalizedPhrase)),
    );
    const termWord = normalizedTerm.split(" ").find((word) => word.startsWith(normalizedWord) && word !== normalizedWord);
    const abbreviationMatch = !normalizedAbbreviation.includes(" ")
      && normalizedAbbreviation.startsWith(normalizedWord);

    if (!phraseCompletion && !abbreviationMatch && !termWord) continue;

    const replacement = term;
    if (normalizeConsultationTerm(replacement) === normalizeConsultationTerm(phraseCompletion ? phrase : currentWord)) continue;

    const label = abbreviationMatch || phraseCompletion
      ? `${abbreviation} → ${term}`
      : term;
    const detail = [entry.category, entry.example].filter(Boolean).join(" · ");
    ranked.push({
      score: phraseCompletion ? 0 : abbreviationMatch ? (normalizedAbbreviation === normalizedWord ? 1 : 2) : termWord === normalizedTerm.split(" ")[0] ? 3 : 4,
      suggestion: {
        key: `${entry.abbreviation}-${entry.term}`,
        label,
        replacement,
        replaceLength: phraseCompletion ? phrase.length : currentWord.length,
        detail,
      },
    });
  }

  return ranked
    .sort((left, right) => left.score - right.score || left.suggestion.label.localeCompare(right.suggestion.label, "fr"))
    .map(({ suggestion }) => suggestion)
    .filter((suggestion, index, suggestions) =>
      suggestions.findIndex((candidate) =>
        normalizeConsultationTerm(candidate.label) === normalizeConsultationTerm(suggestion.label),
      ) === index,
    )
    .slice(0, 6);
};

const parseClinicalSectionHeader = (line: string) => {
  const match = line.match(/^\[\[(Interrogatoire|Examen ciblé|Évaluation|Conduite à tenir)::(.+)\]\]$/);
  return match ? { kind: match[1] as ClinicalSectionKind, motif: match[2] } : null;
};

const splitClinicalNotes = (value: string) => {
  const commonLines: string[] = [];
  const sections: ClinicalNoteSection[] = [];
  let activeSection: ClinicalNoteSection | null = null;
  for (const line of value.split("\n")) {
    const header = parseClinicalSectionHeader(line.trim());
    if (header) {
      activeSection = { ...header, lines: [] };
      sections.push(activeSection);
    } else if (activeSection) {
      activeSection.lines.push(line);
    } else {
      commonLines.push(line);
    }
  }
  return { common: commonLines.join("\n").replace(/\n+$/, ""), sections };
};

const getClinicalSectionText = (value: string, kind: ClinicalSectionKind, motif: string) => {
  const normalizedMotif = normalizeConsultationTerm(motif);
  const section = splitClinicalNotes(value).sections.find((item) =>
    item.kind === kind && normalizeConsultationTerm(item.motif) === normalizedMotif,
  );
  return section?.lines.join("\n") || "";
};

const isStandalonePatientArtifact = (line: string) =>
  /^(?:examen cible\s*)?patient(?:e)?$/.test(normalizeConsultationTerm(line.trim()));

const removeStandalonePatientArtifacts = (value: string) => {
  const { common, sections } = splitClinicalNotes(value);
  const cleanLines = (text: string) => text.split("\n").filter((line) => !isStandalonePatientArtifact(line));
  const cleanedCommon = cleanLines(common).join("\n").trim();
  const serializedSections = sections
    .map((section) => ({
      ...section,
      lines: cleanLines(section.lines.join("\n")),
    }))
    .filter((section) => section.lines.join("\n").trim())
    .map((section) => [`[[${section.kind}::${section.motif}]]`, ...section.lines].join("\n"));
  return [cleanedCommon, ...serializedSections].filter(Boolean).join("\n");
};

const setClinicalSectionText = (
  value: string,
  kind: ClinicalSectionKind,
  motif: string,
  sectionText: string,
) => {
  const { common, sections } = splitClinicalNotes(value);
  const normalizedMotif = normalizeConsultationTerm(motif);
  const matchingIndex = sections.findIndex((section) =>
    section.kind === kind && normalizeConsultationTerm(section.motif) === normalizedMotif,
  );
  if (matchingIndex >= 0) {
    sections[matchingIndex] = { kind, motif, lines: sectionText.split("\n") };
  } else if (sectionText.trim()) {
    sections.push({ kind, motif, lines: sectionText.split("\n") });
  }
  const serializedSections = sections
    .filter((section) => section.lines.join("\n").trim())
    .map((section) => [`[[${section.kind}::${section.motif}]]`, ...section.lines].join("\n"));
  return [common, ...serializedSections].filter(Boolean).join("\n");
};

const setCommonClinicalNotes = (value: string, commonText: string) => {
  const { sections } = splitClinicalNotes(value);
  const serializedSections = sections
    .filter((section) => section.lines.join("\n").trim())
    .map((section) => [`[[${section.kind}::${section.motif}]]`, ...section.lines].join("\n"));
  return [commonText, ...serializedSections].filter((text) => text.length > 0).join("\n");
};

const formatClinicalNotesForDisplay = (value: string) => {
  const { common, sections } = splitClinicalNotes(value);
  return [
    common,
    ...sections
      .filter((section) => section.lines.join("\n").trim())
      .map((section) => `${section.kind} — ${section.motif}\n${section.lines.join("\n").trim()}`),
  ].filter(Boolean).join("\n\n");
};

const getHistoryCategory = (line: string) => {
  const normalized = normalizeConsultationTerm(line);
  if (/anciennete|debut rapporte|caractere inhabituel|signe.*neurologique|date de debut/.test(normalized)) return "Début et évolution";
  if (/frequence|intensite|duree rapportee|evolution rapportee|episode dure/.test(normalized)) return "Fréquence et évolution";
  if (/symptomes presents|reponse rapportee/.test(normalized)) return "Symptômes présents";
  if (/symptomes associes/.test(normalized)) return "Symptômes associés";
  if (/retentissement/.test(normalized)) return "Retentissement";
  return "Notes complémentaires";
};

const buildHistorySynthesis = (value: string) => {
  const grouped = new Map<string, string[]>();
  let activeCategory = "";
  let activeMotif = "";
  const groupedCategory = (category: string) => activeMotif ? `${activeMotif} · ${category}` : category;
  const add = (category: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const rows = grouped.get(category) || [];
    const normalized = normalizeConsultationTerm(trimmed);
    if (!rows.some((row) => normalizeConsultationTerm(row) === normalized)) {
      rows.push(trimmed);
      grouped.set(category, rows);
    }
  };

  for (const rawLine of value.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const sectionHeader = parseClinicalSectionHeader(line);
    if (sectionHeader) {
      activeMotif = sectionHeader.kind === "Interrogatoire" ? sectionHeader.motif : "";
      activeCategory = "";
      continue;
    }
    if (["Début et évolution", "Fréquence et évolution", "Symptômes présents", "Symptômes associés", "Retentissement", "Notes complémentaires"].includes(line)) {
      activeCategory = line;
      continue;
    }
    const separator = line.indexOf(":");
    const prompt = separator >= 0 ? line.slice(0, separator).trim() : "";
    const answer = separator >= 0 ? line.slice(separator + 1).trim() : line;
    const normalizedPrompt = normalizeConsultationTerm(prompt);
    if (prompt && !answer) continue;
    if (prompt && /\?$/.test(prompt) && !answer) continue;
    if (/^debut duree et evolution du motif$/.test(normalizedPrompt) && /anciennete|debut estime/i.test(value)) continue;
    const content = answer || line;
    const normalizedContent = normalizeConsultationTerm(content);
    if (/^intensite(?: rapportee)?\s*:\s*(?:\/\s*10)?\s*\.?$/i.test(line)) continue;
    if (/^symptomes associes$/.test(normalizeConsultationTerm(prompt))) {
      add(groupedCategory("Symptômes associés"), content);
      continue;
    }
    if (/^reponse rapportee$/.test(normalizeConsultationTerm(prompt))) {
      add(groupedCategory("Symptômes présents"), content.replace(/^reponse rapportee\s*:\s*/i, ""));
      continue;
    }
    if (/^Depuis quand|^Quelle est|^Est elle|^Est-il|^Y a-t-il/i.test(prompt) && answer) {
      const answerLines = answer.split(/\n/).filter(Boolean);
      for (const answerLine of answerLines) add(groupedCategory(getHistoryCategory(answerLine)), answerLine);
      continue;
    }
    if (/^(anciennete rapportee|debut rapporte|caractere inhabituel rapporte|signe\(s\) neurologique\(s\) rapporte\(s\)|frequence rapportee|duree rapportee|intensite rapportee|evolution rapportee|symptomes associes rapportes|retentissement rapporte|localisation rapportee|circonstance \/ facteur declenchant rapporte)/.test(normalizedPrompt)) {
      add(groupedCategory(getHistoryCategory(prompt)), line);
      continue;
    }
    if (/^(anciennete rapportee|debut rapporte|caractere inhabituel rapporte|signe\(s\) neurologique\(s\) rapporte\(s\)|frequence rapportee|duree rapportee|intensite rapportee|evolution rapportee|symptomes associes rapportes|retentissement rapporte|localisation rapportee|circonstance \/ facteur declenchant rapporte)/i.test(content)) {
      add(groupedCategory(getHistoryCategory(content)), content);
      continue;
    }
    if (/^symptomes associes\s*:/i.test(content)) {
      add(groupedCategory("Symptômes associés"), content.replace(/^symptomes associes\s*:\s*/i, ""));
      continue;
    }
    if (/^symptomes presents\s*:/i.test(content)) {
      add(groupedCategory("Symptômes présents"), content.replace(/^symptomes presents\s*:\s*/i, ""));
      continue;
    }
    if (/^reponse rapportee\s*:/i.test(content)) {
      add(groupedCategory("Symptômes présents"), content.replace(/^reponse rapportee\s*:\s*/i, ""));
      continue;
    }
    if (/^debut, duree et evolution du motif$/i.test(line) && /anciennete|debut estime/i.test(value)) continue;
    if (/^(depuis quand|quelle est son evolution|est-elle inhabituelle|ou se situe)/i.test(line) && line.endsWith("?")) continue;
    if (normalizedContent) add(groupedCategory(activeCategory || getHistoryCategory(content)), content);
  }

  return [...grouped.entries()];
};

const groupSynthesisByMotif = <T,>(groups: [string, T[]][]) => {
  const motifs = new Map<string, [string, T[]][]>();
  for (const [label, rows] of groups) {
    const separatorIndex = label.indexOf(" · ");
    const motif = separatorIndex >= 0 ? label.slice(0, separatorIndex) : "Commun";
    const category = separatorIndex >= 0 ? label.slice(separatorIndex + 3) : label;
    const categories = motifs.get(motif) || [];
    categories.push([category, rows]);
    motifs.set(motif, categories);
  }
  return [...motifs.entries()];
};

const formatHistorySynthesisRow = (value: string) =>
  value
    .replace(/^Ancienneté rapportée\s*:\s*/i, "Ancienneté : ")
    .replace(/^Début rapporté\s*:\s*/i, "Début : ")
    .replace(/^Caractère inhabituel rapporté\s*:\s*/i, "Caractère inhabituel : ")
    .replace(/^Signe\(s\) neurologique\(s\) rapporté\(s\)\s*:\s*/i, "Signes neurologiques : ")
    .replace(/^Fréquence rapportée\s*:\s*/i, "Fréquence : ")
    .replace(/^Durée rapportée\s*:\s*/i, "Durée : ")
    .replace(/^Intensité rapportée\s*:\s*/i, "Intensité : ")
    .replace(/^Évolution rapportée\s*:\s*/i, "Évolution : ")
    .replace(/^Symptômes associés rapportés\s*:\s*/i, "")
    .replace(/^Symptômes présents\s*:\s*/i, "")
    .replace(/^Retentissement rapporté\s*:\s*/i, "")
    .replace(/\s*\(calculé depuis la consultation du [^)]+\)\.?/i, "")
    .replace(/\.$/, "")
    .replace(/^./, (firstLetter) => firstLetter.toLocaleUpperCase("fr"));

const getExaminationCategory = (prompt: string) => {
  const normalized = normalizeConsultationTerm(prompt);
  if (/constante|temperature|saturation|frequence cardiaque|frequence respiratoire|tension|poids|taille|mesure/.test(normalized)) return "Constantes et mesures";
  if (/resultat|examen complementaire|imagerie|analyse/.test(normalized)) return "Examens complémentaires";
  if (/signe|neurovasculaire|pouls|oedeme|ganglion/.test(normalized)) return "Signes cliniques recherchés";
  if (/etat general|comportement|hydratation|vigilance|orientation/.test(normalized)) return "État général";
  if (/autres constatations|autre constatation/.test(normalized)) return "Autres constatations";
  return "Examen ciblé";
};

interface ExaminationSynthesisRow {
  label: string;
  value: string;
}

const findExaminationEntry = (lines: string[], prompt: string) => {
  const normalizedPrompt = normalizeConsultationTerm(prompt);
  const index = lines.findIndex((line) => {
    const trimmedLine = line.trim();
    if (normalizeConsultationTerm(trimmedLine.slice(0, prompt.length)) !== normalizedPrompt) return false;
    return /^\s*:\s*/.test(trimmedLine.slice(prompt.length));
  });
  if (index < 0) return null;
  const line = lines[index].trim();
  const promptRemainder = line.slice(prompt.length);
  return { index, line, answer: promptRemainder.replace(/^\s*:\s*/, "").trim() };
};

type ExaminationResponseType = "vitals" | "signs" | "laterality" | "results" | "observation";

const getExaminationResponseType = (prompt: string): ExaminationResponseType => {
  const normalized = normalizeConsultationTerm(prompt);
  if (/acuite visuelle|score|evaluation rapportee/.test(normalized)) return "results";
  if (/constante|temperature|saturation|frequence cardiaque|frequence respiratoire|tension|poids|taille|mesure/.test(normalized)) return "vitals";
  if (/signes presents ou absents|signe recherche|present ou absent|signe clinique/.test(normalized)) return "signs";
  if (/droite|gauche|cote|region|localisation|oreille|membre/.test(normalized)) return "laterality";
  if (/resultat|examen complementaire|imagerie|analyse/.test(normalized)) return "results";
  return "observation";
};

const getExaminationDetailTags = (categoryId: string, responseType: ExaminationResponseType) => {
  if (responseType === "results") return ["Examen :", "Date :", "Résultat :"];
  if (responseType !== "observation") return [];
  const tagsByCategory: Record<string, string[]> = {
    ophtalmologie: ["Acuité visuelle :", "Pupilles :", "Mouvements oculaires :", "Autre constatation :"],
    orl: ["Côté :", "Conduit auditif :", "Tympan :", "Nez / gorge :"],
    cardiologie: ["Rythme :", "Auscultation :", "Pouls périphériques :", "Œdèmes :"],
    respiratoire: ["Effort respiratoire :", "Auscultation :", "Saturation :", "Autre constatation :"],
    digestif: ["Inspection :", "Palpation :", "Auscultation :", "Hydratation :"],
    neurologique: ["Vigilance :", "Orientation :", "Force :", "Sensibilité :", "Marche / équilibre :"],
    musculosquelettique: ["Inspection :", "Mobilité :", "Douleur provoquée :", "Examen neurovasculaire :"],
    dermatologie: ["Localisation :", "Aspect :", "Taille :", "Distribution :"],
    gynecologie: ["Examen réalisé :", "Consentement :", "Constatations :", "Résultats disponibles :"],
    urologie: ["Région examinée :", "Inspection :", "Palpation :", "Autre constatation :"],
    pediatrie: ["Comportement :", "Mesures :", "Examen ciblé :", "Informations accompagnant :"],
  };
  return tagsByCategory[categoryId] || ["Inspection :", "Palpation :", "Auscultation :", "Mobilité :", "Autre constatation :"];
};

interface ExaminationQuickResponse {
  label: string;
  value: string;
  recommended?: boolean;
}

interface ExaminationVitalsDraft {
  systolic: string;
  diastolic: string;
  heartRate: string;
  respiratoryRate: string;
  temperature: string;
  oxygenSaturation: string;
  weight: string;
  height: string;
  glucose: string;
  glucoseUnit: string;
}

const EMPTY_EXAMINATION_VITALS: ExaminationVitalsDraft = {
  systolic: "",
  diastolic: "",
  heartRate: "",
  respiratoryRate: "",
  temperature: "",
  oxygenSaturation: "",
  weight: "",
  height: "",
  glucose: "",
  glucoseUnit: "g/L",
};

const formatExaminationVitals = (vitals: ExaminationVitalsDraft) => {
  const values: string[] = [];
  if (vitals.systolic && vitals.diastolic) values.push(`TA : ${vitals.systolic}/${vitals.diastolic} mmHg`);
  else {
    if (vitals.systolic) values.push(`TA systolique : ${vitals.systolic} mmHg`);
    if (vitals.diastolic) values.push(`TA diastolique : ${vitals.diastolic} mmHg`);
  }
  if (vitals.heartRate) values.push(`FC : ${vitals.heartRate} bpm`);
  if (vitals.respiratoryRate) values.push(`FR : ${vitals.respiratoryRate}/min`);
  if (vitals.temperature) values.push(`Température : ${vitals.temperature} °C`);
  if (vitals.oxygenSaturation) values.push(`SpO₂ : ${vitals.oxygenSaturation} %`);
  if (vitals.weight) values.push(`Poids : ${vitals.weight} kg`);
  if (vitals.height) values.push(`Taille : ${vitals.height} cm`);
  if (vitals.glucose) values.push(`Glycémie : ${vitals.glucose} ${vitals.glucoseUnit}`);

  const weight = Number(vitals.weight.replace(",", "."));
  const heightInMeters = Number(vitals.height.replace(",", ".")) / 100;
  if (vitals.weight && vitals.height && weight > 0 && heightInMeters > 0) {
    values.push(`IMC calculé : ${(weight / (heightInMeters * heightInMeters)).toFixed(1)} kg/m²`);
  }
  return values.join(" · ");
};

const parseExaminationVitals = (value: string): ExaminationVitalsDraft => {
  const vitals = { ...EMPTY_EXAMINATION_VITALS };
  const readNumber = (pattern: RegExp) => value.match(pattern)?.[1]?.replace(",", ".") || "";
  const bloodPressure = value.match(/\bTA\s*:\s*(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/i);
  if (bloodPressure) {
    vitals.systolic = bloodPressure[1].replace(",", ".");
    vitals.diastolic = bloodPressure[2].replace(",", ".");
  } else {
    vitals.systolic = readNumber(/\bTA systolique\s*:\s*(\d+(?:[.,]\d+)?)/i);
    vitals.diastolic = readNumber(/\bTA diastolique\s*:\s*(\d+(?:[.,]\d+)?)/i);
  }
  vitals.heartRate = readNumber(/\bFC\s*:\s*(\d+(?:[.,]\d+)?)/i);
  vitals.respiratoryRate = readNumber(/\bFR\s*:\s*(\d+(?:[.,]\d+)?)/i);
  vitals.temperature = readNumber(/Température\s*:\s*(\d+(?:[.,]\d+)?)/i);
  vitals.oxygenSaturation = readNumber(/SpO₂\s*:\s*(\d+(?:[.,]\d+)?)/i);
  vitals.weight = readNumber(/Poids\s*:\s*(\d+(?:[.,]\d+)?)/i);
  vitals.height = readNumber(/Taille\s*:\s*(\d+(?:[.,]\d+)?)/i);
  const glucose = value.match(/Glycémie\s*:\s*(\d+(?:[.,]\d+)?)(?:\s*(g\/L|mmol\/L|mg\/dL))?/i);
  if (glucose) {
    vitals.glucose = glucose[1].replace(",", ".");
    vitals.glucoseUnit = glucose[2] || "g/L";
  }
  return vitals;
};

const EXAMINATION_QUICK_RESPONSES: Record<string, ExaminationQuickResponse[]> = {
  general: [
    { label: "Bon état général", value: "Bon état général.", recommended: true },
    { label: "État général altéré", value: "État général altéré." },
    { label: "Fatigué", value: "Patient fatigué." },
    { label: "Anxieux", value: "Patient anxieux." },
  ],
  vigilance: [
    { label: "Conscient, orienté — GCS 15/15", value: "Conscient et orienté. GCS : 15/15.", recommended: true },
    { label: "Obnubilé", value: "Vigilance diminuée, patient obnubilé." },
    { label: "Confus", value: "Patient confus, orientation à préciser." },
    { label: "GCS à préciser", value: "GCS : /15." },
  ],
  cranialNerves: [
    { label: "R.A.S., symétriques", value: "Nerfs crâniens examinés : pas d’anomalie observée, symétriques.", recommended: true },
    { label: "Atteinte V", value: "Anomalie du nerf crânien V : à préciser." },
    { label: "Atteinte VII", value: "Anomalie du nerf crânien VII : à préciser." },
    { label: "Autre anomalie", value: "Anomalie d’un nerf crânien : à préciser." },
  ],
  strength: [
    { label: "5/5 aux 4 membres", value: "Force cotée à 5/5 aux quatre membres.", recommended: true },
    { label: "Déficit 4/5", value: "Déficit moteur coté à 4/5 : préciser le territoire." },
    { label: "Déficit ≤ 3/5", value: "Déficit moteur coté à 3/5 ou moins : préciser le territoire." },
    { label: "Asymétrique", value: "Force asymétrique : préciser le côté et les groupes musculaires." },
  ],
  sensitivity: [
    { label: "Conservée, symétrique", value: "Sensibilité conservée et symétrique aux territoires examinés.", recommended: true },
    { label: "Hypoesthésie", value: "Hypoesthésie : préciser le territoire et le côté." },
    { label: "Paresthésies", value: "Paresthésies rapportées ou constatées : préciser le territoire." },
    { label: "Anesthésie localisée", value: "Anesthésie localisée : préciser le territoire et le côté." },
  ],
  gait: [
    { label: "Marche normale, Romberg négatif", value: "Marche stable. Romberg négatif.", recommended: true },
    { label: "Trouble de l’équilibre", value: "Trouble de l’équilibre observé : préciser." },
    { label: "Marche instable", value: "Marche instable." },
    { label: "Romberg positif", value: "Romberg positif." },
  ],
  neurological: [
    { label: "Pas d’anomalie observée", value: "Aucune anomalie observée lors des éléments de l’examen neurologique réalisés.", recommended: true },
    { label: "Anomalie motrice", value: "Anomalie motrice : préciser le territoire, le côté et la cotation." },
    { label: "Anomalie sensitive", value: "Anomalie sensitive : préciser le territoire et le côté." },
    { label: "Autre anomalie", value: "Autre anomalie neurologique : préciser." },
  ],
  cardio: [
    { label: "Rythme régulier, B1-B2 perçus", value: "Rythme régulier, bruits du cœur B1-B2 perçus.", recommended: true },
    { label: "Rythme irrégulier", value: "Rythme irrégulier." },
    { label: "Souffle à préciser", value: "Souffle auscultatoire : préciser le foyer et les caractéristiques." },
    { label: "Œdèmes", value: "Œdèmes périphériques : préciser la localisation et le caractère prenant le godet." },
  ],
  respiratory: [
    { label: "Auscultation claire, bilatérale", value: "Murmure vésiculaire perçu bilatéralement, sans bruit surajouté.", recommended: true },
    { label: "Sibilants", value: "Sibilants à l’auscultation : préciser la topographie." },
    { label: "Crépitants", value: "Crépitants à l’auscultation : préciser la topographie." },
    { label: "Diminution du murmure", value: "Murmure vésiculaire diminué : préciser le côté et la topographie." },
  ],
  digestive: [
    { label: "Abdomen souple, non douloureux", value: "Abdomen souple, dépressible et non douloureux à la palpation.", recommended: true },
    { label: "Douleur provoquée", value: "Douleur provoquée à la palpation : préciser la région." },
    { label: "Défense / contracture", value: "Défense ou contracture abdominale : préciser la région." },
    { label: "Distension", value: "Distension abdominale observée." },
  ],
  musculoskeletal: [
    { label: "Mobilité conservée", value: "Mobilité conservée dans les amplitudes examinées.", recommended: true },
    { label: "Mobilité limitée", value: "Limitation de mobilité : préciser l’articulation et les amplitudes." },
    { label: "Douleur à la mobilisation", value: "Douleur à la mobilisation : préciser le mouvement déclencheur." },
    { label: "Gonflement", value: "Gonflement local : préciser la région." },
  ],
  dermatology: [
    { label: "Pas de lésion observée", value: "Aucune lésion cutanée observée sur la zone examinée.", recommended: true },
    { label: "Érythème", value: "Érythème observé : préciser la localisation et l’étendue." },
    { label: "Éruption", value: "Éruption cutanée : préciser l’aspect, la distribution et l’étendue." },
    { label: "Lésion à décrire", value: "Lésion cutanée : préciser la morphologie, la taille et la localisation." },
  ],
  ophtalmology: [
    { label: "Pupilles symétriques et réactives", value: "Pupilles symétriques et réactives à la lumière.", recommended: true },
    { label: "Anisocorie", value: "Anisocorie : préciser le côté et la mesure." },
    { label: "Mouvements oculaires limités", value: "Limitation des mouvements oculaires : préciser la direction." },
    { label: "Acuité à documenter", value: "Acuité visuelle : droite __ / gauche __ (préciser l’échelle)."},
  ],
  orl: [
    { label: "Pas d’anomalie visible", value: "Pas d’anomalie visible sur la région ORL examinée.", recommended: true },
    { label: "Érythème", value: "Érythème de la région examinée : préciser la localisation." },
    { label: "Écoulement", value: "Écoulement observé : préciser le site et l’aspect." },
    { label: "Anomalie du tympan", value: "Anomalie du tympan : préciser le côté et l’aspect." },
  ],
  urology: [
    { label: "Pas de douleur provoquée", value: "Pas de douleur provoquée à la palpation de la région examinée.", recommended: true },
    { label: "Douleur sus-pubienne", value: "Douleur sus-pubienne à la palpation." },
    { label: "Douleur lombaire", value: "Douleur à la percussion lombaire : préciser le côté." },
    { label: "Autre constatation", value: "Constatation urologique : préciser." },
  ],
  pediatrics: [
    { label: "Enfant éveillé, réactif", value: "Enfant éveillé et réactif lors de l’examen.", recommended: true },
    { label: "Fatigué", value: "Enfant fatigué, réactivité à préciser." },
    { label: "Agité / irritable", value: "Enfant agité ou irritable." },
    { label: "Mesures à saisir", value: "Poids : __ kg ; taille : __ cm ; température : __ °C." },
  ],
  endocrinology: [
    { label: "Glycémie à renseigner", value: "Glycémie : __ (unité) ; contexte / heure : __." , recommended: true },
    { label: "Mesure disponible", value: "Mesure : __ (unité) ; date et contexte : __." },
    { label: "Signe clinique observé", value: "Signe clinique : préciser la constatation observée." },
  ],
  psychical: [
    { label: "Contact adapté", value: "Contact adapté au cours de l’entretien.", recommended: true },
    { label: "Humeur anxieuse", value: "Humeur anxieuse rapportée ou observée : préciser." },
    { label: "Humeur triste", value: "Humeur triste rapportée ou observée : préciser." },
    { label: "Discours à décrire", value: "Discours : préciser le débit, la cohérence et les éléments observés." },
  ],
  hematology: [
    { label: "Pas de signe visible", value: "Pas de pâleur ni de saignement visible sur les éléments examinés.", recommended: true },
    { label: "Pâleur", value: "Pâleur cutanéo-muqueuse observée." },
    { label: "Ecchymoses", value: "Ecchymoses observées : préciser la localisation et l’étendue." },
    { label: "Adénopathie", value: "Adénopathie palpée : préciser la localisation et les caractéristiques." },
  ],
  dental: [
    { label: "Pas d’anomalie visible", value: "Pas d’anomalie visible sur les dents, gencives et muqueuses examinées.", recommended: true },
    { label: "Lésion dentaire", value: "Lésion dentaire observée : préciser la dent et l’aspect." },
    { label: "Inflammation gingivale", value: "Inflammation ou saignement gingival : préciser la localisation." },
    { label: "Gonflement", value: "Gonflement bucco-dentaire : préciser la localisation." },
  ],
  trauma: [
    { label: "Pas de douleur provoquée", value: "Pas de douleur provoquée à la palpation de la région examinée.", recommended: true },
    { label: "Ecchymose / œdème", value: "Ecchymose ou œdème observé : préciser la localisation." },
    { label: "Mobilité limitée", value: "Mobilité limitée : préciser la région et les amplitudes." },
    { label: "Examen neurovasculaire", value: "Examen neurovasculaire distal : préciser les constatations." },
  ],
  prevention: [
    { label: "Éléments vérifiés", value: "Éléments de prévention vérifiés : préciser ceux réalisés.", recommended: true },
    { label: "Mesure à documenter", value: "Mesure ou dépistage : préciser le type, la date et le résultat." },
    { label: "Examen ciblé", value: "Examen ciblé réalisé : préciser les constatations observées." },
  ],
  gynecology: [
    { label: "Examen non réalisé", value: "Examen gynécologique non réalisé." },
    { label: "Examen réalisé", value: "Examen gynécologique réalisé ; constatations à préciser." },
    { label: "Résultat à documenter", value: "Résultat d’examen complémentaire : préciser le type, la date et le résultat." },
  ],
};

const getExaminationQuickResponses = (prompt: string, categoryId: string) => {
  const normalizedPrompt = normalizeConsultationTerm(prompt);
  if (/etat general|comportement|hydratation/.test(normalizedPrompt)) {
    return categoryId === "pediatrie" ? EXAMINATION_QUICK_RESPONSES.pediatrics : EXAMINATION_QUICK_RESPONSES.general;
  }
  if (/constante|temperature|saturation|frequence cardiaque|frequence respiratoire|tension|poids|taille|mesure/.test(normalizedPrompt)) return [];
  if (/vigilance|orientation|gcs|conscience/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.vigilance;
  if (/nerf cranien|nerfs craniens/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.cranialNerves;
  if (/force|deficit moteur|motricite/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.strength;
  if (/sensibilite|paresthesie|hypoesthesie/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.sensitivity;
  if (/marche|equilibre|romberg/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.gait;
  if (/auscultation|pouls|oedeme|cardiovasculaire|rythme/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.cardio;
  if (/respiratoire|saturation|pulmonaire|effort respiratoire/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.respiratory;
  if (/abdominal|digestif|palpation|percussion|distension/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.digestive;
  if (/mobilite|amplitude|neurovasculaire|articulation|region et cote/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.musculoskeletal;
  if (/lesion|peau|cutane|eruption|aspect|distribution/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.dermatology;
  if (/acuite visuelle|pupille|mouvement oculaire|oculaire/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.ophtalmology;
  if (/oreille|tympan|conduit auditif|nez|gorge|ganglion|orl/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.orl;
  if (/urinaire|urolog|lombaire|sus pubienne/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.urology;
  if (/gynecolog|consentement/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.gynecology;
  if (/enfant|pediatr|mesures disponibles/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.pediatrics;
  if (/dentaire|dent|gingiv|buccal/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.dental;
  if (/traumatis|blessure|fracture/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.trauma;
  if (/glycem|endocrin|metabol/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.endocrinology;
  if (/humeur|discours|contact|psych/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.psychical;
  if (/hemat|ecchymose|saignement|paleur|ganglion/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.hematology;
  if (/prevention|depistage/.test(normalizedPrompt)) return EXAMINATION_QUICK_RESPONSES.prevention;
  if (categoryId === "neurologique") return EXAMINATION_QUICK_RESPONSES.neurological;
  if (categoryId === "cardiologie") return EXAMINATION_QUICK_RESPONSES.cardio;
  if (categoryId === "respiratoire") return EXAMINATION_QUICK_RESPONSES.respiratory;
  if (categoryId === "digestif") return EXAMINATION_QUICK_RESPONSES.digestive;
  if (categoryId === "musculosquelettique") return EXAMINATION_QUICK_RESPONSES.musculoskeletal;
  if (categoryId === "dermatologie") return EXAMINATION_QUICK_RESPONSES.dermatology;
  if (categoryId === "ophtalmologie") return EXAMINATION_QUICK_RESPONSES.ophtalmology;
  if (categoryId === "orl") return EXAMINATION_QUICK_RESPONSES.orl;
  if (categoryId === "urologie") return EXAMINATION_QUICK_RESPONSES.urology;
  if (categoryId === "gynecologie") return EXAMINATION_QUICK_RESPONSES.gynecology;
  if (categoryId === "pediatrie") return EXAMINATION_QUICK_RESPONSES.pediatrics;
  if (categoryId === "endocrinologie") return EXAMINATION_QUICK_RESPONSES.endocrinology;
  if (categoryId === "psychique") return EXAMINATION_QUICK_RESPONSES.psychical;
  if (categoryId === "hematologie") return EXAMINATION_QUICK_RESPONSES.hematology;
  if (categoryId === "dentaire") return EXAMINATION_QUICK_RESPONSES.dental;
  if (categoryId === "traumatisme") return EXAMINATION_QUICK_RESPONSES.trauma;
  if (categoryId === "prevention") return EXAMINATION_QUICK_RESPONSES.prevention;
  return EXAMINATION_QUICK_RESPONSES.general;
};

const hasUnresolvedExaminationPrompt = (value: string) =>
  /(?:^|\b)(?:a\s+)?(?:preciser|specifier|renseigner|completer|documenter)\b/.test(normalizeConsultationTerm(value));

const buildExaminationSynthesis = (value: string) => {
  const grouped = new Map<string, ExaminationSynthesisRow[]>();
  const headers = ["Constantes et mesures", "État général", "Examen ciblé", "Signes cliniques recherchés", "Examens complémentaires", "Autres constatations"];
  let activeCategory = "";
  let activeMotif = "";
  for (const rawLine of value.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (isStandalonePatientArtifact(line)) continue;
    const sectionHeader = parseClinicalSectionHeader(line);
    if (sectionHeader) {
      activeMotif = sectionHeader.kind === "Examen ciblé" ? sectionHeader.motif : "";
      activeCategory = "";
      continue;
    }
    if (headers.includes(line)) {
      activeCategory = line;
      continue;
    }
    const savedVitals = line.match(/^Constantes(?: et mesures)?\s*:\s*(.+)$/i);
    if (savedVitals) {
      const category = activeMotif ? `${activeMotif} · Constantes et mesures` : "Constantes et mesures";
      const rows = grouped.get(category) || [];
      const measures = savedVitals[1].trim();
      if (!rows.some((row) => normalizeConsultationTerm(row.value) === normalizeConsultationTerm(measures))) {
        rows.push({ label: "", value: measures });
        grouped.set(category, rows);
      }
      continue;
    }
    const spacedSeparator = line.lastIndexOf(" : ");
    const separator = spacedSeparator >= 0 ? spacedSeparator : line.indexOf(":");
    if (separator < 0) {
      const baseCategory = activeCategory || getExaminationCategory(line);
      const category = activeMotif ? `${activeMotif} · ${baseCategory}` : baseCategory;
      const rows = grouped.get(category) || [];
      rows.push({ label: "", value: line });
      grouped.set(category, rows);
      continue;
    }
    const sourcePrefix = line.slice(0, separator).trimEnd();
    const abdominalPromptMatch = line.match(/^(Examen abdominal\s*:\s*inspection,\s*palpation et autres manœuvres réalisées)\s*:\s*(.*)$/i);
    const sourceValue = abdominalPromptMatch?.[2]?.trim()
      || line.slice(separator + (spacedSeparator >= 0 ? 3 : 1)).trim();
    let label = abdominalPromptMatch
      ? "Examen abdominal"
      : sourcePrefix.replace(/:\s*.*$/, "").trim();
    let observation = sourceValue;
    if (!observation) continue;
    const normalizedLabel = normalizeConsultationTerm(label);
    const isAbdominalPrompt = normalizedLabel.includes("examen abdominal");
    const isAbdominalFinding = /abdominal|distension|douleur provoquee|defense|contracture/.test(normalizedLabel);
    if (isAbdominalPrompt) {
      observation = observation.replace(/^inspection,\s*palpation et autres manœuvres réalisées\s*:\s*/i, "").trim();
    }
    const normalizedObservation = normalizeConsultationTerm(observation);
    if (/^(preciser|a preciser|specifier|a specifier)\b/.test(normalizedObservation)) continue;
    if (/^(douleur provoquee a la palpation|defense ou contracture abdominale)\s*:?\s*preciser\b/.test(normalizedObservation)) continue;

    if (isAbdominalPrompt) {
      const embeddedFinding = observation.match(/^(distension abdominale|défense ou contracture abdominale|douleur provoquée à la palpation)\s*:?\s*(.*)$/i);
      if (embeddedFinding) {
        const findingLabel = normalizeConsultationTerm(embeddedFinding[1]);
        label = findingLabel.startsWith("distension")
          ? "Distension"
          : findingLabel.startsWith("defense")
            ? "Défense / contracture"
            : "Douleur provoquée";
        observation = embeddedFinding[2].trim() || (findingLabel.startsWith("distension") ? "Observée" : "");
      } else if (/^abdomen\b/i.test(observation)) {
        label = "Palpation";
      } else if (/^douleur\b/i.test(observation)) {
        label = "";
        observation = observation.replace(/^douleur\b/i, "Douleur");
      } else {
        label = "Constatation";
      }
    } else if (isAbdominalFinding) {
      if (normalizedLabel.startsWith("distension")) label = "Distension";
      else if (normalizedLabel.startsWith("defense") || normalizedLabel.startsWith("contracture")) label = "Défense / contracture";
      else if (normalizedLabel.startsWith("douleur provoquee")) label = "Douleur provoquée";
    }
    if (!observation) continue;
    const baseCategory = isAbdominalPrompt || isAbdominalFinding ? "Examen abdominal" : activeCategory || getExaminationCategory(label);
    const category = activeMotif ? `${activeMotif} · ${baseCategory}` : baseCategory;
    const rows = grouped.get(category) || [];
    const normalizedRow = normalizeConsultationTerm(`${label} ${observation}`);
    if (!rows.some((row) => normalizeConsultationTerm(`${row.label} ${row.value}`) === normalizedRow)) {
      rows.push({ label, value: observation });
      grouped.set(category, rows);
    }
  }
  return [...grouped.entries()];
};

const getConsultationLoadErrorMessage = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return "Le serveur n’a pas renvoyé de détail sur l’erreur.";
  }

  const errorCode = "code" in error ? String(error.code) : "";

  if (errorCode === "PGRST205" || errorCode === "42P01") {
    return "La table consultations n’est pas disponible dans Supabase. Appliquez la migration 20261003160535_create_consultations.sql, puis rechargez cette page.";
  }

  if (errorCode === "42501" || errorCode === "PGRST301") {
    return "Supabase a refusé l’accès à cette consultation. Vérifiez les droits et la politique RLS de la table consultations.";
  }

  return `Erreur Supabase${errorCode ? ` (${errorCode})` : ""}. Vérifiez la connexion et la configuration de la table consultations.`;
};

const CLINICAL_WRITING_SUGGESTIONS = [
  "patient consulte pour", "patient souffre de", "patient se plaint de",
  "patient présente", "patient rapporte", "patient décrit", "patient signale",
  "patient évoque", "patient nie",
  "patient", "patiente", "patients", "patientes", "souffre", "souffrant", "souffrance",
  "présente", "présent", "présentant", "décrit", "décrit une", "rapporte", "rapporte une",
  "consulte pour", "se plaint de", "absence de", "à l’examen", "douleur", "céphalée", "maux de tête", "vertiges", "nausées", "vomissements",
  "fièvre", "toux", "essoufflement", "dyspnée", "palpitations", "œdème",
  "rougeur", "éruption cutanée", "démangeaisons", "prurit", "sensibilité",
  "mobilité", "amplitude articulaire", "tuméfaction", "sensibilité abdominale",
  "auscultation", "palpation", "inspection", "examen neurologique",
  "conscience", "hydratation", "coloration", "symétrie", "sans particularité",
];

const QUESTION_PASTEL_STYLES = [
  { card: "border-sky-200 bg-gradient-to-br from-sky-50 to-white", number: "border-sky-200 bg-sky-100 text-sky-800" },
  { card: "border-violet-200 bg-gradient-to-br from-violet-50 to-white", number: "border-violet-200 bg-violet-100 text-violet-800" },
  { card: "border-amber-200 bg-gradient-to-br from-amber-50 to-white", number: "border-amber-200 bg-amber-100 text-amber-800" },
  { card: "border-teal-200 bg-gradient-to-br from-teal-50 to-white", number: "border-teal-200 bg-teal-100 text-teal-800" },
];

const VITAL_ICONS = {
  systolic: HeartPulse,
  diastolic: HeartPulse,
  heartRate: Heart,
  respiratoryRate: Wind,
  temperature: Thermometer,
  oxygenSaturation: Droplets,
  weight: Weight,
  height: Ruler,
  glucose: Gauge,
} as const;

const EXAMINATION_PROMPT_ICONS: Record<ExaminationResponseType, typeof Activity> = {
  vitals: Activity,
  signs: HeartPulse,
  laterality: Circle,
  results: FileText,
  observation: Stethoscope,
};

interface ClinicalWritingTextareaProps {
  id?: string;
  includeTreatmentTerms?: boolean;
  enterSeparator?: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  "aria-label"?: string;
}

const ClinicalWritingTextarea = forwardRef<HTMLTextAreaElement, ClinicalWritingTextareaProps>(
  ({ id, includeTreatmentTerms = false, enterSeparator, value, onChange, onFocus, disabled, placeholder, rows = 3, "aria-label": ariaLabel }, forwardedRef) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const pendingCaretRef = useRef<number | null>(null);
    const [activeSuggestion, setActiveSuggestion] = useState(-1);
    const [tokenRange, setTokenRange] = useState<{ start: number; end: number; query: string } | null>(null);

    const suggestions = useMemo(() => {
      if (!tokenRange || tokenRange.query.length < 2) return [];
      const query = normalizeConsultationTerm(tokenRange.query);
      const writingSuggestions = CLINICAL_WRITING_SUGGESTIONS
        .filter((suggestion) => {
          const normalized = normalizeConsultationTerm(suggestion);
          return normalized.startsWith(query) && normalized !== query;
        })
        .map((suggestion) => ({
          key: `writing-${suggestion}`,
          label: suggestion,
          replacement: suggestion,
          start: tokenRange.start,
          end: tokenRange.end,
        }));
      const dictionarySuggestions = getClinicalDictionarySuggestions(value, tokenRange.end, includeTreatmentTerms)
        .map((suggestion) => ({
          ...suggestion,
          start: tokenRange.end - suggestion.replaceLength,
          end: tokenRange.end,
        }));
      const phraseWritingSuggestions = writingSuggestions.filter((suggestion) => suggestion.replacement.includes(" "));
      const wordWritingSuggestions = writingSuggestions.filter((suggestion) => !suggestion.replacement.includes(" "));
      return [...phraseWritingSuggestions, ...dictionarySuggestions, ...wordWritingSuggestions]
        .filter((suggestion, index, all) =>
          all.findIndex((candidate) =>
            normalizeConsultationTerm(candidate.replacement) === normalizeConsultationTerm(suggestion.replacement),
          ) === index,
        )
        .slice(0, 6);
    }, [includeTreatmentTerms, tokenRange, value]);

    const updateTokenRange = (text: string, caret: number) => {
      const beforeCaret = text.slice(0, caret);
      const token = beforeCaret.match(/[\p{L}\p{M}'’-]+$/u)?.[0] || "";
      const afterCaret = text.slice(caret).match(/^[\p{L}\p{M}'’-]*/u)?.[0] || "";
      setTokenRange(token.length >= 2 ? { start: caret - token.length, end: caret + afterCaret.length, query: token } : null);
      setActiveSuggestion(-1);
    };

    const applySuggestion = (suggestion: (typeof suggestions)[number]) => {
      const currentValue = textareaRef.current?.value ?? value;
      const suffix = currentValue.slice(suggestion.end);
      const existingSeparator = suffix.match(/^\s+/)?.[0] || "";
      const separator = !existingSeparator && suffix.length === 0 && !/\s$/.test(suggestion.replacement) ? " " : "";
      const insertedText = `${suggestion.replacement}${separator}`;
      const nextValue = `${currentValue.slice(0, suggestion.start)}${insertedText}${suffix}`;
      const caret = suggestion.start + insertedText.length + existingSeparator.length;
      pendingCaretRef.current = caret;
      onChange(nextValue);
      setTokenRange(null);
      setActiveSuggestion(-1);
    };

    useEffect(() => {
      const caret = pendingCaretRef.current;
      const textarea = textareaRef.current;
      if (caret === null || !textarea) return;
      pendingCaretRef.current = null;
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    }, [value]);

    return (
      <div className="relative">
        <Textarea
          id={id}
          ref={(element) => {
            textareaRef.current = element;
            if (typeof forwardedRef === "function") forwardedRef(element);
            else if (forwardedRef) forwardedRef.current = element;
          }}
          rows={rows}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-controls="clinical-writing-suggestions"
          aria-activedescendant={activeSuggestion >= 0 ? `clinical-writing-option-${activeSuggestion}` : undefined}
          onFocus={onFocus}
          onChange={(event) => {
            const { value: nextValue, selectionStart } = event.currentTarget;
            onChange(nextValue);
            updateTokenRange(nextValue, selectionStart);
          }}
          onKeyUp={(event) => {
            if (event.key.length === 1 && !/\s/.test(event.key)) {
              updateTokenRange(event.currentTarget.value, event.currentTarget.selectionStart);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && enterSeparator && !(suggestions.length && activeSuggestion >= 0)) {
              event.preventDefault();
              const textarea = event.currentTarget;
              const { selectionStart, selectionEnd } = textarea;
              const beforeCursor = textarea.value.slice(0, selectionStart);
              const afterCursor = textarea.value.slice(selectionEnd);
              const trimmedBefore = beforeCursor.trimEnd();
              if (!trimmedBefore && !afterCursor.trim()) {
                event.preventDefault();
                return;
              }
              const separator = trimmedBefore.endsWith(",") ? " " : enterSeparator;
              const insertion = trimmedBefore ? separator : "";
              const nextValue = `${trimmedBefore}${insertion}${afterCursor.trimStart()}`;
              const caret = trimmedBefore.length + insertion.length;
              pendingCaretRef.current = caret;
              onChange(nextValue);
              setTokenRange(null);
              setActiveSuggestion(-1);
              return;
            }
            if (!suggestions.length) return;
            if (event.key === "Tab") {
              event.preventDefault();
              if (activeSuggestion >= 0) applySuggestion(suggestions[activeSuggestion]);
              else setActiveSuggestion(0);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveSuggestion((index) => (index + 1) % suggestions.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveSuggestion((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
            } else if ((event.key === "Enter" || event.key === " ") && activeSuggestion >= 0) {
              event.preventDefault();
              applySuggestion(suggestions[activeSuggestion]);
            } else if (event.key === "Escape") {
              setTokenRange(null);
              setActiveSuggestion(-1);
            } else if (/\s/.test(event.key)) {
              setTokenRange(null);
              setActiveSuggestion(-1);
            }
          }}
        />
        {suggestions.length > 0 && !disabled && (
          <div
            id="clinical-writing-suggestions"
            role="listbox"
            aria-label="Suggestions de rédaction"
            className="absolute inset-x-0 top-full z-30 mt-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
          >
            <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              <Sparkles className="mr-1 inline h-3 w-3" />Formulations médicales · Tab puis Entrée pour compléter
            </p>
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.key}
                id={`clinical-writing-option-${index}`}
                type="button"
                role="option"
                aria-selected={activeSuggestion === index}
                className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${
                  activeSuggestion === index ? "bg-teal-50 text-teal-900" : "text-slate-700 hover:bg-slate-50"
                }`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  applySuggestion(suggestion);
                }}
              >
                <span>{suggestion.label}</span>
                {suggestion.detail && <span className="ml-2 text-xs font-normal text-slate-500">{suggestion.detail}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
);
ClinicalWritingTextarea.displayName = "ClinicalWritingTextarea";

const Consultation = () => {
  const { queueId } = useParams<{ queueId: string }>();
  const navigate = useNavigate();
  const { currentUser, sessionToken } = useAuth();
  const {
    data: entry,
    isLoading: queueLoading,
    isError: queueError,
    refetch: refetchQueueEntry,
  } = useQueueEntry(queueId);
  const patientId = entry?.patient_id;
  const {
    data: intakeContext,
    isLoading: intakeLoading,
    isError: intakeError,
    refetch: refetchIntake,
  } = useQueueIntakeContext(queueId);
  const {
    data: medicalRecord,
    isLoading: recordLoading,
    isError: recordError,
    refetch: refetchMedicalRecord,
  } = useMedicalRecord(patientId);
  const {
    data: consultation,
    isLoading: consultationLoading,
    isError: consultationError,
    error: consultationLoadError,
    refetch: refetchConsultation,
  } = useConsultation(queueId);
  const {
    data: consultationPricingDetails,
    isLoading: consultationPricingLoading,
    isError: consultationPricingError,
    error: consultationPricingErrorDetail,
    refetch: refetchConsultationPricing,
  } = useConsultationPricingItems(queueId);
  const {
    data: medicalActTemplates,
    isLoading: medicalActTemplatesLoading,
    isError: medicalActTemplatesError,
    error: medicalActTemplatesErrorDetail,
    refetch: refetchMedicalActTemplates,
  } = useMedicalActTemplates();
  const {
    data: latestPatientContext,
    isLoading: latestPatientConsultationLoading,
    isError: latestPatientConsultationError,
  } = useLatestPatientConsultation(patientId, entry?.created_at);
  const latestPatientConsultation = latestPatientContext?.consultation ?? null;
  const latestPatientPrescriptions = latestPatientContext?.prescriptions ?? [];
  const antecedentCount = countMedicalRecordEntries(medicalRecord?.antecedents);
  const treatmentCount = medicalRecord?.traitements_structures.filter((medication) => medication.status === "active").length ?? 0;
  const isCompleted = consultation?.status === "completed";
  const saveConsultation = useSaveConsultation();
  const saveConsultationAsync = saveConsultation.mutateAsync;
  const completeConsultation = useCompleteConsultation();
  const savePricing = useSaveConsultationPricing();
  const {
    settings,
    updateSetting,
    isLoading: settingsLoading,
    isError: settingsLoadError,
    error: settingsLoadErrorDetail,
  } = useSettings();
  const [fields, setFields] = useState<ConsultationFields>(EMPTY_FIELDS);
  const [diagnosisSuggestionsOpen, setDiagnosisSuggestionsOpen] = useState(false);
  const diagnosisTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const [hasStarted, setHasStarted] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [activeClinicalStep, setActiveClinicalStep] = useState<1 | 2>(1);
  const [isSimplifiedMode, setIsSimplifiedMode] = useState(false);
  const [modePreferenceLoadedForVisit, setModePreferenceLoadedForVisit] = useState<string | null>(null);
  const [isClinicalSidebarOpen, setIsClinicalSidebarOpen] = useState(true);
  const [createdPrescriptions, setCreatedPrescriptions] = useState<{ id: string; type: PrescriptionType; items: string[] }[]>([]);
  const [createdCertificates, setCreatedCertificates] = useState<Certificate[]>([]);
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [certificatePreviewOpen, setCertificatePreviewOpen] = useState(false);
  const [prescriptionPreviewId, setPrescriptionPreviewId] = useState<string | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const prescriptionCreated = createdPrescriptions.length > 0;
  const certificateCreated = createdCertificates.length > 0;
  const [grossAmount, setGrossAmount] = useState(0);
  const [selectedMedicalActs, setSelectedMedicalActs] = useState<SelectedMedicalAct[]>([]);
  const [medicalActSearch, setMedicalActSearch] = useState("");
  const pricingLineCounterRef = useRef(0);
  const createPricingLineId = () => `pricing-line-${Date.now()}-${++pricingLineCounterRef.current}`;
  const pricingInitializedForQueueRef = useRef<string | null>(null);
  const [settlementInstruction, setSettlementInstruction] = useState<"due_at_reception" | "deferred" | "free">("due_at_reception");
  const [followUpDecision, setFollowUpDecision] = useState<"undecided" | "none" | "planned">("none");
  const followUpEnabled = followUpDecision === "planned";
  const [followUpKind, setFollowUpKind] = useState<FollowUpKind | null>(null);
  const [followUpDueDate, setFollowUpDueDate] = useState("");
  const [followUpInstruction, setFollowUpInstruction] = useState("");
  const [followUpDestination, setFollowUpDestination] = useState("");
  const [followUpSpecialty, setFollowUpSpecialty] = useState("");
  const [followUpContactName, setFollowUpContactName] = useState("");
  const followUpNeedsDate = followUpKind === "control" || followUpKind === "exam";
  const followUpInvalid = followUpEnabled && (
    !followUpKind
    || (followUpNeedsDate && !followUpDueDate)
    || (!!followUpDueDate && followUpDueDate < format(new Date(), "yyyy-MM-dd"))
    || (followUpKind === "referral" && !followUpSpecialty)
    || (followUpKind === "surgery" && !followUpDestination.trim())
  );
  const [discountType, setDiscountType] = useState<"none" | "percentage" | "fixed">("none");
  const [discountInput, setDiscountInput] = useState("");
  const [selectedMotifs, setSelectedMotifs] = useState<SelectedMotif[]>([]);
  const [durationInputs, setDurationInputs] = useState<Record<string, DurationInput>>({});
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [questionUnits, setQuestionUnits] = useState<Record<string, string>>({});
  const [editingQuestionKey, setEditingQuestionKey] = useState<string | null>(null);
  const [questionNoteDraft, setQuestionNoteDraft] = useState("");
  const [editingExaminationPromptKey, setEditingExaminationPromptKey] = useState<string | null>(null);
  const [expandedHistoryQuestionKey, setExpandedHistoryQuestionKey] = useState<string | null>(null);
  const examTextareaRef = useRef<HTMLTextAreaElement>(null);
  const quickMotifInputRef = useRef<HTMLTextAreaElement>(null);
  const completeMotifInputRef = useRef<HTMLInputElement>(null);
  const patientSummaryRef = useRef<HTMLDivElement>(null);
  const stickyPatientSummaryRef = useRef<HTMLDivElement>(null);
  const [showStickyPatientSummary, setShowStickyPatientSummary] = useState(false);
  const [stickyPatientSummaryHeight, setStickyPatientSummaryHeight] = useState(0);
  const loadedConsultationIdRef = useRef<string | null>(null);
  const lastSavedFieldsRef = useRef<string | null>(null);
  const [draftSaveState, setDraftSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [closureErrorMessage, setClosureErrorMessage] = useState<string | null>(null);
  const [closureErrorDetail, setClosureErrorDetail] = useState<string | null>(null);
  const [closureFailureStage, setClosureFailureStage] = useState<"saving" | "pricing" | "finalizing" | null>(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  const [appHeaderHeight, setAppHeaderHeight] = useState(56);
  const headerRef = useRef<HTMLElement | null>(null);
  const saveInFlightRef = useRef<Promise<Awaited<ReturnType<typeof saveConsultationAsync>> | null> | null>(null);
  const lastSavedConsultationRef = useRef<Awaited<ReturnType<typeof saveConsultationAsync>> | null>(null);
  const [examinationAnswers, setExaminationAnswers] = useState<Record<string, string>>({});
  const [examinationStatuses, setExaminationStatuses] = useState<Record<string, "not-assessed" | "not-performed">>({});
  const [examinationSides, setExaminationSides] = useState<Record<string, string>>({});
  const [examinationVitals, setExaminationVitals] = useState<Record<string, ExaminationVitalsDraft>>({});
  const [motifQuery, setMotifQuery] = useState("");
  const [activeMotifId, setActiveMotifId] = useState<string | null>(null);
  const [motifCategory, setMotifCategory] = useState("all");
  const {
    data: importedMotifs = [],
    isFetching: importedMotifsLoading,
    isError: importedMotifsError,
  } = useImportedConsultationMotifs(motifQuery, motifCategory);

  useEffect(() => {
    const patientSummary = patientSummaryRef.current;
    if (!patientSummary) return;

    const observer = new IntersectionObserver(
      ([intersection]) => setShowStickyPatientSummary(!intersection.isIntersecting),
      { rootMargin: `-${appHeaderHeight + headerHeight}px 0px 0px 0px` },
    );
    observer.observe(patientSummary);
    return () => observer.disconnect();
  }, [appHeaderHeight, entry?.id, headerHeight]);

  useEffect(() => {
    const stickySummary = stickyPatientSummaryRef.current;
    if (!showStickyPatientSummary || !stickySummary) {
      setStickyPatientSummaryHeight(0);
      return;
    }

    setStickyPatientSummaryHeight(Math.ceil(stickySummary.getBoundingClientRect().height));
    const observer = new ResizeObserver(([resizeEntry]) => {
      setStickyPatientSummaryHeight(Math.ceil(resizeEntry.contentRect.height));
    });
    observer.observe(stickySummary);
    return () => observer.disconnect();
  }, [showStickyPatientSummary, entry?.patient_id]);

  useEffect(() => {
    if (consultation?.queue_id === queueId && loadedConsultationIdRef.current !== consultation.id) {
      loadedConsultationIdRef.current = consultation.id;
      const savedFields = {
        motif: consultation.motif || "",
        histoire: consultation.histoire || "",
        examen_clinique: consultation.examen_clinique || "",
        diagnostic: consultation.diagnostic || "",
        plan: consultation.plan || "",
      };
      lastSavedFieldsRef.current = JSON.stringify(savedFields);
      lastSavedConsultationRef.current = consultation;
      setFields(savedFields);
      setDraftSaveState("saved");
      setDraftSavedAt(new Date(consultation.updated_at));
      const savedMotifs = (consultation.motif || "")
        .split("\n")
        .map((label) => label.trim())
        .filter(Boolean)
        .map((label) => {
          const normalizedLabel = normalizeConsultationTerm(label);
          const entry = CONSULTATION_MOTIFS.find((motif) =>
            [motif.label, ...motif.synonyms].some((term) => normalizeConsultationTerm(term) === normalizedLabel),
          );
          return { id: entry?.id || `custom:${normalizedLabel}`, label, entry };
        });
      setSelectedMotifs(savedMotifs);
      const activeMotif = [...savedMotifs].reverse().find((motif) => motif.id);
      setActiveMotifId(activeMotif?.id || null);
      const activeEntry = activeMotif?.entry || CONSULTATION_MOTIFS.find((motif) => motif.id === activeMotif?.id);
      setMotifCategory(activeEntry?.categoryId || (activeMotif ? "general" : "all"));
      setHasStarted(true);
    }
  }, [consultation, queueId]);

  const changeWorkflowStep = useCallback((nextStep: 1 | 2 | 3) => {
    if (nextStep === activeStep) return;
    setActiveStep(nextStep);
  }, [activeStep]);

  const changeClinicalStep = useCallback((nextStep: 1 | 2) => {
    if (nextStep === activeClinicalStep) return;
    setActiveClinicalStep(nextStep);
  }, [activeClinicalStep]);

  const updateSimpleMotifs = (value: string) => {
    const nextMotifs = [...new Set(value.split("\n").map((label) => label.trim()).filter(Boolean))]
      .map((label): SelectedMotif => {
        const normalizedLabel = normalizeConsultationTerm(label);
        const entry = CONSULTATION_MOTIFS.find((motif) =>
          [motif.label, ...motif.synonyms].some((term) => normalizeConsultationTerm(term) === normalizedLabel),
        );
        return { id: entry?.id || `custom:${normalizedLabel}`, label, entry };
      });
    setSelectedMotifs(nextMotifs);
    setActiveMotifId(nextMotifs[nextMotifs.length - 1]?.id || null);
    setFields((currentFields) => ({ ...currentFields, motif: value }));
  };

  const updateSimpleClinicalNotes = (
    field: "histoire" | "examen_clinique" | "diagnostic" | "plan",
    value: string,
  ) => {
    setFields((currentFields) => ({
      ...currentFields,
      [field]: setCommonClinicalNotes(currentFields[field] || "", value),
    }));
  };

  useEffect(() => {
    if (!currentUser?.id || !queueId || settingsLoading) return;
    const visitPreferenceKey = `${currentUser.id}:${queueId}`;
    if (modePreferenceLoadedForVisit === visitPreferenceKey) return;
    const defaultModeKey = getConsultationDefaultModeSettingKey(currentUser.id);
    if (settingsLoadError) {
      console.error("Unable to load the clinician's default consultation mode; using complete mode.", settingsLoadErrorDetail);
    }
    const savedDefaultMode = settingsLoadError
      ? "complete"
      : settings?.find((setting) => setting.key === defaultModeKey)?.value;
    setIsSimplifiedMode(savedDefaultMode === "simple");
    setModePreferenceLoadedForVisit(visitPreferenceKey);
  }, [currentUser?.id, modePreferenceLoadedForVisit, queueId, settings, settingsLoadError, settingsLoadErrorDetail, settingsLoading]);

  useEffect(() => {
    if (!hasStarted || activeStep !== 1 || isCompleted) return;
    const frame = window.requestAnimationFrame(() => {
      const field = isSimplifiedMode
        ? quickMotifInputRef.current
        : activeClinicalStep === 1
          ? completeMotifInputRef.current
          : examTextareaRef.current;
      field?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeClinicalStep, activeStep, hasStarted, isCompleted, isSimplifiedMode, queueId]);

  const patient = entry?.patients;
  const patientName = formatPatientName(patient?.nom, patient?.prenom);
  const recordedAllergies = medicalRecord?.allergies?.trim() || "";
  const reportedAllergies = intakeContext?.current_intake?.allergies_reported?.trim() || "";
  const hasPatientAllergies = Boolean(recordedAllergies || reportedAllergies);
  const allergyEntriesMatch = Boolean(
    recordedAllergies
    && reportedAllergies
    && normalizeConsultationTerm(recordedAllergies) === normalizeConsultationTerm(reportedAllergies),
  );
  const allergyAlertText = allergyEntriesMatch
    ? `Dossier et signalement du jour · à valider : ${recordedAllergies}`
    : [
        recordedAllergies ? `Dossier : ${recordedAllergies}` : "",
        reportedAllergies ? `Signalées aujourd’hui · à valider : ${reportedAllergies}` : "",
      ].filter(Boolean).join(" · ");
  const allergyStatusText = [
    allergyAlertText,
    !recordedAllergies && recordError ? "Dossier médical indisponible" : "",
    !reportedAllergies && intakeError ? "Transmission infirmière indisponible" : "",
    !hasPatientAllergies && !recordError && !intakeError && (recordLoading || intakeLoading)
      ? "Vérification du statut allergique…"
      : "",
    !hasPatientAllergies && !recordLoading && !intakeLoading && !recordError && !intakeError
      ? "Non renseignées · statut à vérifier"
      : "",
  ].filter(Boolean).join(" · ");
  const patientSexLabel = patient?.sexe === "F"
    ? "Femme"
    : patient?.sexe === "M"
      ? "Homme"
      : null;
  const age = useMemo(() => {
    if (!patient?.date_naissance) return null;
    try {
      return differenceInYears(new Date(), parseISO(patient.date_naissance));
    } catch {
      return null;
    }
  }, [patient?.date_naissance]);
  const savedCustomPrices = useMemo(() => {
    const value = settings?.find((setting) => setting.key === "consultation_custom_prices")?.value;
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? [...new Set(parsed.filter((amount): amount is number => typeof amount === "number" && Number.isFinite(amount) && amount > 0))]
        : [];
    } catch (error) {
      console.error("Invalid saved consultation price list:", error);
      return [];
    }
  }, [settings]);
  const availableMedicalActs = useMemo(
    () => (medicalActTemplates ?? []).filter(
      (template) => template.is_active && template.unit_price !== null && Number.isFinite(Number(template.unit_price)),
    ),
    [medicalActTemplates],
  );
  const defaultConsultationAct = useMemo(() => {
    const specialtyId = settings?.find((setting) => setting.key === "cabinet_specialty_id")?.value ?? "";
    const specialtyName = settings?.find((setting) => setting.key === "cabinet_specialty")?.value ?? "";
    return findDefaultConsultationAct(availableMedicalActs, specialtyId, specialtyName);
  }, [availableMedicalActs, settings]);
  const filteredMedicalActs = useMemo(() => {
    const search = medicalActSearch.trim().toLocaleLowerCase("fr");
    if (!search) return availableMedicalActs;
    return availableMedicalActs.filter((template) =>
      `${template.label} ${template.category} ${template.ngap_code ?? ""}`.toLocaleLowerCase("fr").includes(search),
    );
  }, [availableMedicalActs, medicalActSearch]);
  const medicalActsTotal = Math.round(
    selectedMedicalActs.reduce((total, act) => total + Math.round(act.unitPrice * act.quantity * 100) / 100, 0) * 100,
  ) / 100;
  const invoiceGrossAmount = Math.round((grossAmount + medicalActsTotal) * 100) / 100;
  const discountValue = Number(discountInput) || 0;
  const discountAmount = discountType === "percentage"
    ? Math.round(invoiceGrossAmount * Math.min(discountValue, 100)) / 100
    : discountType === "fixed"
      ? Math.min(discountValue, invoiceGrossAmount)
      : 0;
  const finalAmount = settlementInstruction === "free" ? 0 : Math.max(0, invoiceGrossAmount - discountAmount);
  const formatMoney = (amount: number) => `${amount.toLocaleString("fr-MA", { maximumFractionDigits: 2 })} DH`;

  useEffect(() => {
    if (!entry || !sessionToken || consultationPricingLoading || consultationPricingError
      || medicalActTemplatesLoading || settingsLoading
      || pricingInitializedForQueueRef.current === entry.id) return;

    const savedConsultationAmount = consultationPricingDetails?.consultationAmount;
    const legacyConsultationAmount = Number(entry.montant_consultation ?? 0);
    const initialConsultationAmount = savedConsultationAmount !== null && savedConsultationAmount !== undefined
      ? savedConsultationAmount > 0
        ? savedConsultationAmount
        : Number(defaultConsultationAct?.unit_price ?? 0)
      : legacyConsultationAmount > 0
        ? legacyConsultationAmount
        : Number(defaultConsultationAct?.unit_price ?? 0);
    setGrossAmount(initialConsultationAmount);
    setSelectedMedicalActs((consultationPricingDetails?.items ?? []).map((item, index) => {
      const template = medicalActTemplates?.find((candidate) => candidate.id === item.templateId);
      return {
        lineId: item.templateId ? `catalog-${item.templateId}` : `saved-custom-${index}`,
        templateId: item.templateId,
        label: item.description,
        category: template?.category ?? "Acte enregistré",
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      };
    }));
    if (entry.invoices?.consigne_reglement) {
      setSettlementInstruction(entry.invoices.consigne_reglement);
    }
    if (entry.invoices?.reduction_type === "percentage" || entry.invoices?.reduction_type === "fixed") {
      setDiscountType(entry.invoices.reduction_type);
      setDiscountInput(String(entry.invoices.reduction_valeur || 0));
    }
    pricingInitializedForQueueRef.current = entry.id;
  }, [
    consultationPricingDetails,
    consultationPricingError,
    consultationPricingLoading,
    defaultConsultationAct,
    entry,
    medicalActTemplates,
    medicalActTemplatesLoading,
    sessionToken,
    settingsLoading,
  ]);

  const removeCimProposalLines = (text: string, motifs: SelectedMotif[]) => {
    const generatedProposals = new Set(
      motifs.flatMap((motif) => {
        const code = motif.entry?.code || CONSULTATION_MOTIFS.find((entry) => entry.id === motif.id)?.code;
        return [
          `Proposition CIM-11 à valider : ${motif.label}${code ? ` (${code})` : ""}`,
          `Proposition CIM-11 à valider : ${motif.label}`,
        ].map(normalizeConsultationTerm);
      }),
    );
    return text
      .split("\n")
      .filter((line) => !generatedProposals.has(normalizeConsultationTerm(line)))
      .join("\n");
  };
  const synthesisSections = [
    { title: "Motif", value: fields.motif, icon: ClipboardList, color: "blue" },
    { title: "Interrogatoire", value: fields.histoire, icon: HeartPulse, color: "teal" },
    { title: "Examen clinique", value: fields.examen_clinique, icon: Activity, color: "emerald" },
    { title: "Évaluation et diagnostic", value: formatClinicalNotesForDisplay(removeCimProposalLines(fields.diagnostic, selectedMotifs)), icon: FileHeart, color: "amber" },
    { title: "Conduite à tenir", value: formatClinicalNotesForDisplay(fields.plan), icon: ClipboardCheck, color: "violet" },
  ];
  const selectedMotif = selectedMotifs.find((entry) => entry.id === activeMotifId)?.entry
    || CONSULTATION_MOTIFS.find((entry) => entry.id === activeMotifId)
    || (selectedMotifs.find((entry) => entry.id === activeMotifId)
      ? {
          id: activeMotifId || "custom",
          categoryId: "general",
          label: selectedMotifs.find((entry) => entry.id === activeMotifId)!.label,
          synonyms: [],
          symptomSuggestions: [],
          questions: [
            "Depuis quand ce problème est-il présent et comment a-t-il évolué ?",
            "Quels symptômes ou circonstances sont associés ?",
            "Quel est son retentissement sur les activités ?",
          ],
        }
      : null)
    || null;
  const cim11Proposals = selectedMotifs.flatMap((motif) => {
    const dictionaryEntry = motif.entry || CONSULTATION_MOTIFS.find((entry) => entry.id === motif.id);
    return dictionaryEntry?.code
        ? [{ motif: motif.label, code: dictionaryEntry.code, sourceUrl: dictionaryEntry.sourceUrl }]
        : [];
  });
  const getSynthesisCompletion = (section: (typeof synthesisSections)[number]) => {
    if (section.title === "Interrogatoire") return buildHistorySynthesis(section.value).length > 0;
    if (section.title === "Examen clinique") return buildExaminationSynthesis(section.value).length > 0;
    return Boolean(section.value.trim());
  };
  const reviewCompletionCount = synthesisSections.filter(getSynthesisCompletion).length;
  const evaluationNote = selectedMotif
    ? removeCimProposalLines(getClinicalSectionText(fields.diagnostic, "Évaluation", selectedMotif.label), [selectedMotif])
    : splitClinicalNotes(fields.diagnostic).common;
  const contextualDiagnosisSuggestions: DiagnosisSuggestion[] = evaluationNote.trim()
    ? []
    : (selectedMotif?.symptomSuggestions || []).slice(0, 5).map((suggestion) => ({
        key: `motif-${suggestion}`,
        label: suggestion,
        replacement: suggestion,
        replaceLength: 0,
        detail: "Suggestion pour ce motif",
      }));
  const visibleDiagnosisSuggestions = contextualDiagnosisSuggestions;
  const documentationGuide = selectedMotif ? getConsultationDocumentationGuide(selectedMotif) : null;
  const guidedExaminationPrompts = (documentationGuide?.examination || []).filter((prompt) => {
    const normalizedPrompt = normalizeConsultationTerm(prompt);
    return !/\b(constantes?|mesures? mesurees|aspect general|etat general|hydratation)\b/.test(normalizedPrompt);
  });
  const historyPrompts = documentationGuide?.history || [];
  const answeredHistoryCount = selectedMotif
    ? historyPrompts.filter((prompt) => {
        const existingPromptLine = getClinicalSectionText(fields.histoire || "", "Interrogatoire", selectedMotif.label).split("\n").find(
          (line) => normalizeConsultationTerm(line.split(":")[0]) === normalizeConsultationTerm(prompt),
        );
        return Boolean(existingPromptLine?.split(":").slice(1).join(":").trim());
      }).length
    : 0;
  const staticMotifs = searchConsultationMotifs(motifQuery, motifCategory);
  const staticMotifLabels = new Set(staticMotifs.map((entry) => normalizeConsultationTerm(entry.label)));
  const uniqueImportedMotifs = importedMotifs.filter((entry) => !staticMotifLabels.has(normalizeConsultationTerm(entry.label)));
  const visibleStaticMotifs = uniqueImportedMotifs.length > 0 ? staticMotifs.slice(0, 3) : staticMotifs;
  const motifSuggestions = [
    ...visibleStaticMotifs,
    ...uniqueImportedMotifs,
  ].filter((entry) => !selectedMotifs.some((selected) => selected.id === entry.id));

  const commitMotifs = (nextMotifs: SelectedMotif[]) => {
    setSelectedMotifs(nextMotifs);
    setFields((currentFields) => ({ ...currentFields, motif: nextMotifs.map((motif) => motif.label).join("\n") }));
  };

  const addMotif = (entry: ConsultationMotifEntry) => {
    if (selectedMotifs.some((motif) => motif.id === entry.id)) return;
    commitMotifs([...selectedMotifs, { id: entry.id, label: entry.label, entry }]);
    setActiveMotifId(entry.id);
    setMotifCategory(entry.categoryId);
    setMotifQuery("");
  };

  const addCustomMotif = () => {
    const label = motifQuery.trim();
    if (!label || selectedMotifs.some((motif) => normalizeConsultationTerm(motif.label) === normalizeConsultationTerm(label))) return;
    const customId = `custom:${normalizeConsultationTerm(label)}`;
    commitMotifs([...selectedMotifs, { id: customId, label }]);
    setActiveMotifId(customId);
    setMotifQuery("");
  };

  const addDocumentationPrompt = (field: "histoire" | "examen_clinique", prompt: string) => {
    if (!selectedMotif) return;
    const kind = field === "histoire" ? "Interrogatoire" : "Examen ciblé";
    setFields((currentFields) => {
      const currentText = getClinicalSectionText(currentFields[field] || "", kind, selectedMotif.label);
      const alreadyAdded = currentText
        .split("\n")
        .some((line) => normalizeConsultationTerm(line.split(":")[0]) === normalizeConsultationTerm(prompt));
      if (alreadyAdded) return currentFields;
      const nextLine = `${prompt} : `;
      return {
        ...currentFields,
        [field]: setClinicalSectionText(currentFields[field] || "", kind, selectedMotif.label, [currentText.trimEnd(), nextLine].filter(Boolean).join("\n")),
      };
    });
  };

  const addQuestionAnswer = (prompt: string, answer: string) => {
    if (!selectedMotif) return;
    setFields((currentFields) => {
      const currentSection = getClinicalSectionText(currentFields.histoire || "", "Interrogatoire", selectedMotif.label);
      const answerParts = answer.split("\n").map((line) => line.trim()).filter(Boolean);
      const normalizedAnswerParts = new Set(answerParts.map(normalizeConsultationTerm));
      const lines = currentSection.split("\n").filter((line) =>
        !normalizedAnswerParts.has(normalizeConsultationTerm(line.trim())),
      );
      const promptLineIndex = lines.findIndex(
        (line) => normalizeConsultationTerm(line.split(":")[0]) === normalizeConsultationTerm(prompt),
      );
      const nextLine = `${prompt}: ${answer.replace(/\s*\n\s*/g, " · ").trim()}`;
      if (promptLineIndex >= 0) {
        lines[promptLineIndex] = nextLine;
      } else {
        lines.push(nextLine);
      }
      return {
        ...currentFields,
        histoire: setClinicalSectionText(currentFields.histoire || "", "Interrogatoire", selectedMotif.label, lines.join("\n").trim()),
      };
    });
  };

  const saveQuestionNoteEdit = (prompt: string, editedAnswer: string) => {
    if (!selectedMotif || !editedAnswer.trim()) return;
    const normalizedAnswer = editedAnswer.replace(/\s*\n\s*/g, " · ").trim();
    setFields((currentFields) => {
      const currentSection = getClinicalSectionText(currentFields.histoire || "", "Interrogatoire", selectedMotif.label);
      const lines = currentSection.split("\n");
      const promptLineIndex = lines.findIndex(
        (line) => normalizeConsultationTerm(line.split(":")[0]) === normalizeConsultationTerm(prompt),
      );
      const updatedLine = `${prompt}: ${normalizedAnswer}`;
      if (promptLineIndex >= 0) lines[promptLineIndex] = updatedLine;
      else lines.push(updatedLine);
      return {
        ...currentFields,
        histoire: setClinicalSectionText(currentFields.histoire || "", "Interrogatoire", selectedMotif.label, lines.join("\n").trim()),
      };
    });
    setEditingQuestionKey(null);
    setExpandedHistoryQuestionKey(null);
  };

  const removeQuestionAnswer = (prompt: string, savedAnswer: string) => {
    if (!selectedMotif) return;
    const normalizedAnswerParts = new Set(
      savedAnswer.split(" · ").map((part) => normalizeConsultationTerm(part.trim())).filter(Boolean),
    );
    const categoryLabels = new Set([
      "Début et évolution",
      "Fréquence et évolution",
      "Symptômes associés",
      "Retentissement",
      "Notes complémentaires",
    ]);
    setFields((currentFields) => {
      const currentSection = getClinicalSectionText(currentFields.histoire || "", "Interrogatoire", selectedMotif.label);
      const lines = currentSection.split("\n").filter((line) => {
        const normalizedLine = normalizeConsultationTerm(line.trim());
        const isPromptAnswer = normalizeConsultationTerm(line.split(":")[0]) === normalizeConsultationTerm(prompt);
        return !isPromptAnswer && !normalizedAnswerParts.has(normalizedLine);
      });
      for (let index = lines.length - 1; index >= 0; index -= 1) {
        if (!categoryLabels.has(lines[index].trim())) continue;
        const nextCategoryIndex = lines.findIndex((line, lineIndex) => lineIndex > index && categoryLabels.has(line.trim()));
        const groupEnd = nextCategoryIndex === -1 ? lines.length : nextCategoryIndex;
        if (!lines.slice(index + 1, groupEnd).some((line) => line.trim())) lines.splice(index, 1);
      }
      return {
        ...currentFields,
        histoire: setClinicalSectionText(currentFields.histoire || "", "Interrogatoire", selectedMotif.label, lines.join("\n").trim()),
      };
    });
    const keyPrefix = `${selectedMotif.label}::${prompt}:`;
    setQuestionAnswers((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(keyPrefix))));
    setQuestionUnits((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(keyPrefix))));
    setDurationInputs((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(keyPrefix))));
    setEditingQuestionKey(null);
    setQuestionNoteDraft("");
    setExpandedHistoryQuestionKey(null);
  };

  const updateExaminationVital = (prompt: string, key: keyof ExaminationVitalsDraft, value: string) => {
    setExaminationStatuses((current) => {
      const next = { ...current };
      delete next[prompt];
      return next;
    });
    setExaminationVitals((current) => ({
      ...current,
      [prompt]: {
        ...(current[prompt] || parseExaminationVitals(
          findExaminationEntry(splitClinicalNotes(fieldsRef.current.examen_clinique || "").common.split("\n"), "Constantes")?.answer
            || findExaminationEntry(splitClinicalNotes(fieldsRef.current.examen_clinique || "").common.split("\n"), "Constantes et mesures")?.answer
            || "",
        )),
        [key]: value,
      },
    }));
  };

  const addExaminationAnswer = (prompt: string, answer: string, shared = false) => {
    if (!selectedMotif && !shared) return;
    setFields((currentFields) => {
      const currentSection = shared
        ? splitClinicalNotes(currentFields.examen_clinique || "").common
        : getClinicalSectionText(currentFields.examen_clinique || "", "Examen ciblé", selectedMotif!.label);
      const lines = currentSection.split("\n");
      const existingEntry = findExaminationEntry(lines, prompt)
        || (shared && normalizeConsultationTerm(prompt) === "constantes"
          ? findExaminationEntry(lines, "Constantes et mesures")
          : null);
      if (existingEntry) {
        lines.splice(existingEntry.index, 1);
      }
      const category = getExaminationCategory(prompt);
      let categoryIndex = lines.findIndex((line) => line.trim() === category);
      if (categoryIndex < 0) {
        lines.push(category);
        categoryIndex = lines.length - 1;
      }
      const entry = `${prompt} : ${answer}`;
      const nextSectionIndex = lines.findIndex((line, index) =>
        index > categoryIndex && [
          "Constantes et mesures",
          "État général",
          "Examen ciblé",
          "Signes cliniques recherchés",
          "Examens complémentaires",
          "Autres constatations",
        ].includes(line.trim()),
      );
      if (nextSectionIndex >= 0) lines.splice(nextSectionIndex, 0, entry);
      else lines.splice(categoryIndex + 1, 0, entry);
      const updatedText = lines.join("\n").trim();
      return {
        ...currentFields,
        examen_clinique: shared
          ? setCommonClinicalNotes(currentFields.examen_clinique || "", updatedText)
          : setClinicalSectionText(currentFields.examen_clinique || "", "Examen ciblé", selectedMotif!.label, updatedText),
      };
    });
  };

  const removeSharedExaminationAnswer = (prompt: string) => {
    setFields((currentFields) => {
      const currentText = currentFields.examen_clinique || "";
      const commonText = splitClinicalNotes(currentText).common;
      const lines = commonText.split("\n");
      const entry = findExaminationEntry(lines, prompt)
        || (normalizeConsultationTerm(prompt) === "constantes"
          ? findExaminationEntry(lines, "Constantes et mesures")
          : null);
      if (!entry) return currentFields;
      lines.splice(entry.index, 1);
      const categoryHeaders = ["Constantes et mesures", "État général", "Examen ciblé", "Signes cliniques recherchés", "Examens complémentaires", "Autres constatations"];
      for (let index = lines.length - 1; index >= 0; index -= 1) {
        if (!categoryHeaders.includes(lines[index].trim())) continue;
        const nextHeaderIndex = lines.findIndex((line, lineIndex) => lineIndex > index && categoryHeaders.includes(line.trim()));
        const categoryEnd = nextHeaderIndex < 0 ? lines.length : nextHeaderIndex;
        if (!lines.slice(index + 1, categoryEnd).some((line) => line.trim())) lines.splice(index, 1);
      }
      return {
        ...currentFields,
        examen_clinique: setCommonClinicalNotes(currentText, lines.join("\n").trim()),
      };
    });
    if (normalizeConsultationTerm(prompt) === "constantes") {
      setExaminationVitals((current) => ({ ...current, Constantes: EMPTY_EXAMINATION_VITALS }));
    }
  };

  const updateGuidedExaminationAnswer = (prompt: string, answer: string | null) => {
    if (!selectedMotif) return;
    setFields((currentFields) => {
      const currentText = currentFields.examen_clinique || "";
      const sectionText = getClinicalSectionText(currentText, "Examen ciblé", selectedMotif.label);
      const lines = sectionText.split("\n");
      const existingEntry = findExaminationEntry(lines, prompt);
      if (!existingEntry) return currentFields;
      if (answer === null) {
        lines.splice(existingEntry.index, 1);
        const categoryHeaders = ["Constantes et mesures", "État général", "Examen ciblé", "Signes cliniques recherchés", "Examens complémentaires", "Autres constatations"];
        for (let index = lines.length - 1; index >= 0; index -= 1) {
          if (!categoryHeaders.includes(lines[index].trim())) continue;
          const nextHeaderIndex = lines.findIndex((line, lineIndex) => lineIndex > index && categoryHeaders.includes(line.trim()));
          const categoryEnd = nextHeaderIndex < 0 ? lines.length : nextHeaderIndex;
          if (!lines.slice(index + 1, categoryEnd).some((line) => line.trim())) lines.splice(index, 1);
        }
      } else {
        const normalizedAnswer = answer.replace(/\s*\n\s*/g, " · ").trim();
        if (!normalizedAnswer) return currentFields;
        lines[existingEntry.index] = `${prompt} : ${normalizedAnswer}`;
      }
      const nextSection = lines.join("\n").trim();
      return {
        ...currentFields,
        examen_clinique: setClinicalSectionText(currentText, "Examen ciblé", selectedMotif.label, nextSection),
      };
    });
    const draftKey = `${selectedMotif.label}::${prompt}`;
    setExaminationAnswers((current) => ({ ...current, [draftKey]: "" }));
    setEditingExaminationPromptKey(null);
  };

  const removeMotif = (label: string) => {
    const nextMotifs = selectedMotifs.filter((motif) => motif.label !== label);
    commitMotifs(nextMotifs);
    if (!nextMotifs.some((motif) => motif.id === activeMotifId)) {
      const nextActiveMotif = nextMotifs[0];
      setActiveMotifId(nextActiveMotif?.id || null);
      const nextEntry = nextActiveMotif?.entry || CONSULTATION_MOTIFS.find((entry) => entry.id === nextActiveMotif?.id);
      setMotifCategory(nextEntry?.categoryId || (nextActiveMotif ? "general" : "all"));
    }
  };

  const toggleSuggestedSymptom = (symptom: string) => {
    if (!selectedMotif) return;
    setFields((currentFields) => {
    const history = getClinicalSectionText(currentFields.histoire || "", "Interrogatoire", selectedMotif.label);
    const marker = "Symptômes associés : ";
    const lines = history.split("\n");
    const markerIndex = lines.findIndex((line) => line.startsWith(marker));
    if (markerIndex === -1) {
      return {
        ...currentFields,
        histoire: setClinicalSectionText(currentFields.histoire || "", "Interrogatoire", selectedMotif.label, [history, `${marker}${symptom}`].filter(Boolean).join("\n")),
      };
    }

    const symptoms = lines[markerIndex].slice(marker.length).split(",").map((value) => value.trim()).filter(Boolean);
    const nextSymptoms = symptoms.includes(symptom)
      ? symptoms.filter((value) => value !== symptom)
      : [...symptoms, symptom];
    if (nextSymptoms.length) {
      lines[markerIndex] = `${marker}${nextSymptoms.join(", ")}`;
    } else {
      lines.splice(markerIndex, 1);
    }
    return {
      ...currentFields,
      histoire: setClinicalSectionText(currentFields.histoire || "", "Interrogatoire", selectedMotif.label, lines.join("\n").trim()),
    };
    });
  };

  const save = useCallback(async (status: "in_progress" | "completed" = "in_progress", silent = false) => {
    if (!entry || !currentUser) return null;
    if (saveInFlightRef.current) {
      try {
        await saveInFlightRef.current;
      } catch {
        // Continue with the newest snapshot after a failed earlier autosave.
      }
    }
    const fieldsToSave = fieldsRef.current;
    const fieldsSnapshot = JSON.stringify(fieldsToSave);
    if (
      status === "in_progress"
      && fieldsSnapshot === lastSavedFieldsRef.current
      && lastSavedConsultationRef.current
    ) {
      return lastSavedConsultationRef.current;
    }

    setDraftSaveState("saving");
    const saveRequest = saveConsultationAsync({
      id: consultation?.id || lastSavedConsultationRef.current?.id,
      queueId: entry.id,
      patientId: entry.patient_id,
      userId: currentUser.id,
      fields: fieldsToSave,
      status,
      silent,
    });
    saveInFlightRef.current = saveRequest;
    try {
      const result = await saveRequest;
      lastSavedFieldsRef.current = fieldsSnapshot;
      lastSavedConsultationRef.current = result;
      setDraftSaveState("saved");
      setDraftSavedAt(new Date(result.updated_at));
      setHasStarted(true);
      return result;
    } catch (error) {
      setDraftSaveState("error");
      throw error;
    } finally {
      if (saveInFlightRef.current === saveRequest) saveInFlightRef.current = null;
    }
  }, [consultation?.id, currentUser, entry, saveConsultationAsync]);

  const navigateAfterSaving = useCallback(async (
    destination: string,
    navigationState?: { appNavigation: true; appBack: boolean; restoreScroll: boolean; useHistoryBack?: boolean },
  ) => {
    const navigateToDestination = () => {
      if (navigationState?.useHistoryBack && Number(window.history.state?.idx) > 0) {
        navigate(-1);
        return;
      }
      navigate(destination, navigationState ? { state: navigationState } : undefined);
    };
    if (!hasStarted || isCompleted) {
      navigateToDestination();
      return;
    }
    while (JSON.stringify(fieldsRef.current) !== lastSavedFieldsRef.current || saveInFlightRef.current) {
      try {
        const saved = await save("in_progress");
        if (!saved) return;
      } catch {
        return;
      }
    }
    navigateToDestination();
  }, [hasStarted, isCompleted, navigate, save]);

  useEffect(() => {
    const handleAppNavigation = (event: Event) => {
      const { to, isBack } = (event as CustomEvent<{ to: string; isBack?: boolean }>).detail;
      if (to) void navigateAfterSaving(to, {
        appNavigation: true,
        appBack: isBack === true,
        restoreScroll: isBack === true,
        useHistoryBack: isBack === true,
      });
    };
    window.addEventListener(APP_NAVIGATION_EVENT, handleAppNavigation);
    return () => window.removeEventListener(APP_NAVIGATION_EVENT, handleAppNavigation);
  }, [navigateAfterSaving]);

  useEffect(() => {
    if (!hasStarted || isCompleted || !entry || !currentUser || consultationLoading || consultationError || saveConsultation.isPending) return;

    const fieldsSnapshot = JSON.stringify(fields);
    if (fieldsSnapshot === lastSavedFieldsRef.current) return;

    const timer = window.setTimeout(() => {
      void save("in_progress", true).catch(() => {
        setDraftSaveState("error");
      });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [consultationError, consultationLoading, currentUser, entry, fields, hasStarted, isCompleted, save, saveConsultation.isPending]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasStarted || isCompleted || JSON.stringify(fields) === lastSavedFieldsRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [fields, hasStarted, isCompleted]);

  const handleComplete = async () => {
    if (!entry) return;
    if ((settlementInstruction !== "free" && invoiceGrossAmount <= 0)
      || invoiceGrossAmount > 1000000
      || (settlementInstruction === "deferred" && finalAmount <= 0)
      || discountValue < 0
      || (discountType === "percentage" && discountValue > 100)
      || (discountType === "fixed" && discountValue > invoiceGrossAmount)
      || consultationPricingLoading
      || consultationPricingError) {
      return;
    }
    if (followUpDecision === "undecided") {
      return;
    }
    if (followUpInvalid) {
      return;
    }
    setClosureErrorMessage(null);
    setClosureErrorDetail(null);
    setClosureFailureStage(null);
    let failureStage: "saving" | "pricing" | "finalizing" = "saving";
    try {
      failureStage = "saving";
      setClosureFailureStage(failureStage);
      let savedConsultation = await save();
      if (!savedConsultation) {
        setClosureFailureStage(null);
        return;
      }
      failureStage = "pricing";
      setClosureFailureStage(failureStage);
      await savePricing.mutateAsync({
        queueId: entry.id,
        consultationAmount: grossAmount,
        discountType,
        discountValue: discountType === "none" ? 0 : discountValue,
        settlementInstruction,
        items: selectedMedicalActs.map((act) => ({
          templateId: act.templateId,
          description: act.label,
          quantity: act.quantity,
          unitPrice: act.unitPrice,
        })),
      });
      if (JSON.stringify(fieldsRef.current) !== lastSavedFieldsRef.current) {
        failureStage = "finalizing";
        setClosureFailureStage(failureStage);
        const latestSavedConsultation = await save();
        if (!latestSavedConsultation) {
          setClosureFailureStage(null);
          return;
        }
        savedConsultation = latestSavedConsultation;
      }
      failureStage = "finalizing";
      setClosureFailureStage(failureStage);
      await completeConsultation.mutateAsync({
        consultationId: savedConsultation.id,
        followUp: followUpEnabled && followUpKind
          ? {
              dueDate: followUpDueDate || null,
              kind: followUpKind,
              instruction: followUpInstruction,
              destination: followUpDestination || null,
              specialty: followUpSpecialty || null,
              contactName: followUpContactName.trim() || null,
            }
          : null,
        followUpNone: followUpDecision === "none",
      });
      setClosureFailureStage(null);
      navigate("/file-attente");
    } catch (error) {
      console.error("Unable to complete consultation:", error);
      const databaseError = typeof error === "object" && error !== null
        ? error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown }
        : null;
      const errorDetail = [
        databaseError?.code,
        databaseError?.message,
        databaseError?.details,
        databaseError?.hint,
      ]
        .filter((part): part is string | number => typeof part === "string" || typeof part === "number")
        .map(String)
        .filter(Boolean)
        .join(" — ");
      setClosureErrorDetail(errorDetail || (error instanceof Error ? error.message : "Aucun détail technique renvoyé."));
      const [consultationResult, queueResult] = await Promise.all([
        refetchConsultation(),
        refetchQueueEntry(),
      ]);
      if (consultationResult.data?.status === "completed" && queueResult.data?.status === "completed") {
        setClosureFailureStage(null);
        navigate("/file-attente");
        return;
      }
      setClosureErrorMessage(
        failureStage === "finalizing"
          ? "Le tarif a été enregistré, mais la clôture n’a pas été confirmée. Réessayez : la facture existante sera mise à jour, sans en créer une nouvelle."
          : failureStage === "pricing"
            ? "La consultation est enregistrée, mais le tarif ou la clôture n’a pas abouti. Vérifiez les étapes puis réessayez."
            : "La clôture n’a pas abouti. Vérifiez votre connexion et réessayez.",
      );
    }
  };
  const handleCompleteRef = useRef(handleComplete);
  handleCompleteRef.current = handleComplete;

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const updateHeight = () => setHeaderHeight(Math.ceil(header.getBoundingClientRect().height));
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, [entry, patient]);

  useEffect(() => {
    const appHeader = document.querySelector<HTMLElement>("[data-app-topbar]");
    if (!appHeader) return;
    const updateHeight = () => setAppHeaderHeight(Math.ceil(appHeader.getBoundingClientRect().height));
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(appHeader);
    return () => observer.disconnect();
  }, []);

  const continueFromConsultation = useCallback(async (): Promise<boolean> => {
    if (isCompleted) {
      changeWorkflowStep(2);
      return true;
    }
    try {
      const saved = await save();
      if (!saved) return false;
      changeWorkflowStep(2);
      return true;
    } catch (error) {
      console.error("Unable to save consultation before continuing:", error);
      return false;
    }
  }, [changeWorkflowStep, isCompleted, save]);

  const advanceClinicalStep = useCallback(async () => {
    if (activeClinicalStep === 2) {
      await continueFromConsultation();
      return;
    }
    if (isCompleted) {
      changeClinicalStep(2);
      return;
    }
    try {
      const saved = await save();
      if (saved) changeClinicalStep(2);
    } catch (error) {
      console.error("Unable to save consultation before continuing:", error);
    }
  }, [activeClinicalStep, changeClinicalStep, continueFromConsultation, isCompleted, save]);

  const addCustomInvoiceLine = (label: string, unitPrice: number) => {
    if (selectedMedicalActs.length >= 29) return;
    setSelectedMedicalActs((current) => [
      ...current,
      {
        lineId: createPricingLineId(),
        templateId: null,
        label,
        category: "Prestation personnalisée",
        unitPrice,
        quantity: 1,
      },
    ]);
  };

  const addCustomPrice = async () => {
    const amount = Number(medicalActSearch.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return;
    const nextPrices = [...new Set([...savedCustomPrices, amount])].sort((a, b) => a - b);
    try {
      await updateSetting.mutateAsync({
        key: "consultation_custom_prices",
        value: JSON.stringify(nextPrices),
      });
    } catch (error) {
      console.error("Unable to save custom consultation price:", error);
    }
  };

  const handleStepNavigation = async (nextStep: 1 | 2 | 3) => {
    if (nextStep <= activeStep) {
      changeWorkflowStep(nextStep);
      return;
    }
    if (activeStep === 1 && nextStep >= 2) {
      const saved = await continueFromConsultation();
      if (saved && nextStep === 3) changeWorkflowStep(3);
      return;
    }
    changeWorkflowStep(nextStep);
  };

  const navigateWorkflowScreen = async (screen: "motif" | "exam" | "prescription" | "pricing") => {
    if (screen === "motif") {
      changeWorkflowStep(1);
      changeClinicalStep(1);
      return;
    }
    if (screen === "exam") {
      if (activeStep === 1 && activeClinicalStep === 1 && !isCompleted) {
        await advanceClinicalStep();
        return;
      }
      changeWorkflowStep(1);
      changeClinicalStep(2);
      return;
    }
    if (isCompleted) return;
    if (activeStep === 1) {
      const saved = await save();
      if (!saved) return;
    }
    changeWorkflowStep(screen === "prescription" ? 2 : 3);
  };
  const workflowNavigationItems = isSimplifiedMode
    ? [
        { id: "motif" as const, label: "Clinique", active: activeStep === 1, color: "border-blue-100 bg-blue-50/70 text-blue-900 data-[active=true]:border-blue-200 data-[active=true]:bg-blue-100" },
        { id: "prescription" as const, label: "Ordonnance", active: activeStep === 2, color: "border-indigo-100 bg-indigo-50/70 text-indigo-900 data-[active=true]:border-indigo-200 data-[active=true]:bg-indigo-100" },
        { id: "pricing" as const, label: "Clôture", active: activeStep === 3, color: "border-emerald-100 bg-emerald-50/70 text-emerald-900 data-[active=true]:border-emerald-200 data-[active=true]:bg-emerald-100" },
      ]
    : [
        { id: "motif" as const, label: "Motif", active: activeStep === 1 && activeClinicalStep === 1, color: "border-blue-100 bg-blue-50/70 text-blue-900 data-[active=true]:border-blue-200 data-[active=true]:bg-blue-100" },
        { id: "exam" as const, label: "Examen", active: activeStep === 1 && activeClinicalStep === 2, color: "border-teal-100 bg-teal-50/70 text-teal-900 data-[active=true]:border-teal-200 data-[active=true]:bg-teal-100" },
        { id: "prescription" as const, label: "Ordonnance", active: activeStep === 2, color: "border-indigo-100 bg-indigo-50/70 text-indigo-900 data-[active=true]:border-indigo-200 data-[active=true]:bg-indigo-100" },
        { id: "pricing" as const, label: "Clôture & honoraires", active: activeStep === 3, color: "border-emerald-100 bg-emerald-50/70 text-emerald-900 data-[active=true]:border-emerald-200 data-[active=true]:bg-emerald-100" },
      ];
  const activeWorkflowIndex = Math.max(0, workflowNavigationItems.findIndex((item) => item.active));

  useEffect(() => {
    const handleWorkflowArrow = (event: KeyboardEvent) => {
      if (!hasStarted || queueLoading || consultationLoading || consultationError) return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;

      const primaryShortcut = event.key === "Enter"
        && (event.ctrlKey || event.metaKey)
        && !event.shiftKey;
      if (primaryShortcut && !isCompleted) {
        if (activeStep === 1) {
          event.preventDefault();
          event.stopPropagation();
          if (isSimplifiedMode || activeClinicalStep === 2) {
            void continueFromConsultation();
          } else {
            void advanceClinicalStep();
          }
        } else if (activeStep === 2) {
          event.preventDefault();
          event.stopPropagation();
          changeWorkflowStep(3);
        } else if (activeStep === 3) {
          event.preventDefault();
          event.stopPropagation();
          void handleCompleteRef.current();
        }
        return;
      }

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const modifiedShortcut = event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
      const target = event.target;
      if (!modifiedShortcut || (
        target instanceof HTMLElement
        && (target.isContentEditable || target.closest("input, textarea, select, button, a, [role='button'], [role='combobox']"))
      )) return;

      event.preventDefault();
      event.stopPropagation();
      if (isSimplifiedMode) {
        if (event.key === "ArrowLeft" && activeStep > 1) {
          changeWorkflowStep(activeStep === 3 ? 2 : 1);
        } else if (event.key === "ArrowRight" && activeStep === 1 && !isCompleted) {
          void continueFromConsultation().then((saved) => {
            if (saved) changeWorkflowStep(2);
          });
        } else if (event.key === "ArrowRight" && activeStep === 2 && !isCompleted) {
          changeWorkflowStep(3);
        }
      } else if (event.key === "ArrowLeft") {
        if (activeStep === 1 && activeClinicalStep === 2) changeClinicalStep(1);
        else if (activeStep === 2) {
          changeWorkflowStep(1);
          changeClinicalStep(2);
        } else if (activeStep === 3) changeWorkflowStep(2);
      } else if (activeStep === 1) {
        void advanceClinicalStep();
      } else if (activeStep === 2 && !isCompleted) {
        changeWorkflowStep(3);
      }
    };

    window.addEventListener("keydown", handleWorkflowArrow, true);
    return () => window.removeEventListener("keydown", handleWorkflowArrow, true);
  }, [activeClinicalStep, activeStep, advanceClinicalStep, changeClinicalStep, changeWorkflowStep, consultationError, consultationLoading, continueFromConsultation, hasStarted, isCompleted, isSimplifiedMode, queueLoading]);

  if (queueLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-6xl animate-pulse space-y-5">
          <div className="h-16 rounded-xl bg-white" />
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="h-56 rounded-xl bg-white" />
            <div className="h-72 rounded-xl bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (queueError || !entry || !patient) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-lg">
          <CardContent className="space-y-4 p-8 text-center">
            <p className="font-medium">Cette entrée de file est introuvable.</p>
            <Button variant="outline" onClick={() => void navigateAfterSaving("/file-attente")}>Retour à la file</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70">
      <header ref={headerRef} className="sticky z-20 border-b bg-white/95 backdrop-blur" style={{ top: appHeaderHeight }}>
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => void navigateAfterSaving("/file-attente")} aria-label="Retour à la file d'attente">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold text-slate-900">Consultation</h1>
                <Badge variant={isCompleted ? "secondary" : "outline"}>
                  {isCompleted ? "Terminée" : hasStarted ? "En cours" : "À démarrer"}
                </Badge>
              </div>
              <p className="truncate text-sm text-muted-foreground">{format(new Date(entry.created_at), "EEEE d MMMM · HH:mm", { locale: fr })}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasStarted && !isCompleted && (
              <span
                role="status"
                title={draftSaveState === "saving" || saveConsultation.isPending
                  ? "Enregistrement en cours"
                  : draftSaveState === "error"
                    ? "Échec de sauvegarde — utilisez Enregistrer pour réessayer"
                    : draftSaveState === "saved" && draftSavedAt
                      ? `Enregistré à ${format(draftSavedAt, "HH:mm:ss")}`
                      : "Brouillon non enregistré"}
                aria-label={draftSaveState === "saving" || saveConsultation.isPending
                  ? "Enregistrement en cours"
                  : draftSaveState === "error"
                    ? "Échec de sauvegarde"
                    : draftSaveState === "saved" && draftSavedAt
                      ? `Enregistré à ${format(draftSavedAt, "HH:mm:ss")}`
                      : "Brouillon non enregistré"}
                className={`inline-flex shrink-0 items-center gap-1.5 text-xs ${
                draftSaveState === "error" ? "text-rose-700" : draftSaveState === "saved" ? "text-emerald-700" : "text-slate-500"
              }`}
              >
                {draftSaveState === "saving" || saveConsultation.isPending
                  ? <Circle className="h-3 w-3 animate-pulse" />
                  : draftSaveState === "error"
                    ? <AlertTriangle className="h-3.5 w-3.5" />
                    : draftSaveState === "saved"
                      ? <CheckCircle2 className="h-3.5 w-3.5" />
                      : <Circle className="h-3 w-3" />}
                <span className="hidden md:inline">
                  {draftSaveState === "saving" || saveConsultation.isPending
                    ? "Enregistrement…"
                    : draftSaveState === "error"
                      ? "Échec de sauvegarde"
                      : draftSaveState === "saved" && draftSavedAt
                        ? `Enregistré à ${format(draftSavedAt, "HH:mm:ss")}`
                        : "Brouillon non enregistré"}
                </span>
              </span>
            )}
            <ToggleGroup
              type="single"
              value={isSimplifiedMode ? "simple" : "complete"}
              onValueChange={(value) => {
                if (value === "simple" || value === "complete") setIsSimplifiedMode(value === "simple");
              }}
              disabled={!currentUser?.id || modePreferenceLoadedForVisit !== `${currentUser.id}:${queueId}`}
              aria-label="Mode de saisie de la consultation"
              className="h-9 shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1"
            >
              <ToggleGroupItem
                value="simple"
                aria-label="Mode rapide"
                className="h-7 gap-1 px-2 text-[11px] data-[state=on]:bg-blue-100 data-[state=on]:text-blue-900 sm:px-2.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Mode Rapide</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="complete"
                aria-label="Mode complet"
                className="h-7 gap-1 px-2 text-[11px] data-[state=on]:bg-teal-100 data-[state=on]:text-teal-900 sm:px-2.5"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>Mode Complet</span>
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 border-slate-200"
              aria-pressed={isClinicalSidebarOpen}
              aria-label={isClinicalSidebarOpen ? "Masquer l’aide clinique" : "Afficher l’aide clinique"}
              title={isClinicalSidebarOpen ? "Masquer l’aide clinique" : "Afficher l’aide clinique"}
              onClick={() => setIsClinicalSidebarOpen((open) => !open)}
            >
              {isClinicalSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {showStickyPatientSummary && (
        <div ref={stickyPatientSummaryRef} data-consultation-sticky-summary className="fixed z-30 border-b border-blue-200 bg-white/95 shadow-sm backdrop-blur" style={{ top: appHeaderHeight + headerHeight }} aria-label="Résumé patient fixe">
          <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-center gap-x-2 gap-y-1 px-3 py-1.5 sm:flex sm:min-h-12 sm:flex-wrap sm:gap-3 md:px-6">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
              {`${formatPersonName(patient.prenom).charAt(0)}${formatPersonName(patient.nom).charAt(0)}`.toLocaleUpperCase("fr")}
            </div>
            <div className="min-w-0 max-w-[42vw] sm:max-w-[25%]">
              <p className="truncate text-sm font-semibold text-slate-900">{patientName}</p>
              {age !== null && <p className="text-[10px] leading-3 text-slate-500">{age} ans</p>}
            </div>
            <div className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1 ${
              hasPatientAllergies ? "bg-rose-100 text-rose-900" : "bg-amber-100 text-amber-900"
            } col-span-2 sm:col-span-1`} aria-label="Allergies du patient" title={allergyStatusText}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="shrink-0 text-[10px] font-bold uppercase">Allergies</span>
              <span className="truncate text-xs font-medium">{allergyStatusText}</span>
            </div>
            <div className="col-span-2 flex items-center justify-end gap-1.5 sm:col-span-1 sm:ml-auto sm:shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1 border-blue-200 px-2 text-[11px] text-blue-800 hover:bg-blue-50 sm:gap-1.5 sm:px-3 sm:text-xs"
                onClick={() => void navigateAfterSaving(`/patients/${patient.id}`)}
                aria-label={`Ouvrir le dossier de ${patientName}`}
              >
                <UserRound className="h-3.5 w-3.5" />
                Dossier
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className={`mx-auto grid max-w-[1440px] gap-3 px-3 py-3 [overflow-anchor:none] md:px-6 ${isClinicalSidebarOpen ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]" : "lg:grid-cols-1"}`}>
        <section
          className="min-w-0 space-y-3"
        >
          <div ref={patientSummaryRef}>
          <Card className="overflow-hidden border-blue-200 shadow-sm">
            <div className="space-y-3 bg-gradient-to-r from-blue-50 via-white to-cyan-50/70 p-3 sm:p-4">
              <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-base font-bold text-white shadow-md shadow-blue-600/20">
                    {`${formatPersonName(patient.prenom).charAt(0)}${formatPersonName(patient.nom).charAt(0)}`.toLocaleUpperCase("fr")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase text-blue-700">Patient appelé · N° {entry.numero_ordre}</p>
                      <Badge className="border border-violet-200 bg-violet-100 text-violet-800">Consultation du jour</Badge>
                    </div>
                    <h2 className="truncate text-xl font-bold text-slate-900">{patientName}</h2>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {age !== null && <Badge className="border border-blue-100 bg-white text-blue-800">{age} ans</Badge>}
                      {patientSexLabel && <Badge className="border border-teal-100 bg-teal-50 text-teal-800">{patientSexLabel}</Badge>}
                      {patient.telephone && (
                        <a
                          href={`tel:${patient.telephone.replace(/[^\d+]/g, "")}`}
                          className="inline-flex min-h-8 items-center gap-1.5 self-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm font-semibold tabular-nums tracking-wide text-emerald-800 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                          aria-label={`Appeler ${patientName} au ${formatPhoneNumber(patient.telephone)}`}
                        >
                          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{formatPhoneNumber(patient.telephone)}</span>
                        </a>
                      )}
                      {patient.poids != null && <Badge className="border border-violet-100 bg-violet-50 text-violet-800">{patient.poids} kg</Badge>}
                      {patient.taille != null && <Badge className="border border-cyan-100 bg-cyan-50 text-cyan-800">{patient.taille} cm</Badge>}
                    </div>
                  </div>
                </div>
                <section className={`min-w-0 rounded-xl border p-3 lg:self-end lg:w-[48%] lg:max-w-[560px] ${
                  hasPatientAllergies ? "border-rose-300 bg-rose-100/90" : "border-amber-300 bg-amber-100/90"
                }`} aria-label="Alerte allergies du patient">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      hasPatientAllergies ? "bg-rose-200 text-rose-800" : "bg-amber-200 text-amber-800"
                    }`}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold uppercase tracking-wide ${
                        hasPatientAllergies ? "text-rose-900" : "text-amber-900"
                      }`}>Allergies</p>
                      <p className={`mt-0.5 break-words text-sm leading-5 ${
                        hasPatientAllergies ? "font-semibold text-rose-950" : "font-medium text-amber-950"
                      }`}>
                        {allergyStatusText}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
              <div className="grid gap-2 border-t border-blue-100/80 pt-3 xl:grid-cols-[minmax(0,4fr)_minmax(150px,1fr)]" aria-label="Repères de visite et résumé clinique du patient">
                <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <div className="flex min-h-[54px] min-w-0 items-center gap-1.5 rounded-lg border border-blue-100 bg-white/80 p-2" aria-label="Heure d’arrivée">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Arrivée</p>
                    <p className="truncate text-sm font-semibold tabular-nums text-slate-800">{format(new Date(entry.created_at), "HH:mm")}</p>
                  </div>
                </div>
                <div className="flex min-h-[54px] min-w-0 items-center gap-1.5 rounded-lg border border-teal-100 bg-white/80 p-2" aria-label="Heure d’appel">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Appel</p>
                    <p className="truncate text-sm font-semibold tabular-nums text-slate-800">
                      {entry.called_at ? format(new Date(entry.called_at), "HH:mm") : "Non horodaté"}
                    </p>
                  </div>
                </div>
                <section className="flex min-h-[54px] min-w-0 items-start gap-1.5 rounded-lg border border-violet-200 bg-violet-50/80 p-2" aria-label="Antécédents du patient">
                  <HeartPulse className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-700" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-violet-800">Antécédents</p>
                    <p className="mt-0.5 line-clamp-2 break-words text-xs leading-4 text-violet-950">
                      {recordLoading ? "Chargement du dossier…" : recordError ? "Dossier indisponible" : medicalRecord?.antecedents?.trim() || "Non renseignés"}
                    </p>
                  </div>
                </section>
                <section className="flex min-h-[54px] min-w-0 items-start gap-1.5 rounded-lg border border-sky-200 bg-sky-50/80 p-2" aria-label="Traitements confirmés du patient">
                  <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-700" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-sky-800">Traitements confirmés</p>
                    <p className="mt-0.5 line-clamp-2 break-words text-xs leading-4 text-sky-950">
                      {recordLoading ? "Chargement du dossier…" : recordError ? "Dossier indisponible" : medicalRecord?.traitements_structures.filter((medication) => medication.status === "active").map((medication) => medication.name).join(", ") || "Aucun traitement confirmé"}
                    </p>
                    {!!medicalRecord?.traitements?.trim() && <p className="mt-1 line-clamp-1 text-[10px] text-amber-800">Ancien texte à confirmer</p>}
                  </div>
                </section>
                </div>
                <section className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2 xl:border-l-2 xl:border-l-blue-200" aria-label="Accès au dossier patient">
                  <UserRound className="ml-1 h-4 w-4 shrink-0 text-blue-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Dossier patient</p>
                    <button
                      type="button"
                      className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                      onClick={() => void navigateAfterSaving(`/patients/${patient.id}`)}
                      aria-label={`Ouvrir le dossier de ${patientName}`}
                    >
                      Ouvrir le dossier <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </Card>
          </div>

          {hasStarted && !consultationLoading && !consultationError && (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="space-y-2 p-2.5 sm:p-3">
                <div className="flex items-center justify-between gap-3 px-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Étapes de consultation</p>
                  <Badge variant="outline" className="border-blue-100 bg-blue-50 text-blue-800">
                    Étape {activeWorkflowIndex + 1} sur {workflowNavigationItems.length}
                  </Badge>
                </div>
                <nav className={`grid gap-1.5 ${isSimplifiedMode ? "sm:grid-cols-3" : "sm:grid-cols-4"}`} aria-label="Progression de la consultation">
                  {workflowNavigationItems.map(({ id, label, active, color }, index) => (
                    <button
                      key={id}
                      type="button"
                      data-active={active}
                      data-complete={index < activeWorkflowIndex}
                      aria-current={active ? "step" : undefined}
                      disabled={isCompleted && (id === "prescription" || id === "pricing")}
                      onClick={() => void navigateWorkflowScreen(id)}
                      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 data-[active=true]:shadow-sm data-[complete=true]:border-emerald-200 data-[complete=true]:bg-emerald-50 data-[complete=true]:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40 ${color}`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/80 text-xs font-bold tabular-nums" aria-hidden="true">
                        {index < activeWorkflowIndex
                          ? <Check className="h-3.5 w-3.5" />
                          : index + 1}
                      </span>
                      <span>{label}</span>
                      {active && <span className="sr-only">, étape en cours</span>}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          )}

          {consultationLoading ? (
            <Card className="overflow-hidden border-blue-100">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-blue-100" />
                <div className="flex-1 space-y-2"><div className="h-4 w-48 animate-pulse rounded bg-slate-100" /><div className="h-3 w-72 max-w-full animate-pulse rounded bg-slate-100" /></div>
                <span className="text-sm text-muted-foreground">Vérification de la consultation…</span>
              </CardContent>
            </Card>
          ) : consultationError ? (
            <Card className="border-rose-200 bg-rose-50/70">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div><h3 className="font-semibold text-rose-950">Consultation indisponible</h3><p className="mt-1 text-sm text-rose-800">{getConsultationLoadErrorMessage(consultationLoadError)}</p><p className="mt-2 text-xs text-rose-800/80">Aucune nouvelle saisie n’est activée tant que la consultation existante n’a pas été chargée.</p></div>
                <Button variant="outline" className="border-rose-200 bg-white text-rose-900 hover:bg-rose-100" onClick={() => void refetchConsultation()}>Réessayer</Button>
              </CardContent>
            </Card>
          ) : !hasStarted ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600"><HeartPulse className="h-6 w-6" /></div>
                <div>
                  <h3 className="font-semibold">Prêt à commencer</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Le compte rendu sera enregistré comme une nouvelle consultation, sans remplacer les antécédents du patient.</p>
                </div>
                <Button onClick={() => void save()} disabled={saveConsultation.isPending}>
                  <Stethoscope className="mr-2 h-4 w-4" />Démarrer la consultation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="border-b bg-white px-4 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {activeStep === 1 && <><ClipboardList className="h-4 w-4 text-blue-600" />{isSimplifiedMode ? "Consultation clinique rapide" : activeClinicalStep === 1 ? "Motif et interrogatoire" : "Examen et conclusion clinique"}</>}
                    {activeStep === 2 && <><FileText className="h-4 w-4 text-indigo-600" />Ordonnance</>}
                    {activeStep === 3 && <><Check className="h-4 w-4 text-emerald-700" />Clôture de la consultation</>}
                  </CardTitle>
                  {!isCompleted && activeStep < 3 && (
                    <span className="text-[10px] text-slate-500">Ctrl/Cmd + Entrée · Suivant</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-3 sm:p-4">
                {isSimplifiedMode && activeStep === 1 && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2">
                      <div>
                        <h3 className="text-xs font-semibold text-blue-950">Saisie clinique rapide</h3>
                        <p className="mt-0.5 text-[11px] leading-4 text-blue-900/80">
                          Un écran condensé; les notes guidées du mode complet restent conservées.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-2.5 lg:grid-cols-2">
                      <div className="space-y-1.5 lg:col-span-2">
                        <Label htmlFor="quick-consultation-motif">Motif de consultation</Label>
                        <Textarea
                          id="quick-consultation-motif"
                          ref={quickMotifInputRef}
                          rows={2}
                          value={fields.motif}
                          disabled={isCompleted}
                          onChange={(event) => updateSimpleMotifs(event.target.value)}
                          placeholder="Un motif par ligne"
                          className="min-h-16 resize-y bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="quick-consultation-history">Interrogatoire / histoire</Label>
                        <Textarea
                          id="quick-consultation-history"
                          rows={3}
                          value={splitClinicalNotes(fields.histoire).common}
                          disabled={isCompleted}
                          onChange={(event) => updateSimpleClinicalNotes("histoire", event.target.value)}
                          placeholder="Notes rapportées par le patient…"
                          className="min-h-20 resize-y bg-white"
                        />
                        {splitClinicalNotes(fields.histoire).sections.length > 0 && (
                          <details className="rounded-lg border border-slate-200 bg-white">
                            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                              Voir les notes guidées déjà saisies ({splitClinicalNotes(fields.histoire).sections.length})
                            </summary>
                            <p className="whitespace-pre-wrap border-t px-3 py-2.5 text-xs leading-5 text-slate-700">
                              {formatClinicalNotesForDisplay(
                                splitClinicalNotes(fields.histoire).sections
                                  .map((section) => [`[[${section.kind}::${section.motif}]]`, ...section.lines].join("\n"))
                                  .join("\n"),
                              )}
                            </p>
                          </details>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="quick-consultation-exam">Examen clinique</Label>
                        <p className="text-xs text-slate-500">Pour la saisie guidée des constantes et examens, repassez au mode complet.</p>
                        <Textarea
                          id="quick-consultation-exam"
                          rows={3}
                          value={splitClinicalNotes(fields.examen_clinique).common}
                          disabled={isCompleted}
                          onChange={(event) => updateSimpleClinicalNotes("examen_clinique", event.target.value)}
                          placeholder="Constatations réellement observées…"
                          className="min-h-20 resize-y bg-white"
                        />
                        {splitClinicalNotes(fields.examen_clinique).sections.length > 0 && (
                          <details className="rounded-lg border border-slate-200 bg-white">
                            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                              Voir les notes guidées déjà saisies ({splitClinicalNotes(fields.examen_clinique).sections.length})
                            </summary>
                            <p className="whitespace-pre-wrap border-t px-3 py-2.5 text-xs leading-5 text-slate-700">
                              {formatClinicalNotesForDisplay(
                                splitClinicalNotes(fields.examen_clinique).sections
                                  .map((section) => [`[[${section.kind}::${section.motif}]]`, ...section.lines].join("\n"))
                                  .join("\n"),
                              )}
                            </p>
                          </details>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="quick-consultation-diagnosis">Évaluation / diagnostic</Label>
                        <Textarea
                          id="quick-consultation-diagnosis"
                          rows={3}
                          value={splitClinicalNotes(fields.diagnostic).common}
                          disabled={isCompleted}
                          onChange={(event) => updateSimpleClinicalNotes("diagnostic", event.target.value)}
                          placeholder="Évaluation clinique et diagnostic…"
                          className="min-h-20 resize-y bg-white"
                        />
                        {splitClinicalNotes(fields.diagnostic).sections.length > 0 && (
                          <details className="rounded-lg border border-slate-200 bg-white">
                            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                              Voir les notes guidées déjà saisies ({splitClinicalNotes(fields.diagnostic).sections.length})
                            </summary>
                            <p className="whitespace-pre-wrap border-t px-3 py-2.5 text-xs leading-5 text-slate-700">
                              {formatClinicalNotesForDisplay(
                                splitClinicalNotes(fields.diagnostic).sections
                                  .map((section) => [`[[${section.kind}::${section.motif}]]`, ...section.lines].join("\n"))
                                  .join("\n"),
                              )}
                            </p>
                          </details>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="quick-consultation-plan">Conduite à tenir</Label>
                        <Textarea
                          id="quick-consultation-plan"
                          rows={3}
                          value={splitClinicalNotes(fields.plan).common}
                          disabled={isCompleted}
                          onChange={(event) => updateSimpleClinicalNotes("plan", event.target.value)}
                          placeholder="Plan et consignes…"
                          className="min-h-20 resize-y bg-white"
                        />
                        {splitClinicalNotes(fields.plan).sections.length > 0 && (
                          <details className="rounded-lg border border-slate-200 bg-white">
                            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                              Voir les notes guidées déjà saisies ({splitClinicalNotes(fields.plan).sections.length})
                            </summary>
                            <p className="whitespace-pre-wrap border-t px-3 py-2.5 text-xs leading-5 text-slate-700">
                              {formatClinicalNotesForDisplay(
                                splitClinicalNotes(fields.plan).sections
                                  .map((section) => [`[[${section.kind}::${section.motif}]]`, ...section.lines].join("\n"))
                                  .join("\n"),
                              )}
                            </p>
                          </details>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                      <p className="text-xs text-slate-500">Les modifications utilisent la même sauvegarde automatique que le mode complet.</p>
                      {!isCompleted && (
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={() => void save()} disabled={saveConsultation.isPending}>
                            <Save className="mr-2 h-4 w-4" />Enregistrer
                          </Button>
                          <Button type="button" onClick={() => void handleStepNavigation(2)} disabled={saveConsultation.isPending}>
                            Continuer vers l’ordonnance<ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!isSimplifiedMode && activeStep === 1 && <div className="space-y-3">
                <div className="space-y-2">
                  {activeClinicalStep === 1 && (
                    <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="visit-motif">Motif de consultation</Label>
                    <Select value={motifCategory} onValueChange={(value) => { setMotifCategory(value); setActiveMotifId(null); }} disabled={isCompleted}>
                      <SelectTrigger className="h-8 w-full border-blue-200 bg-white text-xs sm:w-[230px]">
                        <SelectValue placeholder="Toutes les familles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les familles</SelectItem>
                        {CONSULTATION_CATEGORIES.map((category) => (
                          <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="visit-motif"
                      ref={completeMotifInputRef}
                      value={motifQuery}
                      onChange={(event) => {
                        setMotifQuery(event.target.value);
                        setActiveMotifId(null);
                      }}
                      placeholder="Ajouter un ou plusieurs motifs : acouphènes, céphalées..."
                      className="h-11 border-blue-200 bg-white pl-10 focus-visible:ring-blue-300"
                      disabled={isCompleted}
                    />
                  </div>
                  {selectedMotifs.length > 0 && (
                    <div
                      className="sticky z-20 min-w-0 max-w-full space-y-2 rounded-lg border border-blue-100 bg-white/95 p-2 shadow-md backdrop-blur"
                      style={{ top: appHeaderHeight + headerHeight + stickyPatientSummaryHeight + 8 }}
                      aria-label="Navigation des motifs"
                    >
                      <div className="flex items-center justify-between gap-2 px-1">
                        <p className="text-xs font-semibold uppercase text-blue-800">Motifs · {selectedMotifs.length}</p>
                        <p className="hidden text-[11px] text-slate-500 sm:block">Changer de problème sans remonter</p>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {selectedMotifs.map((motif) => {
                          const active = motif.id === activeMotifId;
                          const historyNoted = Boolean(getClinicalSectionText(fields.histoire, "Interrogatoire", motif.label));
                          const examNoted = Boolean(getClinicalSectionText(fields.examen_clinique, "Examen ciblé", motif.label));
                          return (
                            <div key={`${motif.id || "custom"}-${motif.label}`} className={`inline-flex shrink-0 items-center rounded-lg border ${active ? "border-blue-300 bg-blue-100" : "border-slate-200 bg-white"}`}>
                              <button type="button" className="flex min-h-10 items-center gap-2 px-3 text-left text-sm font-medium text-blue-950" aria-current={active ? "true" : undefined} onClick={() => {
                                setActiveMotifId(motif.id);
                                const matchingEntry = motif.entry || CONSULTATION_MOTIFS.find((entry) => entry.id === motif.id);
                                setMotifCategory(matchingEntry?.categoryId || "general");
                              }} title="Afficher les suggestions liées à ce motif">
                                <span className="max-w-[190px] truncate">{motif.label}</span>
                                <span className="flex shrink-0 items-center gap-1 text-[10px]" aria-label={`Interrogatoire ${historyNoted ? "noté" : "à faire"}, examen ${examNoted ? "noté" : "à faire"}`}>
                                  <span className={`rounded px-1.5 py-0.5 ${historyNoted ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-500"}`}>I {historyNoted ? "✓" : "·"}</span>
                                  <span className={`rounded px-1.5 py-0.5 ${examNoted ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>E {examNoted ? "✓" : "·"}</span>
                                </span>
                              </button>
                              {!isCompleted && <Button type="button" variant="ghost" size="icon" className="mr-1 h-6 w-6 shrink-0 rounded-full text-blue-700 hover:bg-blue-200 hover:text-blue-950" aria-label={`Retirer ${motif.label}`} onClick={() => removeMotif(motif.label)}><X className="h-3.5 w-3.5" /></Button>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {selectedMotifs.length > 1 && (
                    <p className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs text-slate-600">
                      Chaque motif possède son propre interrogatoire et examen ciblé. Les éléments communs (contexte, constantes et examen général) sont saisis une seule fois.
                    </p>
                  )}
                  {!selectedMotif && !isCompleted && motifSuggestions.length > 0 && (
                    motifQuery.trim() ? (
                      <div className="grid gap-2 pt-1 sm:grid-cols-2" aria-label="Suggestions de motifs">
                        {motifSuggestions.slice(0, 4).map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => addMotif(entry)}
                            className="group flex min-h-12 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-slate-800">{entry.label}</span>
                              <span className="block truncate text-xs text-blue-700">{getConsultationCategoryLabel(entry.categoryId)}</span>
                              <span className="block truncate text-xs text-slate-500">{entry.synonyms.slice(0, 2).join(" · ")}</span>
                            </span>
                            <Plus className="h-4 w-4 shrink-0 text-blue-600 transition-transform group-hover:scale-110" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 pt-1" aria-label="Motifs fréquents">
                        <span className="mr-1 text-xs text-slate-500">Motifs fréquents</span>
                        {motifSuggestions.slice(0, 4).map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => addMotif(entry)}
                            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                          >
                            {entry.label}
                            <Plus className="h-3 w-3 text-slate-500" />
                          </button>
                        ))}
                      </div>
                    )
                  )}
                  {importedMotifsError && motifQuery.trim().length > 1 && (
                    <p className="text-xs text-destructive">Le catalogue CIM-11 n’a pas pu être interrogé. Le motif libre reste disponible.</p>
                  )}
                  {importedMotifsLoading && motifQuery.trim().length > 1 && (
                    <p className="text-xs text-muted-foreground">Recherche dans le catalogue CIM-11…</p>
                  )}
                  {!isCompleted && motifQuery.trim().length > 1 && !selectedMotifs.some((motif) => normalizeConsultationTerm(motif.label) === normalizeConsultationTerm(motifQuery)) && (
                    <Button type="button" variant="outline" size="sm" className="border-slate-200 bg-white" onClick={addCustomMotif}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />Ajouter « {motifQuery.trim()} » comme motif libre
                    </Button>
                  )}
                  {!selectedMotif && motifQuery.trim().length > 1 && motifSuggestions.length === 0 && !importedMotifsLoading && !importedMotifsError && (
                    <p className="text-xs text-muted-foreground">Aucune suggestion exacte ; le motif libre restera dans la synthèse.</p>
                  )}
                    </>
                  )}

                  {selectedMotif && !isCompleted && (
                    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                        <div className="min-w-0">
                          <h2 className="text-sm font-semibold text-violet-900">Aide à l’interrogatoire</h2>
                          <p className="mt-0.5 truncate text-xs font-medium text-slate-700">Motif : {selectedMotif.label}</p>
                          <p className="mt-0.5 text-xs text-slate-500">Questions facultatives pour guider l’échange clinique.</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 text-slate-600" onClick={() => setActiveMotifId(null)}>Changer de motif</Button>
                      </div>

                      {activeClinicalStep === 1 && <div className="space-y-2">
                        <section className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-800"><ClipboardList className="h-4 w-4" /></span>
                            <span>
                              <span className="block text-sm font-semibold text-slate-800">Questions proposées</span>
                              <span className="block text-[11px] text-slate-600">Guidage facultatif · chaque réponse est ajoutée après validation</span>
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-[10px] font-medium text-slate-500">Notées</span>
                            <Badge variant="secondary" className="h-7 min-w-12 justify-center border border-slate-200 bg-white px-2.5 text-xs font-semibold tabular-nums text-slate-700">
                              {answeredHistoryCount}/{historyPrompts.length}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {historyPrompts.map((prompt, promptIndex) => {
                            const existingPromptLine = getClinicalSectionText(fields.histoire || "", "Interrogatoire", selectedMotif.label).split("\n").find(
                              (line) => normalizeConsultationTerm(line.split(":")[0]) === normalizeConsultationTerm(prompt),
                            );
                            const alreadyAnswered = Boolean(existingPromptLine?.split(":").slice(1).join(":").trim());
                            const questionKey = `${selectedMotif.label}::${prompt}`;
                            const savedAnswer = alreadyAnswered && existingPromptLine
                              ? existingPromptLine.slice(existingPromptLine.indexOf(":") + 1).trim()
                              : "";
                            const isEditingSavedAnswer = editingQuestionKey === questionKey;
                            const pastelStyle = QUESTION_PASTEL_STYLES[promptIndex % QUESTION_PASTEL_STYLES.length];
                            const responseTypes = getQuestionResponseTypes(prompt);
                            const referenceDate = new Date(entry.created_at);
                            const hasValidReferenceDate = Number.isFinite(referenceDate.getTime());
                            const responseAnswer = responseTypes.map((responseType) => {
                              const answerKey = `${selectedMotif.label}::${prompt}:${responseType}`;
                              const selectedAnswer = questionAnswers[answerKey] || "";
                              const durationInput = durationInputs[answerKey] || {
                                amount: "",
                                unit: responseType === "onset" ? "days" as const : "minutes" as const,
                              };
                              const durationAmount = Number(durationInput.amount);
                              const hasValidDuration = Number.isInteger(durationAmount) && durationAmount > 0 && durationAmount <= 9999;
                              const durationUnitLabels: Record<DurationUnit, string> = {
                                minutes: durationAmount === 1 ? "minute" : "minutes",
                                hours: durationAmount === 1 ? "heure" : "heures",
                                days: durationAmount === 1 ? "jour" : "jours",
                                weeks: durationAmount === 1 ? "semaine" : "semaines",
                                months: "mois",
                                years: durationAmount === 1 ? "an" : "ans",
                              };
                              const durationAnswer = `${durationAmount} ${durationUnitLabels[durationInput.unit]}`;
                              const estimatedOnset = responseType === "onset" && hasValidDuration && hasValidReferenceDate
                                ? ({
                                    minutes: subMinutes,
                                    hours: subHours,
                                    days: subDays,
                                    weeks: subWeeks,
                                    months: subMonths,
                                    years: subYears,
                                  }[durationInput.unit])(referenceDate, durationAmount)
                                : null;
                              const unitValue = questionUnits[answerKey] || "day";
                              if (responseType === "onset" && hasValidDuration) {
                                return estimatedOnset
                                  ? `Ancienneté rapportée : environ ${durationAnswer} ; début estimé vers le ${format(
                                      estimatedOnset,
                                      durationInput.unit === "minutes" || durationInput.unit === "hours" ? "d MMMM yyyy 'à' HH:mm" : "d MMMM yyyy",
                                      { locale: fr },
                                    )} (calculé depuis la consultation du ${format(referenceDate, "d MMMM yyyy", { locale: fr })}).`
                                  : `Ancienneté rapportée : environ ${durationAnswer} ; date de début non calculée.`;
                              }
                              if (responseType === "episode-duration" && hasValidDuration) return `Durée rapportée : environ ${durationAnswer}.`;
                              if (responseType === "frequency" && Number.isInteger(Number(selectedAnswer)) && Number(selectedAnswer) > 0) {
                                const frequencyUnit = unitValue === "hour" ? "par heure" : unitValue === "day" ? "par jour" : unitValue === "week" ? "par semaine" : unitValue === "month" ? "par mois" : "par an";
                                return `Fréquence rapportée : ${selectedAnswer} fois ${frequencyUnit}.`;
                              }
                              if (responseType === "intensity" && selectedAnswer.trim() !== "" && Number.isInteger(Number(selectedAnswer)) && Number(selectedAnswer) >= 0 && Number(selectedAnswer) <= 10) return `Intensité rapportée : ${selectedAnswer}/10.`;
                              if (responseType === "onset-mode" && selectedAnswer) return `Début rapporté : ${selectedAnswer.toLocaleLowerCase("fr")}.`;
                              if (responseType === "unusual" && selectedAnswer) return `Caractère inhabituel rapporté : ${selectedAnswer.toLocaleLowerCase("fr")}.`;
                              if (responseType === "neurologic-signs" && selectedAnswer) {
                                return selectedAnswer === "Oui"
                                  ? `Signe(s) neurologique(s) rapporté(s) : ${questionAnswers[`${answerKey}:details`]?.trim() || "oui, détails non précisés"}.`
                                  : `Signe(s) neurologique(s) rapporté(s) : ${selectedAnswer.toLocaleLowerCase("fr")}.`;
                              }
                              if (responseType === "evolution" && selectedAnswer) return `Évolution rapportée : ${selectedAnswer.toLocaleLowerCase("fr")}.`;
                              if (responseType === "yes-no" && selectedAnswer) return `Réponse rapportée : ${selectedAnswer.toLocaleLowerCase("fr")}.`;
                              if (responseType === "location" && selectedAnswer.trim()) return `Localisation rapportée : ${selectedAnswer.trim()}.`;
                              if (responseType === "trigger" && selectedAnswer.trim()) return `Circonstance / facteur déclenchant rapporté : ${selectedAnswer.trim()}.`;
                              if (responseType === "associated-symptoms" && selectedAnswer.trim()) return `Symptômes associés rapportés : ${selectedAnswer.trim()}.`;
                              if (responseType === "impact" && selectedAnswer) return `Retentissement rapporté : ${selectedAnswer.toLocaleLowerCase("fr")}.`;
                              if (responseType === "free-text" && selectedAnswer.trim()) return `Symptômes présents : ${selectedAnswer.trim()}.`;
                              return "";
                            }).filter(Boolean).join("\n");
                            return (
                              <div key={prompt} className={`min-w-0 space-y-1.5 rounded-lg border p-2.5 transition-colors ${alreadyAnswered ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white" : pastelStyle.card}`}>
                                <div className="flex items-start gap-2.5">
                                  <span
                                    className={`inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full border px-2 text-xs font-bold tabular-nums shadow-sm ${alreadyAnswered ? "border-emerald-200 bg-emerald-100 text-emerald-800" : pastelStyle.number}`}
                                    aria-label={`Question ${promptIndex + 1}${alreadyAnswered ? ", réponse notée" : ""}`}
                                  >
                                    {promptIndex + 1}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold leading-5 text-slate-800">{prompt}</p>
                                    {alreadyAnswered && (
                                      <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                        <Check className="h-3 w-3" />Ajoutée aux notes
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <details
                                  open={expandedHistoryQuestionKey === questionKey}
                                  onToggle={(event) => {
                                    if (event.currentTarget.open) setExpandedHistoryQuestionKey(questionKey);
                                    else if (expandedHistoryQuestionKey === questionKey) setExpandedHistoryQuestionKey(null);
                                  }}
                                  className="rounded-md border border-slate-200 bg-slate-50/70 open:bg-white"
                                >
                                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 marker:hidden hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                                    <span>{alreadyAnswered ? "Réponse notée · modifier" : "Répondre à cette question"}</span>
                                    {alreadyAnswered
                                      ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
                                      : <Plus className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />}
                                  </summary>
                                  <div className="space-y-2 border-t border-slate-200 p-2.5">
                                    {!alreadyAnswered && responseTypes.map((responseType) => {
                                      const answerKey = `${selectedMotif.label}::${prompt}:${responseType}`;
                                      const selectedAnswer = questionAnswers[answerKey] || "";
                                      const durationInput = durationInputs[answerKey] || {
                                        amount: "",
                                        unit: responseType === "onset" ? "days" as const : "minutes" as const,
                                      };
                                      const unitOptions = responseType === "frequency"
                                        ? [
                                            { value: "hour", label: "par heure" },
                                            { value: "day", label: "par jour" },
                                            { value: "week", label: "par semaine" },
                                            { value: "month", label: "par mois" },
                                            { value: "year", label: "par an" },
                                          ]
                                        : [
                                            { value: "minutes", label: "minute(s)" },
                                            { value: "hours", label: "heure(s)" },
                                            { value: "days", label: "jour(s)" },
                                            ...(responseType === "onset" ? [
                                              { value: "weeks", label: "semaine(s)" },
                                              { value: "months", label: "mois" },
                                              { value: "years", label: "an(s)" },
                                            ] : []),
                                          ];
                                      const selectedUnit = questionUnits[answerKey] || "day";
                                      const durationValue = Number(durationInput.amount);
                                      const validDuration = Number.isInteger(durationValue) && durationValue > 0 && durationValue <= 9999;
                                      const units: Record<DurationUnit, string> = {
                                        minutes: durationValue === 1 ? "minute" : "minutes",
                                        hours: durationValue === 1 ? "heure" : "heures",
                                        days: durationValue === 1 ? "jour" : "jours",
                                        weeks: durationValue === 1 ? "semaine" : "semaines",
                                        months: "mois",
                                        years: durationValue === 1 ? "an" : "ans",
                                      };
                                      const estimatedOnset = responseType === "onset" && validDuration && hasValidReferenceDate
                                        ? ({
                                            minutes: subMinutes,
                                            hours: subHours,
                                            days: subDays,
                                            weeks: subWeeks,
                                            months: subMonths,
                                            years: subYears,
                                          }[durationInput.unit])(referenceDate, durationValue)
                                        : null;
                                      return (
                                        <div key={responseType} className="space-y-2">
                                          {responseType === "onset" && (
                                            <>
                                              <p className="text-xs font-medium text-slate-600">Ancienneté approximative</p>
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm text-slate-700">Depuis environ</span>
                                                <Input
                                                  type="number"
                                                  min="1"
                                                  max="9999"
                                                  step="1"
                                                  inputMode="numeric"
                                                  className="h-9 w-24"
                                                  aria-label={`Ancienneté pour : ${prompt}`}
                                                  value={durationInput.amount}
                                                  disabled={alreadyAnswered}
                                                  onChange={(event) => setDurationInputs((current) => ({
                                                    ...current,
                                                    [answerKey]: { ...durationInput, amount: event.target.value },
                                                  }))}
                                                />
                                                <Select
                                                  value={durationInput.unit}
                                                  disabled={alreadyAnswered}
                                                  onValueChange={(unit: DurationUnit) => setDurationInputs((current) => ({
                                                    ...current,
                                                    [answerKey]: { ...durationInput, unit },
                                                  }))}
                                                >
                                                  <SelectTrigger className="h-9 w-36" aria-label={`Unité d’ancienneté pour : ${prompt}`}><SelectValue /></SelectTrigger>
                                                  <SelectContent>{unitOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                                                </Select>
                                              </div>
                                              <p className="text-xs text-slate-500">
                                                {estimatedOnset
                                                  ? `Date estimée : ${format(estimatedOnset, durationInput.unit === "minutes" || durationInput.unit === "hours" ? "d MMMM yyyy 'à' HH:mm" : "d MMMM yyyy", { locale: fr })} · depuis la consultation du ${format(referenceDate, "d MMMM yyyy", { locale: fr })}.`
                                                  : hasValidReferenceDate
                                                    ? `La date estimée sera calculée depuis la consultation du ${format(referenceDate, "d MMMM yyyy", { locale: fr })}.`
                                                    : "La date de consultation est indisponible pour calculer une estimation."}
                                              </p>
                                            </>
                                          )}
                                          {responseType === "episode-duration" && (
                                            <>
                                              <p className="text-xs font-medium text-slate-600">Durée d’un épisode</p>
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm text-slate-700">Environ</span>
                                                <Input
                                                  type="number"
                                                  min="1"
                                                  max="9999"
                                                  step="1"
                                                  inputMode="numeric"
                                                  className="h-9 w-24"
                                                  aria-label={`Durée d’un épisode pour : ${prompt}`}
                                                  value={durationInput.amount}
                                                  disabled={alreadyAnswered}
                                                  onChange={(event) => setDurationInputs((current) => ({
                                                    ...current,
                                                    [answerKey]: { ...durationInput, amount: event.target.value },
                                                  }))}
                                                />
                                                <Select
                                                  value={durationInput.unit}
                                                  disabled={alreadyAnswered}
                                                  onValueChange={(unit: DurationUnit) => setDurationInputs((current) => ({
                                                    ...current,
                                                    [answerKey]: { ...durationInput, unit },
                                                  }))}
                                                >
                                                  <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                                                  <SelectContent>{unitOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                                                </Select>
                                              </div>
                                            </>
                                          )}
                                          {responseType === "frequency" && (
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="text-sm text-slate-700">Environ</span>
                                              <Input
                                                type="number"
                                                min="1"
                                                max="9999"
                                                step="1"
                                                inputMode="numeric"
                                                className="h-9 w-24"
                                                aria-label={`Fréquence pour : ${prompt}`}
                                                value={selectedAnswer}
                                                disabled={alreadyAnswered}
                                                onChange={(event) => setQuestionAnswers((current) => ({ ...current, [answerKey]: event.target.value }))}
                                              />
                                              <span className="text-sm text-slate-700">fois</span>
                                              <Select
                                                value={selectedUnit}
                                                disabled={alreadyAnswered}
                                                onValueChange={(unit) => setQuestionUnits((current) => ({ ...current, [answerKey]: unit }))}
                                              >
                                                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                                                <SelectContent>{unitOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                                              </Select>
                                            </div>
                                          )}
                                          {responseType === "intensity" && (
                                            <div className="flex items-center gap-2">
                                              <Input
                                                type="number"
                                                min="0"
                                                max="10"
                                                step="1"
                                                className="h-9 w-24"
                                                aria-label={`Intensité sur 10 pour : ${prompt}`}
                                                placeholder="0 à 10"
                                                value={selectedAnswer}
                                                disabled={alreadyAnswered}
                                                onChange={(event) => setQuestionAnswers((current) => ({ ...current, [answerKey]: event.target.value }))}
                                              />
                                              <span className="text-sm text-slate-600">/ 10 · valeur rapportée</span>
                                            </div>
                                          )}
                                          {responseType === "impact" && (
                                            <div className="flex flex-wrap gap-2">
                                              {["Sommeil", "Activités quotidiennes", "Travail ou études", "Mobilité", "Aucun retentissement rapporté", "Non évalué"].map((option) => (
                                                <Button
                                                  key={option}
                                                  type="button"
                                                  size="sm"
                                                  variant={selectedAnswer === option ? "secondary" : "outline"}
                                                  aria-pressed={selectedAnswer === option}
                                                  disabled={alreadyAnswered}
                                                  onClick={() => setQuestionAnswers((current) => ({ ...current, [answerKey]: option }))}
                                                >
                                                  {option}
                                                </Button>
                                              ))}
                                            </div>
                                          )}
                                          {["onset-mode", "evolution", "yes-no", "unusual", "neurologic-signs"].includes(responseType) && (
                                            <div className="flex flex-wrap gap-2">
                                              {(responseType === "onset-mode"
                                                ? ["Brutal", "Progressif", "Non précisé"]
                                                : responseType === "evolution"
                                                  ? ["Stable", "En amélioration", "En aggravation", "Fluctuante", "Non précisée"]
                                                  : responseType === "unusual"
                                                    ? ["Oui", "Non", "Non précisé"]
                                                    : responseType === "neurologic-signs"
                                                      ? ["Oui", "Non", "Non évalué"]
                                                      : ["Oui", "Non", "Incertain", "Non demandé"]
                                              ).map((option) => (
                                                <Button
                                                  key={option}
                                                  type="button"
                                                  size="sm"
                                                  variant={selectedAnswer === option ? "secondary" : "outline"}
                                                  aria-pressed={selectedAnswer === option}
                                                  disabled={alreadyAnswered}
                                                  onClick={() => setQuestionAnswers((current) => ({ ...current, [answerKey]: option }))}
                                                >
                                                  {option}
                                                </Button>
                                              ))}
                                            </div>
                                          )}
                                          {responseType === "neurologic-signs" && selectedAnswer === "Oui" && (
                                            <Input
                                              className="h-9"
                                              aria-label={`Précisions sur les signes neurologiques pour : ${prompt}`}
                                              placeholder="Préciser le signe neurologique rapporté"
                                              value={questionAnswers[`${answerKey}:details`] || ""}
                                              disabled={alreadyAnswered}
                                              onChange={(event) => setQuestionAnswers((current) => ({
                                                ...current,
                                                [`${answerKey}:details`]: event.target.value,
                                              }))}
                                            />
                                          )}
                                          {["location", "trigger", "associated-symptoms", "free-text"].includes(responseType) && (
                                            <ClinicalWritingTextarea
                                              id={`history-answer-${questionKey}-${responseType}`}
                                              includeTreatmentTerms
                                              enterSeparator=", "
                                              rows={2}
                                              aria-label={`Réponse libre pour : ${prompt}`}
                                              placeholder={
                                                responseType === "location"
                                                  ? "Préciser la localisation ou le côté"
                                                  : responseType === "trigger"
                                                    ? "Préciser les circonstances rapportées"
                                                    : responseType === "associated-symptoms"
                                                      ? "Saisir les symptômes rapportés"
                                                    : "Saisir la réponse rapportée"
                                              }
                                              value={selectedAnswer}
                                              disabled={alreadyAnswered}
                                              onChange={(value) => setQuestionAnswers((current) => ({ ...current, [answerKey]: value }))}
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                    {alreadyAnswered ? (
                                      <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50/70 p-2.5">
                                        <p className="text-[11px] font-semibold text-emerald-900">Note actuellement enregistrée</p>
                                        {isEditingSavedAnswer ? (
                                          <>
                                            <ClinicalWritingTextarea
                                              id={`history-edit-${questionKey}`}
                                              rows={3}
                                              enterSeparator=", "
                                              value={questionNoteDraft}
                                              disabled={isCompleted}
                                              aria-label={`Modifier la note pour : ${prompt}`}
                                              includeTreatmentTerms
                                              onChange={setQuestionNoteDraft}
                                            />
                                            <div className="flex flex-wrap gap-2">
                                              <Button
                                                type="button"
                                                size="sm"
                                                disabled={isCompleted || !questionNoteDraft.trim()}
                                                onClick={() => saveQuestionNoteEdit(prompt, questionNoteDraft)}
                                              >
                                                <Check className="mr-1.5 h-3.5 w-3.5" />Enregistrer la modification
                                              </Button>
                                              <Button type="button" size="sm" variant="outline" onClick={() => setEditingQuestionKey(null)}>
                                                Annuler
                                              </Button>
                                            </div>
                                          </>
                                        ) : (
                                          <div className="flex flex-wrap items-start justify-between gap-2">
                                            <p className="min-w-0 flex-1 text-sm text-slate-700">{savedAnswer}</p>
                                            <div className="flex shrink-0 flex-wrap gap-2">
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                disabled={isCompleted}
                                                onClick={() => {
                                                  setQuestionNoteDraft(savedAnswer);
                                                  setEditingQuestionKey(questionKey);
                                                }}
                                              >
                                                <FileText className="mr-1.5 h-3.5 w-3.5" />Modifier
                                              </Button>
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                                disabled={isCompleted}
                                                aria-label={`Supprimer la réponse à la question ${prompt}`}
                                                onClick={() => removeQuestionAnswer(prompt, savedAnswer)}
                                              >
                                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />Supprimer
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <>
                                        {responseAnswer && <p className="rounded bg-slate-50 p-2 text-sm text-slate-700" aria-live="polite">{responseAnswer}</p>}
                                        <Button
                                          type="button"
                                          size="sm"
                                          disabled={!responseAnswer}
                                          onClick={() => {
                                            addQuestionAnswer(prompt, responseAnswer);
                                            setExpandedHistoryQuestionKey(null);
                                          }}
                                        >
                                          <Plus className="mr-1.5 h-3.5 w-3.5" />Ajouter la réponse aux notes
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </details>
                              </div>
                            );
                          })}
                        </div>
                        </section>
                        <details className="group rounded-lg border border-slate-200 bg-white shadow-sm">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left marker:hidden hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><FileText className="h-4 w-4" /></span>
                              <span>
                                <span className="block text-sm font-semibold text-slate-800">Notes libres · {selectedMotif.label}</span>
                                <span className="block text-xs text-slate-500">Facultatif · éléments rapportés non couverts par les questions</span>
                              </span>
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
                          </summary>
                          <div className="border-t border-slate-200 p-2.5">
                            <ClinicalWritingTextarea
                              id={`history-free-notes-${selectedMotif.id || "custom"}`}
                              includeTreatmentTerms
                              enterSeparator=", "
                              rows={3}
                              value={getClinicalSectionText(fields.histoire || "", "Interrogatoire", selectedMotif.label)}
                              disabled={isCompleted}
                              placeholder={`Notes rapportées en lien avec ${selectedMotif.label}…`}
                              aria-label={`Notes libres pour ${selectedMotif.label}`}
                              onChange={(value) => setFields((currentFields) => ({
                                ...currentFields,
                                histoire: setClinicalSectionText(currentFields.histoire || "", "Interrogatoire", selectedMotif.label, value),
                              }))}
                            />
                          </div>
                        </details>
                      </div>}

                      {activeClinicalStep === 2 && <div className="space-y-2">
                        {selectedMotifs.length > 1 && (
                          <nav className="sticky z-20 min-w-0 max-w-full space-y-2 rounded-lg border border-blue-100 bg-white/95 p-2 shadow-md backdrop-blur" style={{ top: appHeaderHeight + headerHeight + stickyPatientSummaryHeight + 8 }} aria-label="Naviguer entre les motifs de consultation">
                            <p className="px-1 text-xs font-semibold uppercase text-blue-800">Motif examiné</p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {selectedMotifs.map((motif) => (
                                <Button
                                  key={motif.id || motif.label}
                                  type="button"
                                  size="sm"
                                  className="shrink-0"
                                  variant={motif.id === activeMotifId ? "secondary" : "outline"}
                                  aria-pressed={motif.id === activeMotifId}
                                  onClick={() => {
                                    setActiveMotifId(motif.id);
                                    const entryForMotif = motif.entry || CONSULTATION_MOTIFS.find((entry) => entry.id === motif.id);
                                    setMotifCategory(entryForMotif?.categoryId || "general");
                                  }}
                                >
                                  {motif.label}
                                  {getClinicalSectionText(fields.examen_clinique, "Examen ciblé", motif.label) && <Check className="ml-1.5 h-3 w-3" />}
                                </Button>
                              ))}
                            </div>
                          </nav>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800"><Stethoscope className="h-4 w-4" /></span>
                            <span>
                              <p className="text-sm font-semibold text-slate-800">Examen clinique</p>
                              <p className="text-xs text-muted-foreground">Décrivez ce qui a été observé pour ce motif. Les constantes restent séparées.</p>
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5 rounded-lg border border-teal-200 bg-white p-3 shadow-sm">
                          <Label htmlFor={`exam-findings-${selectedMotif.id || "custom"}`} className="text-sm font-semibold text-slate-800">
                            Constatations observées · {selectedMotif.label}
                          </Label>
                          <ClinicalWritingTextarea
                            id={`exam-findings-${selectedMotif.id || "custom"}`}
                            ref={examTextareaRef}
                            rows={4}
                            value={getClinicalSectionText(fields.examen_clinique || "", "Examen ciblé", selectedMotif.label)}
                            disabled={isCompleted}
                            placeholder={`Décrivez librement les constatations réellement observées pour ${selectedMotif.label}…`}
                            aria-label={`Constatations observées pour ${selectedMotif.label}`}
                            onChange={(value) => setFields((currentFields) => ({
                              ...currentFields,
                              examen_clinique: setClinicalSectionText(currentFields.examen_clinique || "", "Examen ciblé", selectedMotif.label, value),
                            }))}
                          />
                          <p className="text-xs text-slate-500">La synthèse reprend les mesures et constatations enregistrées, sans interpréter les repères non renseignés.</p>
                          {fields.examen_clinique.split("\n").some(isStandalonePatientArtifact) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-amber-200 text-amber-800 hover:bg-amber-50"
                              disabled={isCompleted}
                              onClick={() => setFields((currentFields) => ({
                                ...currentFields,
                                examen_clinique: removeStandalonePatientArtifacts(currentFields.examen_clinique || ""),
                              }))}
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />Nettoyer la note « patient »
                            </Button>
                          )}
                        </div>
                        {(() => {
                          const vitalsPrompt = "Constantes";
                          const sharedExamNotes = splitClinicalNotes(fields.examen_clinique || "").common;
                          const savedVitalsEntry = findExaminationEntry(sharedExamNotes.split("\n"), vitalsPrompt)
                            || findExaminationEntry(sharedExamNotes.split("\n"), "Constantes et mesures");
                          const recordedVitals = Boolean(savedVitalsEntry?.answer);
                          const savedVitalsText = savedVitalsEntry?.answer || "";
                          const vitals = examinationVitals[vitalsPrompt]
                            || (recordedVitals ? parseExaminationVitals(savedVitalsText) : EMPTY_EXAMINATION_VITALS);
                          const formattedVitals = formatExaminationVitals(vitals);
                          return (
                            <details className="group rounded-lg border border-rose-200 bg-gradient-to-r from-rose-50/80 to-white shadow-sm">
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2.5 marker:hidden hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
                                <span className="flex min-w-0 items-center gap-2.5">
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-800"><Activity className="h-4 w-4" /></span>
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-slate-800">Constantes et mesures</span>
                                    <span className="block truncate text-xs text-slate-600">
                                      {formattedVitals || savedVitalsText || "Tension, pouls, température, saturation, poids…"}
                                    </span>
                                  </span>
                                </span>
                                <span className="flex shrink-0 items-center gap-2">
                                  {recordedVitals && <Badge variant="secondary"><Check className="mr-1 h-3 w-3" />Notées</Badge>}
                                  <ChevronDown className="h-4 w-4 text-rose-700 transition-transform group-open:rotate-180" />
                                </span>
                              </summary>
                              <div className="space-y-2 border-t border-rose-100 p-3">
                              <p className="text-xs text-slate-600">Renseignez uniquement les mesures effectuées ; les unités sont ajoutées automatiquement.</p>
                              <fieldset disabled={isCompleted} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <legend className="sr-only">Saisie des constantes</legend>
                                {([
                                  ["systolic", "Tension systolique", "mmHg", "1"],
                                  ["diastolic", "Tension diastolique", "mmHg", "1"],
                                  ["heartRate", "Fréquence cardiaque", "bpm", "1"],
                                  ["respiratoryRate", "Fréquence respiratoire", "/min", "1"],
                                  ["temperature", "Température", "°C", "any"],
                                  ["oxygenSaturation", "Saturation SpO₂", "%", "1"],
                                  ["weight", "Poids", "kg", "any"],
                                  ["height", "Taille", "cm", "any"],
                                  ["glucose", "Glycémie", "", "any"],
                                ] as const).map(([key, label, unit, step]) => {
                                  const VitalIcon = VITAL_ICONS[key];
                                  return (
                                  <label key={key} className="space-y-1 text-xs font-medium text-slate-700">
                                    <span className="flex items-center gap-1.5"><VitalIcon className="h-3.5 w-3.5 text-rose-700" />{label}</span>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min="0"
                                        step={step}
                                        inputMode="decimal"
                                        value={vitals[key]}
                                        aria-label={label}
                                        onChange={(event) => updateExaminationVital(vitalsPrompt, key, event.target.value)}
                                      />
                                      {key === "glucose" ? (
                                        <Select value={vitals.glucoseUnit} onValueChange={(value) => updateExaminationVital(vitalsPrompt, "glucoseUnit", value)}>
                                          <SelectTrigger className="w-24 shrink-0" aria-label="Unité de glycémie">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="g/L">g/L</SelectItem>
                                            <SelectItem value="mmol/L">mmol/L</SelectItem>
                                            <SelectItem value="mg/dL">mg/dL</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      ) : <span className="w-12 shrink-0 text-slate-500">{unit}</span>}
                                    </div>
                                  </label>
                                );})}
                              </fieldset>
                              {formattedVitals && (
                                <p className="rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700" aria-live="polite">
                                  Aperçu : {formattedVitals}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap gap-2">
                                  {recordedVitals && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="border-red-200 text-red-700 hover:bg-red-50"
                                      disabled={isCompleted}
                                      onClick={() => removeSharedExaminationAnswer(vitalsPrompt)}
                                    >
                                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />Retirer les constantes
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={isCompleted || !formattedVitals}
                                    onClick={() => addExaminationAnswer(vitalsPrompt, formattedVitals, true)}
                                  >
                                    <Check className="mr-1.5 h-3.5 w-3.5" />{recordedVitals ? "Mettre à jour les mesures" : "Ajouter les mesures à l’examen"}
                                  </Button>
                                </div>
                                <p className="text-xs text-slate-500">L’IMC, s’il est calculable, est indicatif et calculé à partir des mesures saisies.</p>
                              </div>
                              </div>
                            </details>
                          );
                        })()}
                        <details className="group">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 marker:hidden transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                            <Sparkles className="h-3 w-3 text-teal-700" />
                            <span>Repères</span>
                            <span className="text-slate-400">facultatifs</span>
                            <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                          </summary>
                        <div className="mt-2 grid gap-2 border-l-2 border-slate-200 pl-2 sm:grid-cols-2">
                            <details className="rounded-md border border-slate-200 bg-white sm:col-span-2">
                              <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700">
                                Notes communes · {selectedMotif.label}
                              </summary>
                              <div className="border-t border-slate-100 p-2.5">
                                <Textarea
                                  rows={2}
                                  value={splitClinicalNotes(fields.examen_clinique || "").common}
                                  disabled={isCompleted}
                                  placeholder="État général ou constatation partagée entre plusieurs motifs…"
                                  aria-label="Examen général et constatations communes"
                                  onChange={(event) => setFields((currentFields) => ({
                                    ...currentFields,
                                    examen_clinique: setCommonClinicalNotes(currentFields.examen_clinique || "", event.target.value),
                                  }))}
                                />
                              </div>
                            </details>
                            {guidedExaminationPrompts.map((prompt) => {
                            const existingExamEntry = findExaminationEntry(
                              getClinicalSectionText(fields.examen_clinique || "", "Examen ciblé", selectedMotif.label).split("\n"),
                              prompt,
                            );
                            const alreadyAdded = Boolean(existingExamEntry?.answer);
                            const responseType = getExaminationResponseType(prompt);
                            const draftKey = `${selectedMotif.label}::${prompt}`;
                            const answer = examinationAnswers[draftKey] || "";
                            const isEditingAnswer = editingExaminationPromptKey === draftKey;
                            const status = examinationStatuses[draftKey] || "";
                            const side = examinationSides[draftKey] || "";
                            const vitals = examinationVitals[prompt] || EMPTY_EXAMINATION_VITALS;
                            const formattedVitals = formatExaminationVitals(vitals);
                            const detailTags = getExaminationDetailTags(selectedMotif.categoryId, responseType);
                            const quickResponses = getExaminationQuickResponses(prompt, selectedMotif.categoryId);
                            const hasDraftResponse = Boolean(answer.trim() || status || side || formattedVitals);
                            const meaningfulAnswer = answer
                              .split("·")
                              .map((part) => part.trim())
                              .filter((part) => part && !/^[^:]+:\s*$/.test(part))
                              .join(" · ");
                            const responseText = responseType === "signs"
                              ? answer.startsWith("Présent:") && answer.slice("Présent:".length).trim()
                                ? `Signes présents : ${answer.slice("Présent:".length).trim()}.`
                                : answer.startsWith("Absent:") && answer.slice("Absent:".length).trim()
                                  ? `Signes recherchés (${answer.slice("Absent:".length).trim()}) : aucun observé.`
                                  : answer === "Non recherché:"
                                    ? "Signes non recherchés."
                                    : ""
                              : status === "not-assessed"
                                ? "Non évalué."
                                : status === "not-performed"
                                  ? "Examen non réalisé."
                                  : [
                                      side ? `Côté : ${side}.` : "",
                                      responseType === "vitals" ? formattedVitals : meaningfulAnswer,
                                    ].filter(Boolean).join(" ");
                            const responseLabel = responseType === "vitals"
                              ? "Mesures relevées"
                              : responseType === "results"
                                ? "Résultat observé / compte rendu disponible"
                                : responseType === "signs"
                                  ? "Signes recherchés et constatés"
                                  : "Constatation clinique observée";
                            const PromptIcon = EXAMINATION_PROMPT_ICONS[responseType];
                            return (
                              <div key={prompt} className="min-w-0 space-y-2.5 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                                <div className="flex min-w-0 items-start gap-2.5">
                                  <p className="flex min-w-0 flex-1 items-start gap-2 text-sm font-medium leading-5 text-slate-800">
                                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-800"><PromptIcon className="h-3.5 w-3.5" /></span>
                                    <span>{prompt.replace(/\s*:\s*$/, "")}</span>
                                  </p>
                                  {alreadyAdded && <Badge variant="secondary" className="shrink-0"><Check className="mr-1 h-3 w-3" />Noté</Badge>}
                                </div>
                                {alreadyAdded && !isEditingAnswer && (
                                  <div className="ml-8 rounded-md border border-emerald-100 bg-emerald-50/60 px-2.5 py-2">
                                    <p className="whitespace-pre-wrap break-words text-sm leading-5 text-slate-800 [overflow-wrap:anywhere]">{existingExamEntry?.answer}</p>
                                    {!isCompleted && (
                                      <div className="mt-1.5 flex gap-1">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 px-2 text-xs text-teal-800 hover:bg-white"
                                          onClick={() => {
                                            setExaminationAnswers((current) => ({ ...current, [draftKey]: existingExamEntry?.answer || "" }));
                                            setEditingExaminationPromptKey(draftKey);
                                          }}
                                        >
                                          <FileText className="mr-1 h-3.5 w-3.5" />Modifier
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 px-2 text-xs text-red-700 hover:bg-white hover:text-red-800"
                                          onClick={() => updateGuidedExaminationAnswer(prompt, null)}
                                        >
                                          <Trash2 className="mr-1 h-3.5 w-3.5" />Retirer
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {isEditingAnswer && (
                                  <div className="ml-8 space-y-1.5 rounded-md border border-teal-100 bg-teal-50/40 p-2">
                                    <Textarea
                                      rows={2}
                                      value={answer}
                                      disabled={isCompleted}
                                      aria-label={`Modifier la constatation : ${prompt}`}
                                      onChange={(event) => setExaminationAnswers((current) => ({ ...current, [draftKey]: event.target.value }))}
                                    />
                                    <div className="flex gap-1.5">
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        disabled={isCompleted || !answer.trim()}
                                        onClick={() => updateGuidedExaminationAnswer(prompt, answer)}
                                      >
                                        <Check className="mr-1 h-3.5 w-3.5" />Enregistrer
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => {
                                          setExaminationAnswers((current) => ({ ...current, [draftKey]: "" }));
                                          setEditingExaminationPromptKey(null);
                                        }}
                                      >
                                        Annuler
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                {!alreadyAdded && <details className="rounded-md border border-slate-200 bg-white">
                                  <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-teal-800">
                                    Renseigner une constatation
                                  </summary>
                                  <div className="space-y-2 border-t border-slate-100 p-3">
                                  {quickResponses.length > 0 && (
                                    <div className="space-y-2 rounded-md bg-teal-50/70 p-2.5">
                                      <p className="text-xs text-slate-600">Raccourcis à utiliser uniquement si le constat est observé.</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {quickResponses.map((suggestion) => (
                                          <Button
                                            key={suggestion.label}
                                            type="button"
                                            size="sm"
                                            variant={suggestion.recommended ? "secondary" : "outline"}
                                            className="h-auto min-h-8 whitespace-normal text-left text-xs"
                                            disabled={isCompleted || alreadyAdded || hasDraftResponse}
                                            onClick={() => setExaminationAnswers((current) => ({ ...current, [draftKey]: suggestion.value }))}
                                          >
                                            {suggestion.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {responseType === "signs" ? (
                                    <>
                                      <p className="text-xs font-medium text-slate-600">Sélectionnez le résultat réellement recherché.</p>
                                      <div className="flex flex-wrap gap-2">
                                        {["Présent", "Absent", "Non recherché"].map((option) => (
                                          <Button
                                            key={option}
                                            type="button"
                                            size="sm"
                                            variant={answer.startsWith(`${option}:`) ? "secondary" : "outline"}
                                            aria-pressed={answer.startsWith(`${option}:`)}
                                            disabled={isCompleted || alreadyAdded}
                                            onClick={() => {
                                              setExaminationAnswers((current) => ({
                                                ...current,
                                                [draftKey]: option === "Non recherché" ? "Non recherché:" : `${option}: `,
                                              }));
                                            }}
                                          >
                                            {option}
                                          </Button>
                                        ))}
                                      </div>
                                      {(answer.startsWith("Présent:") || answer.startsWith("Absent:")) && (
                                        <Input
                                          className="h-9"
                                          aria-label={`Préciser les signes recherchés pour : ${prompt}`}
                                          placeholder={answer.startsWith("Présent:") ? "Quels signes ont été observés ?" : "Quels signes ont été recherchés ?"}
                                          value={answer.slice(answer.startsWith("Présent:") ? "Présent:".length : "Absent:".length).trimStart()}
                                          disabled={isCompleted || alreadyAdded}
                                          onChange={(event) => setExaminationAnswers((current) => ({
                                            ...current,
                                            [draftKey]: `${answer.startsWith("Présent:") ? "Présent" : "Absent"}: ${event.target.value}`,
                                          }))}
                                        />
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <Label className="text-xs text-slate-600">{responseLabel}</Label>
                                      {responseType === "laterality" && (
                                        <Select
                                          value={side}
                                          disabled={isCompleted || alreadyAdded}
                                          onValueChange={(value) => {
                                            setExaminationStatuses((current) => {
                                              const next = { ...current };
                                              delete next[draftKey];
                                              return next;
                                            });
                                            setExaminationSides((current) => ({ ...current, [draftKey]: value }));
                                          }}
                                        >
                                          <SelectTrigger className="h-9" aria-label={`Côté examiné pour : ${prompt}`}>
                                            <SelectValue placeholder="Côté / région (facultatif)" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Droite">Droite</SelectItem>
                                            <SelectItem value="Gauche">Gauche</SelectItem>
                                            <SelectItem value="Bilatéral">Bilatéral</SelectItem>
                                            <SelectItem value="Non applicable">Non applicable</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      )}
                                      {responseType === "vitals" ? (
                                        <div className="space-y-3">
                                          <fieldset className="space-y-2">
                                            <legend className="text-xs font-medium text-slate-700">Tension artérielle</legend>
                                            <div className="grid grid-cols-2 gap-2">
                                              {([
                                                ["systolic", "Systolique", "mmHg"],
                                                ["diastolic", "Diastolique", "mmHg"],
                                              ] as const).map(([key, label, unit]) => (
                                                <label key={key} className="space-y-1 text-xs text-slate-600">
                                                  {label}
                                                  <div className="flex items-center gap-2">
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      step="1"
                                                      inputMode="decimal"
                                                      aria-label={`${label} (${unit})`}
                                                      value={vitals[key]}
                                                      disabled={isCompleted || alreadyAdded}
                                                      onChange={(event) => updateExaminationVital(prompt, key, event.target.value)}
                                                    />
                                                    <span>{unit}</span>
                                                  </div>
                                                </label>
                                              ))}
                                            </div>
                                          </fieldset>
                                          <div className="grid gap-2 sm:grid-cols-2">
                                            {([
                                              ["heartRate", "Fréquence cardiaque", "bpm", "1"],
                                              ["respiratoryRate", "Fréquence respiratoire", "/min", "1"],
                                              ["temperature", "Température", "°C", "any"],
                                              ["oxygenSaturation", "Saturation SpO₂", "%", "1"],
                                              ["weight", "Poids", "kg", "any"],
                                              ["height", "Taille", "cm", "any"],
                                              ["glucose", "Glycémie (facultatif)", "", "any"],
                                            ] as const).map(([key, label, unit, step]) => (
                                              <label key={key} className="space-y-1 text-xs text-slate-600">
                                                {label}
                                                <div className="flex items-center gap-2">
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    step={step}
                                                    inputMode="decimal"
                                                    aria-label={label}
                                                    value={vitals[key]}
                                                    disabled={isCompleted || alreadyAdded}
                                                    onChange={(event) => updateExaminationVital(prompt, key, event.target.value)}
                                                  />
                                                  {key === "glucose" ? (
                                                    <Select
                                                      value={vitals.glucoseUnit}
                                                      disabled={isCompleted || alreadyAdded}
                                                      onValueChange={(value) => updateExaminationVital(prompt, "glucoseUnit", value)}
                                                    >
                                                      <SelectTrigger className="w-24 shrink-0" aria-label="Unité de glycémie">
                                                        <SelectValue />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        <SelectItem value="g/L">g/L</SelectItem>
                                                        <SelectItem value="mmol/L">mmol/L</SelectItem>
                                                        <SelectItem value="mg/dL">mg/dL</SelectItem>
                                                      </SelectContent>
                                                    </Select>
                                                  ) : <span className="w-12 shrink-0">{unit}</span>}
                                                </div>
                                              </label>
                                            ))}
                                          </div>
                                          {formattedVitals && (
                                            <p className="rounded-md bg-slate-50 p-2 text-xs text-slate-700" aria-live="polite">
                                              Aperçu : {formattedVitals}
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <>
                                          {detailTags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5" aria-label="Raccourcis de saisie">
                                              {detailTags.map((tag) => (
                                                <Button
                                                  key={tag}
                                                  type="button"
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-7 px-2 text-xs"
                                                  disabled={isCompleted || alreadyAdded || answer.includes(tag)}
                                                  onClick={() => {
                                                    setExaminationStatuses((current) => {
                                                      const next = { ...current };
                                                      delete next[draftKey];
                                                      return next;
                                                    });
                                                    setExaminationAnswers((current) => ({
                                                      ...current,
                                                      [draftKey]: `${current[draftKey]?.trimEnd() ? `${current[draftKey].trimEnd()} · ` : ""}${tag} `,
                                                    }));
                                                  }}
                                                >
                                                  {tag.replace(/\s*:\s*$/, "")}
                                                </Button>
                                              ))}
                                            </div>
                                          )}
                                          <ClinicalWritingTextarea
                                            rows={3}
                                            value={answer}
                                            disabled={isCompleted || alreadyAdded}
                                            placeholder={responseType === "results"
                                              ? "Saisir la mesure ou le résultat réellement observé, avec l’unité ou la date si disponible…"
                                              : "Décrire uniquement ce qui a été observé ou mesuré…"}
                                            aria-label={`Réponse à l’examen : ${prompt}`}
                                            onChange={(value) => {
                                              setExaminationStatuses((current) => {
                                                const next = { ...current };
                                                delete next[draftKey];
                                                return next;
                                              });
                                              setExaminationAnswers((current) => ({ ...current, [draftKey]: value }));
                                            }}
                                          />
                                        </>
                                      )}
                                    </>
                                  )}
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                                    <div className="flex flex-wrap gap-1.5">
                                      {(["not-assessed", "not-performed"] as const).map((value) => (
                                        <Button
                                          key={value}
                                          type="button"
                                          size="sm"
                                          variant={status === value ? "secondary" : "outline"}
                                          className="h-7 px-2 text-xs"
                                          aria-pressed={status === value}
                                          disabled={isCompleted || alreadyAdded || responseType === "signs"}
                                          onClick={() => {
                                            setExaminationStatuses((current) => ({ ...current, [draftKey]: value }));
                                            setExaminationAnswers((current) => ({ ...current, [draftKey]: "" }));
                                            setExaminationSides((current) => ({ ...current, [draftKey]: "" }));
                                            setExaminationVitals((current) => {
                                              const next = { ...current };
                                              delete next[prompt];
                                              return next;
                                            });
                                          }}
                                        >
                                          {value === "not-assessed" ? "Non évalué" : "Non réalisé"}
                                        </Button>
                                      ))}
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={isCompleted || alreadyAdded || !responseText || hasUnresolvedExaminationPrompt(responseText)}
                                      onClick={() => addExaminationAnswer(prompt, responseText)}
                                    >
                                      {alreadyAdded ? <><Check className="mr-1.5 h-3.5 w-3.5" />Constat noté</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Ajouter le constat</>}
                                    </Button>
                                  </div>
                                  {responseText && hasUnresolvedExaminationPrompt(responseText) && (
                                    <p className="text-xs text-amber-700">Complétez le repère avant de l’ajouter à la synthèse.</p>
                                  )}
                                  </div>
                                </details>}
                              </div>
                            );
                          })}
                        </div>
                        </details>
                      </div>}

                      {activeClinicalStep === 1 && <div className="space-y-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Autres symptômes ressentis en même temps</p>
                          <p className="text-xs text-muted-foreground">Sélectionnez uniquement ceux rapportés par le patient. Touchez à nouveau pour retirer.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedMotif.symptomSuggestions.map((symptom) => {
                            const markerLine = getClinicalSectionText(fields.histoire || "", "Interrogatoire", selectedMotif.label)
                              .split("\n").find((line) => line.startsWith("Symptômes associés : "));
                            const alreadyAdded = markerLine
                              ?.slice("Symptômes associés : ".length)
                              .split(",")
                              .map((value) => value.trim())
                              .includes(symptom) || false;
                            return (
                              <Button
                                key={symptom}
                                type="button"
                                size="sm"
                                variant={alreadyAdded ? "secondary" : "outline"}
                                aria-pressed={alreadyAdded}
                                className={alreadyAdded ? "h-8 border-teal-200 bg-teal-100 text-teal-900" : "h-8 border-slate-200 bg-white text-slate-700 hover:bg-teal-50"}
                                onClick={() => toggleSuggestedSymptom(symptom)}
                              >
                                {alreadyAdded ? <Check className="mr-1 h-3 w-3" /> : <Plus className="mr-1 h-3 w-3" />}
                                {symptom}
                              </Button>
                            );
                          })}
                        </div>
                      </div>}
                    </div>
                  )}
                </div>
                {activeClinicalStep === 1 && (
                <div className="space-y-2">
                  <Label htmlFor="visit-history">Interrogatoire commun / contexte</Label>
                  <p className="text-xs text-slate-500">Éléments transversaux à plusieurs motifs, saisis une seule fois. Les réponses des questions ci-dessus sont classées sous le motif actif.</p>
                  <ClinicalWritingTextarea
                    id="visit-history"
                    includeTreatmentTerms
                    enterSeparator=", "
                    rows={3}
                    value={splitClinicalNotes(fields.histoire || "").common}
                    onChange={(value) => setFields((currentFields) => ({
                      ...currentFields,
                      histoire: setCommonClinicalNotes(currentFields.histoire || "", value),
                    }))}
                    placeholder="Contexte général, antécédents ou autres éléments communs rapportés…"
                    disabled={isCompleted}
                    aria-label="Interrogatoire commun / contexte"
                  />
                </div>
                )}
                {activeClinicalStep === 2 && <>
                <div className="grid gap-3 md:grid-cols-2">
                  <section className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3" aria-labelledby="visit-diagnosis-title">
                    <div>
                      <h3 id="visit-diagnosis-title" className="text-sm font-semibold text-amber-950">Évaluation et diagnostic</h3>
                      {selectedMotif && (
                        <p className="mt-1 text-sm font-medium text-slate-900">{selectedMotif.label}</p>
                      )}
                    </div>
                    {selectedMotif?.code ? (
                      <div className="flex flex-wrap items-center gap-2 border-t border-amber-200 pt-2">
                        <span className="text-xs font-medium text-amber-900">Proposition CIM-11 :</span>
                        <Badge variant="secondary" className="border border-amber-200 bg-white text-amber-950">{selectedMotif.code}</Badge>
                        <span className="text-xs text-slate-600">à valider</span>
                        {selectedMotif.sourceUrl && (
                          <a href={selectedMotif.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-teal-800 underline underline-offset-2">
                            Source OMS <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ) : selectedMotif ? (
                      <p className="border-t border-amber-200 pt-2 text-xs text-slate-600">Aucune proposition CIM-11 disponible pour ce motif libre.</p>
                    ) : null}
                    <details className="group rounded-md border border-amber-200 bg-white">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-slate-700 marker:hidden">
                        Note libre · évaluation clinique
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      <div
                        className="space-y-2 border-t p-2"
                        onBlur={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                            setDiagnosisSuggestionsOpen(false);
                          }
                        }}
                      >
                        <ClinicalWritingTextarea
                          ref={diagnosisTextareaRef}
                          id="visit-diagnosis"
                          rows={2}
                          value={evaluationNote}
                          onFocus={() => setDiagnosisSuggestionsOpen(true)}
                          onChange={(value) => setFields((currentFields) => ({
                            ...currentFields,
                            diagnostic: selectedMotif
                              ? setClinicalSectionText(
                                  currentFields.diagnostic || "",
                                  "Évaluation",
                                  selectedMotif.label,
                                  removeCimProposalLines(value, [selectedMotif]),
                                )
                              : value,
                          }))}
                          placeholder="Ajouter une note clinique libre, si nécessaire…"
                          disabled={isCompleted}
                          aria-label="Ajouter une note clinique libre, si nécessaire…"
                        />
                        {diagnosisSuggestionsOpen && visibleDiagnosisSuggestions.length > 0 && !isCompleted && (
                          <div className="space-y-1" aria-label="Suggestions de termes cliniques">
                            <p className="text-[11px] font-medium text-slate-500">
                              Suggestions pour ce motif
                            </p>
                            <div className="flex flex-col gap-1">
                              {visibleDiagnosisSuggestions.map((suggestion) => (
                                <button
                                  key={suggestion.key}
                                  type="button"
                                  className="flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-left text-xs font-medium text-amber-950 transition-colors hover:border-amber-300 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    const textarea = diagnosisTextareaRef.current;
                                    const cursor = textarea?.selectionStart ?? evaluationNote.length;
                                    const beforeCursor = evaluationNote.slice(0, cursor);
                                    const afterCursor = evaluationNote.slice(cursor);
                                    const prefix = beforeCursor;
                                    const needsSeparator = !afterCursor || !/^[\s.,;:!?)]/.test(afterCursor);
                                    const nextBeforeCursor = `${prefix}${suggestion.replacement}${needsSeparator ? " " : ""}`;
                                    const nextNote = `${nextBeforeCursor}${afterCursor}`;
                                    setFields((currentFields) => ({
                                      ...currentFields,
                                      diagnostic: selectedMotif
                                        ? setClinicalSectionText(currentFields.diagnostic, "Évaluation", selectedMotif.label, nextNote)
                                        : nextNote,
                                    }));
                                    requestAnimationFrame(() => {
                                      textarea?.focus();
                                      textarea?.setSelectionRange(nextBeforeCursor.length, nextBeforeCursor.length);
                                    });
                                  }}
                                >
                                  <span>{suggestion.label}</span>
                                  {suggestion.detail && <span className="text-[10px] font-normal text-amber-800/75">{suggestion.detail}</span>}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  </section>
                  <div className="space-y-1.5">
                    <Label htmlFor="visit-plan">Conduite à tenir · {selectedMotif?.label || "motif actif"}</Label>
                    <ClinicalWritingTextarea
                      id="visit-plan"
                      includeTreatmentTerms
                      rows={2}
                      value={selectedMotif ? getClinicalSectionText(fields.plan, "Conduite à tenir", selectedMotif.label) : splitClinicalNotes(fields.plan).common}
                      onChange={(value) => setFields((currentFields) => ({
                        ...currentFields,
                        plan: selectedMotif
                          ? setClinicalSectionText(currentFields.plan, "Conduite à tenir", selectedMotif.label, value)
                          : value,
                      }))}
                      placeholder="Traitement, examens ou suivi pour ce motif…"
                      disabled={isCompleted}
                      aria-label="Conduite à tenir"
                    />
                  </div>
                </div>
                <details className="rounded-lg border border-slate-200 bg-white">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-600">Afficher / modifier les anciennes notes non rattachées à un motif</summary>
                  <div className="grid gap-3 border-t p-3 md:grid-cols-2">
                    <label className="space-y-1 text-sm font-medium text-slate-700">
                      Évaluation commune
                      <Textarea
                        rows={3}
                        value={splitClinicalNotes(fields.diagnostic).common}
                        disabled={isCompleted}
                        onChange={(event) => setFields((currentFields) => ({
                          ...currentFields,
                          diagnostic: setCommonClinicalNotes(currentFields.diagnostic, event.target.value),
                        }))}
                      />
                    </label>
                    <label className="space-y-1 text-sm font-medium text-slate-700">
                      Conduite à tenir commune
                      <Textarea
                        rows={3}
                        value={splitClinicalNotes(fields.plan).common}
                        disabled={isCompleted}
                        onChange={(event) => setFields((currentFields) => ({
                          ...currentFields,
                          plan: setCommonClinicalNotes(currentFields.plan, event.target.value),
                        }))}
                      />
                    </label>
                  </div>
                </details>
                </>}
                {isCompleted && <p className="text-sm text-muted-foreground">Cette consultation est clôturée et n'est plus modifiable.</p>}
                {(!isCompleted || activeClinicalStep === 2) && (
                  <div className="flex justify-between gap-3 border-t pt-4">
                    {activeClinicalStep === 2 ? (
                      <Button type="button" variant="outline" onClick={() => changeClinicalStep(1)}>
                        <ChevronLeft className="mr-2 h-4 w-4" />Retour au motif
                      </Button>
                    ) : <span />}
                    {(!isCompleted || activeClinicalStep === 1) && (
                      <Button onClick={() => void advanceClinicalStep()} disabled={saveConsultation.isPending}>
                        {saveConsultation.isPending
                          ? "Enregistrement..."
                          : isCompleted
                            ? "Voir l’examen"
                            : activeClinicalStep === 1
                              ? "Suivant — Examen"
                              : "Enregistrer et continuer"}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
                </div>}

                {activeStep === 2 && <div className="space-y-3">
                  <Card className="border-indigo-100 bg-indigo-50/40 shadow-none">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><FileText className="h-5 w-5" /></div>
                        <div>
                          <h3 className="font-semibold text-indigo-950">Documents médicaux</h3>
                          <p className="mt-1 text-sm text-indigo-900/80">Créez séparément autant de certificats, ordonnances, bons d’analyses et demandes d’imagerie que nécessaire. Chaque document peut être imprimé et sera enregistré dans le dossier du patient.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {(prescriptionCreated || certificateCreated) && (
                    <div className="space-y-2" aria-label="Documents créés pendant cette consultation">
                      <h3 className="text-sm font-semibold text-slate-800">Documents créés pendant cette consultation</h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {createdPrescriptions.map((document) => {
                          const label = document.type === "laboratory"
                            ? "Bon d’analyses"
                            : document.type === "imaging"
                              ? "Bon d’imagerie"
                              : "Ordonnance";
                          const sameTypeDocuments = createdPrescriptions.filter((item) => item.type === document.type);
                          const typeNumber = sameTypeDocuments.findIndex((item) => item.id === document.id) + 1;
                          const documentStyle = document.type === "laboratory"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                            : document.type === "imaging"
                              ? "border-violet-200 bg-violet-50 text-violet-950"
                              : "border-blue-200 bg-blue-50 text-blue-950";
                          const documentIconStyle = document.type === "laboratory"
                            ? "text-emerald-700"
                            : document.type === "imaging"
                              ? "text-violet-700"
                              : "text-blue-700";
                          return (
                            <div key={document.id} className={`space-y-2 rounded-lg border p-3 ${documentStyle}`}>
                              <div className="flex items-center justify-between gap-3">
                                <span className="flex min-w-0 items-center gap-2 truncate text-sm font-semibold">
                                  <Check className={`h-4 w-4 shrink-0 ${documentIconStyle}`} />{label} {sameTypeDocuments.length > 1 ? `#${typeNumber}` : ""} enregistré
                                </span>
                                <div className="flex shrink-0 gap-1.5">
                                  <EditPrescriptionButton
                                    prescriptionId={document.id}
                                    patientId={entry.patient_id}
                                    patientName={patientName}
                                    patientAllergies={medicalRecord?.allergies}
                                    onUpdated={(prescriptionId, prescriptionType, itemNames) => {
                                      setCreatedPrescriptions((current) => current.map((item) => item.id === prescriptionId
                                        ? { ...item, type: prescriptionType, items: itemNames }
                                        : item));
                                    }}
                                  />
                                  <Button type="button" size="sm" variant="outline" className="border-current/20 bg-white" onClick={() => setPrescriptionPreviewId(document.id)}>
                                    <Printer className="mr-2 h-4 w-4" />Imprimer
                                  </Button>
                                </div>
                              </div>
                              <p className="line-clamp-2 text-xs opacity-80" title={document.items.join(", ")}>
                                {document.items.join(" · ")}
                              </p>
                            </div>
                          );
                        })}
                        {createdCertificates.map((certificate, index) => (
                          <div key={certificate.id} className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex min-w-0 items-center gap-2 truncate text-sm font-semibold">
                                <Check className="h-4 w-4 shrink-0 text-amber-700" />Certificat {createdCertificates.length > 1 ? `#${index + 1}` : ""} enregistré
                              </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="shrink-0 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                              onClick={() => {
                                setSelectedCertificate(certificate);
                                setCertificatePreviewOpen(true);
                              }}
                            >
                              <Printer className="mr-2 h-4 w-4" />Vérifier / imprimer
                            </Button>
                            </div>
                            <p className="line-clamp-2 text-xs text-amber-900/80">{certificate.type.replaceAll("_", " ")}{certificate.motif ? ` · ${certificate.motif}` : ""}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!isCompleted && (
                    <div className="space-y-4 border-t pt-4">
                      <Button type="button" variant="ghost" size="sm" onClick={() => changeWorkflowStep(1)} className="text-slate-600 hover:text-slate-900">
                        <ChevronLeft className="mr-2 h-4 w-4" />Retour à la consultation
                      </Button>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Button type="button" variant="outline" onClick={() => setCertificateDialogOpen(true)} className="relative h-12 w-full justify-center border-violet-200 bg-violet-50 px-10 text-center text-violet-800 hover:border-violet-300 hover:bg-violet-100">
                          <FileBadge className="absolute left-4 h-4 w-4" />
                          <span className="leading-tight">{certificateCreated ? "Créer un autre certificat" : "Créer un certificat"}</span>
                        </Button>
                        <PrescriptionDialog
                          patientId={entry.patient_id}
                          patientName={patientName}
                          patientAllergies={medicalRecord?.allergies}
                          patientContext={{
                            antecedents: medicalRecord?.antecedents,
                            allergies: medicalRecord?.allergies,
                            traitements: medicalRecord?.traitements,
                          }}
                          onCreated={(prescriptionId, prescriptionType, itemNames) => {
                            setCreatedPrescriptions((current) => [...current, { id: prescriptionId, type: prescriptionType, items: itemNames }]);
                          }}
                        >
                          <Button type="button" className="relative h-12 w-full justify-center bg-blue-600 px-10 text-center text-white hover:bg-blue-700">
                            <FileText className="absolute left-4 h-4 w-4" />
                            <span className="leading-tight">{prescriptionCreated ? "Créer un autre document" : "Créer un document"}</span>
                          </Button>
                        </PrescriptionDialog>
                      </div>
                    </div>
                  )}
                  {!isCompleted && (
                    <CertificateDialog
                      open={certificateDialogOpen}
                      onOpenChange={setCertificateDialogOpen}
                      patientId={entry.patient_id}
                      patientName={patientName}
                      onCreated={(certificate) => {
                        setCreatedCertificates((current) => [...current, certificate]);
                      }}
                    />
                  )}
                  <CertificatePrintDialog
                    open={certificatePreviewOpen}
                    certificate={selectedCertificate}
                    onOpenChange={setCertificatePreviewOpen}
                  />
                  {prescriptionPreviewId && (
                    <PrescriptionPreview
                      prescriptionId={prescriptionPreviewId}
                      patientName={patientName}
                      onClose={() => setPrescriptionPreviewId(null)}
                    />
                  )}
                  {!isCompleted && (
                    <div className="flex justify-end border-t pt-3">
                      <Button type="button" onClick={() => void handleStepNavigation(3)}>
                        Continuer vers la clôture<ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>}

                {activeStep === 3 && <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  <div className="min-w-0 space-y-4 lg:col-span-7">
                    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-slate-900">Actes & tarification</h3>
                        <Badge variant="secondary">{formatMoney(invoiceGrossAmount)}</Badge>
                      </div>
                      {availableMedicalActs.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-medium text-slate-500">Actes rapides · tarifs du catalogue</p>
                          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Actes tarifés du catalogue">
                            {availableMedicalActs.map((act) => {
                              const isSelected = selectedMedicalActs.some((item) => item.templateId === act.id);
                              return (
                                <button
                                  key={act.id}
                                  type="button"
                                  aria-pressed={isSelected}
                                  disabled={isSelected || selectedMedicalActs.length >= 29}
                                  onClick={() => setSelectedMedicalActs((current) => [...current, {
                                    lineId: createPricingLineId(),
                                    templateId: act.id,
                                    label: act.label,
                                    category: act.category,
                                    unitPrice: Number(act.unit_price),
                                    quantity: 1,
                                  }])}
                                  className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                    isSelected
                                      ? "border-emerald-300 bg-emerald-100 text-emerald-950"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100"
                                  }`}
                                >
                                  {isSelected ? <Check className="mr-1 h-3 w-3" /> : <Plus className="mr-1 h-3 w-3" />}
                                  {act.label} · {formatMoney(Number(act.unit_price))}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <div className="relative space-y-2">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            value={medicalActSearch}
                            onChange={(event) => setMedicalActSearch(event.target.value)}
                            placeholder="Rechercher un acte ou saisir un montant…"
                            aria-label="Rechercher un acte ou saisir un montant en dirhams"
                            className="pl-9"
                          />
                        </div>
                        {(() => {
                          const customAmountValue = Number(medicalActSearch.trim().replace(",", "."));
                          const isAmountSearch = /^\d+(?:[.,]\d{1,2})?$/.test(medicalActSearch.trim())
                            && customAmountValue > 0
                            && customAmountValue <= 1000000;
                          if (isAmountSearch) {
                            return (
                              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2">
                                <span className="text-sm text-emerald-950">Ajouter un montant personnalisé : <strong>{formatMoney(customAmountValue)}</strong></span>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={selectedMedicalActs.length >= 29}
                                    onClick={() => {
                                      addCustomInvoiceLine("Montant personnalisé", customAmountValue);
                                      setMedicalActSearch("");
                                    }}
                                  >
                                    <Plus className="mr-1 h-3.5 w-3.5" />Ajouter
                                  </Button>
                                  <Button type="button" size="sm" variant="outline" disabled={updateSetting.isPending} onClick={() => void addCustomPrice()}>
                                    Mémoriser
                                  </Button>
                                </div>
                              </div>
                            );
                          }
                          if (medicalActTemplatesLoading) return <p className="text-xs text-slate-500">Chargement du catalogue…</p>;
                          if (medicalActTemplatesError) {
                            return (
                              <div role="alert" className="flex flex-wrap items-center justify-between gap-2 text-xs text-destructive">
                                <span>{medicalActTemplatesErrorDetail instanceof Error ? medicalActTemplatesErrorDetail.message : "Impossible de charger le catalogue d’actes."}</span>
                                <Button type="button" variant="outline" size="sm" onClick={() => void refetchMedicalActTemplates()}>Réessayer</Button>
                              </div>
                            );
                          }
                          const matchingActs = medicalActSearch.trim() ? filteredMedicalActs : [];
                          return matchingActs.length > 0 ? (
                            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5">
                              {matchingActs.slice(0, 10).map((template) => {
                                const isSelected = selectedMedicalActs.some((act) => act.templateId === template.id);
                                return (
                                  <button
                                    key={template.id}
                                    type="button"
                                    aria-pressed={isSelected}
                                    disabled={isSelected || selectedMedicalActs.length >= 29}
                                    onClick={() => {
                                      setSelectedMedicalActs((current) => [...current, {
                                        lineId: createPricingLineId(),
                                        templateId: template.id,
                                        label: template.label,
                                        category: template.category,
                                        unitPrice: Number(template.unit_price),
                                        quantity: 1,
                                      }]);
                                      setMedicalActSearch("");
                                    }}
                                    className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                                  >
                                    <span className="min-w-0 truncate font-medium text-slate-800">{template.label}</span>
                                    <span className="shrink-0 text-xs font-semibold text-slate-600">{formatMoney(Number(template.unit_price))}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : medicalActSearch.trim() ? <p className="text-xs text-slate-500">Aucun acte ne correspond à cette recherche.</p> : null;
                        })()}
                      </div>
                      <div className="overflow-hidden rounded-xl border border-emerald-200/80 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-3.5 py-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                              <FileText className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Facture de la visite</p>
                              <p className="truncate text-sm font-semibold text-slate-900">Honoraires & actes</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0 border-emerald-200 bg-white text-emerald-800">
                            {selectedMedicalActs.length + 1} ligne{selectedMedicalActs.length > 0 ? "s" : ""}
                          </Badge>
                        </div>

                        <div className="divide-y divide-slate-100">
                          <div className="flex items-center gap-3 px-3.5 py-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900">Consultation</p>
                              <p className="text-[11px] text-slate-500">Honoraires du cabinet</p>
                            </div>
                            <Input
                              id="consultation-fee"
                              type="number"
                              min="0"
                              max="1000000"
                              step="0.01"
                              value={grossAmount}
                              onChange={(event) => setGrossAmount(Math.max(0, Number(event.target.value) || 0))}
                              aria-label="Tarif des honoraires de consultation en dirhams"
                              className="h-9 w-28 bg-white text-right font-semibold tabular-nums"
                            />
                            <span className="w-5 text-xs font-medium text-slate-500">DH</span>
                          </div>
                          {selectedMedicalActs.map((act) => (
                            <div key={act.lineId} className="flex flex-wrap items-center gap-2.5 px-3.5 py-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-800">{act.label}</p>
                                {act.templateId && <p className="truncate text-[11px] text-slate-500">{act.category}</p>}
                              </div>
                              <Input
                                type="number"
                                min={act.templateId ? "0.01" : "0"}
                                max="1000000"
                                step="0.01"
                                value={act.unitPrice}
                                onChange={(event) => {
                                  const unitPrice = Math.max(0, Number(event.target.value) || 0);
                                  setSelectedMedicalActs((current) => current.map((item) =>
                                    item.lineId === act.lineId ? { ...item, unitPrice } : item,
                                  ));
                                }}
                                aria-label={`Tarif unitaire de ${act.label} en dirhams`}
                                className="h-9 w-24 text-right tabular-nums"
                              />
                              <span className="text-xs text-slate-500">DH</span>
                              <div className="flex h-8 items-center rounded-md border border-slate-200 bg-slate-50">
                                <button
                                  type="button"
                                  aria-label={`Diminuer la quantité de ${act.label}`}
                                  disabled={act.quantity <= 1}
                                  onClick={() => setSelectedMedicalActs((current) => current.map((item) =>
                                    item.lineId === act.lineId ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item,
                                  ))}
                                  className="h-8 w-7 text-slate-600 disabled:opacity-40"
                                >−</button>
                                <span className="w-5 text-center text-xs font-semibold tabular-nums">{act.quantity}</span>
                                <button
                                  type="button"
                                  aria-label={`Augmenter la quantité de ${act.label}`}
                                  disabled={act.quantity >= 100}
                                  onClick={() => setSelectedMedicalActs((current) => current.map((item) =>
                                    item.lineId === act.lineId ? { ...item, quantity: Math.min(100, item.quantity + 1) } : item,
                                  ))}
                                  className="h-8 w-7 text-slate-600 disabled:opacity-40"
                                >+</button>
                              </div>
                              <button
                                type="button"
                                aria-label={`Retirer ${act.label} de la facture`}
                                onClick={() => setSelectedMedicalActs((current) => current.filter((item) => item.lineId !== act.lineId))}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-dashed border-slate-200 bg-slate-50/80 px-3.5 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Label htmlFor="consultation-discount-type" className="text-xs font-semibold text-slate-600">Réduction</Label>
                            <Select
                              value={discountType}
                              onValueChange={(value) => {
                                if (value === "none" || value === "percentage" || value === "fixed") {
                                  setDiscountType(value);
                                  if (value === "none") setDiscountInput("");
                                }
                              }}
                            >
                              <SelectTrigger id="consultation-discount-type" className="h-9 w-[170px] border-slate-200 bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Aucune</SelectItem>
                                <SelectItem value="percentage">Pourcentage</SelectItem>
                                <SelectItem value="fixed">Montant fixe</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {discountType !== "none" && (
                            <div className="mt-2 flex items-center justify-end gap-2">
                              <Input
                                id="consultation-discount"
                                type="number"
                                min="0"
                                max={discountType === "percentage" ? "100" : String(invoiceGrossAmount)}
                                step={discountType === "percentage" ? "1" : "0.01"}
                                value={discountInput}
                                onChange={(event) => setDiscountInput(event.target.value)}
                                placeholder={discountType === "percentage" ? "Ex. 10 %" : "Montant en DH"}
                                aria-label={discountType === "percentage" ? "Pourcentage de réduction" : "Montant fixe de la réduction"}
                                className="h-9 w-[170px] border-slate-200 bg-white text-right"
                              />
                              <span className="w-5 text-xs text-slate-500">{discountType === "percentage" ? "%" : "DH"}</span>
                            </div>
                          )}
                          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2.5">
                            <span className="text-xs font-semibold text-slate-600">Total brut</span>
                            <span className="text-base font-bold tabular-nums text-slate-900">{formatMoney(invoiceGrossAmount)}</span>
                          </div>
                          {discountAmount > 0 && (
                            <div className="mt-1 flex items-center justify-between text-xs">
                              <span className="text-rose-700">Réduction appliquée</span>
                              <span className="font-semibold tabular-nums text-rose-700">− {formatMoney(discountAmount)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                  <div className="min-w-0 lg:col-span-5">
                  <Card className="sticky top-4 border-slate-200 bg-white shadow-sm">
                    <CardContent className="space-y-5 p-5">
                  {!isCompleted && (
                    <section className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-violet-800" />
                            <h3 className="font-semibold text-violet-950">Suite à prévoir</h3>
                          </div>
                          {followUpEnabled && (
                            <Badge variant="outline" className="border-indigo-200 bg-white text-indigo-800">
                              À confirmer par l’équipe
                            </Badge>
                          )}
                        </div>

                        <fieldset className="space-y-2">
                          <legend className="sr-only">Décision sur la suite de soins</legend>
                          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                            <button
                              type="button"
                              aria-pressed={followUpDecision === "planned"}
                              onClick={() => {
                                setFollowUpDecision("planned");
                                setFollowUpKind((current) => current || "control");
                              }}
                              className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                                followUpDecision === "planned"
                                  ? "border border-indigo-300 bg-indigo-100 text-indigo-950 shadow-sm"
                                  : "text-slate-600 hover:bg-white/70"
                              }`}
                            >
                              <CalendarClock className="h-4 w-4" />Prévoir un RDV
                            </button>
                            <button
                              type="button"
                              aria-pressed={followUpDecision === "none"}
                              onClick={() => {
                                setFollowUpDecision("none");
                                setFollowUpKind(null);
                                setFollowUpDueDate("");
                                setFollowUpDestination("");
                                setFollowUpSpecialty("");
                                setFollowUpContactName("");
                                setFollowUpInstruction("");
                              }}
                              className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
                                followUpDecision === "none"
                                  ? "border border-emerald-300 bg-emerald-100 text-emerald-950 shadow-sm"
                                  : "text-slate-600 hover:bg-white/70"
                              }`}
                            >
                              <CheckCircle2 className="h-4 w-4" />Aucune suite
                            </button>
                          </div>

                          {followUpDecision === "undecided" && (
                            <p role="status" className="text-xs font-medium text-amber-800">
                              Choisissez une option pour clôturer.
                            </p>
                          )}
                          {followUpDecision === "none" && (
                            <p role="status" className="text-xs text-emerald-800">
                              Aucun élément ne sera ajouté à l’agenda ou à la file.
                            </p>
                          )}

                          {followUpEnabled && (
                          <div className="space-y-3 border-t border-violet-200/70 pt-3">
                            <p className="text-xs text-indigo-900">
                              La suite sera ajoutée à la liste de suivi. L’équipe pourra confirmer les modalités avec le patient avant toute planification à l’agenda.
                            </p>
                            <fieldset className="space-y-2">
                              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type de suite</legend>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {([
                                  ["control", "Contrôle / résultats", CalendarClock],
                                  ["exam", "Examen au cabinet", Activity],
                                  ["referral", "Référence vers un spécialiste", Stethoscope],
                                  ["surgery", "Préparation chirurgicale", Scissors],
                                ] as const).map(([kind, label, FollowUpIcon]) => (
                                  <button
                                    key={kind}
                                    type="button"
                                    aria-pressed={followUpKind === kind}
                                    onClick={() => {
                                      setFollowUpKind(kind);
                                      if (kind === "referral") setFollowUpDueDate("");
                                    }}
                                    className={`min-h-10 rounded-lg border px-2 py-2 text-left text-xs font-medium transition-colors ${
                                      followUpKind === kind
                                        ? "border-violet-500 bg-violet-100 text-violet-950 ring-2 ring-violet-100"
                                        : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50"
                                    }`}
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <FollowUpIcon className={`h-3.5 w-3.5 shrink-0 ${
                                        followUpKind === kind ? "text-violet-800" : "text-slate-500"
                                      }`} />
                                      <span>{label}</span>
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </fieldset>

                            {followUpKind && (
                              <>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {followUpKind === "referral" && (
                                    <>
                                      <div className="space-y-1.5">
                                        <Label htmlFor="follow-up-specialty" className="text-xs">Spécialité à consulter</Label>
                                        <Select
                                          value={MEDICAL_SPECIALTIES.find((specialty) => specialty.nameFr === followUpSpecialty)?.id ?? ""}
                                          onValueChange={(specialtyId) => {
                                            const specialty = MEDICAL_SPECIALTIES.find((item) => item.id === specialtyId);
                                            if (specialty) setFollowUpSpecialty(specialty.nameFr);
                                          }}
                                        >
                                          <SelectTrigger id="follow-up-specialty" className="h-9 bg-white">
                                            <SelectValue placeholder="Choisir une spécialité" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {[...MEDICAL_SPECIALTIES]
                                              .sort((a, b) => a.nameFr.localeCompare(b.nameFr, "fr"))
                                              .map((specialty) => (
                                              <SelectItem key={specialty.id} value={specialty.id}>
                                                {specialty.nameFr}
                                              </SelectItem>
                                              ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-1.5">
                                        <Label htmlFor="follow-up-contact-name" className="text-xs">
                                          Nom du spécialiste <span className="font-normal text-slate-400">(facultatif)</span>
                                        </Label>
                                        <Input
                                          id="follow-up-contact-name"
                                          value={followUpContactName}
                                          onChange={(event) => setFollowUpContactName(event.target.value.slice(0, 160))}
                                          placeholder="Ex. Dr El Amrani"
                                          maxLength={160}
                                          className="h-9 bg-white"
                                        />
                                      </div>
                                    </>
                                  )}
                                  {followUpKind === "surgery" && (
                                    <div className="space-y-1.5">
                                      <Label htmlFor="follow-up-destination" className="text-xs">Intervention envisagée</Label>
                                      <Input
                                        id="follow-up-destination"
                                        value={followUpDestination}
                                        onChange={(event) => setFollowUpDestination(event.target.value.slice(0, 160))}
                                        placeholder="Ex. avis / préparation opératoire"
                                        maxLength={160}
                                        required
                                        className="h-9"
                                      />
                                    </div>
                                  )}
                                  {followUpKind !== "referral" && (
                                    <div className="space-y-1.5">
                                      <Label htmlFor="follow-up-due-date" className="text-xs">
                                        {followUpNeedsDate ? "Échéance souhaitée" : "Date envisagée (facultative)"}
                                      </Label>
                                      <Input
                                        id="follow-up-due-date"
                                        type="date"
                                        min={format(new Date(), "yyyy-MM-dd")}
                                        value={followUpDueDate}
                                        onChange={(event) => setFollowUpDueDate(event.target.value)}
                                        required={followUpNeedsDate}
                                        className="h-9"
                                      />
                                    </div>
                                  )}
                                </div>
                                {(followUpKind === "control" || followUpKind === "exam") && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {[7, 15, 30].map((days) => (
                                      <Button
                                        key={days}
                                        type="button"
                                        size="sm"
                                        variant={followUpDueDate === format(addDays(new Date(), days), "yyyy-MM-dd") ? "secondary" : "outline"}
                                        className="h-7 rounded-lg px-2.5 text-xs"
                                        onClick={() => setFollowUpDueDate(format(addDays(new Date(), days), "yyyy-MM-dd"))}
                                      >
                                        {days} j
                                      </Button>
                                    ))}
                                  </div>
                                )}
                                <div className="space-y-1.5">
                                  <Label htmlFor="follow-up-instruction" className="text-xs">
                                    Consigne pour l’équipe <span className="font-normal text-slate-400">(facultatif)</span>
                                  </Label>
                                  <Textarea
                                    id="follow-up-instruction"
                                    value={followUpInstruction}
                                    onChange={(event) => setFollowUpInstruction(event.target.value.slice(0, 500))}
                                    placeholder={
                                      followUpKind === "control"
                                        ? "Ex. recontrôle si les symptômes persistent ou revoir après les résultats de biologie / imagerie."
                                        : followUpKind === "referral"
                                          ? "Motif ou éléments à transmettre au spécialiste."
                                          : followUpKind === "surgery"
                                            ? "Précisions utiles à l’équipe pour la préparation."
                                            : "Examen à organiser au cabinet."
                                    }
                                    maxLength={500}
                                    rows={2}
                                    className="resize-none"
                                  />
                                </div>
                              </>
                            )}
                            {followUpInvalid && (
                              <p className="text-xs font-medium text-amber-800">
                                {followUpNeedsDate && !followUpDueDate
                                  ? "Ajoutez une échéance pour ce contrôle."
                                  : followUpKind === "referral" && !followUpSpecialty
                                    ? "Choisissez la spécialité à consulter."
                                    : followUpKind === "surgery" && !followUpDestination.trim()
                                      ? "Précisez l’intervention."
                                    : "Vérifiez les informations de la suite prévue."}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs text-slate-500">
                                {followUpKind === "referral"
                                  ? "Pas de date requise; le nom du spécialiste est facultatif."
                                  : "Cette suite reste à organiser; aucun rendez-vous n’est créé sans accord du patient."}
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-slate-500 hover:text-rose-700"
                                onClick={() => {
                                  setFollowUpDecision("undecided");
                                  setFollowUpKind(null);
                                  setFollowUpDueDate("");
                                  setFollowUpDestination("");
                                  setFollowUpSpecialty("");
                                  setFollowUpContactName("");
                                  setFollowUpInstruction("");
                                }}
                              >
                                Retirer le suivi
                              </Button>
                            </div>
                          </div>
                        )}
                        </fieldset>
                      </section>
                  )}
                  <section className="space-y-4 border-t border-slate-200 pt-4">
                    <h3 className="font-semibold text-slate-900">Mode de règlement</h3>
                    {consultationPricingError && (
                      <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
                        <span>{consultationPricingErrorDetail instanceof Error ? consultationPricingErrorDetail.message : "Impossible de vérifier les lignes de cette facture."}</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => void refetchConsultationPricing()}>Réessayer</Button>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                      <button
                        type="button"
                        aria-pressed={settlementInstruction === "due_at_reception"}
                        onClick={() => setSettlementInstruction("due_at_reception")}
                        className={`flex min-h-10 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                          settlementInstruction === "due_at_reception"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-600 hover:bg-white"
                        }`}
                      >
                        <CreditCard className="h-4 w-4" />À encaisser
                      </button>
                      <button
                        type="button"
                        aria-pressed={settlementInstruction === "deferred"}
                        onClick={() => setSettlementInstruction((current) => current === "deferred" ? "due_at_reception" : "deferred")}
                        className={`flex min-h-10 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                          settlementInstruction === "deferred" ? "bg-amber-100 text-amber-950 shadow-sm" : "text-slate-600 hover:bg-white"
                        }`}
                      >
                        <Clock3 className="h-4 w-4 text-amber-700" />Différé
                      </button>
                      <button
                        type="button"
                        aria-pressed={settlementInstruction === "free"}
                        onClick={() => {
                          setSettlementInstruction((current) => current === "free" ? "due_at_reception" : "free");
                          if (settlementInstruction !== "free") {
                            setDiscountType("none");
                            setDiscountInput("");
                          }
                        }}
                        className={`flex min-h-10 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                          settlementInstruction === "free" ? "bg-emerald-100 text-emerald-950 shadow-sm" : "text-slate-600 hover:bg-white"
                        }`}
                      >
                        <Check className="h-4 w-4 text-emerald-700" />Gratuit
                      </button>
                    </div>
                    <Card className="border-slate-200 bg-slate-50/50 shadow-none">
                        <CardContent className="space-y-1.5 p-3">
                          <div className="flex justify-between gap-3 text-sm"><span>Total brut</span><span className="font-medium tabular-nums">{formatMoney(invoiceGrossAmount)}</span></div>
                          {selectedMedicalActs.length > 0 && (
                            <div className="flex justify-between gap-3 text-xs text-slate-500"><span>{selectedMedicalActs.length} ligne{selectedMedicalActs.length > 1 ? "s" : ""} d’acte</span><span className="tabular-nums">{formatMoney(medicalActsTotal)}</span></div>
                          )}
                          {discountAmount > 0 && (
                            <div className="flex justify-between gap-3 text-sm font-medium text-rose-700"><span>Réduction</span><span className="tabular-nums">− {formatMoney(discountAmount)}</span></div>
                          )}
                          <div className="flex items-end justify-between gap-3 border-t border-slate-200 pt-2">
                            <span className="text-sm font-semibold text-slate-700">{settlementInstruction === "deferred" ? "Crédit patient" : settlementInstruction === "free" ? "Aucun montant dû" : "Net à payer"}</span>
                            <span className="text-2xl font-bold tabular-nums text-slate-800">{formatMoney(finalAmount)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    {invoiceGrossAmount > 1000000 && (
                      <p role="alert" className="text-xs font-medium text-destructive">Le total de la facture ne peut pas dépasser 1 000 000 DH.</p>
                    )}
                    {settlementInstruction === "deferred" && finalAmount > 0 && (
                      <p role="status" className="text-xs font-medium text-amber-800">
                        Accord donné · {formatMoney(finalAmount)} restera dû sur le dossier patient.
                      </p>
                    )}
                  </section>
                  {!isCompleted && (
                    <div className="space-y-3 border-t border-slate-200 pt-4">
                      <Button
                        type="button"
                        className="w-full bg-emerald-600 py-3 font-medium text-white shadow-sm hover:bg-emerald-700"
                        onClick={() => void handleComplete()}
                        disabled={(settlementInstruction !== "free" && invoiceGrossAmount <= 0) || invoiceGrossAmount > 1000000 || (settlementInstruction === "deferred" && finalAmount <= 0) || discountValue < 0 || (discountType === "fixed" && discountValue > invoiceGrossAmount) || (discountType === "percentage" && discountValue > 100) || followUpDecision === "undecided" || followUpInvalid || consultationPricingLoading || consultationPricingError || savePricing.isPending || saveConsultation.isPending || completeConsultation.isPending}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        {savePricing.isPending || saveConsultation.isPending || completeConsultation.isPending ? "Clôture en cours..." : "Terminer & clôturer"}
                      </Button>
                      <Button type="button" variant="ghost" className="w-full" onClick={() => changeWorkflowStep(2)}>
                        <ChevronLeft className="mr-2 h-4 w-4" />Retour à l’ordonnance
                      </Button>
                      <p className="text-center text-[11px] text-slate-400">Ctrl + Entrée pour clôturer</p>
                    </div>
                  )}
                  {isCompleted && entry.invoices && (
                    <p className="rounded-lg bg-slate-50 p-3 text-sm text-muted-foreground">
                      Facture {entry.invoices.numero} · {formatMoney(entry.invoices.montant)}
                    </p>
                  )}
                    </CardContent>
                  </Card>
                  </div>
                  </div>
                </div>}
              </CardContent>
            </Card>
          )}
        </section>

        <aside className={`min-w-0 space-y-3 ${isClinicalSidebarOpen ? "" : "hidden"}`}>
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <CardHeader className="border-b bg-gradient-to-r from-teal-50 to-white px-4 py-2.5"><CardTitle className="flex items-center gap-2 text-sm"><UserRound className="h-4 w-4 text-teal-700" />Contexte médical</CardTitle></CardHeader>
            <CardContent className="space-y-3 p-3 text-sm">
              {recordError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900">
                  <p className="font-medium">Historique médical indisponible</p>
                  <Button variant="link" className="h-auto px-0 text-rose-800" onClick={() => void refetchMedicalRecord()}>Réessayer le chargement</Button>
                </div>
              ) : recordLoading ? (
                <div className="space-y-4" aria-label="Chargement du contexte médical">
                  {[1, 2, 3].map((section) => <div key={section} className="space-y-2"><div className="h-3 w-24 animate-pulse rounded bg-slate-100" /><div className="h-8 animate-pulse rounded bg-slate-50" /></div>)}
                </div>
              ) : (
                <>
                  <details className="group rounded-lg border border-slate-200 bg-white">
                    <summary className="list-none cursor-pointer px-3 py-2 text-xs font-semibold text-slate-700 marker:hidden">
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <span>Repères cliniques du patient</span>
                          {antecedentCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800" aria-label={`${antecedentCount} antécédent${antecedentCount > 1 ? "s" : ""}`}>
                              <Activity className="h-3 w-3" />{antecedentCount} antécédent{antecedentCount > 1 ? "s" : ""}
                            </span>
                          )}
                          {treatmentCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800" aria-label={`${treatmentCount} traitement${treatmentCount > 1 ? "s" : ""}`}>
                              <Pill className="h-3 w-3" />{treatmentCount} traitement{treatmentCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
                      </span>
                    </summary>
                    <div className="space-y-2 border-t px-3 py-2.5">
                      <div><p className="mb-0.5 font-medium text-slate-700">Antécédents</p><p className="whitespace-pre-wrap text-muted-foreground">{medicalRecord?.antecedents || "Aucun antécédent renseigné"}</p></div>
                      <div className="border-t pt-2"><p className="mb-0.5 font-medium text-slate-700">Traitements structurés · statut</p><p className="whitespace-pre-wrap text-muted-foreground">{medicalRecord?.traitements_structures.map((medication) => `${medication.name} — ${medication.status === "active" ? "confirmé actuel" : medication.status === "prescribed" || (medication.status === "needs_confirmation" && medication.source === "clinic_prescription") ? "prescrit · début non confirmé" : medication.status === "needs_confirmation" ? "prise à confirmer" : medication.status === "suspended" ? "suspendu" : medication.status === "stopped" ? "arrêté" : medication.status === "completed" ? "terminé" : "non commencé"}`).join("\n") || "Aucun traitement structuré"}</p></div>
                      {!!medicalRecord?.traitements?.trim() && <div className="border-t pt-2"><p className="mb-0.5 font-medium text-slate-700">Ancien texte libre · à confirmer</p><p className="whitespace-pre-wrap text-muted-foreground">{medicalRecord.traitements}</p></div>}
                    </div>
                  </details>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-teal-200 shadow-sm">
            <CardHeader className="border-b bg-gradient-to-r from-teal-50 to-white px-4 py-2.5">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-teal-800" />
                Pré-consultation du jour
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3 text-sm">
              {intakeLoading ? (
                <p className="text-xs text-muted-foreground">Chargement des constantes recueillies…</p>
              ) : intakeError ? (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                  <p>La transmission infirmière n’est pas disponible.</p>
                  <Button variant="link" className="h-auto px-0 text-rose-800" onClick={() => void refetchIntake()}>Réessayer le chargement</Button>
                </div>
              ) : intakeContext?.current_intake ? (
                <>
                  <p className="text-[10px] text-slate-500">
                    Recueillie le {format(new Date(intakeContext.current_intake.updated_at), "d MMMM · HH:mm", { locale: fr })}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["Poids", intakeContext.current_intake.weight_kg !== null ? `${intakeContext.current_intake.weight_kg} kg` : null],
                      ["Taille", intakeContext.current_intake.height_cm !== null ? `${intakeContext.current_intake.height_cm} cm` : null],
                      ["Température", intakeContext.current_intake.temperature_c !== null ? `${intakeContext.current_intake.temperature_c} °C` : null],
                      ["Tension artérielle", intakeContext.current_intake.systolic_bp !== null && intakeContext.current_intake.diastolic_bp !== null ? `${intakeContext.current_intake.systolic_bp}/${intakeContext.current_intake.diastolic_bp} mmHg` : null],
                      ["Pouls", intakeContext.current_intake.pulse_bpm !== null ? `${intakeContext.current_intake.pulse_bpm} bpm` : null],
                      ["SpO₂", intakeContext.current_intake.oxygen_saturation !== null ? `${intakeContext.current_intake.oxygen_saturation} %` : null],
                      ["Fréquence respiratoire", intakeContext.current_intake.respiratory_rate !== null ? `${intakeContext.current_intake.respiratory_rate}/min` : null],
                      ["Douleur", intakeContext.current_intake.pain_score !== null ? `${intakeContext.current_intake.pain_score}/10` : null],
                    ].filter((item): item is [string, string] => item[1] !== null).map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-slate-50 px-2.5 py-2">
                        <p className="text-[10px] font-medium text-slate-500">{label}</p>
                        <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>
                  {[
                    ["Motif selon le patient", intakeContext.current_intake.reason_for_visit],
                    ["Antécédents rapportés", intakeContext.current_intake.antecedents_reported],
                    ["Traitements rapportés", intakeContext.current_intake.treatments_reported],
                    ["Note de transmission", intakeContext.current_intake.nursing_note],
                  ].filter((item): item is [string, string] => Boolean(item[1]?.trim())).map(([label, value]) => (
                    <div key={label} className="border-t border-slate-100 pt-2">
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                      <p className="whitespace-pre-wrap text-xs leading-5 text-slate-800">{value}</p>
                    </div>
                  ))}
                  <p className="rounded-md bg-teal-50 px-2.5 py-2 text-[10px] leading-4 text-teal-900">
                    Données de recueil rapportées par l’équipe soignante ; à interpréter et valider médicalement.
                  </p>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center">
                  <p className="text-xs font-medium text-slate-600">Aucune pré-consultation enregistrée pour ce passage.</p>
                  <p className="mt-1 text-[10px] text-slate-500">Les constantes et déclarations restent facultatives.</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-violet-100 shadow-sm">
            <CardHeader className="border-b bg-gradient-to-r from-violet-50 to-white px-4 py-2.5">
              <CardTitle className="flex items-center gap-2 text-sm">
                <History className="h-4 w-4 text-violet-700" />
                Dernière consultation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 text-sm">
              {latestPatientConsultationLoading ? (
                <p className="text-xs text-muted-foreground">Chargement de la consultation précédente…</p>
              ) : latestPatientConsultationError ? (
                <p role="status" className="text-xs text-rose-700">Historique récent indisponible.</p>
              ) : latestPatientConsultation ? (
                <>
                  <p className="text-xs font-medium text-violet-800">
                    {format(new Date(latestPatientConsultation.completed_at || latestPatientConsultation.updated_at), "d MMMM yyyy", { locale: fr })}
                  </p>
                  {latestPatientConsultation.motif?.trim() && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Motif</p>
                      <p className="line-clamp-2 break-words text-xs text-slate-800">{latestPatientConsultation.motif}</p>
                    </div>
                  )}
                  {latestPatientConsultation.examen_clinique?.trim() && (
                    <details className="group rounded-md border border-violet-100 bg-violet-50/40">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-800 marker:hidden">
                        Examen clinique
                        <ChevronDown className="h-3 w-3 shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="border-t border-violet-100 px-2 py-1.5 whitespace-pre-wrap break-words text-xs text-slate-800">
                        {formatClinicalNotesForDisplay(latestPatientConsultation.examen_clinique)}
                      </p>
                    </details>
                  )}
                  {latestPatientConsultation.diagnostic?.trim() && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Évaluation</p>
                      <p className="line-clamp-3 whitespace-pre-wrap break-words text-xs text-slate-800">
                        {formatClinicalNotesForDisplay(latestPatientConsultation.diagnostic)}
                      </p>
                    </div>
                  )}
                  {latestPatientConsultation.plan?.trim() && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Conduite à tenir</p>
                      <p className="line-clamp-3 whitespace-pre-wrap break-words text-xs text-slate-800">
                        {formatClinicalNotesForDisplay(latestPatientConsultation.plan)}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Aucune consultation terminée antérieure.</p>
              )}
              {!latestPatientConsultationError && latestPatientPrescriptions.length > 0 && (
                <details className="group rounded-md border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-xs font-semibold text-slate-700 marker:hidden">
                    <span>Prescriptions antérieures</span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-violet-800">
                      <FileText className="h-3 w-3" />{latestPatientPrescriptions.length}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-2 border-t p-2">
                    {latestPatientPrescriptions.map((prescription) => (
                      <section key={prescription.id} className="space-y-1 rounded border border-white bg-white p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            {prescription.prescription_type === "laboratory"
                              ? "Analyses"
                              : prescription.prescription_type === "imaging"
                                ? "Imagerie"
                                : "Ordonnance"}
                          </p>
                          <time className="text-[10px] text-slate-500">
                            {format(new Date(prescription.created_at), "d MMM yyyy", { locale: fr })}
                          </time>
                        </div>
                        {prescription.notes?.trim() && <p className="text-xs text-slate-700">{prescription.notes}</p>}
                        {prescription.items.length > 0 ? (
                          <ul className="space-y-1 text-xs text-slate-700">
                            {prescription.items.map((item, index) => (
                              <li key={`${prescription.id}-${index}`} className="break-words">
                                <span className="font-medium">{item.nom_medicament}</span>
                                {item.dosage ? ` · ${item.dosage}` : ""}
                                {item.request_type === "medication" && item.posologie ? ` · ${item.posologie}` : ""}
                                {item.duree ? ` · ${item.duree}` : ""}
                                {item.request_details?.modality ? ` · ${item.request_details.modality}` : ""}
                                {item.request_details?.region ? ` · ${item.request_details.region}` : ""}
                              </li>
                            ))}
                          </ul>
                        ) : <p className="text-xs text-slate-500">Détail non disponible.</p>}
                      </section>
                    ))}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
          {activeStep === 3 ? (
            <Card className="w-full min-w-0 max-w-full overflow-hidden border-emerald-200 shadow-sm lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100vh-2rem)] lg:flex-col">
              <CardHeader className="shrink-0 border-b bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm"><ClipboardCheck className="h-4 w-4 text-emerald-700" />Relecture avant clôture</CardTitle>
                  <Badge variant="outline" className="shrink-0 border-emerald-200 bg-white text-emerald-800">
                    {reviewCompletionCount}/{synthesisSections.length} renseignées
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-4 text-muted-foreground">Vérifiez les éléments saisis et complétez les rubriques utiles à cette visite.</p>
              </CardHeader>
              <CardContent className="min-h-0 min-w-0 space-y-2 overflow-y-auto p-3 lg:flex-1">
                {closureErrorMessage && (
                  <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs leading-5 text-rose-900">
                    {closureErrorMessage}
                    {closureErrorDetail && (
                      <details className="mt-2 border-t border-rose-200 pt-2">
                        <summary className="cursor-pointer font-semibold">Détail technique pour le support</summary>
                        <code className="mt-1 block break-words text-[11px]">{closureErrorDetail}</code>
                      </details>
                    )}
                  </div>
                )}
                {closureFailureStage && !closureErrorMessage && (
                  <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                    {closureFailureStage === "saving"
                      ? "Enregistrement de la consultation…"
                      : closureFailureStage === "pricing"
                        ? "Enregistrement du tarif…"
                        : "Confirmation de la clôture…"}
                  </p>
                )}
                {synthesisSections.map((section) => {
                  const SectionIcon = section.icon;
                  const completed = getSynthesisCompletion(section);
                  const historyGroups = section.title === "Interrogatoire"
                    ? groupSynthesisByMotif(buildHistorySynthesis(section.value))
                    : [];
                  const examinationGroups = section.title === "Examen clinique"
                    ? groupSynthesisByMotif(buildExaminationSynthesis(section.value))
                    : [];
                  const editStep: 1 | 2 = ["Motif", "Interrogatoire"].includes(section.title) ? 1 : 2;
                  return (
                    <section
                      key={section.title}
                      className={`min-w-0 rounded-lg border p-2.5 ${
                        completed ? "border-slate-200 bg-white" : "border-amber-200 bg-amber-50/50"
                      }`}
                    >
                      <div className="mb-1.5 flex min-w-0 items-center gap-2">
                        <SectionIcon className={`h-3.5 w-3.5 shrink-0 ${completed ? "text-emerald-700" : "text-amber-700"}`} aria-hidden="true" />
                        <h3 className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{section.title}</h3>
                        <span className={`shrink-0 text-[10px] font-medium ${completed ? "text-emerald-700" : "text-amber-800"}`}>
                          {completed ? "Renseigné" : "À vérifier"}
                        </span>
                        {!isCompleted && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 shrink-0 px-1.5 text-[10px] text-slate-600 hover:text-slate-900"
                            onClick={() => {
                              changeWorkflowStep(1);
                              changeClinicalStep(editStep);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            Revoir
                          </Button>
                        )}
                      </div>
                      {historyGroups.length > 0 ? (
                        <div className="space-y-1.5">
                          {historyGroups.map(([motif, categories]) => (
                            <div key={motif} className="min-w-0 rounded-md bg-slate-50 px-2 py-1.5">
                              {motif !== "Commun" && <p className="mb-1 break-words text-[11px] font-semibold text-slate-800">{motif}</p>}
                              {categories.map(([category, rows]) => (
                                <div key={`${motif}-${category}`} className="mb-1 last:mb-0">
                                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{category}</p>
                                  <ul className="mt-0.5 space-y-0.5">
                                    {rows.map((row, index) => (
                                      <li key={`${motif}-${category}-${index}`} className="break-words text-xs leading-4 text-slate-800 [overflow-wrap:anywhere]">
                                        <span className="mr-1 text-slate-400">•</span>{formatHistorySynthesisRow(row)}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : examinationGroups.length > 0 ? (
                        <div className="space-y-1.5">
                          {examinationGroups.map(([motif, categories]) => (
                            <div key={motif} className="min-w-0 rounded-md bg-slate-50 px-2 py-1.5">
                              {motif !== "Commun" && <p className="mb-1 break-words text-[11px] font-semibold text-slate-800">{motif}</p>}
                              {categories.map(([category, rows]) => (
                                <div key={`${motif}-${category}`} className="mb-1 last:mb-0">
                                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{category}</p>
                                  <ul className="mt-0.5 space-y-0.5">
                                    {rows.map((row, index) => (
                                      <li key={`${motif}-${category}-${index}`} className="break-words text-xs leading-4 text-slate-800 [overflow-wrap:anywhere]">
                                        <span className="mr-1 text-slate-400">•</span>
                                        {row.label ? <><span className="font-medium">{row.label} : </span>{row.value}</> : row.value}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : section.value.trim() ? (
                        <>
                          <p className="line-clamp-4 whitespace-pre-wrap break-words text-xs leading-4 text-slate-800 [overflow-wrap:anywhere]">
                            {section.value.trim()}
                          </p>
                          {section.title === "Évaluation et diagnostic" && cim11Proposals.length > 0 && (
                            <div className="mt-1 space-y-1 border-t border-amber-100 pt-1">
                              {cim11Proposals.map(({ motif, code }) => (
                                <p key={`${motif}-${code}`} className="break-words text-xs leading-4 text-amber-950">
                                  Proposition CIM-11 à valider · {motif}{code ? ` · ${code}` : ""}
                                </p>
                              ))}
                            </div>
                          )}
                        </>
                      ) : section.title === "Évaluation et diagnostic" && cim11Proposals.length > 0 ? (
                        <div className="space-y-1">
                          {cim11Proposals.map(({ motif, code }) => (
                            <p key={`${motif}-${code}`} className="break-words text-xs leading-4 text-amber-950">
                              Proposition CIM-11 à valider · {motif}{code ? ` · ${code}` : ""}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs italic leading-4 text-slate-500">Non renseigné · à vérifier si pertinent.</p>
                      )}
                    </section>
                  );
                })}
                <section className="space-y-1.5 rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5">
                  <h3 className="text-[10px] font-bold uppercase tracking-wide text-indigo-800">Documents de cette visite</h3>
                  {createdPrescriptions.length || createdCertificates.length ? (
                    <ul className="space-y-1 text-xs text-slate-800">
                      {createdPrescriptions.map((document) => (
                        <li key={document.id} className="break-words">
                          {document.type === "laboratory" ? "Bon d’analyses" : document.type === "imaging" ? "Bon d’imagerie" : "Ordonnance"}
                          {document.items.length ? ` · ${document.items.join(", ")}` : ""}
                        </li>
                      ))}
                      {createdCertificates.map((certificate) => (
                        <li key={certificate.id} className="break-words">
                          Certificat · {certificate.type.replaceAll("_", " ")}{certificate.motif ? ` · ${certificate.motif}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-slate-600">Aucun document créé pendant cette visite.</p>}
                </section>
                <section className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5">
                  <h3 className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                    {settlementInstruction === "free" ? "Consultation gratuite" : settlementInstruction === "deferred" ? "Crédit patient" : "À encaisser au secrétariat"}
                  </h3>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-700">
                    <span>{formatMoney(invoiceGrossAmount)} − {formatMoney(discountAmount)} de réduction</span>
                    <strong className="text-sm text-emerald-800">{formatMoney(finalAmount)}</strong>
                  </div>
                  {settlementInstruction === "deferred" && <p className="mt-1 text-[10px] text-amber-800">Reste dû · inscrit au dossier patient</p>}
                  {settlementInstruction === "due_at_reception" && <p className="mt-1 text-[10px] text-emerald-800">À encaisser par l’assistante ou la secrétaire</p>}
                  {settlementInstruction === "free" && <p className="mt-1 text-[10px] text-emerald-800">Aucun montant dû</p>}
                </section>
                <section className={`rounded-lg border p-2.5 ${followUpDecision === "planned" ? "border-indigo-100 bg-indigo-50/60" : followUpDecision === "none" ? "border-emerald-100 bg-emerald-50/60" : "border-amber-100 bg-amber-50/60"}`}>
                  <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Suite de soins</h3>
                  <p className="mt-1 text-xs font-medium text-slate-800">
                    {followUpDecision === "planned"
                      ? `${followUpKind === "control" ? "Contrôle" : followUpKind === "exam" ? "Examen" : followUpKind === "referral" ? "Référence vers un spécialiste" : "Planification chirurgicale"}${followUpDueDate ? ` · ${format(parseISO(followUpDueDate), "d MMMM yyyy", { locale: fr })}` : ""}`
                      : followUpDecision === "none" ? "Aucune suite nécessaire" : "Décision non renseignée"}
                  </p>
                  {followUpDecision === "planned" && (followUpDestination || followUpSpecialty || followUpContactName || followUpInstruction) && (
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-700">
                      {[followUpDestination, followUpSpecialty, followUpContactName, followUpInstruction].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {followUpDecision === "planned" && <p className="mt-1 text-[10px] text-indigo-800">À confirmer par l’équipe</p>}
                </section>
              </CardContent>
            </Card>
          ) : (
          <Card className="w-full min-w-0 max-w-full overflow-hidden border-indigo-100 shadow-sm lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100vh-2rem)] lg:flex-col">
            <CardHeader className="shrink-0 border-b bg-gradient-to-r from-indigo-50 via-white to-blue-50 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-indigo-700" />Aide à la décision clinique</CardTitle>
                <Badge variant="outline" className="border-indigo-100 bg-white text-indigo-700">En direct</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Relisez vos notes; aucune validation médicale automatique.</p>
            </CardHeader>
            <CardContent className="min-h-0 min-w-0 max-w-full space-y-3 overflow-x-hidden overflow-y-auto p-3 lg:flex-1">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-slate-500">Rubriques avec notes</p>
                <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                  {synthesisSections.filter((section) =>
                    section.title === "Examen clinique"
                      ? buildExaminationSynthesis(section.value).length > 0
                      : Boolean(section.value.trim()),
                  ).length}/{synthesisSections.length}
                </Badge>
              </div>
              <Accordion type="single" collapsible className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 px-3">
                {synthesisSections.map((section) => {
                  const SectionIcon = section.icon;
                  const historyGroups = section.title === "Interrogatoire"
                    ? buildHistorySynthesis(section.value)
                    : [];
                  const examinationGroups = section.title === "Examen clinique"
                    ? buildExaminationSynthesis(section.value)
                    : [];
                  const historyMotifGroups = groupSynthesisByMotif(historyGroups);
                  const examinationMotifGroups = groupSynthesisByMotif(examinationGroups);
                  const colorClass = {
                    blue: "bg-blue-100 text-blue-700",
                    teal: "bg-teal-100 text-teal-700",
                    emerald: "bg-emerald-100 text-emerald-700",
                    amber: "bg-amber-100 text-amber-800",
                    violet: "bg-violet-100 text-violet-700",
                  }[section.color];
                  const previewText = section.title === "Examen clinique"
                    ? examinationGroups
                      .flatMap(([, rows]) => rows.map((row) => [row.label, row.value].filter(Boolean).join(" : ")))
                      .join(" · ")
                    : section.title === "Évaluation et diagnostic"
                      ? [
                          section.value.replace(/^\[\[.*?\]\]\s*/gm, "").replace(/\s+/g, " ").trim(),
                          ...cim11Proposals.map(({ motif, code }) => `CIM-11 à valider · ${motif} : ${code}`),
                        ].filter(Boolean).join(" · ")
                    : section.value
                      .replace(/^\[\[.*?\]\]\s*/gm, "")
                      .replace(/\s+/g, " ")
                      .trim();
                  const hasSectionContent = section.title === "Examen clinique"
                    ? examinationGroups.length > 0
                    : section.title === "Évaluation et diagnostic"
                      ? Boolean(section.value.trim() || cim11Proposals.length)
                    : Boolean(section.value.trim());

                  return (
                    <AccordionItem key={section.title} value={section.title} className="min-w-0 border-slate-100 last:border-0">
                      <AccordionTrigger className="w-full min-w-0 gap-2 py-2.5 text-left hover:no-underline">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                          <SectionIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-800">{section.title}</span>
                            {hasSectionContent
                              ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Section renseignée" />
                              : <Circle className="h-4 w-4 shrink-0 text-slate-300" aria-label="Section non renseignée" />}
                          </span>
                          <span className="mt-0.5 block truncate text-xs font-normal text-slate-500">
                            {previewText || (section.title === "Examen clinique" ? "Aucune constatation clinique notée" : "Aucune note")}
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="min-w-0 max-w-full overflow-x-hidden pb-3 pl-9 [overflow-wrap:anywhere]">
                        {section.title === "Examen clinique" ? examinationGroups.length > 0 ? (
                          <div className="min-w-0 max-w-full space-y-2">
                            <div className="flex items-center justify-between rounded-md border border-emerald-100 bg-emerald-50/60 px-2.5 py-1.5">
                              <span className="text-xs font-medium text-emerald-900">Constatations documentées</span>
                              <Badge variant="secondary" className="tabular-nums">
                                {examinationGroups.reduce((total, [, rows]) => total + rows.length, 0)}
                              </Badge>
                            </div>
                            {examinationMotifGroups.map(([motif, categories]) => (
                              <div key={motif} className="min-w-0 max-w-full rounded-lg border border-emerald-100 bg-emerald-50/30 px-3 py-2">
                                {motif !== "Commun" && <p className="text-xs font-semibold text-emerald-950">{motif}</p>}
                                <div className={motif === "Commun" ? "space-y-2" : "mt-1.5 space-y-2"}>
                                  {categories.map(([category, rows]) => (
                                    <div key={`${motif}-${category}`}>
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">{category}</p>
                                      <ul className="mt-0.5 space-y-1">
                                        {rows.map((row, index) => (
                                          <li key={`${motif}-${category}-${index}`} className="min-w-0 break-words text-sm leading-5 text-slate-800 [overflow-wrap:anywhere]">
                                            <span className="mr-1.5 text-emerald-500">•</span>
                                            {row.label && <span className="font-medium text-slate-600">{row.label.replace(/\s*\([^)]*\)/g, "")}: </span>}
                                            {row.value}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="py-2 text-sm italic text-slate-500">Aucune constatation clinique notée.</p>
                        ) : section.title === "Interrogatoire" && historyGroups.length > 0 ? (
                          <div className="min-w-0 max-w-full space-y-2">
                            {historyMotifGroups.map(([motif, categories]) => (
                              <div key={motif} className="min-w-0 max-w-full rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2">
                                {motif !== "Commun" && <p className="text-xs font-semibold text-slate-800">{motif}</p>}
                                <div className={motif === "Commun" ? "space-y-2" : "mt-1.5 space-y-2"}>
                                  {categories.map(([category, rows]) => (
                                    <div key={`${motif}-${category}`}>
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{category}</p>
                                      {category === "Symptômes associés" || category === "Symptômes présents" ? (
                                        <p className="mt-0.5 break-words text-sm leading-5 text-slate-800 [overflow-wrap:anywhere]">{rows.map(formatHistorySynthesisRow).join(" · ")}</p>
                                      ) : (
                                        <ul className="mt-0.5 space-y-0.5">
                                          {rows.map((row, index) => (
                                            <li key={`${motif}-${category}-${index}`} className="min-w-0 break-words text-sm leading-5 text-slate-800 [overflow-wrap:anywhere]">
                                              <span className="mr-1.5 text-slate-400">•</span>{formatHistorySynthesisRow(row)}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : section.title === "Évaluation et diagnostic" ? (
                          <div className="space-y-2">
                            {section.value.trim() ? (
                              <p className="min-w-0 max-w-full whitespace-pre-wrap break-words text-sm leading-5 text-slate-800 [overflow-wrap:anywhere]">
                                {section.value}
                              </p>
                            ) : null}
                            {cim11Proposals.map(({ motif, code, sourceUrl }) => (
                              <div key={`${motif}-${code}`} className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50/70 px-2.5 py-2">
                                <span className="text-xs font-medium text-amber-950">Proposition CIM-11 à valider · {motif}</span>
                                <Badge variant="secondary" className="border border-amber-200 bg-white text-amber-950">{code}</Badge>
                                {sourceUrl && (
                                  <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-teal-800 underline underline-offset-2">
                                    Source OMS <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            ))}
                            {!section.value.trim() && cim11Proposals.length === 0 && (
                              <p className="min-w-0 max-w-full py-2 text-sm italic text-slate-500">Aucune note ni proposition CIM-11 disponible.</p>
                            )}
                          </div>
                        ) : (
                          <p className="min-w-0 max-w-full whitespace-pre-wrap break-words text-sm leading-5 text-slate-800 [overflow-wrap:anywhere]">
                            {section.value.trim() || <span className="italic text-slate-400">Aucune note saisie dans cette section.</span>}
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Aperçu fidèle aux informations saisies par le médecin; les sections non renseignées ne sont pas interprétées.
              </div>
            </CardContent>
          </Card>
          )}
        </aside>
      </main>
    </div>
  );
};

export default Consultation;
