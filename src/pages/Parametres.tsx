import { useState, useEffect } from "react";
import { ArrowLeft, User, Building2, Bell, Lock, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";

const Parametres = () => {
  const navigate = useNavigate();
  const { getSettingValue, updateSetting, isLoading } = useSettings();
  
  const [specialty, setSpecialty] = useState("");
  const [doctorName, setDoctorName] = useState("");

  useEffect(() => {
    if (!isLoading) {
      setSpecialty(getSettingValue("cabinet_specialty"));
      setDoctorName(getSettingValue("doctor_name"));
    }
  }, [isLoading, getSettingValue]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
              <p className="text-sm text-muted-foreground">
                Configuration du système et préférences
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="cabinet" className="gap-2">
              <Building2 className="w-4 h-4" />
              Cabinet
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="w-4 h-4" />
              Sécurité
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              Apparence
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Informations du praticien</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input id="firstName" placeholder="Votre prénom" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input id="lastName" placeholder="Votre nom" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialty">Spécialité</Label>
                  <Input id="specialty" placeholder="Ex: Médecine générale" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rpps">N° RPPS</Label>
                  <Input id="rpps" placeholder="Numéro RPPS" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="email@exemple.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input id="phone" type="tel" placeholder="+33 6 12 34 56 78" />
                </div>

                <Separator />

                <Button>Enregistrer les modifications</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="cabinet">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Informations du cabinet</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Nom affiché :</p>
                  <p className="font-semibold text-foreground">
                    Cabinet {specialty || "[Spécialité]"} Dr {doctorName || "[Nom]"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specialty">Spécialité</Label>
                    <Input 
                      id="specialty" 
                      placeholder="Ex: Médecine Générale" 
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doctorName">Nom du docteur</Label>
                    <Input 
                      id="doctorName" 
                      placeholder="Ex: MARTIN" 
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => {
                    updateSetting.mutate({ key: "cabinet_specialty", value: specialty });
                    updateSetting.mutate({ key: "doctor_name", value: doctorName });
                  }}
                  disabled={updateSetting.isPending}
                >
                  Enregistrer le nom du cabinet
                </Button>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input id="address" placeholder="Numéro et rue" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">Code postal</Label>
                    <Input id="zipCode" placeholder="75001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input id="city" placeholder="Paris" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cabinetPhone">Téléphone cabinet</Label>
                  <Input id="cabinetPhone" type="tel" placeholder="+33 1 23 45 67 89" />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Horaires d'ouverture</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="openTime">Ouverture</Label>
                      <Input id="openTime" type="time" defaultValue="08:00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="closeTime">Fermeture</Label>
                      <Input id="closeTime" type="time" defaultValue="19:00" />
                    </div>
                  </div>
                </div>

                <Separator />

                <Button>Enregistrer les modifications</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Préférences de notifications</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notifications de rendez-vous</p>
                    <p className="text-sm text-muted-foreground">
                      Recevoir des alertes pour les RDV du jour
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Rappels patients</p>
                    <p className="text-sm text-muted-foreground">
                      Envoyer des rappels automatiques aux patients
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Alertes synchronisation</p>
                    <p className="text-sm text-muted-foreground">
                      Notifier en cas de problème de sync
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Sécurité et confidentialité</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                  <Input id="currentPassword" type="password" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <Input id="newPassword" type="password" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input id="confirmPassword" type="password" />
                </div>

                <Separator />

                <Button>Modifier le mot de passe</Button>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Paramètres de sécurité</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Authentification à deux facteurs</p>
                      <p className="text-sm text-muted-foreground">
                        Sécurité renforcée pour la connexion
                      </p>
                    </div>
                    <Switch />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Verrouillage automatique</p>
                      <p className="text-sm text-muted-foreground">
                        Verrouiller après 15 min d'inactivité
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Apparence de l'interface</h3>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Thème</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4 cursor-pointer border-2 border-primary">
                      <div className="aspect-video bg-background rounded mb-2"></div>
                      <p className="text-sm text-center font-medium">Clair</p>
                    </Card>
                    <Card className="p-4 cursor-pointer hover:border-2 hover:border-primary">
                      <div className="aspect-video bg-foreground rounded mb-2"></div>
                      <p className="text-sm text-center font-medium">Sombre</p>
                    </Card>
                    <Card className="p-4 cursor-pointer hover:border-2 hover:border-primary">
                      <div className="aspect-video bg-gradient-to-br from-background to-foreground rounded mb-2"></div>
                      <p className="text-sm text-center font-medium">Auto</p>
                    </Card>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Mode compact</p>
                    <p className="text-sm text-muted-foreground">
                      Affichage plus dense pour les écrans plus petits
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Parametres;
