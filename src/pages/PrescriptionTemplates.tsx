import { useEffect, useState } from "react";
import { BookmarkPlus, BookOpenCheck, FlaskConical, Pencil, Pill, ScanLine, Search, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useMedications, Medication, PrescriptionItem, PrescriptionType } from "@/hooks/usePrescriptions";
import {
  LocalPrescriptionTemplate,
  readPrescriptionTemplates,
  writePrescriptionTemplates,
} from "@/lib/prescriptionTemplates";
import {
  IMAGING_REQUEST_CATALOG,
  LAB_REQUEST_CATALOG,
  MOROCCAN_ORDER_BASKETS,
  type NomenclatureReference,
} from "@/lib/prescriptionRequestCatalogs";

const TEMPLATE_TYPES: { value: PrescriptionType; label: string; Icon: typeof Pill; color: string }[] = [
  { value: "medication", label: "Médicaments", Icon: Pill, color: "blue" },
  { value: "laboratory", label: "Biologie", Icon: FlaskConical, color: "emerald" },
  { value: "imaging", label: "Imagerie", Icon: ScanLine, color: "violet" },
];

const createMedicationItem = (medication: Medication): PrescriptionItem => ({
  medication_id: medication.id,
  nom_medicament: medication.nom,
  dosage: medication.dosage_defaut ? `${medication.dosage_defaut} ${medication.unite || ""}`.trim() : null,
  posologie: "",
  duree: null,
  instructions: null,
  ordre: 0,
  request_type: "medication",
  request_details: {},
});

const createExamItem = (
  type: "laboratory" | "imaging",
  name: string,
  modality?: string,
  references?: NomenclatureReference[],
): PrescriptionItem => ({
  medication_id: null,
  nom_medicament: name,
  dosage: null,
  posologie: "",
  duree: null,
  instructions: null,
  ordre: 0,
  request_type: type,
  request_details: {
    ...(type === "laboratory" ? { priority: "routine" as const } : {}),
    ...(type === "imaging" && modality && modality.toLocaleLowerCase() !== "autre" ? { modality } : {}),
    ...(references?.length ? { catalogReferences: references } : {}),
  },
});

const normalizeExamName = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase();

const PrescriptionTemplates = () => {
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id;
  const [templates, setTemplates] = useState<LocalPrescriptionTemplate[]>([]);
  const [activeType, setActiveType] = useState<PrescriptionType>("medication");
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [examName, setExamName] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [basketSearch, setBasketSearch] = useState("");
  const [showNomenclatureReferences, setShowNomenclatureReferences] = useState(false);
  const canUseAdvancedBilling = currentUser?.role === "secretaire" || currentUser?.role === "assistant";

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 120);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const { data: medications = [], isFetching: isSearching, isError: searchError } = useMedications(debouncedSearch);

  useEffect(() => {
    if (!currentUserId) return;
    try {
      setTemplates(readPrescriptionTemplates(currentUserId));
    } catch (error) {
      console.error("Unable to load local prescription templates:", error);
      toast.error("Impossible de lire les modèles enregistrés sur cet appareil.");
    }
  }, [currentUserId]);

  const updateItem = (index: number, updates: Partial<PrescriptionItem>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...updates } : item));
  };

  const addMedication = (medication: Medication) => {
    if (items.some((item) => item.medication_id === medication.id)) return;
    setItems((current) => [...current, createMedicationItem(medication)]);
    setSearch("");
  };

  const addExam = (
    examType: "laboratory" | "imaging",
    exam: { name: string; modality?: string; references?: NomenclatureReference[] },
  ) => {
    const exists = items.some((item) => item.nom_medicament.toLocaleLowerCase() === exam.name.toLocaleLowerCase());
    if (exists) return;
    setItems((current) => [...current, createExamItem(examType, exam.name, exam.modality, exam.references)]);
    setExamName("");
  };

  const loadOrderBasket = (basketId: string) => {
    const basket = MOROCCAN_ORDER_BASKETS.find((item) => item.id === basketId && item.type === activeType);
    if (!basket || (activeType !== "laboratory" && activeType !== "imaging")) return;
    const existingNames = new Set(items.map((item) => normalizeExamName(item.nom_medicament)));
    const basketItems = basket.items
      .filter((item) => {
        const normalizedName = normalizeExamName(item.name);
        if (existingNames.has(normalizedName)) return false;
        existingNames.add(normalizedName);
        return true;
      })
      .map((item) => createExamItem(activeType, item.name, item.modality, item.references));
    if (basketItems.length === 0) {
      toast.info("Ce panier ne contient que des examens déjà ajoutés.");
      return;
    }
    setItems((current) => [...current, ...basketItems]);
    toast.success(`${basketItems.length} examen${basketItems.length > 1 ? "s" : ""} ajouté${basketItems.length > 1 ? "s" : ""} au brouillon. Vous pouvez modifier la sélection.`);
  };

  const persist = (nextTemplates: LocalPrescriptionTemplate[]) => {
    if (!currentUser) return false;
    try {
      writePrescriptionTemplates(currentUser.id, nextTemplates);
      setTemplates(nextTemplates);
      return true;
    } catch (error) {
      console.error("Unable to update local prescription templates:", error);
      toast.error("Impossible d’enregistrer les modèles sur cet appareil.");
      return false;
    }
  };

  const saveTemplate = () => {
    if (!name.trim() || items.length === 0) return;
    const normalizedName = name.trim().toLocaleLowerCase();
    if (templates.some((template) => template.prescriptionType === activeType && template.name.toLocaleLowerCase() === normalizedName)) {
      toast.error("Un modèle de ce type porte déjà ce nom.");
      return;
    }
    const template: LocalPrescriptionTemplate = {
      id: crypto.randomUUID(),
      name: name.trim(),
      tags: [...new Set(tags.split(",").map((tag) => tag.trim()).filter(Boolean))],
      prescriptionType: activeType,
      items: items.map((item, index) => ({ ...item, ordre: index })),
      createdAt: new Date().toISOString(),
    };
    if (persist([template, ...templates])) {
      setName("");
      setTags("");
      setItems([]);
      toast.success("Modèle enregistré sur cet appareil");
    }
  };

  const switchType = (type: PrescriptionType) => {
    setActiveType(type);
    setItems([]);
    setSearch("");
    setExamName("");
    setCatalogSearch("");
    setBasketSearch("");
    setShowNomenclatureReferences(false);
  };

  const visibleExams = (activeType === "laboratory" ? LAB_REQUEST_CATALOG : IMAGING_REQUEST_CATALOG)
    .filter((exam) => `${exam.category} ${exam.name}`.toLocaleLowerCase().includes(catalogSearch.toLocaleLowerCase()));
  const referenceBasketsForType = MOROCCAN_ORDER_BASKETS.filter((basket) => basket.type === activeType);
  const visibleBaskets = referenceBasketsForType
    .filter((basket) => `${basket.name} ${basket.items.map((item) => item.name).join(" ")}`.toLocaleLowerCase().includes(basketSearch.toLocaleLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Modèles de prescription</h1>
            <p className="text-sm text-slate-600">Prépare des brouillons réutilisables par type de document.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div>
            <h2 className="font-semibold text-slate-900">{activeType === "laboratory" || activeType === "imaging" ? "Personnaliser un panier de référence" : "Créer un modèle de médicaments"}</h2>
            <p className="mt-1 text-sm text-slate-600">Le contenu du panier se modifie directement dans la liste. Les précisions restent facultatives.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Type de modèle">
            {TEMPLATE_TYPES.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={activeType === value}
                onClick={() => switchType(value)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors sm:text-sm ${activeType === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>

          {activeType === "medication" ? (
            <div className="space-y-2">
              <Label htmlFor="template-medication-search">Ajouter des médicaments</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="template-medication-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher par nom ou DCI…" className="pl-9" />
              </div>
              {search.trim().length >= 2 && (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1">
                  {isSearching ? <p className="p-2 text-sm text-slate-500">Recherche…</p>
                    : searchError ? <p className="p-2 text-sm text-red-700">La recherche est indisponible.</p>
                      : medications.map((medication) => (
                        <button key={medication.id} type="button" onClick={() => addMedication(medication)} className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-blue-50">
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-slate-900">{medication.nom}</span>
                            <span className="block truncate text-xs text-slate-500">{medication.dci || medication.forme || ""}</span>
                          </span>
                          <Plus className="h-4 w-4 shrink-0 text-blue-700" />
                        </button>
                      ))}
                  {!isSearching && !searchError && medications.length === 0 && <p className="p-2 text-sm text-slate-500">Aucun résultat.</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="template-exam-search">Ajouter des examens</Label>
                {canUseAdvancedBilling && (
                  <button
                    type="button"
                    aria-pressed={showNomenclatureReferences}
                    onClick={() => setShowNomenclatureReferences((value) => !value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${showNomenclatureReferences ? "border-sky-300 bg-sky-50 text-sky-900" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    {showNomenclatureReferences ? "Masquer les références" : "Facturation avancée"}
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="template-exam-search" value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder={activeType === "laboratory" ? "Filtrer les analyses…" : "Filtrer les examens d’imagerie…"} className="pl-9" />
              </div>
              <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {visibleExams.map((exam) => {
                  const selected = items.some((item) => item.nom_medicament === exam.name);
                  return (
                    <Button key={exam.name} type="button" size="sm" variant={selected ? "secondary" : "outline"} className="h-auto min-h-8 whitespace-normal text-left text-xs" disabled={selected} onClick={() => addExam(activeType, exam)}>
                      {selected ? "✓ " : "+ "}{exam.name}
                      {canUseAdvancedBilling && showNomenclatureReferences && exam.references?.length ? (
                        <span className="ml-1 text-[10px] text-slate-500">{exam.references.map((reference) => `${reference.code}${reference.coefficient ? ` · ${reference.coefficient} ${reference.unit || ""}` : ""}`).join(" / ")}</span>
                      ) : null}
                    </Button>
                  );
                })}
              </div>
              <details className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <summary className="cursor-pointer text-xs font-medium text-slate-600">Ajouter un examen personnalisé</summary>
                <div className="mt-2 flex gap-2">
                  <Input value={examName} onChange={(event) => setExamName(event.target.value)} placeholder="Nom de l’examen" aria-label="Nom d’un examen personnalisé" />
                  <Button type="button" variant="secondary" disabled={!examName.trim()} onClick={() => addExam(activeType, { name: examName.trim() })}>
                    <Plus className="mr-1 h-4 w-4" />Ajouter
                  </Button>
                </div>
              </details>
              {canUseAdvancedBilling && showNomenclatureReferences && (
                <p className="rounded-lg border border-sky-100 bg-sky-50/70 px-2.5 py-2 text-[11px] leading-4 text-slate-600">
                  Références indicatives fournies avec le dictionnaire. Les coefficients ne sont pas des montants en DH et ne déclenchent aucun calcul.
                </p>
              )}
              <p className="text-[11px] leading-4 text-slate-500">Choisissez un panier à droite, puis adaptez seulement les examens nécessaires.</p>
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-800">{activeType === "medication" ? "Contenu du modèle" : "Examens sélectionnés"} ({items.length})</h3>
              {items.map((item, index) => (
                <div key={`${item.medication_id || item.nom_medicament}-${index}`} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.nom_medicament}</p>
                      {canUseAdvancedBilling && showNomenclatureReferences && item.request_details?.catalogReferences?.length ? (
                        <p className="mt-0.5 truncate text-[10px] text-sky-800">
                          {item.request_details.catalogReferences.map((reference) => `${reference.code}${reference.coefficient ? ` · ${reference.coefficient} ${reference.unit || ""}` : ""}`).join(" / ")}
                        </p>
                      ) : null}
                    </div>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-slate-500 hover:text-red-700" aria-label={`Retirer ${item.nom_medicament}`} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X className="h-4 w-4" /></Button>
                  </div>
                  {activeType === "medication" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input value={item.dosage || ""} onChange={(event) => updateItem(index, { dosage: event.target.value || null })} placeholder="Dosage, ex. 500 mg" aria-label={`Dosage de ${item.nom_medicament}`} />
                      <Input value={item.posologie} onChange={(event) => updateItem(index, { posologie: event.target.value })} placeholder="Posologie (ex. 1 comprimé matin)" aria-label={`Posologie de ${item.nom_medicament}`} />
                      <Input value={item.duree || ""} onChange={(event) => updateItem(index, { duree: event.target.value || null })} placeholder="Durée, ex. 5 jours" aria-label={`Durée de ${item.nom_medicament}`} />
                      <Input value={item.instructions || ""} onChange={(event) => updateItem(index, { instructions: event.target.value || null })} placeholder="Instruction (facultative)" aria-label={`Instruction pour ${item.nom_medicament}`} />
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <details className="col-span-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <summary className="cursor-pointer text-xs font-medium text-slate-600">Ajouter une précision (facultatif)</summary>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {activeType === "imaging" && (
                            <Input value={item.request_details?.modality || ""} onChange={(event) => updateItem(index, { request_details: { ...(item.request_details || {}), modality: event.target.value || undefined } })} placeholder="Modalité, si utile" aria-label={`Modalité de ${item.nom_medicament}`} />
                          )}
                          <Input value={item.request_details?.indication || ""} onChange={(event) => updateItem(index, { request_details: { ...(item.request_details || {}), indication: event.target.value || undefined } })} placeholder="Indication clinique" aria-label={`Indication de ${item.nom_medicament}`} />
                          {activeType === "laboratory" && (
                            <Input value={item.request_details?.specimen || ""} onChange={(event) => updateItem(index, { request_details: { ...(item.request_details || {}), specimen: event.target.value || undefined } })} placeholder="Prélèvement, si utile" aria-label={`Prélèvement de ${item.nom_medicament}`} />
                          )}
                          <Textarea value={item.instructions || ""} onChange={(event) => updateItem(index, { instructions: event.target.value || null })} placeholder="Autre précision" aria-label={`Précisions pour ${item.nom_medicament}`} rows={2} />
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 border-t border-slate-200 pt-4">
            {activeType === "medication" && (
              <>
                <Label htmlFor="template-name">Nom du modèle</Label>
                <Input id="template-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Traitement courant" />
                <details>
                  <summary className="cursor-pointer text-xs font-medium text-slate-600">Ajouter des tags (facultatif)</summary>
                  <Input id="template-tags" className="mt-2" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Séparés par des virgules" />
                </details>
                <Button type="button" disabled={!name.trim() || items.length === 0} onClick={saveTemplate} className="w-full bg-indigo-700 hover:bg-indigo-800">
                  <BookmarkPlus className="mr-2 h-4 w-4" />Enregistrer le modèle
                </Button>
              </>
            )}
          </div>
        </section>

        <aside className="space-y-3">
          {activeType === "medication" ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
              Les paniers de référence sont disponibles pour la biologie et l’imagerie. Vos modèles de médicaments restent accessibles dans le formulaire d’ordonnance.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-900">Paniers de référence · {activeType === "laboratory" ? "Biologie" : "Imagerie"}</h2>
                  <p className="text-xs text-slate-500">Choisissez un panier, puis modifiez seulement les examens nécessaires.</p>
                </div>
                <Badge variant="secondary">{referenceBasketsForType.length}</Badge>
              </div>
              {referenceBasketsForType.length > 0 && (
                <section className="overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm">
                  <div className="border-b border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
                    <p className="mt-0.5 text-[11px] leading-4 text-slate-600">Modifiez la sélection dans la liste à gauche après avoir choisi un panier.</p>
                  </div>
                  <div className="space-y-2 p-2.5">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={basketSearch}
                        onChange={(event) => setBasketSearch(event.target.value)}
                        placeholder={`Rechercher un bilan de ${activeType === "laboratory" ? "biologie" : "imagerie"}…`}
                        aria-label={`Rechercher un panier de ${activeType === "laboratory" ? "biologie" : "imagerie"}`}
                        className="pl-9"
                      />
                    </div>
                    <div className="max-h-[min(55dvh,480px)] space-y-1.5 overflow-y-auto pr-1">
                      {visibleBaskets.map((basket) => (
                        <article key={basket.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                          <div className="flex items-start gap-2">
                            <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-semibold leading-4 text-slate-800">{basket.name}</h4>
                              <p className="mt-0.5 text-[10px] text-slate-500">{basket.items.length} éléments · {basket.section}</p>
                              <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-600">{basket.items.slice(0, 3).map((item) => item.name).join(" · ")}{basket.items.length > 3 ? ` · +${basket.items.length - 3}` : ""}</p>
                              {canUseAdvancedBilling && showNomenclatureReferences && basket.items.some((item) => item.references?.length) && (
                                <p className="mt-1 line-clamp-1 text-[10px] text-sky-800">
                                  Réf. {basket.items.flatMap((item) => item.references ?? []).map((reference) => reference.code).filter((code, index, codes) => codes.indexOf(code) === index).slice(0, 6).join(" · ")}
                                </p>
                              )}
                            </div>
                            <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 gap-1 px-2 text-[10px]" onClick={() => loadOrderBasket(basket.id)}>
                              <Pencil className="h-3 w-3" />Modifier
                            </Button>
                          </div>
                        </article>
                      ))}
                      {visibleBaskets.length === 0 && <p className="p-3 text-xs text-slate-500">Aucun panier ne correspond à cette recherche.</p>}
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </aside>
      </main>
    </div>
  );
};

export default PrescriptionTemplates;
