import { useState } from "react";
import { ArrowLeft, Search, Plus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { usePatients } from "@/hooks/usePatients";
import { Badge } from "@/components/ui/badge";
import NewPatientDialog from "@/components/NewPatientDialog";
import { PatientCard } from "@/components/PatientCard";

const Patients = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const { data: patients = [], isLoading } = usePatients();

  // Filter patients based on search query
  const filteredPatients = patients.filter((patient) => {
    const query = searchQuery.toLowerCase();
    return (
      patient.nom.toLowerCase().includes(query) ||
      patient.prenom.toLowerCase().includes(query) ||
      patient.email?.toLowerCase().includes(query) ||
      patient.telephone?.includes(query) ||
      patient.cin?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                Gestion des Patients
              </h1>
              <p className="text-sm text-muted-foreground">
                Dossiers médicaux, documents et historique
              </p>
            </div>
            <Button className="gap-2" onClick={() => setIsNewPatientOpen(true)}>
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
        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher par nom, prénom, CIN ou téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        {/* Patient List */}
        {isLoading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Chargement des patients...</p>
          </Card>
        ) : filteredPatients.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-tile-patients/10 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-tile-patients" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchQuery ? "Aucun patient trouvé" : "Aucun patient enregistré"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? "Essayez une autre recherche"
                  : "Commencez par ajouter votre premier patient pour gérer leurs dossiers médicaux"}
              </p>
              <Button className="gap-2" onClick={() => setIsNewPatientOpen(true)}>
                <Plus className="w-4 h-4" />
                Ajouter un patient
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
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
