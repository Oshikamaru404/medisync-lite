import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export type QueueStatus = 'waiting' | 'in_consultation' | 'completed' | 'cancelled';

export type QueueEntry = {
  id: string;
  patient_id: string;
  status: QueueStatus;
  numero_ordre: number;
  motif: string | null;
  montant_consultation: number | null;
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
  invoice_id: string | null;
  patients?: {
    id: string;
    nom: string;
    prenom: string;
    telephone: string | null;
  };
  invoices?: {
    id: string;
    numero: string;
    montant: number;
    statut: string;
  } | null;
};

export const useQueue = (date?: string) => {
  const queryClient = useQueryClient();
  const targetDate = date || new Date().toISOString().split('T')[0];

  const query = useQuery({
    queryKey: ['queue', targetDate],
    queryFn: async () => {
      const startOfDay = `${targetDate}T00:00:00`;
      const endOfDay = `${targetDate}T23:59:59`;

      const { data, error } = await supabase
        .from('queue')
        .select(`
          *,
          patients (id, nom, prenom, telephone),
          invoices (id, numero, montant, statut)
        `)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('numero_ordre', { ascending: true });

      if (error) throw error;
      return data as QueueEntry[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['queue', targetDate] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, targetDate]);

  return query;
};

export const useAddToQueue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: { 
      patient_id: string; 
      motif?: string; 
      montant_consultation?: number 
    }) => {
      // Get next order number for today
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('queue')
        .select('numero_ordre')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('numero_ordre', { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.numero_ordre || 0) + 1;

      const { data, error } = await supabase
        .from('queue')
        .insert({
          patient_id: entry.patient_id,
          motif: entry.motif,
          montant_consultation: entry.montant_consultation || 0,
          numero_ordre: nextOrder,
          status: 'waiting'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast({
        title: 'Patient ajouté',
        description: 'Le patient a été ajouté à la file d\'attente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible d'ajouter à la file: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateQueueStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: QueueStatus }) => {
      const { data, error } = await supabase
        .from('queue')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      
      const messages: Record<QueueStatus, string> = {
        waiting: 'Patient remis en attente',
        in_consultation: 'Patient appelé en consultation - Facture créée',
        completed: 'Consultation terminée',
        cancelled: 'Patient retiré de la file',
      };
      
      toast({
        title: 'Statut mis à jour',
        description: messages[variables.status],
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de mettre à jour: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateInvoiceStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoiceId, statut }: { invoiceId: string; statut: string }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({ statut })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Paiement enregistré',
        description: 'Le statut de la facture a été mis à jour.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de mettre à jour: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useRemoveFromQueue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('queue')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast({
        title: 'Patient retiré',
        description: 'Le patient a été retiré de la file d\'attente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de supprimer: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};
