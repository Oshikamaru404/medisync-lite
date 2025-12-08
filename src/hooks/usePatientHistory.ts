import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ConsultationHistoryEntry = {
  id: string;
  date: string;
  type: 'queue' | 'appointment';
  motif: string | null;
  status: string;
  montant: number | null;
  invoice_status: string | null;
  invoice_number: string | null;
  called_at: string | null;
  completed_at: string | null;
};

export type PatientStats = {
  totalConsultations: number;
  firstVisit: string | null;
  lastVisit: string | null;
  totalBilled: number;
  totalPaid: number;
  pendingAmount: number;
};

export const usePatientHistory = (patientId: string | undefined) => {
  return useQuery({
    queryKey: ['patient-history', patientId],
    queryFn: async (): Promise<{ history: ConsultationHistoryEntry[]; stats: PatientStats }> => {
      if (!patientId) {
        return { 
          history: [], 
          stats: { 
            totalConsultations: 0, 
            firstVisit: null, 
            lastVisit: null, 
            totalBilled: 0, 
            totalPaid: 0,
            pendingAmount: 0
          } 
        };
      }

      // Fetch queue entries (consultations)
      const { data: queueData, error: queueError } = await supabase
        .from('queue')
        .select(`
          id,
          created_at,
          motif,
          status,
          montant_consultation,
          called_at,
          completed_at,
          invoice_id,
          invoices (
            numero,
            montant,
            statut
          )
        `)
        .eq('patient_id', patientId)
        .in('status', ['completed', 'in_consultation'])
        .order('created_at', { ascending: false });

      if (queueError) throw queueError;

      // Fetch appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, date, heure_debut, type, statut, notes')
        .eq('patient_id', patientId)
        .order('date', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Fetch all invoices for stats
      const { data: allInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('montant, statut')
        .eq('patient_id', patientId);

      if (invoicesError) throw invoicesError;

      // Transform queue entries to history format
      const queueHistory: ConsultationHistoryEntry[] = (queueData || []).map((entry: any) => ({
        id: entry.id,
        date: entry.created_at,
        type: 'queue' as const,
        motif: entry.motif,
        status: entry.status,
        montant: entry.invoices?.montant || entry.montant_consultation,
        invoice_status: entry.invoices?.statut || null,
        invoice_number: entry.invoices?.numero || null,
        called_at: entry.called_at,
        completed_at: entry.completed_at,
      }));

      // Transform appointments to history format (only past confirmed ones)
      const appointmentHistory: ConsultationHistoryEntry[] = (appointmentsData || [])
        .filter((apt: any) => apt.statut === 'confirmed' && new Date(apt.date) < new Date())
        .map((apt: any) => ({
          id: apt.id,
          date: `${apt.date}T${apt.heure_debut}`,
          type: 'appointment' as const,
          motif: apt.type,
          status: apt.statut,
          montant: null,
          invoice_status: null,
          invoice_number: null,
          called_at: null,
          completed_at: null,
        }));

      // Combine and sort by date
      const allHistory = [...queueHistory, ...appointmentHistory]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate stats
      const totalBilled = (allInvoices || []).reduce((sum, inv) => sum + (inv.montant || 0), 0);
      const totalPaid = (allInvoices || []).filter(inv => inv.statut === 'paid').reduce((sum, inv) => sum + (inv.montant || 0), 0);
      const pendingAmount = totalBilled - totalPaid;

      const dates = allHistory.map(h => new Date(h.date).getTime()).filter(d => !isNaN(d));
      const firstVisit = dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : null;
      const lastVisit = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null;

      return {
        history: allHistory,
        stats: {
          totalConsultations: queueHistory.length,
          firstVisit,
          lastVisit,
          totalBilled,
          totalPaid,
          pendingAmount,
        },
      };
    },
    enabled: !!patientId,
  });
};
