import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type Certificate = {
  id: string;
  patient_id: string;
  type: 'repos' | 'aptitude' | 'bonne_sante' | 'custom';
  date: string;
  duree_jours: number | null;
  date_debut: string | null;
  date_fin: string | null;
  motif: string | null;
  contenu: string | null;
  notes: string | null;
  created_at: string;
  patient?: {
    nom: string;
    prenom: string;
    date_naissance: string | null;
    adresse: string | null;
  };
};

export type CertificateInsert = Omit<Certificate, 'id' | 'created_at' | 'patient'>;

export const useCertificates = (patientId?: string) => {
  return useQuery({
    queryKey: ['certificates', patientId],
    queryFn: async () => {
      let query = supabase
        .from('certificates')
        .select(`
          *,
          patient:patients(nom, prenom, date_naissance, adresse)
        `)
        .order('date', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Certificate[];
    },
    enabled: patientId ? !!patientId : true,
  });
};

export const useCreateCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (certificate: CertificateInsert) => {
      const { data, error } = await supabase
        .from('certificates')
        .insert(certificate)
        .select(`
          *,
          patient:patients(nom, prenom, date_naissance, adresse)
        `)
        .single();

      if (error) throw error;
      return data as Certificate;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['certificates', variables.patient_id] });
      toast({
        title: 'Certificat créé',
        description: 'Le certificat médical a été créé avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de créer le certificat: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string }) => {
      const { error } = await supabase
        .from('certificates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return patientId;
    },
    onSuccess: (patientId) => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['certificates', patientId] });
      toast({
        title: 'Certificat supprimé',
        description: 'Le certificat a été supprimé avec succès.',
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

export const CERTIFICATE_TYPES = {
  repos: {
    label: 'Certificat de repos',
    labelAr: 'شهادة راحة طبية',
    description: 'Arrêt de travail pour raison médicale',
  },
  aptitude: {
    label: "Certificat d'aptitude",
    labelAr: 'شهادة القدرة',
    description: 'Aptitude à la pratique sportive ou professionnelle',
  },
  bonne_sante: {
    label: 'Certificat de bonne santé',
    labelAr: 'شهادة صحية',
    description: 'Attestation de bonne santé générale',
  },
  custom: {
    label: 'Certificat personnalisé',
    labelAr: 'شهادة مخصصة',
    description: 'Certificat avec contenu libre',
  },
} as const;
