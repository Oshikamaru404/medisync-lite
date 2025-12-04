import { useState } from "react";
import { ArrowLeft, Plus, Clock, ChevronLeft, ChevronRight, Edit, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useAppointments, Appointment } from "@/hooks/useAppointments";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { cn } from "@/lib/utils";

const Agenda = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("week");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [defaultDialogDate, setDefaultDialogDate] = useState<Date | undefined>();
  const [defaultDialogTime, setDefaultDialogTime] = useState<string | undefined>();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const timeSlots = Array.from({ length: 12 }, (_, i) => `${8 + i}:00`);

  // Fetch all appointments for the week
  const { data: allAppointments = [], isLoading } = useAppointments();

  // Filter appointments for the current week
  const weekAppointments = allAppointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    return aptDate >= weekStart && aptDate <= addDays(weekStart, 6);
  });

  // Filter appointments for the current day
  const dayAppointments = allAppointments.filter((apt) => 
    isSameDay(new Date(apt.date), currentDate)
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      confirmed: { label: "Confirmé", className: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30" },
      pending: { label: "En attente", className: "bg-amber-500/20 text-amber-700 border-amber-500/30" },
      cancelled: { label: "Annulé", className: "bg-red-500/20 text-red-700 border-red-500/30" },
      completed: { label: "Terminé", className: "bg-blue-500/20 text-blue-700 border-blue-500/30" },
    };
    const variant = variants[status] || variants.pending;
    return <Badge variant="outline" className={variant.className}>{variant.label}</Badge>;
  };

  const getAppointmentsForSlot = (day: Date, time: string) => {
    const hour = parseInt(time.split(":")[0]);
    return weekAppointments.filter((apt) => {
      const aptDate = new Date(apt.date);
      const aptHour = parseInt(apt.heure_debut.split(":")[0]);
      return isSameDay(aptDate, day) && aptHour === hour;
    });
  };

  const handleNewAppointment = (date?: Date, time?: string) => {
    setSelectedAppointment(null);
    setDefaultDialogDate(date);
    setDefaultDialogTime(time);
    setDialogOpen(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDefaultDialogDate(undefined);
    setDefaultDialogTime(undefined);
    setDialogOpen(true);
  };

  const handleDayNavigation = (direction: "prev" | "next") => {
    setCurrentDate(direction === "prev" ? subDays(currentDate, 1) : addDays(currentDate, 1));
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      confirmed: "border-l-emerald-500 bg-emerald-50",
      pending: "border-l-amber-500 bg-amber-50",
      cancelled: "border-l-red-500 bg-red-50",
      completed: "border-l-blue-500 bg-blue-50",
    };
    return colors[status] || colors.pending;
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
            <Button className="gap-2" onClick={() => handleNewAppointment()}>
              <Plus className="w-4 h-4" />
              Nouveau RDV
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week")} className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <TabsList>
              <TabsTrigger value="day">Jour</TabsTrigger>
              <TabsTrigger value="week">Semaine</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => view === "week" 
                  ? setCurrentDate(subWeeks(currentDate, 1))
                  : handleDayNavigation("prev")
                }
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-[200px] text-center">
                <p className="font-semibold text-foreground">
                  {view === "week" 
                    ? format(currentDate, "MMMM yyyy", { locale: fr })
                    : format(currentDate, "EEEE d MMMM yyyy", { locale: fr })
                  }
                </p>
                {view === "week" && (
                  <p className="text-sm text-muted-foreground">
                    Semaine {format(currentDate, "w", { locale: fr })}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => view === "week"
                  ? setCurrentDate(addWeeks(currentDate, 1))
                  : handleDayNavigation("next")
                }
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                Aujourd'hui
              </Button>
            </div>
          </div>

          {/* Week View */}
          <TabsContent value="week" className="space-y-0">
            <Card className="overflow-hidden">
              {/* Week header */}
              <div className="grid grid-cols-8 border-b border-border bg-muted/50">
                <div className="p-4 border-r border-border">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                {weekDays.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "p-4 text-center border-r border-border last:border-r-0 cursor-pointer hover:bg-muted/80 transition-colors",
                        isToday && "bg-primary/10"
                      )}
                      onClick={() => {
                        setCurrentDate(day);
                        setView("day");
                      }}
                    >
                      <p className="font-semibold text-foreground">
                        {format(day, "EEE", { locale: fr })}
                      </p>
                      <p className={cn(
                        "text-2xl font-bold mt-1",
                        isToday ? "text-primary" : "text-foreground"
                      )}>
                        {format(day, "d")}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Time slots */}
              <div className="max-h-[600px] overflow-y-auto">
                {timeSlots.map((time) => (
                  <div key={time} className="grid grid-cols-8 border-b border-border min-h-[80px]">
                    <div className="p-4 border-r border-border text-sm font-medium text-muted-foreground">
                      {time}
                    </div>
                    {weekDays.map((day) => {
                      const slotAppointments = getAppointmentsForSlot(day, time);
                      return (
                        <div
                          key={day.toISOString()}
                          className="p-1 border-r border-border last:border-r-0 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleNewAppointment(day, time)}
                        >
                          {slotAppointments.map((apt) => (
                            <div
                              key={apt.id}
                              className={cn(
                                "p-2 rounded text-xs mb-1 border-l-4 cursor-pointer hover:opacity-80",
                                getStatusColor(apt.statut)
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditAppointment(apt);
                              }}
                            >
                              <p className="font-semibold truncate">
                                {apt.patient?.prenom} {apt.patient?.nom}
                              </p>
                              <p className="text-muted-foreground">
                                {apt.heure_debut.slice(0, 5)} - {apt.heure_fin.slice(0, 5)}
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Day View */}
          <TabsContent value="day" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    Rendez-vous du jour
                  </h3>
                  <Badge variant="outline">{dayAppointments.length} RDV</Badge>
                </div>

                {isLoading ? (
                  <p className="text-center text-muted-foreground py-8">Chargement...</p>
                ) : dayAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Aucun rendez-vous pour cette journée
                    </p>
                    <Button onClick={() => handleNewAppointment(currentDate)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter un rendez-vous
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dayAppointments
                      .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))
                      .map((apt) => (
                        <Card 
                          key={apt.id} 
                          className={cn(
                            "p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4",
                            getStatusColor(apt.statut)
                          )}
                          onClick={() => handleEditAppointment(apt)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="text-center min-w-[70px]">
                                <p className="text-2xl font-bold text-primary">
                                  {apt.heure_debut.slice(0, 5)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {apt.heure_fin.slice(0, 5)}
                                </p>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  <p className="font-semibold text-foreground">
                                    {apt.patient?.prenom} {apt.patient?.nom}
                                  </p>
                                </div>
                                <p className="text-sm text-muted-foreground capitalize">{apt.type}</p>
                                {apt.notes && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {apt.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(apt.statut)}
                              <Button variant="ghost" size="icon">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Day Timeline */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Planning horaire</h3>
              <div className="space-y-1">
                {timeSlots.map((time) => {
                  const hour = parseInt(time.split(":")[0]);
                  const slotApts = dayAppointments.filter(
                    (apt) => parseInt(apt.heure_debut.split(":")[0]) === hour
                  );
                  return (
                    <div 
                      key={time} 
                      className="flex items-stretch gap-4 min-h-[50px] hover:bg-muted/50 rounded cursor-pointer p-2"
                      onClick={() => handleNewAppointment(currentDate, time)}
                    >
                      <div className="w-16 text-sm font-medium text-muted-foreground pt-1">
                        {time}
                      </div>
                      <div className="flex-1 border-l border-border pl-4">
                        {slotApts.length > 0 ? (
                          slotApts.map((apt) => (
                            <div
                              key={apt.id}
                              className={cn(
                                "p-2 rounded border-l-4 mb-1",
                                getStatusColor(apt.statut)
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditAppointment(apt);
                              }}
                            >
                              <span className="font-medium">
                                {apt.patient?.prenom} {apt.patient?.nom}
                              </span>
                              <span className="text-muted-foreground ml-2">
                                ({apt.heure_debut.slice(0, 5)} - {apt.heure_fin.slice(0, 5)})
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex items-center text-muted-foreground/50 text-sm">
                            Disponible
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Appointment Dialog */}
      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointment={selectedAppointment}
        defaultDate={defaultDialogDate}
        defaultTime={defaultDialogTime}
      />
    </div>
  );
};

export default Agenda;
