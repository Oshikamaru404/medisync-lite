import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type Patient = {
  id: string;
  nom: string;
  prenom: string;
  date_naissance: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  mutuelle: string | null;
  personne_contact: string | null;
  created_at: string;
};

export type PatientWithAllergies = Patient & {
  medical_records?: { allergies: string | null } | null;
};

export const usePatients = () => {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          medical_records(allergies)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PatientWithAllergies[];
    },
  });
};

export const usePatient = (id: string | undefined) => {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Patient;
    },
    enabled: !!id,
  });
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patient: Omit<Patient, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('patients')
        .insert(patient)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast({
        title: 'Patient ajouté',
        description: 'Le patient a été créé avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de créer le patient: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Patient> & { id: string }) => {
      const { data, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', variables.id] });
      toast({
        title: 'Patient mis à jour',
        description: 'Les informations ont été enregistrées.',
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

export const useDeletePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast({
        title: 'Patient supprimé',
        description: 'Le patient a été supprimé avec succès.',
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
