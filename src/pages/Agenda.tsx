import { useState } from "react";
import { ArrowLeft, Plus, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { useAppointments } from "@/hooks/useAppointments";

const Agenda = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("week");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const timeSlots = Array.from({ length: 11 }, (_, i) => `${8 + i}:00`);

  // Fetch appointments from Supabase
  const today = format(currentDate, "yyyy-MM-dd");
  const { data: appointments = [], isLoading } = useAppointments(today);

  const getStatusBadge = (status: string) => {
    const variants = {
      confirmed: { label: "Confirmé", className: "bg-tile-agenda" },
      pending: { label: "En attente", className: "bg-tile-patients" },
      cancelled: { label: "Annulé", className: "bg-muted" },
      completed: { label: "Terminé", className: "bg-tile-statistiques" },
    };
    const variant = variants[status as keyof typeof variants] || variants.confirmed;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Agenda Médical</h1>
              <p className="text-sm text-muted-foreground">
                Gestion des rendez-vous et planning
              </p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau RDV
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week")} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="day">Jour</TabsTrigger>
              <TabsTrigger value="week">Semaine</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-[200px] text-center">
                <p className="font-semibold text-foreground">
                  {format(currentDate, "MMMM yyyy", { locale: fr })}
                </p>
                <p className="text-sm text-muted-foreground">
                  Semaine {format(currentDate, "w", { locale: fr })}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                Aujourd'hui
              </Button>
            </div>
          </div>

          <TabsContent value="week" className="space-y-0">
            <Card className="overflow-hidden">
              {/* Week header */}
              <div className="grid grid-cols-8 border-b border-border bg-muted/50">
                <div className="p-4 border-r border-border">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="p-4 text-center border-r border-border last:border-r-0"
                  >
                    <p className="font-semibold text-foreground">
                      {format(day, "EEE", { locale: fr })}
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {format(day, "d")}
                    </p>
                  </div>
                ))}
              </div>

              {/* Time slots */}
              <div className="max-h-[600px] overflow-y-auto">
                {timeSlots.map((time) => (
                  <div key={time} className="grid grid-cols-8 border-b border-border min-h-[80px]">
                    <div className="p-4 border-r border-border text-sm font-medium text-muted-foreground">
                      {time}
                    </div>
                    {weekDays.map((day) => (
                      <div
                        key={day.toISOString()}
                        className="p-2 border-r border-border last:border-r-0 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        {/* Appointments will appear here */}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="day" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    Rendez-vous du jour
                  </h3>
                  <Badge variant="outline">{appointments.length} RDV</Badge>
                </div>

                {isLoading ? (
                  <p className="text-center text-muted-foreground py-8">Chargement...</p>
                ) : appointments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun rendez-vous pour cette journée
                  </p>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((apt) => (
                      <Card key={apt.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-tile-agenda">
                                {apt.heure_debut.slice(0, 5)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {apt.heure_fin.slice(0, 5)}
                              </p>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {apt.patient?.prenom} {apt.patient?.nom}
                              </p>
                              <p className="text-sm text-muted-foreground capitalize">{apt.type}</p>
                            </div>
                          </div>
                          {getStatusBadge(apt.statut)}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Agenda;
