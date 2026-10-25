import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Banknote,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FileText,
  LoaderCircle,
  Printer,
  ReceiptText,
  ShieldCheck,
  UserRound,
  TriangleAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EncashmentContext,
  EncashmentItemInput,
  SaveEncashmentInput,
  useInvoiceEncashmentContext,
  useSaveInvoiceEncashment,
} from "@/hooks/useInvoiceEncashment";
import { formatPatientName, formatPhoneNumber } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
import {
  getMoroccanCabinetTariffProfile,
  getSuggestedPaymentAmounts,
} from "@/lib/moroccanCabinetTariffs";

type Props = {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type EditableItem = EncashmentItemInput & { key: string };
type PaymentReceiptDetails = {
  amount: number;
  payer: "patient" | "insurer";
  method: SaveEncashmentInput["paymentMethod"];
  reference: string;
  remaining: number;
  createdAt: Date;
};

const money = (amount: number) =>
  `${amount.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;

const calculateTotal = (items: EditableItem[]) =>
  items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);

const getNetAmount = (invoice: EncashmentContext["invoice"], total: number) => {
  if (invoice.reduction_type === "percentage") {
    return Math.round(total * (1 - Math.min(Math.max(invoice.reduction_valeur, 0), 100) / 100) * 100) / 100;
  }
  if (invoice.reduction_type === "fixed") {
    return Math.max(0, Math.round((total - Math.max(invoice.reduction_valeur, 0)) * 100) / 100);
  }
  return Math.round(total * 100) / 100;
};

const makeLegacyItem = (context: EncashmentContext): EditableItem => ({
  key: crypto.randomUUID(),
  description: "Consultation médicale",
  quantity: 1,
  unitPrice: context.invoice.montant_brut || context.invoice.montant || 0,
});

const getInitialItems = (context: EncashmentContext): EditableItem[] => {
  if (context.items.length) {
    return context.items.map((item) => ({
      key: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
    }));
  }
  return [makeLegacyItem(context)];
};

const getPatientRemaining = (context: EncashmentContext, netAmount: number) =>
  Math.max(0, netAmount - getPaidBy(context, "patient"));

const getPaidBy = (context: EncashmentContext, payer: "patient" | "insurer") =>
  context.payments
    .filter((payment) => payment.payer_type === payer)
    .reduce((total, payment) => total + payment.amount, 0);

const PrintStatement = ({
  context,
  items,
  grossAmount,
  netAmount,
  coverageMode,
  insuranceName,
  memberNumber,
  insurerAmount,
  includeCabinetLetterhead,
  cabinet,
  receipt,
}: {
  context: EncashmentContext;
  items: EditableItem[];
  grossAmount: number;
  netAmount: number;
  coverageMode: "reimbursement" | "third_party" | null;
  insuranceName: string;
  memberNumber: string;
  insurerAmount: number;
  includeCabinetLetterhead: boolean;
  cabinet: {
    name: string;
    doctorName: string;
    specialty: string;
    orderNumber: string;
    logo: string;
    address: string;
    city: string;
    phone: string;
    email: string;
  };
  receipt: PaymentReceiptDetails | null;
}) => {
  const patientDue = Math.max(0, netAmount - insurerAmount);

  return (
    <div className="billing-print">
    {includeCabinetLetterhead && (
      <header className="billing-print-letterhead">
        {cabinet.logo && <img className="billing-print-logo" src={cabinet.logo} alt="" />}
        <div className="billing-print-cabinet">
          <strong>{cabinet.name}</strong>
          {cabinet.doctorName && <span>{cabinet.doctorName}</span>}
          {cabinet.specialty && <span>{cabinet.specialty}</span>}
          {cabinet.orderNumber && <span>Ordre : {cabinet.orderNumber}</span>}
        </div>
        <div className="billing-print-contact">
          {[cabinet.address, cabinet.city].filter(Boolean).join(" · ") && (
            <span>{[cabinet.address, cabinet.city].filter(Boolean).join(" · ")}</span>
          )}
          {cabinet.phone && <span>Tél. {cabinet.phone}</span>}
          {cabinet.email && <span>{cabinet.email}</span>}
        </div>
      </header>
    )}
    <header className="billing-print-document">
      <div>
        <p className="billing-print-subtitle">{receipt ? "Reçu de paiement" : "Décompte détaillé des prestations"}</p>
      </div>
      <div className="billing-print-number">
        <strong>{context.invoice.numero}</strong>
        <span>{format(new Date(`${context.invoice.date}T12:00:00`), "d MMMM yyyy", { locale: fr })}</span>
      </div>
    </header>
    <section className="billing-print-patient">
      <div><span>Patient</span><strong>{formatPatientName(context.patient.nom, context.patient.prenom)}</strong></div>
      {context.patient.cin && <div><span>CIN</span><strong>{context.patient.cin}</strong></div>}
      {context.patient.telephone && <div><span>Téléphone</span><strong>{formatPhoneNumber(context.patient.telephone)}</strong></div>}
      <div><span>Organisme</span><strong>{insuranceName || context.patient.mutuelle || "Non renseigné"}</strong></div>
      {(memberNumber || context.patient.numero_mutuelle) && <div><span>N° adhérent</span><strong>{memberNumber || context.patient.numero_mutuelle}</strong></div>}
    </section>
    <table className="billing-print-table">
      <thead><tr><th>Prestation</th><th>Qté</th><th>Prix unitaire</th><th>Total</th></tr></thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.key}>
            <td>{item.description || "Prestation"}</td>
            <td>{item.quantity}</td>
            <td>{money(item.unitPrice)}</td>
            <td>{money(item.quantity * item.unitPrice)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    {receipt && (
      <section className="billing-print-receipt">
        <h2>Paiement reçu</h2>
        <div><span>Payé par</span><strong>{receipt.payer === "insurer" ? "Organisme" : "Patient"}</strong></div>
        <div><span>Mode de règlement</span><strong>{receipt.method === "cash" ? "Espèces" : receipt.method === "card" ? "Carte / TPE" : receipt.method === "cheque" ? "Chèque" : receipt.method === "transfer" ? "Virement" : "Autre"}</strong></div>
        {receipt.reference && <div><span>Référence</span><strong>{receipt.reference}</strong></div>}
        <div><span>Date et heure</span><strong>{format(receipt.createdAt, "d MMMM yyyy à HH:mm", { locale: fr })}</strong></div>
        <div className="billing-print-receipt-amount"><span>Montant reçu</span><strong>{money(receipt.amount)}</strong></div>
        <div><span>{receipt.remaining > 0 ? "Solde restant dû" : "Solde de cette part"}</span><strong>{money(receipt.remaining)}</strong></div>
      </section>
    )}
    <section className="billing-print-totals">
      {grossAmount !== netAmount && <div><span>Réduction déjà appliquée</span><strong>− {money(grossAmount - netAmount)}</strong></div>}
      <div className="billing-print-total"><span>Total net</span><strong>{money(netAmount)}</strong></div>
      {coverageMode === "third_party" && <div><span>Part organisme (tiers payant)</span><strong>{money(insurerAmount)}</strong></div>}
      {coverageMode === "third_party" && <div><span>Part patient</span><strong>{money(patientDue)}</strong></div>}
    </section>
    {includeCabinetLetterhead && (
      <footer className="billing-print-footer">
        <p>{coverageMode === "third_party"
          ? "Décompte établi pour la prise en charge en tiers payant, selon les montants enregistrés par le cabinet."
          : "Décompte détaillé remis au patient pour ses démarches de remboursement auprès de son organisme."}</p>
        <div className="billing-print-signature"><span>Cachet et signature du cabinet</span></div>
      </footer>
    )}
    </div>
  );
};

export const QueueEncashmentDialog = ({ invoiceId, open, onOpenChange }: Props) => {
  const { data, isLoading, isError, error, refetch } = useInvoiceEncashmentContext(open ? invoiceId ?? undefined : undefined);
  const { getSettingValue } = useSettings();
  const saveEncashment = useSaveInvoiceEncashment();
  const [items, setItems] = useState<EditableItem[]>([]);
  const [coverageMode, setCoverageMode] = useState<"reimbursement" | "third_party">("reimbursement");
  const [isThirdPartyExpanded, setIsThirdPartyExpanded] = useState(false);
  const [isPriceAdjustmentEnabled, setIsPriceAdjustmentEnabled] = useState(false);
  const [insuranceName, setInsuranceName] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const [insurerAmountValue, setInsurerAmountValue] = useState("0");
  const [paymentPayer, setPaymentPayer] = useState<"patient" | "insurer">("patient");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "cheque" | "transfer" | "other">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [includeCabinetLetterhead, setIncludeCabinetLetterhead] = useState(true);
  const [printReceiptAfterSave, setPrintReceiptAfterSave] = useState(false);
  const [receiptForPrint, setReceiptForPrint] = useState<PaymentReceiptDetails | null>(null);
  const [shouldAutoPrintReceipt, setShouldAutoPrintReceipt] = useState(false);
  const initializedInvoiceIdRef = useRef<string | null>(null);
  const cabinetSpecialty = getSettingValue("cabinet_specialty");
  const cabinet = {
    name: getSettingValue("cabinet_name") || (cabinetSpecialty ? `Cabinet ${cabinetSpecialty}` : "Cabinet médical"),
    doctorName: getSettingValue("doctor_name"),
    specialty: cabinetSpecialty,
    orderNumber: getSettingValue("order_number"),
    logo: getSettingValue("custom_logo"),
    address: getSettingValue("cabinet_address"),
    city: getSettingValue("cabinet_city"),
    phone: getSettingValue("cabinet_phone"),
    email: getSettingValue("cabinet_email") || getSettingValue("doctor_email"),
  };

  useEffect(() => {
    if (!open) {
      initializedInvoiceIdRef.current = null;
      return;
    }
    if (!data || initializedInvoiceIdRef.current === data.invoice.id) return;
    initializedInvoiceIdRef.current = data.invoice.id;
    const initialItems = getInitialItems(data);
    const initialNetAmount = getNetAmount(data.invoice, calculateTotal(initialItems));
    setItems(initialItems);
    setCoverageMode("reimbursement");
    setIsThirdPartyExpanded(false);
    setIsPriceAdjustmentEnabled(false);
    setInsuranceName(data.invoice.insurance_name || data.patient.mutuelle || "");
    setMemberNumber(data.invoice.insurance_member_number || data.patient.numero_mutuelle || "");
    setInsurerAmountValue(String(data.invoice.insurer_amount || 0));
    setPaymentPayer("patient");
    setPaymentAmount(getPatientRemaining(data, initialNetAmount).toFixed(2));
    setPaymentMethod("cash");
    setPaymentReference("");
    setPrintReceiptAfterSave(false);
    setReceiptForPrint(null);
    setShouldAutoPrintReceipt(false);
  }, [data, open]);

  const grossAmount = useMemo(() => calculateTotal(items), [items]);
  const netAmount = data ? getNetAmount(data.invoice, grossAmount) : 0;
  const insurerAmount = coverageMode === "third_party" ? Number(insurerAmountValue) || 0 : 0;
  const patientDue = Math.max(0, netAmount - insurerAmount);
  const patientRemaining = Math.max(0, patientDue - (data ? getPaidBy(data, "patient") : 0));
  const insurerRemaining = Math.max(0, insurerAmount - (data ? getPaidBy(data, "insurer") : 0));
  const selectedRemaining = paymentPayer === "insurer" ? insurerRemaining : patientRemaining;
  const tariffProfile = getMoroccanCabinetTariffProfile(getSettingValue("cabinet_specialty_id"));
  const suggestedPayments = getSuggestedPaymentAmounts(tariffProfile.presets, selectedRemaining);
  const currentPaymentAmount = Math.round((Number(paymentAmount) || 0) * 100);
  const availablePaymentSuggestions = suggestedPayments.filter(
    (amount) => Math.round(amount * 100) !== currentPaymentAmount,
  );
  const exactBalanceIsSuggested = suggestedPayments.some(
    (amount) => Math.round(amount * 100) === Math.round(selectedRemaining * 100),
  );
  const showExactBalanceShortcut = selectedRemaining > 0
    && !exactBalanceIsSuggested
    && Math.round(selectedRemaining * 100) !== currentPaymentAmount;
  const parsedPaymentAmount = Number(paymentAmount) || 0;
  const remainingAfterPayment = Math.max(0, Math.round((selectedRemaining - parsedPaymentAmount) * 100) / 100);
  const isPartialPayment = parsedPaymentAmount > 0 && parsedPaymentAmount < selectedRemaining;
  const isFullPayment = parsedPaymentAmount > 0 && parsedPaymentAmount === selectedRemaining;
  const paymentReferenceLabel = paymentMethod === "cheque"
    ? "N° de chèque, banque"
    : paymentMethod === "card"
      ? "N° de transaction TPE"
      : paymentMethod === "transfer"
        ? "N° de transaction"
        : "Référence";
  const paymentReferencePlaceholder = paymentMethod === "cheque"
    ? "N° de chèque, banque"
    : paymentMethod === "card"
      ? "N° du ticket TPE"
      : paymentMethod === "transfer"
        ? "N° de virement"
        : "Référence (facultative)";

  const updateItemPrice = (key: string, unitPrice: number) => {
    const updatedItems = items.map((item) => item.key === key ? { ...item, unitPrice } : item);
    setItems(updatedItems);
    const updatedNetAmount = data ? getNetAmount(data.invoice, calculateTotal(updatedItems)) : 0;
    const updatedPatientDue = coverageMode === "third_party" ? Math.max(0, updatedNetAmount - insurerAmount) : updatedNetAmount;
    const updatedRemaining = paymentPayer === "insurer"
      ? Math.max(0, insurerAmount - (data ? getPaidBy(data, "insurer") : 0))
      : Math.max(0, updatedPatientDue - (data ? getPaidBy(data, "patient") : 0));
    setPaymentAmount(updatedRemaining.toFixed(2));
  };

  const selectCoverage = (mode: "reimbursement" | "third_party") => {
    if (!data) return;
    const nextInsurerAmount = mode === "third_party" ? Number(insurerAmountValue) || 0 : 0;
    const nextPatientDue = Math.max(0, netAmount - nextInsurerAmount);
    setCoverageMode(mode);
    setIsThirdPartyExpanded(mode === "third_party");
    setPaymentPayer("patient");
    setPaymentAmount(Math.max(0, nextPatientDue - getPaidBy(data, "patient")).toFixed(2));
  };

  const setPayer = (payer: "patient" | "insurer") => {
    setPaymentPayer(payer);
    const amountOwed = payer === "insurer" ? insurerRemaining : patientRemaining;
    setPaymentAmount(amountOwed ? amountOwed.toFixed(2) : "");
  };

  const updateInsurerAmount = (value: string) => {
    setInsurerAmountValue(value);
    const nextInsurerAmount = Number(value) || 0;
    const nextPatientDue = Math.max(0, netAmount - nextInsurerAmount);
    const amountOwed = paymentPayer === "insurer"
      ? Math.max(0, nextInsurerAmount - (data ? getPaidBy(data, "insurer") : 0))
      : Math.max(0, nextPatientDue - (data ? getPaidBy(data, "patient") : 0));
    setPaymentAmount(amountOwed.toFixed(2));
  };

  const save = () => {
    if (!data || !coverageMode) return;
    const cleanItems = items.map(({ description, quantity, unitPrice }) => ({
      description: description.trim(),
      quantity,
      unitPrice,
    }));
    if (cleanItems.some((item) =>
      !item.description
      || item.description.length > 180
      || !Number.isFinite(item.quantity)
      || item.quantity <= 0
      || item.quantity > 100
      || !Number.isFinite(item.unitPrice)
      || item.unitPrice < 0
    )) return;

    const parsedAmount = paymentAmount.trim() ? Number(paymentAmount) : 0;
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0 || parsedAmount > selectedRemaining) return;

    saveEncashment.mutate({
      invoiceId: data.invoice.id,
      coverageMode,
      insuranceName: insuranceName.trim(),
      insuranceMemberNumber: memberNumber.trim(),
      insurerAmount,
      items: cleanItems,
      paymentPayer: parsedAmount > 0 ? paymentPayer : null,
      paymentAmount: parsedAmount,
      paymentMethod,
      paymentReference: paymentReference.trim(),
    }, {
      onSuccess: () => {
        if (!printReceiptAfterSave || parsedAmount <= 0) return;
        setReceiptForPrint({
          amount: parsedAmount,
          payer: paymentPayer,
          method: paymentMethod,
          reference: paymentReference.trim(),
          remaining: Math.max(0, Math.round((selectedRemaining - parsedAmount) * 100) / 100),
          createdAt: new Date(),
        });
        setShouldAutoPrintReceipt(true);
      },
    });
  };

  const canSave = Boolean(
    data
    && coverageMode
    && data.invoice.statut !== "cancelled"
    && items.length > 0
    && items.every((item) =>
      item.description.trim()
      && item.quantity > 0
      && Number.isFinite(item.quantity)
      && item.unitPrice >= 0
      && Number.isFinite(item.unitPrice)
    )
    && (coverageMode !== "third_party" || (insurerAmount >= 0 && insurerAmount <= netAmount))
    && Number(paymentAmount || 0) >= 0
    && Number(paymentAmount || 0) <= selectedRemaining
  );

  const print = useCallback(() => {
    document.body.classList.add("printing-billing");
    window.addEventListener("afterprint", () => {
      document.body.classList.remove("printing-billing");
      setReceiptForPrint(null);
    }, { once: true });
    window.print();
  }, []);

  useEffect(() => {
    if (!shouldAutoPrintReceipt || !receiptForPrint || !open) return;
    const timeout = window.setTimeout(() => {
      setShouldAutoPrintReceipt(false);
      print();
    }, 100);
    return () => window.clearTimeout(timeout);
  }, [open, print, receiptForPrint, shouldAutoPrintReceipt]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94dvh] max-w-4xl flex-col overflow-hidden border-slate-200 p-0">
        <div className="shrink-0 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur sm:px-7">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                <ReceiptText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-left text-base">Encaissement & couverture</DialogTitle>
                <DialogDescription className="sr-only">Vérifiez le solde, la couverture et enregistrez le règlement.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Chargement de la facture…</div>
        ) : isError ? (
          <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 sm:m-7">
            <p className="font-semibold">La facture ne peut pas être chargée.</p><p className="mt-1">{error.message}</p>
            <Button type="button" variant="outline" className="mt-3" onClick={() => void refetch()}>Réessayer</Button>
          </div>
        ) : data ? (
          <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3 sm:px-7">
              <PatientAndInvoice context={data} />

              {data.invoice.statut === "cancelled" ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-900">Cette facture est annulée et ne peut pas être encaissée.</div>
              ) : (
                <>
                  <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-950">
                      {coverageMode === "third_party"
                        ? <Building2 className="h-4 w-4 text-indigo-700" />
                        : <UserRound className="h-4 w-4 text-emerald-700" />}
                      {coverageMode === "third_party" ? "Tiers payant" : "Règlement par le patient"}
                    </span>
                    {(data.patient.mutuelle || data.patient.numero_mutuelle) && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                        {data.patient.mutuelle || "Couverture renseignée"}
                      </span>
                    )}
                    <div className="ml-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-expanded={isThirdPartyExpanded}
                        onClick={() => selectCoverage(coverageMode === "third_party" ? "reimbursement" : "third_party")}
                        className={cn(
                          "h-8 rounded-lg px-2.5 text-[11px] font-semibold",
                          coverageMode === "third_party"
                            ? "border-indigo-300 bg-indigo-50 text-indigo-900 hover:bg-indigo-100"
                            : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-900",
                        )}
                      >
                        <Building2 className="mr-1.5 h-3.5 w-3.5" />
                        {coverageMode === "third_party" ? "Revenir au règlement patient" : "Activer le tiers payant"}
                        <ChevronDown className={cn("ml-1.5 h-3.5 w-3.5 transition-transform", isThirdPartyExpanded && "rotate-180")} />
                      </Button>
                    </div>
                  </section>

                  {coverageMode === "third_party" && isThirdPartyExpanded && (
                    <section className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
                      <SectionTitle icon={Building2} title="Ventilation exceptionnelle en tiers payant" subtitle="Renseignez uniquement la part confirmée par l’organisme. Aucun taux n’est estimé automatiquement." />
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5"><Label htmlFor="coverage-insurer">Organisme</Label><Input id="coverage-insurer" value={insuranceName} onChange={(event) => setInsuranceName(event.target.value)} placeholder="Nom de la mutuelle / assurance" className="rounded-lg bg-white" /></div>
                        <div className="space-y-1.5"><Label htmlFor="coverage-member">N° adhérent / assuré</Label><Input id="coverage-member" value={memberNumber} onChange={(event) => setMemberNumber(event.target.value)} placeholder="À vérifier sur la carte" className="rounded-lg bg-white" /></div>
                        <div className="space-y-1.5 sm:max-w-xs"><Label htmlFor="coverage-amount">Part due par l’organisme · DH</Label><Input id="coverage-amount" type="number" min="0" max={netAmount} step="0.01" value={insurerAmountValue} onChange={(event) => updateInsurerAmount(event.target.value)} className="rounded-lg bg-white font-semibold tabular-nums" /></div>
                        <p className="self-end text-xs leading-5 text-indigo-900">Le patient reste responsable du solde non pris en charge, selon l’accord convenu.</p>
                      </div>
                    </section>
                  )}

                  <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <SectionTitle icon={FileText} title="Prestations facturées" subtitle="Détail défini par le médecin." />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-pressed={isPriceAdjustmentEnabled}
                        onClick={() => setIsPriceAdjustmentEnabled((enabled) => !enabled)}
                        className={cn(
                          "h-9 rounded-lg text-xs font-semibold",
                          isPriceAdjustmentEnabled
                            ? "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
                            : "border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-950",
                        )}
                      >
                        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                        {isPriceAdjustmentEnabled ? "Fermer l’ajustement exceptionnel" : "Ajuster exceptionnellement un tarif"}
                      </Button>
                    </div>
                    {isPriceAdjustmentEnabled && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-950">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>Exceptionnellement, seuls les prix unitaires sont modifiables. Les actes et quantités restent ceux définis par le médecin.</p>
                      </div>
                    )}
                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                      <div className="hidden grid-cols-[minmax(0,1fr)_72px_140px_140px] gap-3 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:grid">
                        <span>Prestation</span><span className="text-right">Qté</span><span className="text-right">Prix unitaire</span><span className="text-right">Montant</span>
                      </div>
                      {items.map((item, index) => (
                        <div key={item.key} className="grid gap-2 border-t border-slate-100 px-3 py-3 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_72px_140px_140px] sm:items-center sm:gap-3 sm:px-4">
                          <div className="min-w-0">
                            <span className="mr-1.5 text-[10px] font-semibold text-slate-400 sm:hidden">Prestation {index + 1}</span>
                            <span className="text-sm font-semibold text-slate-800">{item.description || "Prestation"}</span>
                          </div>
                          <span className="text-xs tabular-nums text-slate-500 sm:text-right">× {item.quantity}</span>
                          {isPriceAdjustmentEnabled ? (
                            <div className="relative">
                              <Input
                                id={`billing-price-${item.key}`}
                                type="number"
                                min="0"
                                max="1000000"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(event) => updateItemPrice(item.key, Number(event.target.value))}
                                aria-label={`Prix unitaire exceptionnel pour ${item.description || `prestation ${index + 1}`}`}
                                className="h-9 rounded-lg border-amber-300 bg-amber-50 pr-10 text-right font-semibold tabular-nums"
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-amber-800">DH</span>
                            </div>
                          ) : (
                            <span className="text-xs tabular-nums text-slate-600 sm:text-right">{money(item.unitPrice)}</span>
                          )}
                          <span className="text-sm font-bold tabular-nums text-slate-900 sm:text-right">{money(item.quantity * item.unitPrice)}</span>
                        </div>
                      ))}
                      {grossAmount !== netAmount && (
                        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs">
                          <span className="font-medium text-slate-600">Réduction appliquée</span>
                          <span className="font-semibold tabular-nums text-slate-700">− {money(grossAmount - netAmount)}</span>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                    <SectionTitle icon={CircleDollarSign} title="Encaissement" subtitle="Paiement total ou partiel." />

                    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-600">{paymentPayer === "insurer" ? "À recevoir de l’organisme" : "À recevoir du patient"}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">Solde restant à régler</p>
                        </div>
                        <p className="text-xl font-bold tabular-nums text-emerald-900">{money(selectedRemaining)}</p>
                      </div>
                      {coverageMode === "third_party" && (
                        <div className="grid grid-cols-2 gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-right">
                          <div>
                            <p className="text-[10px] font-semibold text-indigo-700">Part patient</p>
                            <p className="mt-1 text-sm font-bold tabular-nums text-indigo-950">{money(patientDue)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-indigo-700">Part organisme</p>
                            <p className="mt-1 text-sm font-bold tabular-nums text-indigo-950">{money(insurerAmount)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
                      {coverageMode === "third_party" && (
                        <div className="space-y-1.5">
                          <Label htmlFor="payment-payer">Qui règle maintenant ?</Label>
                          <Select value={paymentPayer} onValueChange={(value: "patient" | "insurer") => setPayer(value)}>
                            <SelectTrigger id="payment-payer" className="rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="patient">Patient</SelectItem>
                              <SelectItem value="insurer">Mutuelle / assurance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label htmlFor="payment-amount">Montant reçu · DH</Label>
                        <Input id="payment-amount" type="number" min="0" max={selectedRemaining} step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="0" className="rounded-lg font-semibold tabular-nums" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="payment-method">Mode de règlement</Label>
                        <Select value={paymentMethod} onValueChange={(value: typeof paymentMethod) => {
                          setPaymentMethod(value);
                          setPaymentReference("");
                        }}>
                          <SelectTrigger id="payment-method" className="rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Espèces</SelectItem>
                            <SelectItem value="card">Carte bancaire</SelectItem>
                            <SelectItem value="cheque">Chèque</SelectItem>
                            <SelectItem value="transfer">Virement</SelectItem>
                            <SelectItem value="other">Autre / antérieur</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {paymentMethod !== "cash" && (
                        <div className="space-y-1.5">
                          <Label htmlFor="payment-reference">{paymentReferenceLabel}</Label>
                          <Input
                            id="payment-reference"
                            value={paymentReference}
                            onChange={(event) => setPaymentReference(event.target.value)}
                            maxLength={120}
                            placeholder={paymentReferencePlaceholder}
                            className="rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                    {parsedPaymentAmount > selectedRemaining ? (
                      <div role="alert" className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-900">
                        <TriangleAlert className="h-4 w-4 shrink-0" />
                        Le montant dépasse le solde restant de {money(selectedRemaining)}.
                      </div>
                    ) : isPartialPayment ? (
                      <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-amber-950">
                          <TriangleAlert className="h-4 w-4 shrink-0 text-amber-700" />
                          Partiellement réglé
                        </span>
                        <span className="text-xs font-medium tabular-nums text-amber-900">
                          Reste à charge {money(remainingAfterPayment)}
                        </span>
                      </div>
                    ) : isFullPayment ? (
                      <div role="status" className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Solde réglé par cet encaissement
                      </div>
                    ) : null}
                    {(availablePaymentSuggestions.length > 0 || showExactBalanceShortcut) && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[11px] font-semibold text-slate-700">
                          Montants rapides · {tariffProfile.profileLabel}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {availablePaymentSuggestions.map((amount) => (
                            <Button
                              key={amount}
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setPaymentAmount(amount.toFixed(2))}
                              className="h-8 rounded-full border-emerald-200 px-3 text-xs font-semibold tabular-nums text-emerald-900 hover:bg-emerald-50"
                            >
                              {money(amount)}
                            </Button>
                          ))}
                          {showExactBalanceShortcut && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setPaymentAmount(selectedRemaining.toFixed(2))}
                              className="h-8 rounded-full border-slate-300 px-3 text-xs font-semibold tabular-nums text-slate-800"
                            >
                              Solde exact · {money(selectedRemaining)}
                            </Button>
                          )}
                        </div>
                        <p className="mt-2 text-[10px] leading-4 text-slate-500">
                          Les montants rapides remplissent uniquement le règlement saisi. Ils ne changent pas le tarif de la facture ni le solde dû.
                        </p>
                      </div>
                    )}
                  </section>
                </>
              )}

            </div>

            <div className="z-10 flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <label className="mr-2 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={includeCabinetLetterhead}
                    onChange={(event) => setIncludeCabinetLetterhead(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                  />
                  En-tête et pied
                </label>
                <label className={cn(
                  "mr-2 inline-flex items-center gap-2 text-xs font-medium text-slate-600",
                  parsedPaymentAmount > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                )}>
                  <input
                    type="checkbox"
                    checked={printReceiptAfterSave}
                    disabled={parsedPaymentAmount <= 0}
                    onChange={(event) => setPrintReceiptAfterSave(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                  />
                  Imprimer le reçu après validation
                </label>
                <Button type="button" variant="outline" disabled={data.invoice.statut === "cancelled"} onClick={print} className="rounded-lg">
                  <Printer className="mr-2 h-4 w-4" /> Imprimer
                </Button>
                <Button type="button" disabled={!canSave || saveEncashment.isPending} onClick={save} className="rounded-lg bg-emerald-800 text-white hover:bg-emerald-900">
                  {saveEncashment.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />}
                  {saveEncashment.isPending
                    ? "Enregistrement…"
                    : Number(paymentAmount) > 0
                      ? `${paymentPayer === "insurer" ? "Paiement organisme" : "Encaisser"} ${money(Number(paymentAmount))}`
                      : "Enregistrer"}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
    {data && createPortal(
      <div className="billing-print-portal">
        <PrintStatement
          context={data}
          items={items}
          grossAmount={grossAmount}
          netAmount={netAmount}
          coverageMode={coverageMode}
          insuranceName={insuranceName}
          memberNumber={memberNumber}
          insurerAmount={insurerAmount}
          includeCabinetLetterhead={includeCabinetLetterhead}
          cabinet={cabinet}
          receipt={receiptForPrint}
        />
      </div>,
      document.body,
    )}
    </>
  );
};

const PatientAndInvoice = ({ context }: { context: EncashmentContext }) => (
  <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm"><UserRound className="h-5 w-5" /></div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-950">{formatPatientName(context.patient.nom, context.patient.prenom)}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {[context.patient.telephone ? formatPhoneNumber(context.patient.telephone) : null, context.patient.mutuelle || null, context.patient.numero_mutuelle ? `N° ${context.patient.numero_mutuelle}` : null]
            .filter(Boolean).join(" · ") || "Couverture à préciser"}
        </p>
      </div>
    </div>
    <div className="text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Facture {context.invoice.numero}</p><p className="mt-0.5 text-xs font-semibold text-slate-700">{format(new Date(`${context.invoice.date}T12:00:00`), "d MMMM yyyy", { locale: fr })}</p></div>
  </section>
);

const SectionTitle = ({ icon: Icon, title, subtitle }: { icon: typeof FileText; title: string; subtitle: string }) => (
  <div className="flex items-start gap-2.5">
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-teal-800 shadow-sm ring-1 ring-slate-100"><Icon className="h-4 w-4" /></div>
    <div><h3 className="text-sm font-bold text-slate-900">{title}</h3><p className="mt-0.5 text-[11px] leading-4 text-slate-500">{subtitle}</p></div>
  </div>
);
