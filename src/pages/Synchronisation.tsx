import { useState } from "react";
import { ArrowLeft, Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Synchronisation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    // Simulate sync
    setTimeout(() => {
      setIsSyncing(false);
      toast({
        title: "Synchronisation terminée",
        description: "Toutes les données ont été synchronisées avec succès",
      });
    }, 2000);
  };

  const syncHistory = [
    { id: 1, date: "2024-03-15 14:30", status: "success", items: 12 },
    { id: 2, date: "2024-03-15 10:15", status: "success", items: 8 },
    { id: 3, date: "2024-03-14 18:45", status: "success", items: 15 },
    { id: 4, date: "2024-03-14 09:20", status: "error", items: 0 },
  ];

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
              <h1 className="text-2xl font-bold text-foreground">Synchronisation</h1>
              <p className="text-sm text-muted-foreground">
                Gestion du cloud et synchronisation des données
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Sync Status */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {syncEnabled ? (
                <Cloud className="w-8 h-8 text-tile-sync" />
              ) : (
                <CloudOff className="w-8 h-8 text-muted-foreground" />
              )}
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Synchronisation Cloud
                </h2>
                <p className="text-sm text-muted-foreground">
                  {syncEnabled ? "Activée" : "Désactivée"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="sync-toggle" className="text-sm">
                Activer la sync
              </Label>
              <Switch
                id="sync-toggle"
                checked={syncEnabled}
                onCheckedChange={setSyncEnabled}
              />
            </div>
          </div>

          {syncEnabled && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Database className="w-6 h-6 mx-auto mb-2 text-tile-patients" />
                  <p className="text-2xl font-bold text-foreground">245</p>
                  <p className="text-xs text-muted-foreground">Patients</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 text-tile-agenda" />
                  <p className="text-2xl font-bold text-foreground">1.2 Mo</p>
                  <p className="text-xs text-muted-foreground">Données</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <CheckCircle className="w-6 h-6 mx-auto mb-2 text-tile-statistiques" />
                  <p className="text-2xl font-bold text-foreground">100%</p>
                  <p className="text-xs text-muted-foreground">Synchronisé</p>
                </div>
              </div>

              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="w-full gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Synchronisation en cours..." : "Synchroniser maintenant"}
              </Button>
            </>
          )}
        </Card>

        {/* Sync History */}
        {syncEnabled && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Historique des synchronisations</h3>
            <div className="space-y-3">
              {syncHistory.map((sync) => (
                <div
                  key={sync.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {sync.status === "success" ? (
                      <CheckCircle className="w-5 h-5 text-tile-statistiques" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{sync.date}</p>
                      <p className="text-xs text-muted-foreground">
                        {sync.status === "success"
                          ? `${sync.items} éléments synchronisés`
                          : "Échec de la synchronisation"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={
                      sync.status === "success"
                        ? "bg-tile-statistiques"
                        : "bg-destructive"
                    }
                  >
                    {sync.status === "success" ? "Réussi" : "Échec"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Info Card when disabled */}
        {!syncEnabled && (
          <Card className="p-8 text-center">
            <CloudOff className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Mode Offline</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              L'application fonctionne actuellement en mode hors ligne. 
              Activez la synchronisation cloud pour sauvegarder vos données 
              et y accéder depuis d'autres appareils.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Synchronisation;
