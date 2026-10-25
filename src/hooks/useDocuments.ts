import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface Document {
  id: string;
  patient_id: string;
  type: string;
  nom: string;
  url: string;
  created_at: string;
}

export interface DocumentAnalysis {
  documentType: string;
  documentDate: string;
  summary: string;
  detailedReport: string;
  keyPoints: string[];
  labResults: Array<{
    name: string;
    value: string;
    unit: string;
    referenceRange: string;
    flag: "low" | "normal" | "high" | "unknown";
    confidence: number;
  }>;
  extractedText: string;
  verificationNotes: string[];
  generatedAt?: string;
  model?: string;
  reviewStatus?: "to_review";
}

export interface NewDocument {
  patient_id: string;
  type: string;
  nom: string;
  file: File;
}

export const getDocumentAnalysis = async (
  documentId: string,
  patientId: string,
  sessionToken: string,
) => {
  const result = await invokeDocumentFunction<{ analysis: DocumentAnalysis | null }>(
    "get_analysis",
    sessionToken,
    { documentId, patientId },
  );
  return result.analysis;
};

export const saveDocumentAnalysis = async (
  documentId: string,
  patientId: string,
  sessionToken: string,
  analysis: DocumentAnalysis,
) => {
  const result = await invokeDocumentFunction<{ analysis: DocumentAnalysis }>(
    "save_analysis",
    sessionToken,
    { documentId, patientId, analysis },
  );
  if (!result.analysis) throw new Error("Le rapport n’a pas pu être associé à cette pièce.");
  return result.analysis;
};

const invokeDocumentFunction = async <T,>(
  action: string,
  sessionToken: string,
  payload: Record<string, unknown> = {},
): Promise<T> => {
  if (!sessionToken) throw new Error("Votre session a expiré. Reconnectez-vous pour accéder aux documents.");

  const { data, error } = await supabase.functions.invoke("patient-documents", {
    body: { action, sessionToken, ...payload },
  });
  if (error) {
    let message = error.message;
    if ("context" in error && error.context instanceof Response) {
      const responseBody = await error.context.clone().json().catch(() => null) as { error?: string } | null;
      message = responseBody?.error || message;
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
};

export const getDocumentSignedUrl = async (
  documentId: string,
  patientId: string,
  sessionToken: string,
) => {
  const result = await invokeDocumentFunction<{ signedUrl: string }>(
    "signed_url",
    sessionToken,
    { documentId, patientId },
  );
  if (!result.signedUrl) throw new Error("Le service documentaire n’a pas fourni de lien temporaire. Réessayez.");
  return result.signedUrl;
};

export const useDocuments = (patientId: string | undefined) => {
  const queryClient = useQueryClient();
  const { sessionToken } = useAuth();

  return useQuery({
    queryKey: ["documents", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const result = await invokeDocumentFunction<{ documents: Document[] }>(
        "list",
        sessionToken ?? "",
        { patientId },
      );
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      return result.documents;
    },
    enabled: !!patientId && !!sessionToken,
  });
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();
  const { sessionToken } = useAuth();

  return useMutation({
    mutationFn: async ({ file, ...metadata }: NewDocument) => {
      if (!sessionToken) throw new Error("Votre session a expiré. Reconnectez-vous avant d’ajouter une pièce.");
      if (file.size > 20 * 1024 * 1024) throw new Error("Le fichier ne doit pas dépasser 20 Mo.");

      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const prepared = await invokeDocumentFunction<{ path: string; token: string }>(
        "prepare_upload",
        sessionToken,
        {
          patientId: metadata.patient_id,
          extension,
          contentType: file.type,
        },
      );

      const { error: uploadError } = await supabase.storage
        .from("patient-documents-private")
        .uploadToSignedUrl(prepared.path, prepared.token, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const result = await invokeDocumentFunction<{ document: Document }>(
        "register_upload",
        sessionToken,
        {
          patientId: metadata.patient_id,
          path: prepared.path,
          name: metadata.nom,
          type: metadata.type,
        },
      );
      return result.document;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["documents", variables.patient_id] });
    },
    onError: (error) => {
      console.error("Error creating patient document:", error);
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  const { sessionToken } = useAuth();

  return useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string }) => {
      await invokeDocumentFunction("delete", sessionToken ?? "", {
        documentId: id,
        patientId,
      });
      return { id, patientId };
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["documents", data.patientId] });
      toast({ title: "Pièce supprimée", description: "Le fichier a été retiré du dossier." });
    },
    onError: (error) => {
      toast({
        title: "Suppression impossible",
        description: error instanceof Error ? error.message : "Impossible de supprimer le document.",
        variant: "destructive",
      });
      console.error("Error deleting patient document:", error);
    },
  });
};
