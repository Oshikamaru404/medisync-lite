import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FollowUpKind = "control" | "exam" | "referral" | "surgery";
export type FollowUpStatus =
  | "to_contact"
  | "unreachable"
  | "declined"
  | "scheduled"
  | "arranged"
  | "completed"
  | "cancelled";

export interface FollowUpTask {
  id: string;
  patient_id: string;
  consultation_id: string;
  appointment_id: string | null;
  due_date: string | null;
  kind: FollowUpKind;
  destination: string | null;
  specialty: string | null;
  contact_name: string | null;
  instruction: string | null;
  status: FollowUpStatus;
  created_by: string | null;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
  patients: {
    id: string;
    nom: string;
    prenom: string;
    telephone: string | null;
  };
  appointments: {
    date: string;
    heure_debut: string;
    heure_fin: string;
  } | null;
}

const FOLLOW_UP_QUERY_KEY = ["follow-up-tasks"] as const;

export type FollowUpActionSummary = Pick<FollowUpTask, "due_date" | "status">;

export const useFollowUpActionSummary = (enabled = true) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...FOLLOW_UP_QUERY_KEY, "notification-summary"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_up_tasks")
        .select("due_date, status")
        .in("status", ["to_contact", "unreachable"])
        .order("due_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as FollowUpActionSummary[];
    },
  });

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("follow-up-action-summary-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follow_up_tasks" },
        () => {
          queryClient.invalidateQueries({ queryKey: FOLLOW_UP_QUERY_KEY });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  return query;
};

export const useFollowUpTasks = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: FOLLOW_UP_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_up_tasks")
        .select("*, specialty:referral_specialty, contact_name:referral_contact_name, patients(id, nom, prenom, telephone), appointments(date, heure_debut, heure_fin)")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as FollowUpTask[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("follow-up-task-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follow_up_tasks" },
        () => {
          queryClient.invalidateQueries({ queryKey: FOLLOW_UP_QUERY_KEY });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

export const useUpdateFollowUpStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "unreachable" | "declined" | "arranged";
    }) => {
      const { data, error } = await supabase
        .from("follow_up_tasks")
        .update({
          status,
          last_contact_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .in("status", ["to_contact", "unreachable"])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: FOLLOW_UP_QUERY_KEY });
      const messages = {
        unreachable: "Suivi marqué comme « à rappeler »",
        declined: "Le suivi a été refusé par le patient",
        arranged: "La suite a été marquée comme organisée",
      };
      toast.success(messages[variables.status]);
    },
    onError: (error) => {
      console.error("Unable to update follow-up status:", error);
      toast.error("Impossible de mettre à jour le suivi");
    },
  });
};

export const useScheduleFollowUpAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      followUpId: string;
      date: string;
      heureDebut: string;
      heureFin: string;
    }) => {
      const { data, error } = await supabase.rpc("schedule_follow_up_appointment", {
        _follow_up_id: input.followUpId,
        _date: input.date,
        _heure_debut: input.heureDebut,
        _heure_fin: input.heureFin,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLLOW_UP_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Rendez-vous confirmé et ajouté à l’agenda");
    },
    onError: (error) => {
      console.error("Unable to schedule follow-up appointment:", error);
      toast.error("Impossible de créer le rendez-vous. Le suivi reste à organiser.");
    },
  });
};
