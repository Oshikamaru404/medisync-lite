import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MedicalActTemplate = {
  id: string;
  doctor_user_id: string;
  label: string;
  category: string;
  ngap_code: string | null;
  unit_price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MedicalActTemplateInput = Pick<
  MedicalActTemplate,
  "category" | "is_active" | "label" | "ngap_code" | "unit_price"
> & { id?: string | null };

export const useMedicalActTemplates = () => {
  const { sessionToken } = useAuth();

  return useQuery({
    queryKey: ["medical-act-templates"],
    enabled: Boolean(sessionToken),
    queryFn: async () => {
      if (!sessionToken) throw new Error("Une session médecin est nécessaire pour accéder au catalogue.");
      const { data, error } = await supabase.rpc("get_medical_act_templates", {
        _actor_session_token: sessionToken,
      });
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error("Le catalogue d’actes reçu est incomplet.");
      return data as unknown as MedicalActTemplate[];
    },
  });
};

export const useSaveMedicalActTemplate = () => {
  const { sessionToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: MedicalActTemplateInput) => {
      if (!sessionToken) throw new Error("Votre session a expiré. Reconnectez-vous pour enregistrer un acte.");
      const { data, error } = await supabase.rpc("save_medical_act_template", {
        _actor_session_token: sessionToken,
        _template_id: template.id ?? null,
        _label: template.label,
        _category: template.category,
        _ngap_code: template.ngap_code,
        _unit_price: template.unit_price,
        _is_active: template.is_active,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-act-templates"] });
      toast.success("Acte enregistré dans votre catalogue");
    },
    onError: (error) => toast.error(error.message || "Impossible d’enregistrer cet acte"),
  });
};

export const useArchiveMedicalActTemplate = () => {
  const { sessionToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!sessionToken) throw new Error("Votre session a expiré. Reconnectez-vous pour modifier le catalogue.");
      const { data, error } = await supabase.rpc("archive_medical_act_template", {
        _actor_session_token: sessionToken,
        _template_id: templateId,
      });
      if (error) throw error;
      if (!data) throw new Error("Cet acte est introuvable ou déjà archivé.");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-act-templates"] });
      toast.success("Acte retiré des actes actifs");
    },
    onError: (error) => toast.error(error.message || "Impossible d’archiver cet acte"),
  });
};
