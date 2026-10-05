import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { inferConsultationCategoryId, type ConsultationMotifEntry } from "@/data/consultationDictionary";

export const useImportedConsultationMotifs = (search: string, categoryId: string) => {
  const normalizedSearch = search.trim();

  return useQuery({
    queryKey: ["clinical-terms", normalizedSearch.toLocaleLowerCase(), categoryId],
    queryFn: async (): Promise<ConsultationMotifEntry[]> => {
      if (normalizedSearch.length < 2) return [];

      const { data, error } = await supabase.functions.invoke("icd11-search", {
        body: { query: normalizedSearch },
      });
      if (error) throw error;
      const results: unknown = data?.results;
      if (!Array.isArray(results)) {
        throw new Error("The ICD-11 search function returned an invalid response.");
      }
      return results.flatMap((result): ConsultationMotifEntry[] => {
        if (!result || typeof result !== "object") return [];
        if (!("id" in result) || typeof result.id !== "string") return [];
        if (!("label" in result) || typeof result.label !== "string") return [];
        const code = "code" in result && typeof result.code === "string" ? result.code : undefined;
        const sourceUrl = "sourceUrl" in result && typeof result.sourceUrl === "string" ? result.sourceUrl : undefined;
        return [{
          id: result.id,
          label: result.label,
          categoryId: inferConsultationCategoryId(result.label),
          synonyms: [],
          symptomSuggestions: [],
          questions: [],
          code,
          source: "CIM-11 OMS",
          sourceUrl,
        }];
      });
    },
    enabled: normalizedSearch.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
};
