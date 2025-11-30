import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

export interface Document {
  id: string;
  patient_id: string;
  type: string;
  nom: string;
  url: string;
  created_at: string;
}

export const useDocuments = (patientId: string | undefined) => {
  return useQuery({
    queryKey: ["documents", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Document[];
    },
    enabled: !!patientId,
  });
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: Omit<Document, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("documents")
        .insert(document)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documents", variables.patient_id] });
      toast({
        title: "Succès",
        description: "Document ajouté avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le document",
        variant: "destructive",
      });
      console.error("Error creating document:", error);
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string }) => {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, patientId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documents", data.patientId] });
      toast({
        title: "Succès",
        description: "Document supprimé",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document",
        variant: "destructive",
      });
      console.error("Error deleting document:", error);
    },
  });
};
