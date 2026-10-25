import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const CASABLANCA_TIMEZONE = 'Africa/Casablanca';

export const getQueueDateKey = (date: Date) => {
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CASABLANCA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const getCasablancaDayBounds = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const getOffsetMilliseconds = (dayAsUtc: number) => {
    const offsetName = new Intl.DateTimeFormat('en-US', {
      timeZone: CASABLANCA_TIMEZONE,
      timeZoneName: 'longOffset',
    })
      .formatToParts(new Date(dayAsUtc + 12 * 60 * 60 * 1000))
      .find(({ type }) => type === 'timeZoneName')?.value;
    const offset = offsetName?.match(/^GMT(?:([+-])(\d{2}):(\d{2}))?$/);
    if (!offset) throw new Error(`Fuseau horaire Casablanca non reconnu : ${offsetName ?? 'indisponible'}`);
    if (!offset[1]) return 0;
    const sign = offset[1] === '+' ? 1 : -1;
    return sign * (Number(offset[2]) * 60 + Number(offset[3])) * 60 * 1000;
  };

  const startAsUtc = Date.UTC(year, month - 1, day);
  const endAsUtc = Date.UTC(year, month - 1, day + 1);
  return {
    start: new Date(startAsUtc - getOffsetMilliseconds(startAsUtc)).toISOString(),
    end: new Date(endAsUtc - getOffsetMilliseconds(endAsUtc)).toISOString(),
  };
};

export type QueueStatus = 'waiting' | 'in_consultation' | 'completed' | 'cancelled';
export type QueueDisplayStatus = QueueStatus | 'called';
export type QueuePriority = 'critical' | 'high' | 'relative' | 'comfort' | 'standard';

export const getQueueDisplayStatus = (entry: QueueEntry): QueueDisplayStatus =>
  entry.status === 'waiting' && entry.called_at ? 'called' : entry.status;

const isMissingSettlementInstructionColumn = (error: { code?: string }) => error.code === "42703";

export type QueueEntry = {
  id: string;
  patient_id: string;
  status: QueueStatus;
  numero_ordre: number;
  manual_order: number | null;
  motif: string | null;
  montant_consultation: number | null;
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
  invoice_id: string | null;
  priority_level: QueuePriority;
  appointment_id?: string | null;
  appointments?: {
    date: string;
    heure_debut: string;
  } | null;
  patients?: {
    id: string;
    nom: string;
    prenom: string;
    telephone: string | null;
    date_naissance?: string | null;
    sexe?: string | null;
    poids?: number | null;
    taille?: number | null;
  };
  invoices?: {
    id: string;
    numero: string;
    montant: number;
    statut: string;
    montant_brut?: number;
    reduction_type?: string;
    reduction_valeur?: number;
    consigne_reglement?: "due_at_reception" | "deferred" | "free" | null;
  } | null;
};

export const getQueuePriorityRank = (entry: QueueEntry, todayKey: string) => {
  if (entry.priority_level !== 'standard') {
    const priorityRanks: Record<Exclude<QueuePriority, 'standard'>, number> = {
      critical: 0,
      high: 1,
      relative: 2,
      comfort: 4,
    };
    return priorityRanks[entry.priority_level];
  }
  if (!entry.appointments || entry.appointments.date !== todayKey) return 5;

  const arrival = new Date(entry.created_at);
  const casablancaTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: CASABLANCA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(arrival);
  const arrivalTime = Number(casablancaTime.find(({ type }) => type === 'hour')?.value) * 60
    + Number(casablancaTime.find(({ type }) => type === 'minute')?.value);
  const [appointmentHour, appointmentMinute] = entry.appointments.heure_debut.split(':').map(Number);
  const scheduledTime = appointmentHour * 60 + appointmentMinute;

  return arrivalTime >= scheduledTime - 15 && arrivalTime <= scheduledTime + 15 ? 3 : 5;
};

export const compareQueueOrder = (first: QueueEntry, second: QueueEntry) => {
  const firstManualOrder = typeof first.manual_order === 'number' ? first.manual_order : null;
  const secondManualOrder = typeof second.manual_order === 'number' ? second.manual_order : null;

  if (firstManualOrder !== null && secondManualOrder !== null) {
    return firstManualOrder - secondManualOrder || first.numero_ordre - second.numero_ordre;
  }
  if (firstManualOrder !== null) return -1;
  if (secondManualOrder !== null) return 1;
  return first.numero_ordre - second.numero_ordre;
};

export const useQueueEntry = (queueId: string | undefined) =>
  useQuery({
    queryKey: ['queue-entry', queueId],
    queryFn: async () => {
      if (!queueId) return null;

      const query = supabase
        .from('queue')
        .select('*, patients(id, nom, prenom, telephone, date_naissance, sexe, poids, taille), invoices(id, numero, montant, statut, montant_brut, reduction_type, reduction_valeur, consigne_reglement)')
        .eq('id', queueId);
      const { data, error } = await query.maybeSingle();

      if (!error) return data as QueueEntry | null;
      if (!isMissingSettlementInstructionColumn(error)) throw error;

      const { data: legacyData, error: legacyError } = await supabase
        .from('queue')
        .select('*, patients(id, nom, prenom, telephone, date_naissance, sexe, poids, taille), invoices(id, numero, montant, statut, montant_brut, reduction_type, reduction_valeur)')
        .eq('id', queueId)
        .maybeSingle();

      if (legacyError) throw legacyError;
      return legacyData as QueueEntry | null;
    },
    enabled: !!queueId,
  });

export const useQueue = (date?: string) => {
  const queryClient = useQueryClient();
  const targetDate = date || getQueueDateKey(new Date());

  const query = useQuery({
    queryKey: ['queue', targetDate],
    queryFn: async () => {
      const { start, end } = getCasablancaDayBounds(targetDate);

      const { data, error } = await supabase
        .from('queue')
        .select(`
          *,
          patients (id, nom, prenom, telephone),
          invoices (id, numero, montant, statut),
          appointments!queue_appointment_id_fkey (date, heure_debut)
        `)
        .gte('created_at', start)
        .lt('created_at', end)
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

export const useQueueActionSummary = (date?: string) => {
  const queryClient = useQueryClient();
  const targetDate = date || getQueueDateKey(new Date());
  const query = useQuery({
    queryKey: ["queue-action-summary", targetDate],
    queryFn: async () => {
      const { start, end } = getCasablancaDayBounds(targetDate);
      const { data, error } = await supabase
        .from("queue")
        .select("patient_id, appointment_id, status")
        .gte("created_at", start)
        .lt("created_at", end)
        .in("status", ["waiting", "in_consultation"]);

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`queue-action-summary-${targetDate}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["queue-action-summary", targetDate] });
        },
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
      const today = getQueueDateKey(new Date());
      const { start, end } = getCasablancaDayBounds(today);
      const { data: existing } = await supabase
        .from('queue')
        .select('numero_ordre')
        .gte('created_at', start)
        .lt('created_at', end)
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

export const useCheckInAppointment = () => {
  const queryClient = useQueryClient();
  const { sessionToken } = useAuth();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      if (!sessionToken) throw new Error('Votre session a expiré. Reconnectez-vous pour confirmer l’arrivée.');
      const { data, error } = await supabase.rpc('check_in_appointment_with_attendance', {
        _appointment_id: appointmentId,
        _actor_session_token: sessionToken,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-attendance-events'] });
      toast({
        title: 'Arrivée confirmée',
        description: 'Le patient a été ajouté à la file active.',
      });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast({
        title: 'Arrivée non enregistrée',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useSetQueuePriority = () => {
  const queryClient = useQueryClient();
  const { sessionToken } = useAuth();

  return useMutation({
    mutationFn: async (input: { queueId: string; priority: QueuePriority }) => {
      if (!sessionToken) throw new Error("Votre session a expiré. Reconnectez-vous pour modifier la priorité.");

      const { data, error } = await supabase.rpc("set_queue_priority", {
        _queue_id: input.queueId,
        _priority_level: input.priority,
        _actor_session_token: sessionToken,
        _note: null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      toast({
        title: "Priorité mise à jour",
        description: "L’ordre d’appel a été recalculé selon les priorités.",
      });
    },
    onError: (error) => {
      toast({
        title: "Priorité non modifiée",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useReorderQueuePriorityGroup = () => {
  const queryClient = useQueryClient();
  const { sessionToken } = useAuth();

  return useMutation({
    mutationFn: async (orderedQueueIds: string[]) => {
      if (!sessionToken) throw new Error('Votre session a expiré. Reconnectez-vous pour réorganiser la file.');

      const { error } = await supabase.rpc('reorder_queue_priority_group', {
        _ordered_queue_ids: orderedQueueIds,
        _actor_session_token: sessionToken,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast({
        title: 'Ordre de passage mis à jour',
        description: 'La file a été réorganisée sans modifier les priorités.',
      });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast({
        title: 'Réorganisation impossible',
        description: error.message,
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
      queryClient.invalidateQueries({ queryKey: ['queue-encashment-summary'] });
      
      const messages: Record<QueueStatus, string> = {
        waiting: 'Patient remis en attente',
        in_consultation: 'Consultation démarrée - Facture créée',
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

export const useCallQueueEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('queue')
        .update({ called_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'waiting')
        .is('called_at', null)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast({
        title: 'Patient appelé',
        description: 'Le médecin peut maintenant ouvrir son dossier depuis la file.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Appel impossible',
        description: `La file n'a pas pu être mise à jour : ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateInvoiceStatus = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  return useMutation({
    mutationFn: async ({ invoiceId, statut }: { invoiceId: string; statut: "paid" }) => {
      if (currentUser?.role !== "secretaire" && currentUser?.role !== "assistant") {
        throw new Error("Secrétariat uniquement : vous n’êtes pas autorisé à enregistrer un paiement.");
      }
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
      queryClient.invalidateQueries({ queryKey: ['queue-encashment-summary'] });
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
