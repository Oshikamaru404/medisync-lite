import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Upload, Search, Pill, TestTube, Scan, ClipboardList, Award, Mail, MoreHorizontal, X, Eye, History, FileBadge } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { usePatient } from "@/hooks/usePatients";
import { useMedicalRecord, useCreateOrUpdateMedicalRecord } from "@/hooks/useMedicalRecords";
import { useDocuments, useDeleteDocument } from "@/hooks/useDocuments";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentUploadDialog } from "@/components/DocumentUploadDialog";
import { PatientIdentityTab } from "@/components/PatientIdentityTab";
import { PatientIdentityCompact } from "@/components/PatientIdentityCompact";
import { MedicalRecordAccordion } from "@/components/MedicalRecordAccordion";
import { PatientHistoryTab } from "@/components/PatientHistoryTab";
import { PrescriptionsList } from "@/components/PrescriptionsList";
import { CertificatesList } from "@/components/CertificatesList";
import { CertificateDialog } from "@/components/CertificateDialog";
import { cn } from "@/lib/utils";
import { differenceInYears, parseISO } from "date-fns";

const DOCUMENT_TYPE_STYLES: Record<string, { icon: typeof FileText; barColor: string; iconColor: string; badgeClass: string }> = {
  "Ordonnance": { icon: Pill, barColor: "bg-blue-500", iconColor: "text-blue-600", badgeClass: "bg-blue-100 text-blue-700" },
  "Analyse": { icon: TestTube, barColor: "bg-green-500", iconColor: "text-green-600", badgeClass: "bg-green-100 text-green-700" },
  "Radiologie": { icon: Scan, barColor: "bg-purple-500", iconColor: "text-purple-600", badgeClass: "bg-purple-100 text-purple-700" },
  "Compte rendu": { icon: ClipboardList, barColor: "bg-orange-500", iconColor: "text-orange-600", badgeClass: "bg-orange-100 text-orange-700" },
  "Certificat": { icon: Award, barColor: "bg-yellow-500", iconColor: "text-yellow-600", badgeClass: "bg-yellow-100 text-yellow-700" },
  "Courrier": { icon: Mail, barColor: "bg-cyan-500", iconColor: "text-cyan-600", badgeClass: "bg-cyan-100 text-cyan-700" },
  "Autre": { icon: MoreHorizontal, barColor: "bg-gray-500", iconColor: "text-gray-600", badgeClass: "bg-gray-100 text-gray-700" },
};

const getDocumentStyle = (type: string) => {
  return DOCUMENT_TYPE_STYLES[type] || DOCUMENT_TYPE_STYLES["Autre"];
};

const PatientDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: patient, isLoading: patientLoading } = usePatient(id);
  const { data: medicalRecord, isLoading: recordLoading } = useMedicalRecord(id);
  const { data: documents = [], isLoading: docsLoading } = useDocuments(id);
  const updateMedicalRecord = useCreateOrUpdateMedicalRecord();
  const deleteDocument = useDeleteDocument();

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showIdentityEdit, setShowIdentityEdit] = useState(false);
  const [medicalData, setMedicalData] = useState({
    antecedents: "",
    allergies: "",
    traitements: "",
    notes: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isCertificateDialogOpen, setIsCertificateDialogOpen] = useState(false);

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

  const calculateAge = (dateNaissance: string | null) => {
    if (!dateNaissance) return null;
    try {
      return differenceInYears(new Date(), parseISO(dateNaissance));
    } catch {
      return null;
    }
  };

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

  const age = calculateAge(patient.date_naissance);
  const sexe = (patient as any).sexe;

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
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {patient.prenom} {patient.nom}
                </h1>
                {sexe && (
                  <Badge className={cn(
                    sexe === 'M' && "bg-blue-100 text-blue-700",
                    sexe === 'F' && "bg-pink-100 text-pink-700",
                    sexe === 'Autre' && "bg-gray-100 text-gray-700"
                  )}>
                    {sexe === 'M' ? '♂' : sexe === 'F' ? '♀' : '⚧'}
                  </Badge>
                )}
                {age !== null && (
                  <Badge variant="secondary">{age} ans</Badge>
                )}
              </div>
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
          <TabsList className="grid w-full grid-cols-5 bg-muted/30 p-1.5 h-auto gap-1.5">
            <TabsTrigger 
              value="medical"
              className="bg-emerald-100/60 text-emerald-700 hover:bg-emerald-200/80 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-400 data-[state=active]:text-white data-[state=active]:shadow-md py-3 rounded-lg transition-all"
            >
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Dossier</span>
              <span className="sm:hidden">Méd.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="prescriptions"
              className="bg-blue-100/60 text-blue-700 hover:bg-blue-200/80 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-400 data-[state=active]:text-white data-[state=active]:shadow-md py-3 rounded-lg transition-all"
            >
              <Pill className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Ordonnances</span>
              <span className="sm:hidden">Ordo.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="certificates"
              className="bg-yellow-100/60 text-yellow-700 hover:bg-yellow-200/80 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-400 data-[state=active]:text-white data-[state=active]:shadow-md py-3 rounded-lg transition-all"
            >
              <FileBadge className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Certificats</span>
              <span className="sm:hidden">Cert.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="documents"
              className="bg-violet-100/60 text-violet-700 hover:bg-violet-200/80 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-400 data-[state=active]:text-white data-[state=active]:shadow-md py-3 rounded-lg transition-all"
            >
              <Upload className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Documents</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              className="bg-amber-100/60 text-amber-700 hover:bg-amber-200/80 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-400 data-[state=active]:text-white data-[state=active]:shadow-md py-3 rounded-lg transition-all"
            >
              <History className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Historique</span>
              <span className="sm:hidden">Hist.</span>
            </TabsTrigger>
          </TabsList>

          {/* Medical Record Tab - 2 Column Layout */}
          <TabsContent value="medical" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
              {/* Left Column - Identity */}
              <div className="hidden lg:block">
                <PatientIdentityCompact 
                  patient={patient} 
                  onEdit={() => setShowIdentityEdit(true)} 
                />
              </div>

              {/* Right Column - Medical Sections */}
              <div className="space-y-3">
                {/* Mobile Identity Summary */}
                <div className="lg:hidden mb-4">
                  <PatientIdentityCompact 
                    patient={patient} 
                    onEdit={() => setShowIdentityEdit(true)} 
                  />
                </div>

                <MedicalRecordAccordion
                  data={medicalData}
                  onSave={(section, value) => {
                    setMedicalData({ ...medicalData, [section]: value });
                    handleSaveSection(section as keyof typeof medicalData, value);
                  }}
                  editingSection={editingSection}
                  onEditToggle={(section) => setEditingSection(section)}
                />
              </div>
            </div>

            {/* Identity Edit Dialog */}
            {showIdentityEdit && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Modifier les informations</h2>
                    <Button variant="ghost" size="sm" onClick={() => setShowIdentityEdit(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <PatientIdentityTab patient={patient} />
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions" className="mt-6">
            {id && patient && (
              <PrescriptionsList
                patientId={id}
                patientName={`${patient.prenom} ${patient.nom}`}
              />
            )}
          </TabsContent>

          {/* Certificates Tab */}
          <TabsContent value="certificates" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setIsCertificateDialogOpen(true)} className="gap-2">
                <FileBadge className="w-4 h-4" />
                Nouveau certificat
              </Button>
            </div>
            {id && patient && (
              <>
                <CertificatesList patientId={id} />
                <CertificateDialog
                  open={isCertificateDialogOpen}
                  onOpenChange={setIsCertificateDialogOpen}
                  patientId={id}
                  patientName={`${patient.prenom} ${patient.nom}`}
                />
              </>
            )}
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
                {id && patient && <DocumentUploadDialog patientId={id} patientName={`${patient.prenom} ${patient.nom}`} />}
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
                  {id && patient && <DocumentUploadDialog patientId={id} patientName={`${patient.prenom} ${patient.nom}`}>
                    <Button className="gap-2">
                      <Upload className="w-4 h-4" />
                      Ajouter un document
                    </Button>
                  </DocumentUploadDialog>}
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map((doc) => {
                  const style = getDocumentStyle(doc.type);
                  const Icon = style.icon;
                  return (
                    <Card 
                      key={doc.id} 
                      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group bg-card"
                      onClick={() => window.open(doc.url, '_blank')}
                    >
                      <div className="flex">
                        {/* Color indicator bar */}
                        <div className={cn("w-1.5 shrink-0", style.barColor)} />
                        
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="p-2 rounded-lg bg-muted">
                              <Icon className={cn("w-5 h-5", style.iconColor)} />
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={cn("text-xs", style.badgeClass)}>{doc.type}</Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  id && deleteDocument.mutate({ id: doc.id, patientId: id });
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <h4 className="font-medium text-foreground text-sm leading-snug mb-2 line-clamp-2">
                            {doc.nom}
                          </h4>
                          
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString("fr-FR", { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric' 
                              })}
                            </p>
                            <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              Ouvrir <Eye className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            {id && <PatientHistoryTab patientId={id} />}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PatientDetail;
