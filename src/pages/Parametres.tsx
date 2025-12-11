import { useState, useEffect } from "react";
import { ArrowLeft, Building2, Bell, Lock, Palette, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "sonner";

const Parametres = () => {
  const navigate = useNavigate();
  const { getSettingValue, updateSetting, isLoading } = useSettings();
  
  // Cabinet & Doctor settings
  const [specialty, setSpecialty] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorFirstName, setDoctorFirstName] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [doctorPhone, setDoctorPhone] = useState("+212 ");
  const [cabinetAddress, setCabinetAddress] = useState("");
  const [cabinetZipCode, setCabinetZipCode] = useState("");
  const [cabinetCity, setCabinetCity] = useState("");
  const [cabinetPhone, setCabinetPhone] = useState("+212 ");
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("19:00");

  useEffect(() => {
    if (!isLoading) {
      setSpecialty(getSettingValue("cabinet_specialty") || "");
      setDoctorName(getSettingValue("doctor_name") || "");
      setDoctorFirstName(getSettingValue("doctor_first_name") || "");
      setDoctorEmail(getSettingValue("doctor_email") || "");
      setDoctorPhone(getSettingValue("doctor_phone") || "+212 ");
      setCabinetAddress(getSettingValue("cabinet_address") || "");
      setCabinetZipCode(getSettingValue("cabinet_zip_code") || "");
      setCabinetCity(getSettingValue("cabinet_city") || "");
      setCabinetPhone(getSettingValue("cabinet_phone") || "+212 ");
      setOpenTime(getSettingValue("open_time") || "08:00");
      setCloseTime(getSettingValue("close_time") || "19:00");
    }
  }, [isLoading, getSettingValue]);

  const formatMoroccanPhone = (value: string) => {
    // Keep +212 prefix and format the rest
    let cleaned = value.replace(/[^\d+]/g, "");
    if (!cleaned.startsWith("+212")) {
      cleaned = "+212" + cleaned.replace("+", "");
    }
    // Format: +212 6XX XX XX XX
    const digits = cleaned.slice(4);
    if (digits.length <= 3) {
      return `+212 ${digits}`;
    } else if (digits.length <= 5) {
      return `+212 ${digits.slice(0, 3)} ${digits.slice(3)}`;
    } else if (digits.length <= 7) {
      return `+212 ${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
    } else {
      return `+212 ${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
    }
  };

  const handleSaveAll = async () => {
    const settings = [
      { key: "cabinet_specialty", value: specialty },
      { key: "doctor_name", value: doctorName },
      { key: "doctor_first_name", value: doctorFirstName },
      { key: "doctor_email", value: doctorEmail },
      { key: "doctor_phone", value: doctorPhone },
      { key: "cabinet_address", value: cabinetAddress },
      { key: "cabinet_zip_code", value: cabinetZipCode },
      { key: "cabinet_city", value: cabinetCity },
      { key: "cabinet_phone", value: cabinetPhone },
      { key: "open_time", value: openTime },
      { key: "close_time", value: closeTime },
    ];

    for (const setting of settings) {
      await updateSetting.mutateAsync(setting);
    }
    toast.success("Tous les paramètres ont été enregistrés");
  };

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
        <Tabs defaultValue="cabinet" className="space-y-6">
          <TabsList>
            <TabsTrigger value="cabinet" className="gap-2">
              <Building2 className="w-4 h-4" />
              Cabinet & Praticien
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

          <TabsContent value="cabinet">
            <div className="space-y-6">
              {/* Preview du nom */}
              <Card className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Nom affiché sur le dashboard :</p>
                <p className="text-xl font-semibold text-foreground">
                  Cabinet {specialty || "[Spécialité]"} Dr {doctorName || "[Nom]"}
                </p>
              </Card>

              {/* Informations du praticien */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Informations du praticien</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="doctorFirstName">Prénom</Label>
                      <Input 
                        id="doctorFirstName" 
                        placeholder="Votre prénom" 
                        value={doctorFirstName}
                        onChange={(e) => setDoctorFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doctorName">Nom</Label>
                      <Input 
                        id="doctorName" 
                        placeholder="Votre nom" 
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialty">Spécialité</Label>
                    <Input 
                      id="specialty" 
                      placeholder="Ex: Médecine Générale, Cardiologie..." 
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="doctorEmail">Email</Label>
                      <Input 
                        id="doctorEmail" 
                        type="email" 
                        placeholder="email@exemple.com" 
                        value={doctorEmail}
                        onChange={(e) => setDoctorEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doctorPhone">Téléphone personnel</Label>
                      <Input 
                        id="doctorPhone" 
                        type="tel" 
                        placeholder="+212 6XX XX XX XX" 
                        value={doctorPhone}
                        onChange={(e) => setDoctorPhone(formatMoroccanPhone(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Informations du cabinet */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Informations du cabinet</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cabinetAddress">Adresse</Label>
                    <Input 
                      id="cabinetAddress" 
                      placeholder="Numéro et rue" 
                      value={cabinetAddress}
                      onChange={(e) => setCabinetAddress(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cabinetZipCode">Code postal</Label>
                      <Input 
                        id="cabinetZipCode" 
                        placeholder="20000" 
                        value={cabinetZipCode}
                        onChange={(e) => setCabinetZipCode(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cabinetCity">Ville</Label>
                      <Input 
                        id="cabinetCity" 
                        placeholder="Casablanca" 
                        value={cabinetCity}
                        onChange={(e) => setCabinetCity(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cabinetPhone">Téléphone du cabinet</Label>
                    <Input 
                      id="cabinetPhone" 
                      type="tel" 
                      placeholder="+212 5XX XX XX XX" 
                      value={cabinetPhone}
                      onChange={(e) => setCabinetPhone(formatMoroccanPhone(e.target.value))}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Horaires d'ouverture</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="openTime">Ouverture</Label>
                        <Input 
                          id="openTime" 
                          type="time" 
                          value={openTime}
                          onChange={(e) => setOpenTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="closeTime">Fermeture</Label>
                        <Input 
                          id="closeTime" 
                          type="time" 
                          value={closeTime}
                          onChange={(e) => setCloseTime(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Save button */}
              <Button 
                onClick={handleSaveAll}
                disabled={updateSetting.isPending}
                className="w-full gap-2"
                size="lg"
              >
                <Save className="w-4 h-4" />
                Enregistrer tous les paramètres
              </Button>
            </div>
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
