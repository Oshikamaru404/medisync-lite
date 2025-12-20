import { ArrowLeft, TrendingUp, Users, Calendar, Banknote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePatients } from "@/hooks/usePatients";
import { useAppointments } from "@/hooks/useAppointments";
import { useInvoices } from "@/hooks/useInvoices";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, Area, AreaChart
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo } from "react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const Statistiques = () => {
  const navigate = useNavigate();

  const { data: patients = [] } = usePatients();
  const { data: appointments = [] } = useAppointments();
  const { data: invoices = [] } = useInvoices();

  // Calculate real statistics
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const appointmentsMonth = appointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    return aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear;
  }).length;

  const revenueMonth = invoices
    .filter((inv) => {
      const invDate = new Date(inv.date);
      return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
    })
    .reduce((sum, inv) => sum + inv.montant, 0);

  const averagePerDay = appointmentsMonth > 0 ? Math.round(appointmentsMonth / 30) : 0;

  const stats = {
    totalPatients: patients.length,
    appointmentsMonth,
    revenueMonth,
    averagePerDay,
  };

  // Données pour graphiques sur 6 derniers mois
  const last6Months = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });
    return months.map(month => ({
      month: format(month, 'MMM', { locale: fr }),
      fullMonth: format(month, 'MMMM yyyy', { locale: fr }),
      start: startOfMonth(month),
      end: endOfMonth(month)
    }));
  }, []);

  // Revenus mensuels
  const revenueData = useMemo(() => {
    return last6Months.map(({ month, start, end }) => {
      const total = invoices
        .filter(inv => {
          const date = new Date(inv.date);
          return date >= start && date <= end;
        })
        .reduce((sum, inv) => sum + inv.montant, 0);
      return { name: month, revenus: total };
    });
  }, [invoices, last6Months]);

  // RDV mensuels
  const appointmentsData = useMemo(() => {
    return last6Months.map(({ month, start, end }) => {
      const confirmed = appointments.filter(apt => {
        const date = new Date(apt.date);
        return date >= start && date <= end && apt.statut === 'confirmed';
      }).length;
      const pending = appointments.filter(apt => {
        const date = new Date(apt.date);
        return date >= start && date <= end && apt.statut === 'pending';
      }).length;
      const cancelled = appointments.filter(apt => {
        const date = new Date(apt.date);
        return date >= start && date <= end && apt.statut === 'cancelled';
      }).length;
      return { name: month, confirmés: confirmed, attente: pending, annulés: cancelled };
    });
  }, [appointments, last6Months]);

  // Nouveaux patients par mois
  const patientsData = useMemo(() => {
    return last6Months.map(({ month, start, end }) => {
      const count = patients.filter(p => {
        if (!p.created_at) return false;
        const date = new Date(p.created_at);
        return date >= start && date <= end;
      }).length;
      return { name: month, patients: count };
    });
  }, [patients, last6Months]);

  // Répartition par type de RDV
  const appointmentTypeData = useMemo(() => {
    const typeCount: Record<string, number> = {};
    appointments.forEach(apt => {
      const type = apt.type || 'Autre';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    return Object.entries(typeCount).map(([name, value]) => ({ name, value }));
  }, [appointments]);

  // Répartition par statut de facture
  const invoiceStatusData = useMemo(() => {
    const paid = invoices.filter(inv => inv.statut === 'paid').length;
    const pending = invoices.filter(inv => inv.statut === 'pending').length;
    return [
      { name: 'Payées', value: paid },
      { name: 'En attente', value: pending }
    ];
  }, [invoices]);

  // Répartition par sexe
  const genderData = useMemo(() => {
    const male = patients.filter(p => p.sexe === 'M').length;
    const female = patients.filter(p => p.sexe === 'F').length;
    const unknown = patients.filter(p => !p.sexe || (p.sexe !== 'M' && p.sexe !== 'F')).length;
    return [
      { name: 'Homme', value: male },
      { name: 'Femme', value: female },
      ...(unknown > 0 ? [{ name: 'Non renseigné', value: unknown }] : [])
    ].filter(d => d.value > 0);
  }, [patients]);

  // Statuts des RDV
  const appointmentStatusData = useMemo(() => {
    const confirmed = appointments.filter(apt => apt.statut === 'confirmed').length;
    const pending = appointments.filter(apt => apt.statut === 'pending').length;
    const cancelled = appointments.filter(apt => apt.statut === 'cancelled').length;
    const completed = appointments.filter(apt => apt.statut === 'completed').length;
    return [
      { name: 'Confirmés', value: confirmed },
      { name: 'En attente', value: pending },
      { name: 'Terminés', value: completed },
      { name: 'Annulés', value: cancelled }
    ].filter(d => d.value > 0);
  }, [appointments]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toLocaleString()} {entry.dataKey === 'revenus' ? 'DH' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return percent > 0.05 ? (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-medium">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
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
              <h1 className="text-2xl font-bold text-foreground">Statistiques</h1>
              <p className="text-sm text-muted-foreground">
                Tableaux de bord et analyses
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-tile-patients/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-tile-patients" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Patients</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalPatients}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-tile-agenda/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-tile-agenda" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">RDV ce mois</p>
                <p className="text-2xl font-bold text-foreground">{stats.appointmentsMonth}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-tile-comptabilite/10 flex items-center justify-center">
                <Banknote className="w-6 h-6 text-tile-comptabilite" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenu mensuel</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.revenueMonth.toLocaleString()} DH
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-tile-statistiques/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-tile-statistiques" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Moyenne/jour</p>
                <p className="text-2xl font-bold text-foreground">{stats.averagePerDay}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts & Reports */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="revenue">Revenus</TabsTrigger>
            <TabsTrigger value="appointments">Rendez-vous</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Évolution des revenus */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Évolution des revenus (6 mois)</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenus" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `${v/1000}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="revenus" stroke="#10b981" fill="url(#colorRevenus)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Répartition RDV */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Statuts des rendez-vous</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={appointmentStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {appointmentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Nouveaux patients */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Nouveaux patients par mois</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={patientsData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="patients" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Statut factures */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">État des factures</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={invoiceStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="patients">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Évolution patients */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Évolution du nombre de patients</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={patientsData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="patients" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Répartition par sexe */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Répartition par sexe</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : index === 1 ? '#ec4899' : '#9ca3af'} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Stats patients */}
              <Card className="p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Statistiques détaillées</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-tile-patients">{patients.length}</p>
                    <p className="text-sm text-muted-foreground">Total patients</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-blue-500">{patients.filter(p => p.sexe === 'M').length}</p>
                    <p className="text-sm text-muted-foreground">Hommes</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-pink-500">{patients.filter(p => p.sexe === 'F').length}</p>
                    <p className="text-sm text-muted-foreground">Femmes</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-500">
                      {patients.filter(p => p.created_at && new Date(p.created_at).getMonth() === currentMonth).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Nouveaux ce mois</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="revenue">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Évolution revenus */}
              <Card className="p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Évolution des revenus mensuels</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `${v/1000}k DH`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenus" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* État des factures */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">État des factures</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={invoiceStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Stats revenus */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Résumé financier</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total factures payées</p>
                    <p className="text-2xl font-bold text-green-500">
                      {invoices.filter(i => i.statut === 'paid').reduce((s, i) => s + i.montant, 0).toLocaleString()} DH
                    </p>
                  </div>
                  <div className="p-4 bg-amber-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total en attente</p>
                    <p className="text-2xl font-bold text-amber-500">
                      {invoices.filter(i => i.statut === 'pending').reduce((s, i) => s + i.montant, 0).toLocaleString()} DH
                    </p>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Montant moyen consultation</p>
                    <p className="text-2xl font-bold text-blue-500">
                      {invoices.length > 0 ? Math.round(invoices.reduce((s, i) => s + i.montant, 0) / invoices.length).toLocaleString() : 0} DH
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="appointments">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* RDV par mois */}
              <Card className="p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Rendez-vous par mois (par statut)</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={appointmentsData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="confirmés" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="attente" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="annulés" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Types de RDV */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Répartition par type de consultation</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={appointmentTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {appointmentTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Stats RDV */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Statistiques RDV</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-tile-agenda/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total RDV</p>
                    <p className="text-2xl font-bold text-tile-agenda">{appointments.length}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-500/10 rounded-lg text-center">
                      <p className="text-xl font-bold text-green-500">
                        {appointments.filter(a => a.statut === 'confirmed').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Confirmés</p>
                    </div>
                    <div className="p-4 bg-amber-500/10 rounded-lg text-center">
                      <p className="text-xl font-bold text-amber-500">
                        {appointments.filter(a => a.statut === 'pending').length}
                      </p>
                      <p className="text-xs text-muted-foreground">En attente</p>
                    </div>
                    <div className="p-4 bg-blue-500/10 rounded-lg text-center">
                      <p className="text-xl font-bold text-blue-500">
                        {appointments.filter(a => a.statut === 'completed').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Terminés</p>
                    </div>
                    <div className="p-4 bg-red-500/10 rounded-lg text-center">
                      <p className="text-xl font-bold text-red-500">
                        {appointments.filter(a => a.statut === 'cancelled').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Annulés</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Statistiques;
