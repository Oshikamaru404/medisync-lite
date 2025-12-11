import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Setting {
  id: string;
  key: string;
  value: string | null;
}

export const useSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*");
      
      if (error) throw error;
      return data as Setting[];
    },
  });

  const getSettingValue = (key: string): string => {
    const setting = settings?.find((s) => s.key === key);
    return setting?.value || "";
  };

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("settings")
        .update({ value })
        .eq("key", key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Paramètre mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const cabinetName = `Cabinet ${getSettingValue("cabinet_specialty")} Dr ${getSettingValue("doctor_name")}`;

  return {
    settings,
    isLoading,
    getSettingValue,
    updateSetting,
    cabinetName,
  };
};
