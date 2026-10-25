import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
};

export type InvoicePayment = {
  id: string;
  payer_type: "patient" | "insurer";
  amount: number;
  payment_method: "cash" | "card" | "cheque" | "transfer" | "other";
  reference: string | null;
  received_by_name: string | null;
  created_at: string;
};

export type EncashmentContext = {
  invoice: {
    id: string;
    patient_id: string;
    numero: string;
    date: string;
    montant: number;
    montant_brut: number;
    reduction_type: "none" | "percentage" | "fixed";
    reduction_valeur: number;
    statut: "paid" | "pending" | "cancelled" | "no_charge";
    coverage_mode: "reimbursement" | "third_party";
    insurance_name: string | null;
    insurance_member_number: string | null;
    insurer_amount: number;
    consigne_reglement: string | null;
  };
  patient: {
    id: string;
    nom: string;
    prenom: string;
    cin: string | null;
    telephone: string | null;
    mutuelle: string | null;
    numero_mutuelle: string | null;
  };
  items: InvoiceItem[];
  payments: InvoicePayment[];
};

export type EncashmentItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type SaveEncashmentInput = {
  invoiceId: string;
  coverageMode: "reimbursement" | "third_party";
  insuranceName: string;
  insuranceMemberNumber: string;
  insurerAmount: number;
  items: EncashmentItemInput[];
  paymentPayer: "patient" | "insurer" | null;
  paymentAmount: number;
  paymentMethod: "cash" | "card" | "cheque" | "transfer" | "other";
  paymentReference: string;
};

export type QueueEncashmentItem = {
  queue_number: number;
  reason: string | null;
  patient_name: string;
  telephone: string | null;
  invoice_id: string;
  invoice_number: string;
  invoice_status: string | null;
  total_amount: number;
  coverage_mode: "reimbursement" | "third_party";
  insurance_name: string | null;
  insurer_amount: number;
  patient_remaining: number;
  insurer_remaining: number;
  items: Array<{ description: string; quantity: number; line_total: number }>;
};

export type QueueEncashmentSummary = {
  items: QueueEncashmentItem[];
  patient_remaining_total: number;
  insurer_remaining_total: number;
  open_invoice_count: number;
};

export const useQueueEncashmentSummary = (enabled = true) => {
  const { sessionToken } = useAuth();

  return useQuery({
    queryKey: ["queue-encashment-summary"],
    enabled: enabled && Boolean(sessionToken),
    queryFn: async (): Promise<QueueEncashmentSummary> => {
      if (!sessionToken) throw new Error("Une session active est nécessaire pour consulter les encaissements.");
      const { data, error } = await supabase.rpc("get_queue_encashment_summary", {
        _actor_session_token: sessionToken,
      });
      if (error) throw error;
      const summary = data as unknown as QueueEncashmentSummary;
      if (!Array.isArray(summary?.items)) throw new Error("Le récapitulatif d’encaissement reçu est incomplet.");
      return summary;
    },
  });
};

export const useInvoiceEncashmentContext = (invoiceId: string | undefined) => {
  const { sessionToken } = useAuth();

  return useQuery({
    queryKey: ["invoice-encashment", invoiceId],
    enabled: Boolean(invoiceId && sessionToken),
    queryFn: async (): Promise<EncashmentContext> => {
      if (!invoiceId || !sessionToken) throw new Error("Une session active est nécessaire pour encaisser.");
      const { data, error } = await supabase.rpc("get_invoice_encashment_context", {
        _invoice_id: invoiceId,
        _actor_session_token: sessionToken,
      });
      if (error) throw error;

      const context = data as unknown as EncashmentContext;
      if (!context?.invoice?.id || !context.patient?.id || !Array.isArray(context.items) || !Array.isArray(context.payments)) {
        throw new Error("Les informations de facturation reçues sont incomplètes.");
      }
      return context;
    },
  });
};

export const useSaveInvoiceEncashment = () => {
  const queryClient = useQueryClient();
  const { sessionToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: SaveEncashmentInput) => {
      if (!sessionToken) throw new Error("Votre session a expiré. Reconnectez-vous pour enregistrer l’encaissement.");

      const { data, error } = await supabase.rpc("save_invoice_encashment", {
        _invoice_id: input.invoiceId,
        _actor_session_token: sessionToken,
        _coverage_mode: input.coverageMode,
        _insurance_name: input.insuranceName || null,
        _insurance_member_number: input.insuranceMemberNumber || null,
        _insurer_amount: input.coverageMode === "third_party" ? input.insurerAmount : 0,
        _items: input.items.map(({ description, quantity, unitPrice }) => ({
          description,
          quantity,
          unit_price: unitPrice,
        })),
        _payment_payer: input.paymentPayer,
        _payment_amount: input.paymentAmount,
        _payment_method: input.paymentMethod,
        _payment_reference: input.paymentReference || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-encashment", input.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["queue-entry"] });
      queryClient.invalidateQueries({ queryKey: ["queue-encashment-summary"] });
      toast({ title: "Facturation mise à jour", description: "Les prestations et le règlement sont enregistrés." });
    },
    onError: (error) => {
      toast({ title: "Enregistrement impossible", description: error.message, variant: "destructive" });
    },
  });
};
