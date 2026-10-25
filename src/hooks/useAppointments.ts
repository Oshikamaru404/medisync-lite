import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type Appointment = {
  id: string;
  patient_id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  type: string;
  statut: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  attendance_status?: 'expected' | 'late_contacted' | 'late_expected' | 'no_show' | 'arrived' | 'cancelled';
  attendance_updated_at?: string | null;
  attendance_updated_by?: string | null;
  attendance_note?: string | null;
  notes: string | null;
  created_at: string;
  patient?: {
    nom: string;
    prenom: string;
    telephone: string | null;
  };
};

export type AppointmentAttendanceStatus = NonNullable<Appointment["attendance_status"]>;

export const useAppointments = (date?: string) => {
  return useQuery({
    queryKey: ['appointments', date],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(nom, prenom, telephone)
        `)
        .order('date', { ascending: true })
        .order('heure_debut', { ascending: true });

      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Appointment[];
    },
  });
};

export const useOperationalAppointmentSummary = (date: string, enabled: boolean) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["appointment-action-summary", date],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, patient_id, date, heure_debut, statut, attendance_status")
        .eq("date", date)
        .order("heure_debut", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`appointment-action-summary-${date}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => queryClient.invalidateQueries({ queryKey: ["appointment-action-summary", date] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, enabled, queryClient]);

  return query;
};

export const useRecordAppointmentAttendance = () => {
  const queryClient = useQueryClient();
  const { sessionToken } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      appointmentId: string;
      status: Exclude<AppointmentAttendanceStatus, "expected" | "arrived">;
      note?: string;
    }) => {
      if (!sessionToken) throw new Error("Votre session a expiré. Reconnectez-vous pour enregistrer cette décision.");
      const { data, error } = await supabase.rpc("record_appointment_attendance", {
        _appointment_id: input.appointmentId,
        _attendance_status: input.status,
        _actor_session_token: sessionToken,
        _note: input.note ?? null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointment-attendance-events"] });
      toast({
        title: "Présence mise à jour",
        description: "La décision de l’équipe a été enregistrée dans l’historique.",
      });
    },
    onError: (error) => {
      toast({
        title: "Décision non enregistrée",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useAppointmentAttendanceEvents = (appointmentIds: string[]) => {
  return useQuery({
    queryKey: ["appointment-attendance-events", appointmentIds],
    enabled: appointmentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_attendance_events")
        .select("id, appointment_id, event_type, note, actor_name, created_at")
        .in("appointment_id", appointmentIds)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data;
    },
  });
};

export const useLastCompletedConsultations = () => {
  return useQuery({
    queryKey: ['queue', 'last-completed-by-patient'],
    queryFn: async () => {
      const pageSize = 1000;
      const latestByPatient = new Map<string, string>();
      let offset = 0;
      let pageLength = pageSize;

      while (pageLength === pageSize) {
        const { data, error } = await supabase
          .from('queue')
          .select('patient_id, completed_at, created_at')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) throw error;
        pageLength = data.length;
        for (const visit of data) {
          const visitDate = visit.completed_at || visit.created_at;
          const currentLatest = latestByPatient.get(visit.patient_id);
          if (!currentLatest || visitDate > currentLatest) {
            latestByPatient.set(visit.patient_id, visitDate);
          }
        }
        offset += pageSize;
      }

      return latestByPatient;
    },
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointment: Omit<Appointment, 'id' | 'created_at' | 'patient'>) => {
      const { data, error } = await supabase
        .from('appointments')
        .insert(appointment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Rendez-vous créé',
        description: 'Le rendez-vous a été ajouté à l\'agenda.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de créer le rendez-vous: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  const { sessionToken } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Appointment> & { id: string }) => {
      if (!sessionToken) throw new Error("Votre session a expiré. Reconnectez-vous pour modifier ce rendez-vous.");
      if (
        !updates.patient_id
        || !updates.date
        || !updates.heure_debut
        || !updates.heure_fin
        || !updates.type
        || !updates.statut
      ) {
        throw new Error("Les informations complètes du rendez-vous sont nécessaires pour l’enregistrer.");
      }

      const { data, error } = await supabase.rpc("update_appointment_with_attendance", {
        _appointment_id: id,
        _patient_id: updates.patient_id,
        _date: updates.date,
        _heure_debut: updates.heure_debut,
        _heure_fin: updates.heure_fin,
        _type: updates.type,
        _statut: updates.statut,
        _notes: updates.notes ?? null,
        _actor_session_token: sessionToken,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Rendez-vous modifié',
        description: 'Les modifications ont été enregistrées.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de modifier: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Rendez-vous supprimé',
        description: 'Le rendez-vous a été supprimé de l\'agenda.',
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
