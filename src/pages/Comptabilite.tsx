import { useState } from "react";
import { ArrowLeft, Plus, Euro, TrendingUp, FileText, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const Comptabilite = () => {
  const navigate = useNavigate();

  // Mock data
  const stats = {
    totalMonth: 12500,
    totalYear: 145000,
    pending: 2500,
    invoiceCount: 45,
  };

  const recentInvoices = [
    { id: "F-2024-001", patient: "Jean Dupont", date: "2024-03-15", amount: 50, status: "paid" },
    { id: "F-2024-002", patient: "Marie Martin", date: "2024-03-14", amount: 70, status: "paid" },
    { id: "F-2024-003", patient: "Pierre Durand", date: "2024-03-14", amount: 60, status: "pending" },
    { id: "F-2024-004", patient: "Sophie Bernard", date: "2024-03-13", amount: 50, status: "paid" },
  ];

  const getStatusBadge = (status: string) => {
    return status === "paid" ? (
      <Badge className="bg-tile-statistiques">Payée</Badge>
    ) : (
      <Badge className="bg-tile-comptabilite">En attente</Badge>
    );
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
              <h1 className="text-2xl font-bold text-foreground">Comptabilité</h1>
              <p className="text-sm text-muted-foreground">
                Gestion financière et facturation
              </p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle facture
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-tile-comptabilite/10 flex items-center justify-center">
                <Euro className="w-6 h-6 text-tile-comptabilite" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ce mois</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalMonth.toLocaleString()}€
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
                <p className="text-sm text-muted-foreground">Cette année</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalYear.toLocaleString()}€
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-tile-agenda/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-tile-agenda" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.pending.toLocaleString()}€
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-tile-patients/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-tile-patients" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Factures</p>
                <p className="text-2xl font-bold text-foreground">{stats.invoiceCount}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="invoices" className="space-y-6">
          <TabsList>
            <TabsTrigger value="invoices">Factures</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Facture</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{invoice.id}</TableCell>
                      <TableCell>{invoice.patient}</TableCell>
                      <TableCell>{invoice.date}</TableCell>
                      <TableCell className="font-semibold">{invoice.amount}€</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Détails
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                Module de gestion des paiements
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                Rapports et exports comptables
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Comptabilite;
