import { useState } from "react";
import { Pill, Calendar, Eye, Printer, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePrescriptions, usePrescription, useDeletePrescription } from "@/hooks/usePrescriptions";
import { PrescriptionDialog } from "@/components/PrescriptionDialog";
import { PrescriptionPreview } from "@/components/PrescriptionPreview";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PrescriptionsListProps {
  patientId: string;
  patientName: string;
}

export const PrescriptionsList = ({
  patientId,
  patientName,
}: PrescriptionsListProps) => {
  const { data: prescriptions = [], isLoading } = usePrescriptions(patientId);
  const deletePrescription = useDeletePrescription();
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Chargement des ordonnances...</p>
      </Card>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <Pill className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Aucune ordonnance
          </h3>
          <p className="text-muted-foreground mb-6">
            Ce patient n'a pas encore d'ordonnance
          </p>
          <PrescriptionDialog patientId={patientId} patientName={patientName} />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">
          Ordonnances ({prescriptions.length})
        </h3>
        <PrescriptionDialog patientId={patientId} patientName={patientName} />
      </div>

      {/* List */}
      <div className="grid gap-4">
        {prescriptions.map((prescription) => (
          <PrescriptionCard
            key={prescription.id}
            prescription={prescription}
            patientId={patientId}
            patientName={patientName}
            onView={() => setSelectedPrescriptionId(prescription.id)}
            onDelete={() =>
              deletePrescription.mutate({ id: prescription.id, patientId })
            }
          />
        ))}
      </div>

      {/* Preview Modal */}
      {selectedPrescriptionId && (
        <PrescriptionPreview
          prescriptionId={selectedPrescriptionId}
          patientName={patientName}
          onClose={() => setSelectedPrescriptionId(null)}
        />
      )}
    </div>
  );
};

interface PrescriptionCardProps {
  prescription: {
    id: string;
    date: string;
    notes: string | null;
    created_at: string;
  };
  patientId: string;
  patientName: string;
  onView: () => void;
  onDelete: () => void;
}

const PrescriptionCard = ({
  prescription,
  onView,
  onDelete,
}: PrescriptionCardProps) => {
  const { data: fullPrescription } = usePrescription(prescription.id);
  const itemCount = fullPrescription?.items?.length || 0;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-blue-100">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">Ordonnance</span>
              <Badge variant="secondary" className="text-xs">
                {itemCount} médicament{itemCount > 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {format(new Date(prescription.date), "d MMMM yyyy", { locale: fr })}
            </div>
            {prescription.notes && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                {prescription.notes}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onView}>
            <Eye className="w-4 h-4 mr-1" />
            Voir
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onView();
              // Trigger print after modal opens
              setTimeout(() => window.print(), 500);
            }}
          >
            <Printer className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer l'ordonnance ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. L'ordonnance sera définitivement supprimée.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );
};
