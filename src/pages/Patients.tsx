import { useState } from "react";
import { Search, Plus, Users, LayoutGrid, List, CalendarClock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { usePatients } from "@/hooks/usePatients";
import { Badge } from "@/components/ui/badge";
import NewPatientDialog from "@/components/NewPatientDialog";
import { PatientCard } from "@/components/PatientCard";
import { cn } from "@/lib/utils";
import { useLastCompletedConsultations } from "@/hooks/useAppointments";
import { useNavigationViewState } from "@/hooks/useNavigationViewState";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SexFilter = "all" | "F" | "M" | "unreported";
type PatientView = "grid" | "list";
type ConsultationDateFilter = "all" | "30" | "90" | "365" | "never";

const Patients = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useNavigationViewState(`${currentUser?.id ?? "anonymous"}.patients.search`, "");
  const viewStateScope = currentUser?.id ?? "anonymous";
  const [sexFilter, setSexFilter] = useNavigationViewState<SexFilter>(`${viewStateScope}.patients.sex-filter`, "all");
  const [patientView, setPatientView] = useNavigationViewState<PatientView>(`${viewStateScope}.patients.view`, "grid");
  const [consultationDateFilter, setConsultationDateFilter] = useNavigationViewState<ConsultationDateFilter>(`${viewStateScope}.patients.consultation-filter`, "all");
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const {
    data: patients = [],
    isLoading,
    isError,
    refetch,
  } = usePatients();
  const {
    data: lastCompletedConsultations = new Map<string, string>(),
    isLoading: isConsultationDatesLoading,
    isError: isConsultationDatesError,
    refetch: refetchConsultationDates,
  } = useLastCompletedConsultations();

  const sexCounts = {
    all: patients.length,
    F: patients.filter((patient) => patient.sexe === "F").length,
    M: patients.filter((patient) => patient.sexe === "M").length,
    unreported: patients.filter((patient) => patient.sexe !== "F" && patient.sexe !== "M").length,
  };

  const filteredPatients = patients.filter((patient) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      patient.nom.toLowerCase().includes(query) ||
      patient.prenom.toLowerCase().includes(query) ||
      patient.email?.toLowerCase().includes(query) ||
      patient.telephone?.includes(query) ||
      patient.cin?.toLowerCase().includes(query)
    );
    const matchesSex = sexFilter === "all"
      || (sexFilter === "unreported"
        ? patient.sexe !== "F" && patient.sexe !== "M"
        : patient.sexe === sexFilter);
    const lastConsultationDate = lastCompletedConsultations.get(patient.id);
    const matchesConsultationDate = isConsultationDatesLoading || isConsultationDatesError || consultationDateFilter === "all"
      || (consultationDateFilter === "never" && !lastConsultationDate)
      || (consultationDateFilter !== "never" && consultationDateFilter !== "all" && !!lastConsultationDate
        && lastConsultationDate >= format(subDays(new Date(), Number(consultationDateFilter)), "yyyy-MM-dd"));
    return matchesSearch && matchesSex && matchesConsultationDate;
  });
  const displayedPatients = patientView === "list"
    ? [...filteredPatients].sort((first, second) =>
        first.nom.localeCompare(second.nom, "fr", { sensitivity: "base" })
        || first.prenom.localeCompare(second.prenom, "fr", { sensitivity: "base" }))
    : filteredPatients;

  const sexFilters: { value: SexFilter; label: string }[] = [
    { value: "all", label: "Tous" },
    { value: "F", label: "Femmes" },
    { value: "M", label: "Hommes" },
    { value: "unreported", label: "Non renseigné" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                Gestion des Patients
              </h1>
              <p className="text-sm text-muted-foreground">
                Dossiers médicaux, documents et historique
              </p>
            </div>
            <Button className="gap-2 bg-teal-700 hover:bg-teal-800" onClick={() => setIsNewPatientOpen(true)}>
              <Plus className="w-4 h-4" />
              Nouveau patient
            </Button>
          </div>
          <NewPatientDialog open={isNewPatientOpen} onOpenChange={setIsNewPatientOpen} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              aria-label="Rechercher un patient"
              placeholder="Rechercher par nom, prénom, CIN ou téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 border-slate-200 bg-white pl-10 shadow-sm focus-visible:ring-teal-600"
            />
          </div>
          {!isLoading && !isError && (
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <Badge className="w-fit shrink-0 gap-1.5 whitespace-nowrap border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600">
                <Users className="h-4 w-4" aria-hidden="true" />
                {searchQuery
                  ? `${filteredPatients.length} résultat${filteredPatients.length === 1 ? "" : "s"}`
                  : `${sexCounts[sexFilter]} patient${sexCounts[sexFilter] === 1 ? "" : "s"}`}
              </Badge>
              <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm" role="group" aria-label="Mode d’affichage">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Afficher les patients en cartes"
                  aria-pressed={patientView === "grid"}
                  onClick={() => setPatientView("grid")}
                  className={cn(
                    "h-8 w-9 px-0",
                    patientView === "grid" ? "bg-teal-50 text-teal-800 shadow-sm hover:bg-teal-50" : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Afficher les patients en liste"
                  aria-pressed={patientView === "list"}
                  onClick={() => setPatientView("list")}
                  className={cn(
                    "h-8 w-9 px-0",
                    patientView === "list" ? "bg-teal-50 text-teal-800 shadow-sm hover:bg-teal-50" : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  <List className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {!isLoading && !isError && (
          <div className="mb-6 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer les patients par sexe">
              {sexFilters.map((filter) => {
                const count = sexCounts[filter.value];
                return (
                  <Button
                    key={filter.value}
                    type="button"
                    variant={sexFilter === filter.value ? "default" : "outline"}
                    aria-pressed={sexFilter === filter.value}
                    onClick={() => setSexFilter(filter.value)}
                    className={cn(
                      "h-9 rounded-full px-3.5 text-sm",
                      sexFilter === filter.value
                        ? "bg-teal-700 text-white hover:bg-teal-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900",
                    )}
                  >
                    {filter.label}
                    <span className={cn(
                      "ml-1.5 tabular-nums",
                      sexFilter === filter.value ? "text-teal-100" : "text-slate-400",
                    )}>
                      {count}
                    </span>
                  </Button>
                );
              })}
            </div>
            {patientView === "list" && (
              <div className="flex items-center justify-end gap-2">
                <CalendarClock className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <label htmlFor="consultation-date-filter" className="shrink-0 text-sm text-slate-600">
                  Dernière consultation
                </label>
                <Select
                  value={consultationDateFilter}
                  onValueChange={(value: ConsultationDateFilter) => setConsultationDateFilter(value)}
                  disabled={isConsultationDatesLoading || isConsultationDatesError}
                >
                  <SelectTrigger id="consultation-date-filter" className="w-[190px] border-slate-200 bg-white">
                    <SelectValue placeholder="Toutes les dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les dates</SelectItem>
                    <SelectItem value="30">30 derniers jours</SelectItem>
                    <SelectItem value="90">3 derniers mois</SelectItem>
                    <SelectItem value="365">12 derniers mois</SelectItem>
                    <SelectItem value="never">Jamais consulté</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {patientView === "list" && isConsultationDatesError && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <span>Les dates de consultation n’ont pas pu être chargées ; le filtre n’est pas disponible.</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetchConsultationDates()}>
              Réessayer
            </Button>
          </div>
        )}

        {/* Patient List */}
        {isLoading ? (
          <Card className="border-slate-200 p-12 text-center">
            <p className="text-muted-foreground">Chargement des patients...</p>
          </Card>
        ) : isError ? (
          <Card className="border-rose-200 bg-rose-50/50 p-8 text-center">
            <h2 className="mb-2 font-semibold text-slate-900">Impossible de charger les patients</h2>
            <p className="mb-5 text-sm text-slate-600">
              La liste n’est pas disponible pour le moment. Vérifiez votre connexion puis réessayez.
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              Réessayer
            </Button>
          </Card>
        ) : displayedPatients.length === 0 ? (
          <Card className="border-slate-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-tile-patients/10 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-tile-patients" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchQuery || sexFilter !== "all" || consultationDateFilter !== "all" ? "Aucun patient trouvé" : "Aucun patient enregistré"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || sexFilter !== "all" || consultationDateFilter !== "all"
                  ? "Modifiez la recherche ou choisissez un autre filtre."
                  : "Commencez par ajouter votre premier patient pour gérer leurs dossiers médicaux"}
              </p>
              <Button className="gap-2" onClick={() => setIsNewPatientOpen(true)}>
                <Plus className="w-4 h-4" />
                Ajouter un patient
              </Button>
            </div>
          </Card>
        ) : (
          <div className={cn(
            patientView === "grid"
              ? "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "flex flex-col gap-2",
          )}>
            {displayedPatients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                view={patientView}
                lastConsultationDate={lastCompletedConsultations.get(patient.id)}
                consultationDatesUnavailable={isConsultationDatesError}
                onClick={() => navigate(`/patients/${patient.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Patients;
