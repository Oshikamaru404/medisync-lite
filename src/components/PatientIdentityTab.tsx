import { useState, useEffect } from "react";
import { User, Phone, Mail, MapPin, Shield, Users, Edit, Save, X, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Patient, useUpdatePatient } from "@/hooks/usePatients";
import { differenceInYears, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

type PatientWithExtras = Patient & {
  sexe?: string | null;
  numero_mutuelle?: string | null;
  lien_personne_contact?: string | null;
  telephone_personne_contact?: string | null;
};

interface PatientIdentityTabProps {
  patient: PatientWithExtras;
}

export const PatientIdentityTab = ({ patient }: PatientIdentityTabProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const updatePatient = useUpdatePatient();
  
  const [formData, setFormData] = useState({
    prenom: patient.prenom || "",
    nom: patient.nom || "",
    date_naissance: patient.date_naissance || "",
    sexe: (patient as any).sexe || "",
    telephone: patient.telephone || "",
    email: patient.email || "",
    adresse: patient.adresse || "",
    mutuelle: patient.mutuelle || "",
    numero_mutuelle: (patient as any).numero_mutuelle || "",
    personne_contact: patient.personne_contact || "",
    telephone_personne_contact: (patient as any).telephone_personne_contact || "",
    lien_personne_contact: (patient as any).lien_personne_contact || "",
  });

  useEffect(() => {
    setFormData({
      prenom: patient.prenom || "",
      nom: patient.nom || "",
      date_naissance: patient.date_naissance || "",
      sexe: (patient as any).sexe || "",
      telephone: patient.telephone || "",
      email: patient.email || "",
      adresse: patient.adresse || "",
      mutuelle: patient.mutuelle || "",
      numero_mutuelle: (patient as any).numero_mutuelle || "",
      personne_contact: patient.personne_contact || "",
      telephone_personne_contact: (patient as any).telephone_personne_contact || "",
      lien_personne_contact: (patient as any).lien_personne_contact || "",
    });
  }, [patient]);

  const calculateAge = (dateNaissance: string | null) => {
    if (!dateNaissance) return null;
    try {
      return differenceInYears(new Date(), parseISO(dateNaissance));
    } catch {
      return null;
    }
  };

  const handleSave = () => {
    updatePatient.mutate(
      { 
        id: patient.id, 
        ...formData,
        date_naissance: formData.date_naissance || null,
      },
      {
        onSuccess: () => setIsEditing(false),
      }
    );
  };

  const handleCancel = () => {
    setFormData({
      prenom: patient.prenom || "",
      nom: patient.nom || "",
      date_naissance: patient.date_naissance || "",
      sexe: (patient as any).sexe || "",
      telephone: patient.telephone || "",
      email: patient.email || "",
      adresse: patient.adresse || "",
      mutuelle: patient.mutuelle || "",
      numero_mutuelle: (patient as any).numero_mutuelle || "",
      personne_contact: patient.personne_contact || "",
      telephone_personne_contact: (patient as any).telephone_personne_contact || "",
      lien_personne_contact: (patient as any).lien_personne_contact || "",
    });
    setIsEditing(false);
  };

  const age = calculateAge(patient.date_naissance);

  const renderField = (label: string, value: string | null | undefined, placeholder: string = "Non renseigné") => (
    <div>
      <span className="text-sm text-muted-foreground">{label}</span>
      <p className="font-medium text-foreground">{value || <span className="text-muted-foreground italic">{placeholder}</span>}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Edit Button */}
      <div className="flex justify-end">
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={updatePatient.isPending}>
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={updatePatient.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {updatePatient.isPending ? "Enregistrement..." : "Sauvegarder"}
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </Button>
        )}
      </div>

      {/* Informations Personnelles */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3 bg-primary/5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            Informations Personnelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_naissance">Date de naissance</Label>
                <Input
                  id="date_naissance"
                  type="date"
                  value={formData.date_naissance}
                  onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sexe">Sexe</Label>
                <Select value={formData.sexe} onValueChange={(value) => setFormData({ ...formData, sexe: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculin</SelectItem>
                    <SelectItem value="F">Féminin</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {renderField("Prénom", patient.prenom)}
              {renderField("Nom", patient.nom)}
              <div>
                <span className="text-sm text-muted-foreground">Date de naissance</span>
                <p className="font-medium text-foreground">
                  {patient.date_naissance 
                    ? (
                      <>
                        {format(parseISO(patient.date_naissance), "dd MMMM yyyy", { locale: fr })}
                        {age !== null && (
                          <Badge variant="secondary" className="ml-2">{age} ans</Badge>
                        )}
                      </>
                    )
                    : <span className="text-muted-foreground italic">Non renseigné</span>
                  }
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Sexe</span>
                <p className="font-medium text-foreground mt-1">
                  {(patient as any).sexe === 'M' && <Badge className="bg-patient-male/20 text-patient-male border border-patient-male/30">♂ Masculin</Badge>}
                  {(patient as any).sexe === 'F' && <Badge className="bg-patient-female/20 text-patient-female border border-patient-female/30">♀ Féminin</Badge>}
                  {(patient as any).sexe === 'Autre' && <Badge className="bg-patient-other/20 text-patient-other border border-patient-other/30">Autre</Badge>}
                  {!(patient as any).sexe && <span className="text-muted-foreground italic">Non renseigné</span>}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coordonnées */}
      <Card className="border-l-4 border-l-secondary">
        <CardHeader className="pb-3 bg-secondary/5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-secondary/10">
              <Phone className="w-5 h-5 text-secondary" />
            </div>
            Coordonnées
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  placeholder="+212 6XX XXX XXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="patient@email.com"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Textarea
                  id="adresse"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  placeholder="Adresse complète..."
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-sm text-muted-foreground">Téléphone</span>
                  <p className="font-medium text-foreground">{patient.telephone || <span className="text-muted-foreground italic">Non renseigné</span>}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-sm text-muted-foreground">Email</span>
                  <p className="font-medium text-foreground">{patient.email || <span className="text-muted-foreground italic">Non renseigné</span>}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 md:col-span-2 lg:col-span-1">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-sm text-muted-foreground">Adresse</span>
                  <p className="font-medium text-foreground">{patient.adresse || <span className="text-muted-foreground italic">Non renseigné</span>}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Couverture Médicale */}
      <Card className="border-l-4 border-l-tile-dossiers">
        <CardHeader className="pb-3 bg-tile-dossiers/5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-tile-dossiers/10">
              <Shield className="w-5 h-5 text-tile-dossiers" />
            </div>
            Couverture Médicale
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mutuelle">Mutuelle / Assurance</Label>
                <Input
                  id="mutuelle"
                  value={formData.mutuelle}
                  onChange={(e) => setFormData({ ...formData, mutuelle: e.target.value })}
                  placeholder="Nom de la mutuelle..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero_mutuelle">Numéro d'adhérent</Label>
                <Input
                  id="numero_mutuelle"
                  value={formData.numero_mutuelle}
                  onChange={(e) => setFormData({ ...formData, numero_mutuelle: e.target.value })}
                  placeholder="N° adhérent..."
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderField("Mutuelle / Assurance", patient.mutuelle)}
              {renderField("Numéro d'adhérent", (patient as any).numero_mutuelle)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personne à Contacter */}
      <Card className="border-l-4 border-l-destructive">
        <CardHeader className="pb-3 bg-destructive/5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Users className="w-5 h-5 text-destructive" />
            </div>
            Personne à Contacter en Cas d'Urgence
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="personne_contact">Nom complet</Label>
                <Input
                  id="personne_contact"
                  value={formData.personne_contact}
                  onChange={(e) => setFormData({ ...formData, personne_contact: e.target.value })}
                  placeholder="Nom de la personne..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone_personne_contact">Téléphone</Label>
                <Input
                  id="telephone_personne_contact"
                  type="tel"
                  value={formData.telephone_personne_contact}
                  onChange={(e) => setFormData({ ...formData, telephone_personne_contact: e.target.value })}
                  placeholder="+212 6XX XXX XXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lien_personne_contact">Lien de parenté</Label>
                <Select 
                  value={formData.lien_personne_contact} 
                  onValueChange={(value) => setFormData({ ...formData, lien_personne_contact: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Conjoint(e)">Conjoint(e)</SelectItem>
                    <SelectItem value="Parent">Parent</SelectItem>
                    <SelectItem value="Enfant">Enfant</SelectItem>
                    <SelectItem value="Frère/Sœur">Frère/Sœur</SelectItem>
                    <SelectItem value="Ami(e)">Ami(e)</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {renderField("Nom complet", patient.personne_contact)}
              {renderField("Téléphone", (patient as any).telephone_personne_contact)}
              {renderField("Lien de parenté", (patient as any).lien_personne_contact)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Patient enregistré le {format(new Date(patient.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
