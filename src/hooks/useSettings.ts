import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCallback } from "react";

interface Setting {
  id: string;
  key: string;
  value: string | null;
}

export const useSettings = () => {
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    isError,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*");
      
      if (error) throw error;
      return data as Setting[];
    },
  });

  const getSettingValue = useCallback((key: string): string => {
    const setting = settings?.find((s) => s.key === key);
    return setting?.value || "";
  }, [settings]);

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      // Try to update first, if no rows affected, insert
      const { data: existing, error: lookupError } = await supabase
        .from("settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existing) {
        const { error } = await supabase
          .from("settings")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("settings")
          .insert({ key, value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error) => {
      toast.error(`Impossible d’enregistrer le réglage : ${error.message}`);
    },
  });

  const cabinetName = `Cabinet ${getSettingValue("cabinet_specialty")} Dr ${getSettingValue("doctor_name")}`;

  return {
    settings,
    isLoading,
    isError,
    isFetching,
    error,
    refetch,
    getSettingValue,
    updateSetting,
    cabinetName,
  };
};
