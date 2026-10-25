import { useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { LockKeyhole, Printer, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface SharedPrescriptionData {
  prescription: {
    date: string;
    notes: string | null;
    prescriptionType: string;
    items: Array<{
      nom_medicament: string;
      dosage: string | null;
      posologie: string;
      duree: string | null;
      instructions: string | null;
      request_type: "medication" | "laboratory" | "imaging";
      request_details: {
        indication?: string;
        priority?: string;
        specimen?: string;
        preparation?: string;
        modality?: string;
        region?: string;
        laterality?: string;
        contrast?: string;
      } | null;
    }>;
  };
  patient: {
    nom: string;
    prenom: string;
    age: number | null;
    sexe: string | null;
  };
  cabinet: Record<string, string | null>;
  expiresAt: string;
}

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-MA", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

export default function SharedPrescription() {
  const { token = "" } = useParams();
  const [accessCode, setAccessCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sharedData, setSharedData] = useState<SharedPrescriptionData | null>(null);

  const openPrescription = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("prescription-share", {
        body: { action: "open", token, accessCode },
      });
      if (error) {
        if ("context" in error && error.context instanceof Response) {
          if (error.context.status === 403) {
            throw new Error("Lien ou code invalide, expiré ou révoqué.");
          }
          if (error.context.status === 410) {
            throw new Error("Cette ordonnance a été modifiée. Demandez au cabinet un nouveau lien.");
          }
        }
        throw new Error("Impossible d’ouvrir le document. Vérifiez votre connexion puis réessayez.");
      }
      if (data?.error) throw new Error(data.error);
      setSharedData(data as SharedPrescriptionData);
    } catch (error) {
      console.error("Unable to open shared prescription:", error);
      setErrorMessage(error instanceof Error
        ? error.message
        : "Impossible d’ouvrir le document. Vérifiez votre connexion puis réessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!/^[0-9a-f]{64}$/i.test(token)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f7f4] p-5">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl">
          <LockKeyhole className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
          <h1 className="mt-4 text-lg font-bold text-slate-900">Lien invalide</h1>
          <p className="mt-2 text-sm text-slate-600">Vérifiez le lien transmis par le cabinet médical.</p>
        </section>
      </main>
    );
  }

  if (!sharedData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,#e3f1e8_0%,#f4f7f5_55%,#eef2f1_100%)] p-5">
        <section className="w-full max-w-md rounded-3xl border border-[#dce9e1] bg-white p-7 shadow-[0_24px_80px_-36px_rgba(23,77,60,0.35)] sm:p-9">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf4ed] text-[#23634f]">
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b8577]">Document médical sécurisé</p>
          <h1 className="mt-2 text-center text-xl font-bold text-[#194d40]">Accéder à l’ordonnance</h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-slate-600">
            Saisissez le code à 8 chiffres communiqué séparément par le cabinet.
          </p>
          <form className="mt-6 space-y-4" onSubmit={(event) => void openPrescription(event)}>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="share-access-code">
              Code d’accès
            </label>
            <input
              id="share-access-code"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{8}"
              maxLength={8}
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="••••••••"
              required
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-center font-mono text-xl tracking-[0.45em] text-slate-900 outline-none transition focus:border-[#39866a] focus:ring-4 focus:ring-[#39866a]/10"
              aria-describedby={errorMessage ? "share-access-error" : undefined}
            />
            {errorMessage && (
              <p id="share-access-error" role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {errorMessage}
              </p>
            )}
            <Button type="submit" disabled={isLoading || accessCode.length !== 8} className="h-11 w-full rounded-xl bg-[#23634f] font-semibold text-white hover:bg-[#194d40]">
              {isLoading ? "Vérification sécurisée…" : "Ouvrir le document"}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">
            Le lien est temporaire et peut être désactivé par le cabinet. Ne transférez pas ce document sans autorisation.
          </p>
        </section>
      </main>
    );
  }

  const { prescription, patient, cabinet } = sharedData;
  const physician = cabinet.doctor_name || "Cabinet médical";
  const specialty = cabinet.cabinet_specialty;
  const prescriptionTitle = prescription.prescriptionType === "laboratory"
    ? "Prescription biologique"
    : prescription.prescriptionType === "imaging"
      ? "Prescription d’imagerie"
      : "Ordonnance";

  return (
    <main className="min-h-screen bg-[#f3f7f4] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[#194d40]">
            <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="truncate">Partage sécurisé du cabinet</span>
          </div>
          <Button type="button" variant="outline" className="shrink-0 rounded-xl border-[#d6e3dc] bg-white" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
            Imprimer / PDF
          </Button>
        </div>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-10 print:border-0 print:p-0 print:shadow-none">
          <header className="border-b-2 border-[#dce9e1] pb-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6b8577]">{specialty || "Document médical"}</p>
            <h1 className="mt-1 text-2xl font-bold text-[#194d40]">{physician}</h1>
            {cabinet.order_number && <p className="mt-1 text-xs text-slate-600">N° d’ordre : {cabinet.order_number}</p>}
            {(cabinet.cabinet_address || cabinet.cabinet_city || cabinet.cabinet_phone) && (
              <p className="mt-2 text-xs text-slate-600">
                {[cabinet.cabinet_address, cabinet.cabinet_city, cabinet.cabinet_phone].filter(Boolean).join(" · ")}
              </p>
            )}
          </header>
          <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Patient</p>
            <p className="mt-1 font-semibold text-slate-900">{patient.prenom} {patient.nom}</p>
            <p className="mt-1 text-sm text-slate-600">
              {patient.age !== null ? `${patient.age} ans` : ""}
              {patient.age !== null && patient.sexe ? " · " : ""}
              {patient.sexe || ""}
            </p>
          </section>
          <div className="my-6 flex items-end justify-between gap-4 border-b border-slate-200 pb-3">
            <h2 className="text-xl font-bold tracking-wide text-slate-800">{prescriptionTitle}</h2>
            <p className="shrink-0 text-sm text-slate-600">{formatDate(prescription.date)}</p>
          </div>
          <ol className="space-y-4">
            {prescription.items.map((item, index) => (
              <li key={`${index}-${item.nom_medicament}`} className="flex gap-3">
                <span className="pt-0.5 font-bold text-[#32745a]">{index + 1}.</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900">
                    {item.request_type === "laboratory" ? "Analyse : " : item.request_type === "imaging" ? "Imagerie : " : ""}
                    {item.nom_medicament}{item.dosage ? ` · ${item.dosage}` : ""}
                  </h3>
                  {item.posologie && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{item.posologie}</p>}
                  {item.duree && <p className="mt-1 text-sm text-slate-600">Durée : {item.duree}</p>}
                  {item.instructions && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{item.instructions}</p>}
                  {item.request_type !== "medication" && item.request_details && (
                    <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
                      {[
                        ["Priorité", item.request_details.priority && item.request_details.priority !== "routine" ? item.request_details.priority : ""],
                        ["Modalité", item.request_details.modality],
                        ["Région / organe", item.request_details.region],
                        ["Côté", item.request_details.laterality],
                        ["Contraste", item.request_details.contrast],
                        ["Prélèvement", item.request_details.specimen],
                        ["Indication", item.request_details.indication],
                        ["Préparation", item.request_details.preparation],
                      ].filter(([, value]) => value).map(([label, value]) => (
                        <div key={label}>
                          <dt className="inline font-semibold">{label} : </dt>
                          <dd className="inline">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </li>
            ))}
          </ol>
          {prescription.notes && (
            <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Recommandations</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{prescription.notes}</p>
            </section>
          )}
          <footer className="mt-10 border-t border-slate-200 pt-3 text-xs text-slate-500">
            Document communiqué par voie sécurisée. Lien valable jusqu’au {formatDate(sharedData.expiresAt)}.
          </footer>
        </article>
      </div>
      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          body { background: #fff !important; }
          main { min-height: 0 !important; padding: 0 !important; background: #fff !important; }
        }
      `}</style>
    </main>
  );
}
