import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Upload, Search, Activity, StickyNote } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { usePatient } from "@/hooks/usePatients";
import { useMedicalRecord, useCreateOrUpdateMedicalRecord } from "@/hooks/useMedicalRecords";
import { useDocuments, useCreateDocument, useDeleteDocument } from "@/hooks/useDocuments";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MedicalRecordSection } from "@/components/MedicalRecordSection";
import { AllergiesSection } from "@/components/AllergiesSection";
import { TreatmentsSection } from "@/components/TreatmentsSection";
import { antecedentsTemplates } from "@/data/medicalTemplates";

const PatientDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: patient, isLoading: patientLoading } = usePatient(id);
  const { data: medicalRecord, isLoading: recordLoading } = useMedicalRecord(id);
  const { data: documents = [], isLoading: docsLoading } = useDocuments(id);
  const updateMedicalRecord = useCreateOrUpdateMedicalRecord();
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [medicalData, setMedicalData] = useState({
    antecedents: "",
    allergies: "",
    traitements: "",
    notes: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Load medical data when available
  useEffect(() => {
    if (medicalRecord) {
      setMedicalData({
        antecedents: medicalRecord.antecedents || "",
        allergies: medicalRecord.allergies || "",
        traitements: medicalRecord.traitements || "",
        notes: medicalRecord.notes || "",
      });
    }
  }, [medicalRecord]);

  const handleSaveSection = (section: keyof typeof medicalData, value: string) => {
    if (!id) return;
    updateMedicalRecord.mutate({
      patientId: id,
      data: { [section]: value },
    });
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || doc.type === selectedType;
    return matchesSearch && matchesType;
  });

  const documentTypes = Array.from(new Set(documents.map(d => d.type)));

  if (patientLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Patient non trouvé</p>
          <Button onClick={() => navigate("/patients")}>
            Retour à la liste
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/patients")}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                {patient.prenom} {patient.nom}
              </h1>
              <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                {patient.telephone && <span>📞 {patient.telephone}</span>}
                {patient.email && <span>✉️ {patient.email}</span>}
                {patient.mutuelle && <span>🏥 {patient.mutuelle}</span>}
              </div>
            </div>
            <Badge variant="outline" className="bg-tile-patients/10">
              Patient
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="medical" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="medical">
              <FileText className="w-4 h-4 mr-2" />
              Dossier Médical
            </TabsTrigger>
            <TabsTrigger value="documents">
              <Upload className="w-4 h-4 mr-2" />
              Documents Scannés
            </TabsTrigger>
          </TabsList>

          {/* Medical Record Tab */}
          <TabsContent value="medical" className="mt-6 space-y-6">
            {/* Antécédents */}
            <MedicalRecordSection
              title="Antécédents Médicaux"
              value={medicalData.antecedents}
              onSave={(value) => {
                setMedicalData({ ...medicalData, antecedents: value });
                handleSaveSection("antecedents", value);
              }}
              placeholder="Historique des maladies, opérations, hospitalisations..."
              templates={antecedentsTemplates}
              isEditing={editingSection === "antecedents"}
              onEditToggle={() =>
                setEditingSection(editingSection === "antecedents" ? null : "antecedents")
              }
              icon={Activity}
              colorClass="medical-antecedents"
            />

            {/* Allergies */}
            <AllergiesSection
              value={medicalData.allergies}
              onSave={(value) => {
                setMedicalData({ ...medicalData, allergies: value });
                handleSaveSection("allergies", value);
              }}
              isEditing={editingSection === "allergies"}
              onEditToggle={() =>
                setEditingSection(editingSection === "allergies" ? null : "allergies")
              }
            />

            {/* Traitements */}
            <TreatmentsSection
              value={medicalData.traitements}
              onSave={(value) => {
                setMedicalData({ ...medicalData, traitements: value });
                handleSaveSection("traitements", value);
              }}
              isEditing={editingSection === "traitements"}
              onEditToggle={() =>
                setEditingSection(editingSection === "traitements" ? null : "traitements")
              }
            />

            {/* Notes */}
            <MedicalRecordSection
              title="Notes Médicales"
              value={medicalData.notes}
              onSave={(value) => {
                setMedicalData({ ...medicalData, notes: value });
                handleSaveSection("notes", value);
              }}
              placeholder="Notes libres du praticien..."
              isEditing={editingSection === "notes"}
              onEditToggle={() =>
                setEditingSection(editingSection === "notes" ? null : "notes")
              }
              icon={StickyNote}
              colorClass="medical-notes"
            />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-6 space-y-6">
            {/* Search and Filters */}
            <Card className="p-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Rechercher un document..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Type de document" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {documentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button className="gap-2">
                  <Upload className="w-4 h-4" />
                  Upload
                </Button>
              </div>
            </Card>

            {/* Documents List */}
            {docsLoading ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Chargement des documents...</p>
              </Card>
            ) : filteredDocuments.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-full bg-tile-scanner/10 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-[hsl(var(--tile-scanner))]" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Aucun document
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery ? "Aucun document ne correspond à votre recherche" : "Aucun document scanné pour ce patient"}
                  </p>
                  <Button className="gap-2">
                    <Upload className="w-4 h-4" />
                    Ajouter un document
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map((doc) => (
                  <Card key={doc.id} className="p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[hsl(var(--tile-scanner))]" />
                        <Badge variant="outline">{doc.type}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => id && deleteDocument.mutate({ id: doc.id, patientId: id })}
                      >
                        ✕
                      </Button>
                    </div>
                    <h4 className="font-semibold text-foreground mb-2">{doc.nom}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PatientDetail;
