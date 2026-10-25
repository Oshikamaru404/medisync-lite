import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

export const PwaStatus = () => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error("Shifalyx service worker registration failed:", error);
    },
  });

  useEffect(() => {
    const handleOffline = () => setIsOnline(false);
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Connexion réseau rétablie", {
        description: "Vérifiez que vos dernières actions ont bien été enregistrées.",
        duration: 6000,
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const applyUpdate = async () => {
    try {
      await updateServiceWorker(true);
    } catch (error) {
      console.error("Shifalyx PWA update failed:", error);
      toast.error("La mise à jour n’a pas pu être appliquée", {
        description: "Réessayez lorsque la connexion sera stable.",
      });
    }
  };

  if (!isOnline && !needRefresh) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[120] flex justify-center px-3">
        <div
          className="flex max-w-xl items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950 shadow-lg"
          role="status"
          aria-live="polite"
        >
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Hors connexion. Les dossiers et enregistrements nécessitent Internet ; les données médicales ne sont pas disponibles hors ligne.
          </span>
        </div>
      </div>
    );
  }

  if (!needRefresh) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[120] flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-lg">
        <div>
          <p className="font-medium">Une mise à jour de Shifalyx est prête.</p>
          <p className="mt-0.5 text-xs text-slate-600">Enregistrez vos brouillons avant l’actualisation.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#23634f] px-3 text-xs font-semibold text-white hover:bg-[#194d40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23634f] focus-visible:ring-offset-2"
            onClick={() => void applyUpdate()}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Actualiser
          </button>
          <button
            type="button"
            className="h-8 rounded-lg px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            onClick={() => setNeedRefresh(false)}
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
};
