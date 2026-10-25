import { useMemo, useState } from "react";
import { Activity, Baby, BadgeCheck, Bone, Brain, Building2, Check, ClipboardList, Droplets, Ear, Eye, FilePlus2, Fingerprint, HeartPulse, Home, Microscope, Pencil, Plus, Scissors, Search, ShieldCheck, Sparkles, Stethoscope, Trash2, Wind, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";
import {
  MedicalActTemplate,
  MedicalActTemplateInput,
  useArchiveMedicalActTemplate,
  useMedicalActTemplates,
  useSaveMedicalActTemplate,
} from "@/hooks/useMedicalActTemplates";
import { MEDICAL_ACT_SUGGESTIONS, MedicalActSuggestion } from "@/data/medicalActSuggestions";

type ActForm = {
  label: string;
  category: string;
  ngapCode: string;
  unitPrice: string;
  isActive: boolean;
};

type ActLocationFilter = "Tous les lieux" | "Au cabinet" | "À domicile";

const EMPTY_FORM: ActForm = {
  label: "",
  category: "Consultation",
  ngapCode: "",
  unitPrice: "",
  isActive: true,
};

const CABINET_TARIFF_CHIPS = [150, 200, 250, 300, 350, 500, 700];

const formatPrice = (value: number) =>
  `${value.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;

const normalizeSearchText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-MA");

const getCategoryStyle = (category: string): { Icon: LucideIcon; chip: string; icon: string } => {
  const normalized = normalizeSearchText(category);
  if (normalized.includes("domicile")) {
    return { Icon: Home, chip: "border-orange-200 bg-orange-50 text-orange-800", icon: "bg-orange-100 text-orange-700" };
  }
  if (normalized.includes("cabinet")) {
    return { Icon: Building2, chip: "border-sky-200 bg-sky-50 text-sky-800", icon: "bg-sky-100 text-sky-700" };
  }
  if (normalized.includes("cardio")) {
    return { Icon: HeartPulse, chip: "border-rose-200 bg-rose-50 text-rose-800", icon: "bg-rose-100 text-rose-700" };
  }
  if (normalized.includes("dermato")) {
    return { Icon: Fingerprint, chip: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800", icon: "bg-fuchsia-100 text-fuchsia-700" };
  }
  if (normalized.includes("gastro")) {
    return { Icon: Microscope, chip: "border-amber-200 bg-amber-50 text-amber-800", icon: "bg-amber-100 text-amber-700" };
  }
  if (normalized.includes("gyneco") || normalized.includes("obstet")) {
    return { Icon: Baby, chip: "border-pink-200 bg-pink-50 text-pink-800", icon: "bg-pink-100 text-pink-700" };
  }
  if (normalized.includes("neurolog")) {
    return { Icon: Brain, chip: "border-violet-200 bg-violet-50 text-violet-800", icon: "bg-violet-100 text-violet-700" };
  }
  if (normalized.includes("ophtalmo")) {
    return { Icon: Eye, chip: "border-cyan-200 bg-cyan-50 text-cyan-800", icon: "bg-cyan-100 text-cyan-700" };
  }
  if (normalized === "orl" || normalized.includes("oto-rhino")) {
    return { Icon: Ear, chip: "border-indigo-200 bg-indigo-50 text-indigo-800", icon: "bg-indigo-100 text-indigo-700" };
  }
  if (normalized.includes("pneumo") || normalized.includes("allerg")) {
    return { Icon: Wind, chip: "border-sky-200 bg-sky-50 text-sky-800", icon: "bg-sky-100 text-sky-700" };
  }
  if (normalized.includes("rhumato")) {
    return { Icon: Bone, chip: "border-orange-200 bg-orange-50 text-orange-800", icon: "bg-orange-100 text-orange-700" };
  }
  if (normalized.includes("urolo")) {
    return { Icon: Droplets, chip: "border-blue-200 bg-blue-50 text-blue-800", icon: "bg-blue-100 text-blue-700" };
  }
  if (normalized.includes("examen") || normalized.includes("exploration")) {
    return { Icon: Activity, chip: "border-violet-200 bg-violet-50 text-violet-800", icon: "bg-violet-100 text-violet-700" };
  }
  if (normalized.includes("chirurgie") || normalized.includes("chirurgical")) {
    return { Icon: Scissors, chip: "border-rose-200 bg-rose-50 text-rose-800", icon: "bg-rose-100 text-rose-700" };
  }
  if (normalized.includes("consultation") || normalized.includes("suivi")) {
    return { Icon: Stethoscope, chip: "border-teal-200 bg-teal-50 text-teal-800", icon: "bg-teal-100 text-teal-700" };
  }
  if (normalized.includes("soin") || normalized.includes("infirm")) {
    return { Icon: HeartPulse, chip: "border-pink-200 bg-pink-50 text-pink-800", icon: "bg-pink-100 text-pink-700" };
  }
  return { Icon: ClipboardList, chip: "border-amber-200 bg-amber-50 text-amber-800", icon: "bg-amber-100 text-amber-700" };
};

const MedicalActTemplates = () => {
  const navigate = useNavigate();
  const { data: templates = [], isLoading, isError, refetch } = useMedicalActTemplates();
  const saveTemplate = useSaveMedicalActTemplate();
  const archiveTemplate = useArchiveMedicalActTemplate();
  const { getSettingValue, updateSetting } = useSettings();
  const [form, setForm] = useState<ActForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actSearch, setActSearch] = useState("");
  const [actCategoryFilter, setActCategoryFilter] = useState("Toutes les catégories");
  const [actLocationFilter, setActLocationFilter] = useState<ActLocationFilter>("Tous les lieux");
  const [showArchived, setShowArchived] = useState(false);

  const showNgapCodes = getSettingValue("show_ngap_codes") === "true";
  const activeTemplateCount = templates.filter((template) => template.is_active).length;
  const pricedTemplateCount = templates.filter((template) => template.is_active && template.unit_price !== null).length;
  const filteredTemplates = useMemo(() => {
    const normalizedSearch = normalizeSearchText(search.trim());
    return templates.filter((template) => {
      if (template.is_active === showArchived) return false;
      if (!normalizedSearch) return true;
      return [template.label, template.category, template.ngap_code || ""]
        .some((value) => normalizeSearchText(value).includes(normalizedSearch));
    });
  }, [search, showArchived, templates]);
  const suggestionCountByCategory = useMemo(
    () => MEDICAL_ACT_SUGGESTIONS.reduce<Record<string, number>>((counts, suggestion) => {
      counts[suggestion.category] = (counts[suggestion.category] || 0) + 1;
      return counts;
    }, {}),
    [],
  );
  const suggestionCategories = useMemo(
    () => Object.keys(suggestionCountByCategory),
    [suggestionCountByCategory],
  );
  const specialtyCategories = useMemo(
    () => suggestionCategories
      .filter((category) => {
        const normalized = normalizeSearchText(category);
        return !normalized.startsWith("actes ")
          && !normalized.startsWith("consultations ")
          && !normalized.startsWith("visites ");
      })
      .sort((a, b) => suggestionCountByCategory[b] - suggestionCountByCategory[a] || a.localeCompare(b, "fr")),
    [suggestionCategories, suggestionCountByCategory],
  );
  const medicalActSuggestions = useMemo(
    () => [
      ...MEDICAL_ACT_SUGGESTIONS,
      ...specialtyCategories.map((category): MedicalActSuggestion => ({
        category,
        label: `Consultation au cabinet · ${category}`,
        ngap_code: null,
      })),
    ],
    [specialtyCategories],
  );
  const actPickerSuggestions = useMemo(() => {
    const normalizedSearch = normalizeSearchText(actSearch.trim());
    return medicalActSuggestions
      .filter((suggestion) => {
        const context = normalizeSearchText(`${suggestion.category} ${suggestion.label}`);
        return (actCategoryFilter === "Toutes les catégories" || suggestion.category === actCategoryFilter)
          && (actLocationFilter === "Tous les lieux"
            || (actLocationFilter === "Au cabinet" && !context.includes("domicile"))
            || (actLocationFilter === "À domicile" && !context.includes("cabinet")))
          && (!normalizedSearch || [suggestion.label, suggestion.category, suggestion.ngap_code || ""]
            .some((value) => normalizeSearchText(value).includes(normalizedSearch)));
      })
      .sort((a, b) => {
        const aIsSpecialtyConsultation = a.label === `Consultation au cabinet · ${a.category}`;
        const bIsSpecialtyConsultation = b.label === `Consultation au cabinet · ${b.category}`;
        if (aIsSpecialtyConsultation !== bIsSpecialtyConsultation) return aIsSpecialtyConsultation ? -1 : 1;
        if (aIsSpecialtyConsultation && bIsSpecialtyConsultation) return a.category.localeCompare(b.category, "fr");
        return a.label.localeCompare(b.label, "fr", { sensitivity: "base" });
      })
      .slice(0, 30);
  }, [actCategoryFilter, actLocationFilter, actSearch, medicalActSuggestions]);
  const actCategories = useMemo(
    () => [...new Set([...medicalActSuggestions.map((suggestion) => suggestion.category), ...templates.map((template) => template.category)])].sort((a, b) => a.localeCompare(b, "fr")),
    [medicalActSuggestions, templates],
  );
  const visibleSpecialtyCategories = specialtyCategories.slice(0, 4);
  const otherSpecialtyCategories = specialtyCategories.slice(4);
  const cabinetSuggestionCount = medicalActSuggestions.filter((suggestion) => {
    const context = normalizeSearchText(`${suggestion.category} ${suggestion.label}`);
    return context.includes("cabinet") && !context.includes("domicile");
  }).length;
  const homeSuggestionCount = medicalActSuggestions.filter((suggestion) => {
    const context = normalizeSearchText(`${suggestion.category} ${suggestion.label}`);
    return context.includes("domicile") && !context.includes("cabinet");
  }).length;

  const startNew = (suggestion?: MedicalActSuggestion) => {
    setEditingId(null);
    setForm(suggestion
      ? {
          label: suggestion.label,
          category: suggestion.category,
          ngapCode: suggestion.ngap_code || "",
          unitPrice: "",
          isActive: true,
        }
      : EMPTY_FORM);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEdit = (template: MedicalActTemplate) => {
    setEditingId(template.id);
    setForm({
      label: template.label,
      category: template.category,
      ngapCode: template.ngap_code || "",
      unitPrice: template.unit_price === null ? "" : String(template.unit_price),
      isActive: template.is_active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectSuggestedAct = (suggestion: MedicalActSuggestion) => {
    setEditingId(null);
    setForm((current) => ({
      ...current,
      label: suggestion.label,
      category: suggestion.category,
      ngapCode: suggestion.ngap_code || "",
      isActive: true,
    }));
    setActSearch("");
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const price = form.unitPrice.trim() === "" ? null : Number(form.unitPrice);
    if (!Number.isFinite(price) && price !== null) {
      toast.error("Saisissez un tarif valide en dirhams.");
      return;
    }
    if (price !== null && (price < 0 || price > 1000000)) {
      toast.error("Le tarif doit être compris entre 0 et 1 000 000 DH.");
      return;
    }
    const input: MedicalActTemplateInput = {
      id: editingId,
      label: form.label.trim(),
      category: form.category.trim(),
      ngap_code: form.ngapCode.trim() || null,
      unit_price: price,
      is_active: form.isActive,
    };
    try {
      await saveTemplate.mutateAsync(input);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch {
      // The mutation reports the server error to the user.
    }
  };

  const archive = async (template: MedicalActTemplate) => {
    if (!template.is_active) {
      toast.error("Cet acte est déjà archivé.");
      return;
    }
    try {
      await archiveTemplate.mutateAsync(template.id);
    } catch {
      // The mutation reports the server error to the user.
    }
  };

  const toggleNgapCodes = async (checked: boolean) => {
    try {
      await updateSetting.mutateAsync({ key: "show_ngap_codes", value: checked ? "true" : "false" });
      toast.success(checked ? "Codes affichés dans le catalogue" : "Codes masqués dans le catalogue");
    } catch {
      toast.error("Impossible d’enregistrer cette préférence.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-900">
      <header className="border-b border-[#dfe9e4] bg-white/95">
        <div className="ios-soft-enter mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-7">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#123f3a] text-white shadow-md shadow-teal-950/15">
            <Stethoscope className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-[#f0a27e]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#438177]">Espace médecin <span className="px-1 text-[#d58c6b]">/</span> Paramétrage</p>
            <h1 className="text-xl font-bold tracking-tight text-[#183a37] sm:text-2xl">Actes & tarifs</h1>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-[#d9e9e3] bg-[#f1f8f5] px-3 py-1.5 text-[11px] font-semibold text-[#36756b] sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" /> Votre cabinet
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-7 sm:py-8">
        <section className="ios-soft-enter ios-soft-enter-delay-1 relative isolate overflow-hidden rounded-[28px] bg-[linear-gradient(115deg,#123b37_0%,#18564e_62%,#287267_100%)] p-5 text-white shadow-xl shadow-[#184a43]/10 sm:p-7">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full border border-white/10 bg-white/[0.04]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 right-28 h-64 w-64 rounded-full border border-white/10" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#d6eee6]">
                <Sparkles className="h-3.5 w-3.5 text-[#f2b397]" /> Votre savoir-faire, bien organisé
              </div>
              <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">Le bon acte.<br className="hidden sm:block" /> Le juste tarif.</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[#d4e7e1]">
                Composez un catalogue à l’image de votre cabinet : des actes faciles à retrouver, des honoraires maîtrisés, et des choix prêts pour le quotidien.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[390px]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3 backdrop-blur-sm sm:p-4">
                <p className="text-2xl font-semibold tabular-nums text-white">{MEDICAL_ACT_SUGGESTIONS.length}</p>
                <p className="mt-1 text-[10px] font-medium leading-4 text-[#c6ded7] sm:text-xs">actes suggérés</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3 backdrop-blur-sm sm:p-4">
                <p className="text-2xl font-semibold tabular-nums text-white">{activeTemplateCount}</p>
                <p className="mt-1 text-[10px] font-medium leading-4 text-[#c6ded7] sm:text-xs">dans votre catalogue</p>
              </div>
              <div className="rounded-2xl border border-[#f2b397]/20 bg-[#f2b397]/10 p-3 backdrop-blur-sm sm:p-4">
                <p className="text-2xl font-semibold tabular-nums text-[#ffd5c1]">{pricedTemplateCount}</p>
                <p className="mt-1 text-[10px] font-medium leading-4 text-[#f0d8cc] sm:text-xs">tarifs renseignés</p>
              </div>
            </div>
          </div>
        </section>

        <section className="ios-soft-enter ios-soft-enter-delay-2 flex flex-col gap-3 rounded-2xl border border-[#e2e9df] bg-[#fffefa] p-3.5 shadow-sm shadow-[#354a3b]/[0.03] sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f2eee2] text-[#8a7048]"><ShieldCheck className="h-4 w-4" /></span>
            <div>
              <p className="text-xs font-bold text-[#3e493e]">Une référence utile, jamais un tarif automatique</p>
              <p className="mt-0.5 max-w-2xl text-[11px] leading-4 text-[#77786e]">Les actes et codes sont indicatifs : vérifiez-les selon votre spécialité. Aucun tarif n’est déduit du code ; le NGAP reste une référence distincte, utile notamment pour les justificatifs.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-[#e8ebe4] bg-white px-3 py-2.5 sm:justify-start">
            <div>
              <p className="text-xs font-semibold text-[#33453e]">Codes NGAP</p>
              <p className="text-[10px] text-[#85877f]">{showNgapCodes ? "Visibles dans le catalogue" : "Masqués au quotidien"}</p>
            </div>
            <Switch checked={showNgapCodes} onCheckedChange={(checked) => void toggleNgapCodes(checked)} aria-label="Afficher les codes NGAP dans le catalogue" />
          </div>
        </section>

        <div className="space-y-5">
            <Card className="ios-soft-enter ios-soft-enter-delay-2 ios-card-interactive overflow-hidden rounded-[24px] border-[#dce8e2] shadow-md shadow-[#214a3d]/[0.05]">
              <div className="border-b border-[#dce8e2] bg-[linear-gradient(110deg,#eaf5ef,#fffdfa_62%,#fff3eb)] p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#164c43] text-white shadow-md shadow-[#164c43]/15"><FilePlus2 className="h-5 w-5" /></span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#548176]">{editingId ? "Mise à jour du catalogue" : "Construire votre catalogue"}</p>
                    <h2 className="text-base font-bold text-[#203d37] sm:text-lg">{editingId ? "Modifier un acte" : "Créer un acte médical"}</h2>
                    <p className="mt-0.5 text-xs text-[#64736b]">Choisissez un acte courant ou créez le vôtre, puis définissez vos honoraires.</p>
                  </div>
                </div>
              </div>
              <form className="space-y-4 p-4 sm:p-5" onSubmit={(event) => void save(event)}>
                {!editingId && (
                  <section className="overflow-hidden rounded-2xl border border-[#d9e8e0] bg-[#f3f8f4]" aria-label="Sélectionner un acte courant">
                    <div className="border-b border-[#e3ece5] bg-white/90 px-3 py-3 sm:px-4">
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[180px] flex-1 space-y-1.5">
                          <Label htmlFor="act-catalog-search" className="text-xs font-bold text-[#36574c]">01 <span className="ml-1.5 text-[#34433d]">Trouver un acte</span></Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                              id="act-catalog-search"
                              autoFocus={false}
                              value={actSearch}
                              onChange={(event) => setActSearch(event.target.value)}
                              placeholder="Ex. consultation, pansement, ECG…"
                              className="h-10 border-[#dce7e0] bg-[#fbfdfb] pl-9 focus-visible:ring-[#4f8a79]"
                            />
                          </div>
                        </div>
                        <span className="pb-2 text-[11px] font-semibold text-[#718078]">{actPickerSuggestions.length} proposition{actPickerSuggestions.length > 1 ? "s" : ""}</span>
                      </div>
                      <div className="mt-3 space-y-2.5" aria-label="Filtrer les actes">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wide text-[#818a81]">Lieu</span>
                          {([
                            { value: "Tous les lieux", Icon: ClipboardList, count: MEDICAL_ACT_SUGGESTIONS.length },
                            { value: "Au cabinet", Icon: Building2, count: cabinetSuggestionCount },
                            { value: "À domicile", Icon: Home, count: homeSuggestionCount },
                          ] as const).map(({ value, Icon, count }) => {
                            const selected = actLocationFilter === value;
                            const selectedStyle = value === "Au cabinet" ? "border-sky-300 bg-sky-100 text-sky-900" : value === "À domicile" ? "border-orange-300 bg-orange-100 text-orange-900" : "border-[#174d43] bg-[#174d43] text-white";
                            return (
                              <button
                                key={value}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setActLocationFilter(value)}
                                className={`ios-pill-interactive flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition-colors sm:px-3 sm:text-[11px] ${
                                  selected ? `${selectedStyle} shadow-sm` : "border-[#e0e8e1] bg-white text-[#58685e] hover:border-[#b9d7c6]"
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" />{value}<span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[9px] tabular-nums">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wide text-[#818a81]">Type</span>
                          <button
                            type="button"
                            aria-pressed={actCategoryFilter === "Toutes les catégories"}
                            onClick={() => setActCategoryFilter("Toutes les catégories")}
                            className={`ios-pill-interactive flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition-colors sm:px-3 sm:text-[11px] ${
                              actCategoryFilter === "Toutes les catégories" ? "border-[#174d43] bg-[#174d43] text-white shadow-sm" : "border-[#e0e8e1] bg-white text-[#58685e] hover:border-[#9fc9b5]"
                            }`}
                          >
                            <ClipboardList className="h-3.5 w-3.5" />Tous les types
                          </button>
                          {visibleSpecialtyCategories.map((category) => {
                            const { Icon, chip } = getCategoryStyle(category);
                            const selected = actCategoryFilter === category;
                            return (
                              <button
                                key={category}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setActCategoryFilter(category)}
                                className={`ios-pill-interactive flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition-all sm:px-3 sm:text-[11px] ${
                                  selected ? `${chip} shadow-sm` : "border-[#e0e8e1] bg-white text-[#58685e] hover:border-[#b9d7c6] hover:bg-[#f8fbf8]"
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" />{category}
                              </button>
                            );
                          })}
                          {otherSpecialtyCategories.length > 0 && (
                            <select
                              aria-label="Autres types d’actes"
                              value={otherSpecialtyCategories.includes(actCategoryFilter) ? actCategoryFilter : ""}
                              onChange={(event) => {
                                if (event.target.value) setActCategoryFilter(event.target.value);
                              }}
                              className="h-8 max-w-full rounded-full border border-[#dce7e0] bg-white px-3 text-[10px] font-semibold text-[#58685e] outline-none focus-visible:ring-2 focus-visible:ring-[#4f8a79] sm:text-[11px]"
                            >
                              <option value="">Autres types…</option>
                              {otherSpecialtyCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                            </select>
                          )}
                        </div>
                        <p className="pl-[4.5rem] text-[9px] leading-4 text-[#879087]">
                          Les actes sans lieu précisé restent visibles dans les deux filtres.
                        </p>
                      </div>
                    </div>
                    <div className="grid max-h-[360px] gap-2 overflow-y-auto p-3 sm:grid-cols-2 lg:grid-cols-3">
                      {actPickerSuggestions.length > 0 ? actPickerSuggestions.map((suggestion, index) => {
                        const selected = form.label === suggestion.label && form.category === suggestion.category;
                        const categoryStyle = getCategoryStyle(suggestion.category);
                        const CategoryIcon = categoryStyle.Icon;
                        return (
                          <button
                            key={`${suggestion.category}-${suggestion.label}-${index}`}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => selectSuggestedAct(suggestion)}
                            className={`ios-card-interactive group flex min-h-[86px] w-full items-start justify-between gap-3 rounded-xl border p-3 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8a79] ${
                              selected
                                ? "border-[#4f8a79] bg-[#e7f4ed] ring-1 ring-[#c4dfd2]"
                                : "border-[#e2e9e3] bg-white hover:-translate-y-0.5 hover:border-[#9fc9b5] hover:shadow-md"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="flex items-start gap-2">
                                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${categoryStyle.icon}`}>
                                  <CategoryIcon className="h-3.5 w-3.5" />
                                </span>
                                <span className="line-clamp-2 text-xs font-semibold leading-5 text-slate-900">{suggestion.label}</span>
                              </span>
                              <span className={`mt-2 inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${categoryStyle.chip}`}>
                                {suggestion.category}
                              </span>
                              {showNgapCodes && suggestion.ngap_code && <span className="mt-1 inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">{suggestion.ngap_code}</span>}
                            </span>
                            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              selected ? "bg-[#236b5e] text-white" : "bg-[#f0f3ee] text-[#748077] group-hover:bg-[#e4f2e9] group-hover:text-[#236b5e]"
                            }`}>
                              {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            </span>
                          </button>
                        );
                      }) : (
                        <p className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                          Aucun acte ne correspond. Vous pouvez saisir un acte personnalisé ci-dessous.
                        </p>
                      )}
                    </div>
                  </section>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="act-label" className="text-xs font-semibold">2. Libellé à enregistrer</Label>
                    <Input id="act-label" maxLength={150} required value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="Sélectionnez un acte ci-dessus ou saisissez un libellé personnalisé" className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="act-category" className="text-xs font-semibold">Catégorie</Label>
                    <Input id="act-category" list="medical-act-categories" maxLength={80} required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Choisir ou saisir une catégorie" className="h-11" />
                    <datalist id="medical-act-categories">
                      {actCategories.map((category) => <option key={category} value={category} />)}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="act-price" className="text-xs font-semibold">3. Tarif du cabinet · DH</Label>
                    <Input id="act-price" type="number" min="0" max="1000000" step="0.01" value={form.unitPrice} onChange={(event) => setForm((current) => ({ ...current, unitPrice: event.target.value }))} placeholder="Saisir le montant" className="h-11 text-base font-semibold tabular-nums" />
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Tarifs rapides du cabinet">
                      {CABINET_TARIFF_CHIPS.map((amount) => {
                        const selected = Number(form.unitPrice) === amount;
                        return (
                          <Button
                            key={amount}
                            type="button"
                            size="sm"
                            variant={selected ? "default" : "outline"}
                            aria-pressed={selected}
                            onClick={() => setForm((current) => ({ ...current, unitPrice: String(amount) }))}
                            className={`h-8 rounded-full px-3 text-xs font-semibold tabular-nums ${
                              selected
                                ? "bg-[#174d43] text-white hover:bg-[#103e36]"
                                : "border-[#dce7e0] bg-white text-[#40594e] hover:border-[#9fc9b5] hover:bg-[#f1f8f5]"
                            }`}
                          >
                            {amount} DH
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="act-ngap" className="text-xs font-semibold">Code NGAP <span className="font-normal text-slate-400">(facultatif)</span></Label>
                    <Input id="act-ngap" maxLength={40} value={form.ngapCode} onChange={(event) => setForm((current) => ({ ...current, ngapCode: event.target.value }))} placeholder="Ex. C, Cs, K15…" className="h-11" />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#e6eae2] bg-[#fafaf6] px-3 py-2.5">
                  <div>
                    <Label htmlFor="act-active" className="text-xs font-semibold">Acte disponible</Label>
                    <p className="mt-0.5 text-[10px] text-slate-500">Désactivez-le pour le retirer des choix sans effacer son historique.</p>
                  </div>
                  <Switch id="act-active" checked={form.isActive} onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))} />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {editingId && <Button type="button" variant="outline" onClick={() => startNew()}>Annuler</Button>}
                  <Button type="submit" disabled={saveTemplate.isPending} className="h-11 rounded-xl bg-[#174d43] px-5 text-sm font-bold text-white shadow-md shadow-[#174d43]/15 hover:bg-[#103e36]">
                    {saveTemplate.isPending ? "Enregistrement…" : <><Check className="mr-2 h-4 w-4" />{editingId ? "Enregistrer les modifications" : "Créer l’acte"}</>}
                  </Button>
                </div>
              </form>
            </Card>

            <Card className="ios-soft-enter ios-soft-enter-delay-3 ios-card-interactive overflow-hidden rounded-[24px] border-[#dce8e2] shadow-md shadow-[#214a3d]/[0.05]">
              <div className="border-b border-[#e7ece6] bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#edf5ef] text-[#3d7566]"><BadgeCheck className="h-5 w-5" /></span>
                    <div>
                      <h2 className="text-sm font-bold text-[#233d35]">{showArchived ? "Actes archivés" : "Actes du cabinet"}</h2>
                      <p className="mt-0.5 text-xs text-[#78837b]">{filteredTemplates.length} résultat{filteredTemplates.length > 1 ? "s" : ""} · {activeTemplateCount} actif{activeTemplateCount > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowArchived((current) => !current)}>
                    {showArchived ? "Voir les actes actifs" : "Voir les archives"}
                  </Button>
                </div>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un acte, une catégorie ou un code" className="border-[#e1e8e1] bg-[#fbfcf9] pl-9" />
                </div>
              </div>
              {isLoading ? (
                <div className="space-y-3 p-4" aria-label="Chargement du catalogue">
                  <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ) : isError ? (
                <div className="p-5 text-sm text-rose-800">
                  <p>Le catalogue d’actes n’a pas pu être chargé.</p>
                  <Button type="button" variant="outline" className="mt-3" onClick={() => void refetch()}>Réessayer</Button>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="p-8 text-center">
                  <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff6ef] text-[#548171]"><Stethoscope className="h-5 w-5" /></span>
                  <p className="text-sm font-semibold text-[#30463c]">{showArchived ? "Aucun acte archivé." : "Votre catalogue attend ses premiers actes."}</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#7b847b]">Choisissez une suggestion ou créez un acte personnalisé pour préparer vos prochains encaissements.</p>
                  {!showArchived && <Button type="button" variant="outline" className="mt-4 rounded-xl border-[#d6e6dc] bg-white text-[#315c4e] hover:bg-[#f1f7f2]" onClick={() => startNew()}><Plus className="mr-1.5 h-4 w-4" />Créer un premier acte</Button>}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredTemplates.map((template) => {
                    const categoryStyle = getCategoryStyle(template.category);
                    const CategoryIcon = categoryStyle.Icon;
                    return (
                    <article key={template.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-[#f9fbf8] sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#263d34]">{template.label}</h3>
                          {showNgapCodes && template.ngap_code && <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600">NGAP {template.ngap_code}</span>}
                        </div>
                        <p className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${categoryStyle.chip}`}>
                          <CategoryIcon className="h-3 w-3" />{template.category}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className={template.unit_price === null ? "rounded-full bg-[#fff3e7] px-3 py-1.5 text-xs font-semibold text-[#9a683d]" : "rounded-full bg-[#eaf4ed] px-3 py-1.5 text-sm font-bold tabular-nums text-[#286355]"}>
                          {template.unit_price === null ? "Tarif à définir" : formatPrice(template.unit_price)}
                        </span>
                        <div className="flex gap-1">
                          <Button type="button" size="icon" variant="ghost" aria-label={`Modifier ${template.label}`} onClick={() => startEdit(template)}><Pencil className="h-4 w-4" /></Button>
                          {template.is_active && <Button type="button" size="icon" variant="ghost" aria-label={`Archiver ${template.label}`} onClick={() => void archive(template)} disabled={archiveTemplate.isPending}><Trash2 className="h-4 w-4 text-slate-500" /></Button>}
                        </div>
                      </div>
                    </article>
                    );
                  })}
                </div>
              )}
            </Card>
        </div>
      </main>
    </div>
  );
};

export default MedicalActTemplates;
