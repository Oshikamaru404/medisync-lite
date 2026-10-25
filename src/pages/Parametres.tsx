import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BellRing,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Cloud,
  Database,
  KeyRound,
  Loader2,
  LockKeyhole,
  Printer,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Upload,
  Users,
  X,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/contexts/AuthContext";
import { getConsultationDefaultModeSettingKey, type ConsultationMode } from "@/lib/consultationPreferences";
import { toast } from "sonner";
import { MEDICAL_SPECIALTIES, getSpecialtyById, getSpecialtyLogo } from "@/data/specialties";
import { supabase } from "@/integrations/supabase/client";
import {
  getSessionInactivityTimeoutMs,
  SESSION_INACTIVITY_TIMEOUT_MINUTES_OPTIONS,
} from "@/lib/sessionSecurity";
import { DEFAULT_CABINET_WORKING_DAYS, parseCabinetWorkingDays } from "@/lib/cabinetWorkingDays";
import { UserManagement } from "@/components/auth/UserManagement";
import { PrescriptionStationeryPreview } from "@/components/PrescriptionStationeryPreview";
import prescriptionSampleA5 from "@/assets/prescription-print-preview-sample.png";
import prescriptionSampleA4 from "@/assets/prescription-print-preview-a4.png";
import { useAppointmentReminders } from "@/hooks/useAppointmentReminders";
import {
  isValidMoroccanPhone,
  normalizeMoroccanPhoneInput,
  sanitizeMoroccanPhoneInput,
  toMoroccanInternationalPhone,
} from "@/lib/utils";

const settingsSections = [
  { value: "overview", label: "Vue d’ensemble", description: "Retrouvez rapidement un réglage", icon: Settings2, keywords: "rechercher réglages" },
  { value: "cabinet", label: "Identité du cabinet", description: "Praticien, coordonnées, logo", icon: Building2, keywords: "médecin adresse ville téléphone spécialité ordre logo mode consultation rapide complet" },
  { value: "users", label: "Équipe", description: "Comptes, rôles et codes PIN", icon: Users, keywords: "utilisateurs collaborateurs accès" },
  { value: "planning", label: "Planification", description: "Horaires, jours et durée", icon: CalendarDays, keywords: "agenda rendez-vous créneaux ouverture" },
  { value: "printing", label: "Impression", description: "Ordonnances, format et test", icon: Printer, keywords: "document papier A5 A4 imprimante pdf" },
  { value: "notifications", label: "Notifications", description: "Rappels sur cet appareil", icon: Bell, keywords: "alertes rendez-vous navigateur" },
  { value: "security", label: "Sécurité", description: "Verrouillage et accès", icon: ShieldCheck, keywords: "session inactivité protection" },
  { value: "sync", label: "Données & cloud", description: "Connexion et état des données", icon: Cloud, keywords: "synchronisation réseau sauvegarde cloud" },
] as const;

const settingsGroups = [
  { label: "Cabinet", caption: "Votre pratique au quotidien", values: ["cabinet", "users", "planning"] },
  { label: "Documents & communication", caption: "Ce qui sort du cabinet et vous alerte", values: ["printing", "notifications"] },
  { label: "Système", caption: "Accès, connexion et données", values: ["security", "sync"] },
] as const;

const WEEKDAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

const Parametres = () => {
  const {
    settings,
    updateSetting,
    isLoading,
    isError: settingsError,
    isFetching: settingsRefreshing,
    refetch: refetchSettings,
  } = useSettings();
  const { currentUser, sessionToken, lock } = useAuth();
  const consultationDefaultModeKey = currentUser?.role === "medecin"
    ? getConsultationDefaultModeSettingKey(currentUser.id)
    : null;
  const {
    enabled: browserRemindersEnabled,
    reminderMinutes,
    isSupported: browserNotificationsSupported,
    permission: browserNotificationPermission,
    enableReminders,
    disableReminders,
    setReminderMinutes,
    sendTestNotification,
  } = useAppointmentReminders();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const activeSection = requestedSection && settingsSections.some((section) => section.value === requestedSection)
    ? requestedSection
    : "overview";
  const [settingsSearch, setSettingsSearch] = useState("");
  const setActiveSection = (section: string) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (section === "overview") {
      nextSearchParams.delete("section");
    } else {
      nextSearchParams.set("section", section);
    }
    setSearchParams(nextSearchParams, { replace: true });
  };
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  
  // Cabinet & Doctor settings
  const [specialtyId, setSpecialtyId] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [specialtyArabic, setSpecialtyArabic] = useState("");
  const [specialtyIcon, setSpecialtyIcon] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorNameArabic, setDoctorNameArabic] = useState("");
  const [doctorFirstName, setDoctorFirstName] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [doctorPhone, setDoctorPhone] = useState("");
  const [cabinetAddress, setCabinetAddress] = useState("");
  const [cabinetZipCode, setCabinetZipCode] = useState("");
  const [cabinetCity, setCabinetCity] = useState("");
  const [cabinetPhone, setCabinetPhone] = useState("");
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("19:00");
  const [appointmentDefaultDuration, setAppointmentDefaultDuration] = useState("30");
  const [appointmentSlotInterval, setAppointmentSlotInterval] = useState("30");
  const [cabinetWorkingDays, setCabinetWorkingDays] = useState<number[]>([...DEFAULT_CABINET_WORKING_DAYS]);
  const [sessionInactivityTimeoutMinutes, setSessionInactivityTimeoutMinutes] = useState("15");
  const [prescriptionPaperSize, setPrescriptionPaperSize] = useState<"A5" | "A4">("A5");
  const [consultationDefaultMode, setConsultationDefaultMode] = useState<ConsultationMode>("complete");
  const [isPrintTestOpen, setIsPrintTestOpen] = useState(false);
  const [customLogo, setCustomLogo] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoMigrationAttempted = useRef(false);
  const [initialized, setInitialized] = useState(false);

  const restoreFormFromSettings = useCallback(() => {
    if (!settings) return;
    const getValue = (key: string) => settings.find((setting) => setting.key === key)?.value || "";

    setSpecialtyId(getValue("cabinet_specialty_id"));
    setSpecialty(getValue("cabinet_specialty"));
    setSpecialtyArabic(getValue("cabinet_specialty_arabic"));
    setSpecialtyIcon(getValue("cabinet_specialty_icon"));
    setOrderNumber(getValue("order_number"));
    setDoctorName(getValue("doctor_name"));
    setDoctorNameArabic(getValue("doctor_name_arabic"));
    setDoctorFirstName(getValue("doctor_first_name"));
    setDoctorEmail(getValue("doctor_email"));
    setDoctorPhone(normalizeMoroccanPhoneInput(getValue("doctor_phone")));
    setCabinetAddress(getValue("cabinet_address"));
    setCabinetZipCode(getValue("cabinet_zip_code"));
    setCabinetCity(getValue("cabinet_city"));
    setCabinetPhone(normalizeMoroccanPhoneInput(getValue("cabinet_phone")));
    setOpenTime(getValue("open_time") || "08:00");
    setCloseTime(getValue("close_time") || "19:00");
    const savedDefaultDuration = getValue("appointment_default_duration");
    setAppointmentDefaultDuration(
      ["15", "20", "30", "45", "60", "90"].includes(savedDefaultDuration) ? savedDefaultDuration : "30",
    );
    const savedSlotInterval = getValue("appointment_slot_interval");
    setAppointmentSlotInterval(["15", "30"].includes(savedSlotInterval) ? savedSlotInterval : "30");
    const savedSessionTimeout = getValue("session_inactivity_timeout_minutes");
    setSessionInactivityTimeoutMinutes(
      SESSION_INACTIVITY_TIMEOUT_MINUTES_OPTIONS.some((minutes) => minutes === Number(savedSessionTimeout))
        ? savedSessionTimeout
        : "15",
    );
    setPrescriptionPaperSize(getValue("prescription_paper_size") === "A4" ? "A4" : "A5");
    const savedConsultationMode = consultationDefaultModeKey
      ? getValue(consultationDefaultModeKey)
      : "";
    setConsultationDefaultMode(savedConsultationMode === "simple" ? "simple" : "complete");
    try {
      setCabinetWorkingDays(parseCabinetWorkingDays(getValue("cabinet_working_days")));
    } catch (error) {
      console.error("Invalid cabinet working days setting:", error);
      setCabinetWorkingDays([...DEFAULT_CABINET_WORKING_DAYS]);
      toast.error("Les jours d’ouverture enregistrés sont invalides. Vérifiez-les dans Planification.");
    }
    setCustomLogo(getValue("custom_logo"));
  }, [consultationDefaultModeKey, settings]);

  useEffect(() => {
    if (!isLoading && !settingsError && settings && currentUser?.id && !initialized) {
      restoreFormFromSettings();
      setInitialized(true);
    }
  }, [currentUser?.id, initialized, isLoading, restoreFormFromSettings, settings, settingsError]);

  useEffect(() => {
    if (!isPrintTestOpen) return;
    const closeAfterPrint = () => setIsPrintTestOpen(false);
    window.addEventListener("afterprint", closeAfterPrint);
    return () => window.removeEventListener("afterprint", closeAfterPrint);
  }, [isPrintTestOpen]);

  const formSettings = useMemo(() => [
    { key: "cabinet_specialty_id", value: specialtyId },
    { key: "cabinet_specialty", value: specialty },
    { key: "cabinet_specialty_arabic", value: specialtyArabic },
    { key: "cabinet_specialty_icon", value: specialtyIcon },
    { key: "order_number", value: orderNumber },
    { key: "doctor_name", value: doctorName },
    { key: "doctor_name_arabic", value: doctorNameArabic },
    { key: "doctor_first_name", value: doctorFirstName },
    { key: "doctor_email", value: doctorEmail },
    { key: "doctor_phone", value: doctorPhone },
    { key: "cabinet_address", value: cabinetAddress },
    { key: "cabinet_zip_code", value: cabinetZipCode },
    { key: "cabinet_city", value: cabinetCity },
    { key: "cabinet_phone", value: cabinetPhone },
    { key: "open_time", value: openTime },
    { key: "close_time", value: closeTime },
    { key: "appointment_default_duration", value: appointmentDefaultDuration },
    { key: "appointment_slot_interval", value: appointmentSlotInterval },
    { key: "cabinet_working_days", value: JSON.stringify(cabinetWorkingDays) },
    { key: "session_inactivity_timeout_minutes", value: sessionInactivityTimeoutMinutes },
    { key: "prescription_paper_size", value: prescriptionPaperSize },
    ...(consultationDefaultModeKey
      ? [{ key: consultationDefaultModeKey, value: consultationDefaultMode }]
      : []),
    { key: "custom_logo", value: customLogo },
  ], [
    cabinetAddress, cabinetCity, cabinetPhone, cabinetZipCode, closeTime,
    appointmentDefaultDuration, appointmentSlotInterval, customLogo, doctorEmail,
    doctorFirstName, doctorName, doctorNameArabic, doctorPhone, openTime,
    orderNumber, specialty, specialtyArabic, specialtyIcon, specialtyId, cabinetWorkingDays,
    sessionInactivityTimeoutMinutes, prescriptionPaperSize, consultationDefaultMode, consultationDefaultModeKey,
  ]);
  const hasUnsavedChanges = useMemo(() => {
    if (!initialized || !settings) return false;
    return formSettings.some(({ key, value }) => {
      const storedValue = settings.find((setting) => setting.key === key)?.value || "";
      if (key === "doctor_phone" || key === "cabinet_phone") {
        return normalizeMoroccanPhoneInput(storedValue) !== normalizeMoroccanPhoneInput(value);
      }
      const defaultValue = key === "open_time" ? "08:00"
        : key === "close_time" ? "19:00"
        : key === "appointment_default_duration" || key === "appointment_slot_interval" ? "30"
          : key === "session_inactivity_timeout_minutes" ? "15"
          : key === "prescription_paper_size" ? "A5"
          : key.startsWith("consultation_default_mode.") ? "complete"
          : key === "cabinet_working_days" ? JSON.stringify(DEFAULT_CABINET_WORKING_DAYS) : "";
      return (storedValue || defaultValue) !== value;
    });
  }, [formSettings, initialized, settings]);
  const filteredSettingsGroups = useMemo(() => {
    const query = settingsSearch.trim().toLocaleLowerCase("fr");
    return settingsGroups.map((group) => ({
      ...group,
      sections: settingsSections.filter((section) =>
        group.values.includes(section.value)
        && (!query || `${section.label} ${section.description} ${section.keywords} ${group.label}`.toLocaleLowerCase("fr").includes(query)),
      ),
    })).filter((group) => group.sections.length > 0);
  }, [settingsSearch]);

  useEffect(() => {
    if (
      !initialized
      || !sessionToken
      || logoMigrationAttempted.current
      || !customLogo.includes("/storage/v1/object/public/patient-documents/")
    ) return;

    logoMigrationAttempted.current = true;
    void (async () => {
      const { data, error } = await supabase.functions.invoke("patient-documents", {
        body: { action: "migrate_legacy_logo", sessionToken },
      });
      if (error || data?.error) {
        const message = data?.error || error?.message || "Migration du logo impossible.";
        console.error("Error migrating legacy cabinet logo:", error || data?.error);
        toast.error(message);
        return;
      }
      if (data?.publicUrl) {
        setCustomLogo(data.publicUrl);
        void queryClient.invalidateQueries({ queryKey: ["settings"] });
      }
    })();
  }, [customLogo, initialized, queryClient, sessionToken]);

  const handleSaveAll = async () => {
    const isValidTime = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
    if (
      !isValidTime(openTime)
      || !isValidTime(closeTime)
      || openTime >= closeTime
    ) {
      toast.error("L’heure de fermeture doit être postérieure à l’heure d’ouverture.");
      return;
    }

    if (!SESSION_INACTIVITY_TIMEOUT_MINUTES_OPTIONS.some((minutes) => minutes === Number(sessionInactivityTimeoutMinutes))) {
      toast.error("Choisissez une durée de verrouillage parmi les options proposées.");
      return;
    }

    if (!isValidMoroccanPhone(doctorPhone) || !isValidMoroccanPhone(cabinetPhone)) {
      toast.error("Chaque numéro renseigné doit contenir 10 chiffres et commencer par 0.");
      return;
    }

    if (doctorEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doctorEmail.trim())) {
      toast.error("Vérifiez le format de l’adresse e-mail du praticien.");
      return;
    }

    try {
      for (const setting of formSettings) {
        const value = setting.key === "doctor_phone" || setting.key === "cabinet_phone"
          ? toMoroccanInternationalPhone(setting.value)
          : setting.value;
        await updateSetting.mutateAsync({ ...setting, value });
      }
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      await queryClient.invalidateQueries({ queryKey: ["session-inactivity-timeout"] });
      setLastSavedAt(new Date());
      toast.success("Les paramètres du cabinet ont été enregistrés.");
    } catch (error) {
      console.error("Unable to save cabinet settings:", error);
      toast.error("Enregistrement interrompu. Vérifiez la connexion puis réessayez.");
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }

    setIsUploadingLogo(true);
    try {
      if (!sessionToken) throw new Error("Votre session a expiré. Reconnectez-vous avant d’ajouter un logo.");
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const { data: prepared, error: prepareError } = await supabase.functions.invoke("patient-documents", {
        body: { action: "prepare_logo_upload", sessionToken, extension },
      });
      if (prepareError) throw prepareError;
      if (prepared?.error) throw new Error(prepared.error);

      const { error: uploadError } = await supabase.storage
        .from("cabinet-assets")
        .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      setCustomLogo(prepared.publicUrl);
      toast.success("Logo uploadé avec succès");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Erreur lors de l'upload du logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setCustomLogo("");
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
          Chargement des paramètres du cabinet…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fa] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf4ed] text-[#23634f]">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#39745e]">Espace de travail</p>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">Paramètres du cabinet</h1>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">Un espace clair pour régler votre cabinet à votre façon.</p>
            </div>
          </div>
          <div className="flex items-center gap-2" role="status" aria-live="polite">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
              settingsError || (updateSetting.isError && hasUnsavedChanges)
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : updateSetting.isPending
                  ? "border-sky-200 bg-sky-50 text-sky-800"
                  : hasUnsavedChanges
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}>
              {settingsError || (updateSetting.isError && hasUnsavedChanges)
                ? <AlertCircle className="h-3.5 w-3.5" />
                : updateSetting.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : hasUnsavedChanges
                    ? <Clock3 className="h-3.5 w-3.5" />
                    : <CheckCircle2 className="h-3.5 w-3.5" />}
              {settingsError
                ? "Réglages indisponibles"
                : updateSetting.isError && hasUnsavedChanges
                  ? "Erreur d’enregistrement"
                  : updateSetting.isPending
                    ? "Enregistrement…"
                    : hasUnsavedChanges
                      ? "Modifications en cours"
                      : "Enregistré"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-5 pb-28 sm:px-6 sm:py-7 lg:px-8">
        <Tabs value={activeSection} onValueChange={setActiveSection}>
          <div className="grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-7">
            <TabsList
              orientation="vertical"
              className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_8px_26px_-22px_rgba(15,23,42,0.35)] sm:grid-cols-4 lg:sticky lg:top-[4.5rem] lg:flex lg:flex-col lg:items-stretch lg:gap-2"
              aria-label="Rubriques des paramètres"
            >
              <TabsTrigger
                value="overview"
                className="group h-auto min-h-[54px] justify-start gap-2 rounded-xl px-2.5 py-2 text-left text-slate-600 data-[state=active]:bg-[#eaf4f0] data-[state=active]:text-[#155b48] data-[state=active]:shadow-none sm:gap-3 sm:px-3 lg:w-full"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-data-[state=active]:bg-white group-data-[state=active]:text-teal-800">
                  <Settings2 className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-semibold sm:text-xs">Vue d’ensemble</span>
                  <span className="mt-0.5 hidden truncate text-[10px] font-normal text-slate-500 lg:block">Tous les réglages</span>
                </span>
              </TabsTrigger>
              {settingsGroups.map((group) => (
                <div key={group.label} role="presentation" className="contents lg:flex lg:flex-col lg:gap-1">
                  <p className="hidden px-3 pt-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 lg:block">{group.label}</p>
                  {settingsSections.filter((section) => group.values.includes(section.value)).map(({ value, label, description, icon: Icon }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="group h-auto min-h-[54px] justify-start gap-2 rounded-xl px-2.5 py-2 text-left text-slate-600 data-[state=active]:bg-[#eaf4f0] data-[state=active]:text-[#155b48] data-[state=active]:shadow-none sm:gap-3 sm:px-3 lg:w-full"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-data-[state=active]:bg-white group-data-[state=active]:text-teal-800">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-semibold sm:text-xs">{label}</span>
                        <span className="mt-0.5 hidden truncate text-[10px] font-normal text-slate-500 lg:block">{description}</span>
                      </span>
                    </TabsTrigger>
                  ))}
                </div>
              ))}
            </TabsList>

          <TabsContent value="overview" className="min-w-0">
            <section className="overflow-hidden rounded-2xl border border-[#dfeae3] bg-gradient-to-br from-[#f0f7f2] via-white to-[#f5f8fb] p-5 sm:p-7">
              <div className="max-w-2xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#39745e]">Votre espace, simplement</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">Que souhaitez-vous régler&nbsp;?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Retrouvez les réglages du cabinet, des documents et du système au même endroit.</p>
              </div>
              <div className="relative mt-5 max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input
                  type="search"
                  value={settingsSearch}
                  onChange={(event) => setSettingsSearch(event.target.value)}
                  placeholder="Rechercher un réglage : horaires, impression, équipe…"
                  aria-label="Rechercher dans les paramètres"
                  className="h-11 rounded-xl border-white/80 bg-white/90 pl-10 shadow-sm placeholder:text-slate-400 focus-visible:ring-[#5a9b7a]"
                />
              </div>
            </section>

            <div className="mt-5 space-y-6">
              {filteredSettingsGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                  <Search className="mx-auto h-5 w-5 text-slate-400" aria-hidden="true" />
                  <p className="mt-2 text-sm font-semibold text-slate-800">Aucun réglage trouvé</p>
                  <p className="mt-1 text-xs text-slate-500">Essayez un terme plus général, comme « document » ou « accès ».</p>
                </div>
              ) : filteredSettingsGroups.map((group) => (
                <section key={group.label} aria-labelledby={`settings-group-${group.label.replaceAll(" ", "-")}`}>
                  <div className="mb-2 flex items-end justify-between gap-3 px-1">
                    <div>
                      <h3 id={`settings-group-${group.label.replaceAll(" ", "-")}`} className="text-sm font-semibold text-slate-900">{group.label}</h3>
                      <p className="mt-0.5 text-xs text-slate-500">{group.caption}</p>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {group.sections.map(({ value, label, description, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setActiveSection(value)}
                        className="group flex min-h-[92px] items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-left transition duration-150 hover:-translate-y-0.5 hover:border-[#bfd8c8] hover:shadow-[0_12px_24px_-18px_rgba(24,65,50,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5a9b7a] focus-visible:ring-offset-2"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff6f1] text-[#39745e] transition-colors group-hover:bg-[#e1f0e6]">
                          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-900">{label}</span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-[#39745e]" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="min-w-0 rounded-2xl border-slate-200 p-4 shadow-sm sm:p-6">
              <UserManagement />
            </Card>
          </TabsContent>

          <TabsContent value="printing">
            <div className="space-y-5">
              <Card className="rounded-2xl border-slate-200 p-5 shadow-sm sm:p-7">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                    <Printer className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-800">Documents du cabinet</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-950">Préférences d’impression</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                      Choisissez le format utilisé par défaut pour les ordonnances imprimées et les PDF téléchargés.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 border-t border-slate-100 pt-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(300px,1fr)]">
                  <div className="space-y-5">
                    <fieldset>
                      <legend className="text-sm font-semibold text-slate-900">Format de vos ordonnances</legend>
                      <p className="mt-1 text-xs text-slate-500">A5 est le format compact recommandé. En A4, le contenu est agrandi uniformément pour remplir la feuille.</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {([
                          { value: "A5", label: "A5", detail: "148 × 210 mm", recommended: true },
                          { value: "A4", label: "A4", detail: "210 × 297 mm", recommended: false },
                        ] as const).map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={prescriptionPaperSize === option.value}
                            onClick={() => setPrescriptionPaperSize(option.value)}
                            className={`rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5a9b7a] focus-visible:ring-offset-2 ${
                              prescriptionPaperSize === option.value
                                ? "border-[#75a98d] bg-[#eff7f1] shadow-sm"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-base font-bold text-slate-900">{option.label}</span>
                              {option.recommended && <span className="rounded-full bg-[#e0f0e5] px-2 py-0.5 text-[9px] font-semibold text-[#23634f]">Recommandé</span>}
                            </span>
                            <span className="mt-1 block text-[11px] text-slate-500">{option.detail}</span>
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-sm font-semibold text-slate-900">Imprimante</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Le navigateur ouvre la fenêtre d’impression. L’imprimante par défaut se règle dans les paramètres de Windows ou macOS ; Shifalyx ne peut pas imposer un périphérique depuis une webapp.</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 h-10 gap-2 rounded-xl border-slate-300 bg-white"
                        onClick={() => {
                          setIsPrintTestOpen(true);
                          window.setTimeout(() => window.print(), 250);
                        }}
                      >
                        <Printer className="h-4 w-4" aria-hidden="true" />
                        Imprimer l’ordonnance de démonstration
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Aperçu de l’ordonnance</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">Mise en page du cabinet · sans données patient</p>
                      </div>
                      <span className="rounded-full bg-[#eff6f1] px-2.5 py-1 text-[10px] font-semibold text-[#39745e]">{prescriptionPaperSize}</span>
                    </div>
                    <PrescriptionStationeryPreview
                      paperSize={prescriptionPaperSize}
                    />
                    <p className="mt-2 text-[11px] leading-5 text-slate-500">L’aperçu respecte la taille relative réelle des feuilles : l’A4 occupe deux fois la surface de l’A5. Le document de démonstration ne suit pas les coordonnées du cabinet.</p>
                  </div>
                </div>
              </Card>

              {isPrintTestOpen && (
                <>
                  <div
                    className="print-test-page fixed left-[-10000px] top-0 overflow-hidden bg-white"
                    style={{
                      width: prescriptionPaperSize === "A4" ? "210mm" : "148mm",
                      height: prescriptionPaperSize === "A4" ? "297mm" : "210mm",
                    }}
                  >
                    <img
                      src={prescriptionPaperSize === "A4" ? prescriptionSampleA4 : prescriptionSampleA5}
                      alt={`Ordonnance de démonstration au format ${prescriptionPaperSize}`}
                      className="block h-full w-full object-fill"
                    />
                  </div>
                  <style>{`
                    @media print {
                      @page { size: ${prescriptionPaperSize} portrait; margin: 0; }
                      body * { visibility: hidden !important; }
                      .print-test-page,
                      .print-test-page * { visibility: visible !important; }
                      .print-test-page {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        z-index: 99999 !important;
                        display: block !important;
                        width: ${prescriptionPaperSize === "A4" ? "210mm" : "148mm"} !important;
                        height: ${prescriptionPaperSize === "A4" ? "297mm" : "210mm"} !important;
                        padding: 0 !important;
                        background: #fff !important;
                        print-color-adjust: exact !important;
                        -webkit-print-color-adjust: exact !important;
                      }
                    }
                  `}</style>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cabinet">
            {settingsError ? (
              <Card className="rounded-2xl border-rose-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-slate-950">Réglages indisponibles</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Les informations du cabinet n’ont pas pu être chargées. Vous pouvez toujours gérer l’équipe et verrouiller la session, mais les changements de profil ne seront pas proposés hors connexion.
                    </p>
                    <Button variant="outline" onClick={() => void refetchSettings()} disabled={settingsRefreshing} className="mt-4 gap-2">
                      <RotateCcw className={`h-4 w-4 ${settingsRefreshing ? "animate-spin" : ""}`} />
                      Réessayer
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
            <div className="min-w-0 space-y-5">
              {/* Preview du nom */}
              <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
                <div className="h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600" />
                <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
                      {customLogo ? (
                        <img src={customLogo} alt="" className="h-full w-full object-contain" />
                      ) : specialtyIcon ? (
                        <div className="h-9 w-9 text-teal-800" dangerouslySetInnerHTML={{ __html: getSpecialtyLogo(specialtyIcon) }} />
                      ) : (
                        <Building2 className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Aperçu de votre identité médicale</p>
                      <p className="mt-1 truncate text-base font-semibold text-slate-950 sm:text-lg">
                        {specialty || "Spécialité à définir"}{doctorName ? ` · Dr ${doctorName}` : ""}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {[cabinetCity, cabinetPhone].filter(Boolean).join(" · ") || "Complétez les informations du cabinet"}
                      </p>
                    </div>
                  </div>
                  {lastSavedAt && (
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                      Enregistré à {lastSavedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </Card>

              {currentUser?.role === "medecin" && <Card className="rounded-2xl border-slate-200 p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-800">Préférence du praticien</p>
                    <h2 className="mt-1 text-base font-semibold text-slate-950">Mode de consultation par défaut</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">
                      Choisissez le mode ouvert à chaque nouvelle consultation. Vous pourrez toujours basculer de mode sans perdre vos notes.
                    </p>
                  </div>
                  <div className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1 sm:w-auto" role="group" aria-label="Mode de consultation par défaut">
                    {([
                      { value: "simple" as const, label: "Mode rapide", description: "Saisie condensée" },
                      { value: "complete" as const, label: "Mode complet", description: "Parcours guidé" },
                    ]).map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        aria-pressed={consultationDefaultMode === mode.value}
                        onClick={() => setConsultationDefaultMode(mode.value)}
                        className={`min-h-11 flex-1 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:flex-none ${
                          consultationDefaultMode === mode.value
                            ? "bg-white text-teal-950 shadow-sm ring-1 ring-slate-200"
                            : "text-slate-600 hover:bg-white/70"
                        }`}
                      >
                        <span className="block text-xs font-semibold">{mode.label}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">{mode.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Préférence propre à {currentUser ? `Dr ${[currentUser.prenom, currentUser.nom].filter(Boolean).join(" ")}` : "votre compte"}; le mode complet est utilisé par défaut.
                </p>
              </Card>}

              {/* Informations du praticien */}
              <Card className="rounded-2xl border-slate-200 p-5 shadow-sm sm:p-7">
                <div className="mb-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-800">Profil médical</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">Informations du praticien</h2>
                  <p className="mt-1 text-sm text-slate-500">Ces éléments personnalisent les documents et l’espace de travail du cabinet.</p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="doctorFirstName">Prénom</Label>
                      <Input 
                        id="doctorFirstName" 
                        placeholder="Votre prénom" 
                        value={doctorFirstName}
                        onChange={(e) => setDoctorFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doctorName">Nom</Label>
                      <Input 
                        id="doctorName" 
                        placeholder="Votre nom" 
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doctorNameArabic">Nom en arabe (pour l'ordonnance)</Label>
                    <Input 
                      id="doctorNameArabic" 
                      placeholder="الاسم بالعربية" 
                      value={doctorNameArabic}
                      onChange={(e) => setDoctorNameArabic(e.target.value)}
                      dir="rtl"
                      className="text-right"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialty">Spécialité</Label>
                    <Select
                      value={specialtyId}
                      onValueChange={(value) => {
                        const spec = getSpecialtyById(value);
                        if (spec) {
                          setSpecialtyId(value);
                          setSpecialty(spec.nameFrLong);
                          setSpecialtyArabic(spec.nameAr);
                          setSpecialtyIcon(spec.icon);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une spécialité" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEDICAL_SPECIALTIES.map((spec) => (
                          <SelectItem key={spec.id} value={spec.id}>
                            {spec.nameFr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {specialtyId && (
                    <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Traduction arabe (auto)</Label>
                        <p className="text-sm font-medium" dir="rtl">{specialtyArabic}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Logo par défaut</Label>
                        <div 
                          className="w-16 h-16 text-primary"
                          dangerouslySetInnerHTML={{ __html: getSpecialtyLogo(specialtyIcon) }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Custom Logo Upload */}
                  <div className="space-y-2">
                    <Label>Logo personnalisé (optionnel)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Utilisé sur les documents du cabinet. Image jusqu’à 2 Mo.
                    </p>
                    <div className="flex items-center gap-4">
                      {customLogo ? (
                        <div className="relative">
                          <img 
                            src={customLogo} 
                            alt="Logo personnalisé" 
                            className="w-20 h-20 object-contain border rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={handleRemoveLogo}
                            aria-label="Supprimer le logo personnalisé"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={isUploadingLogo}
                          aria-label="Choisir le logo personnalisé du cabinet"
                          className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 transition-colors hover:border-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50"
                        >
                          <Upload className="h-6 w-6 text-slate-500" />
                        </button>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      {!customLogo && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={isUploadingLogo}
                        >
                          {isUploadingLogo ? "Upload en cours..." : "Choisir un fichier"}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orderNumber">N° d'ordre (Conseil de l'Ordre)</Label>
                    <Input 
                      id="orderNumber" 
                      placeholder="Ex: 48/0802" 
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="doctorEmail">Email</Label>
                      <Input 
                        id="doctorEmail" 
                        type="email" 
                        placeholder="email@exemple.com" 
                        value={doctorEmail}
                        onChange={(e) => setDoctorEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doctorPhone">Téléphone personnel (10 chiffres)</Label>
                      <Input 
                        id="doctorPhone" 
                        type="tel" 
                        inputMode="numeric"
                        autoComplete="tel-national"
                        maxLength={20}
                        placeholder="0612345678"
                        value={doctorPhone}
                        onChange={(e) => setDoctorPhone(sanitizeMoroccanPhoneInput(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Indicatif +212 implicite.</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Informations du cabinet */}
              <Card className="rounded-2xl border-slate-200 p-5 shadow-sm sm:p-7">
                <div className="mb-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-800">Coordonnées & accueil</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">Informations du cabinet</h2>
                  <p className="mt-1 text-sm text-slate-500">Utilisées pour les documents du cabinet et le cadrage des horaires de rendez-vous.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cabinetAddress">Adresse</Label>
                    <Input 
                      id="cabinetAddress" 
                      placeholder="Numéro et rue" 
                      value={cabinetAddress}
                      onChange={(e) => setCabinetAddress(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cabinetZipCode">Code postal</Label>
                      <Input 
                        id="cabinetZipCode" 
                        placeholder="20000" 
                        value={cabinetZipCode}
                        onChange={(e) => setCabinetZipCode(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cabinetCity">Ville</Label>
                      <Input 
                        id="cabinetCity" 
                        placeholder="Casablanca" 
                        value={cabinetCity}
                        onChange={(e) => setCabinetCity(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cabinetPhone">Téléphone du cabinet (10 chiffres)</Label>
                    <Input 
                      id="cabinetPhone" 
                      type="tel" 
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={20}
                      placeholder="0523456789"
                      value={cabinetPhone}
                      onChange={(e) => setCabinetPhone(sanitizeMoroccanPhoneInput(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Indicatif +212 implicite.</p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Horaires d'ouverture</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="openTime">Ouverture</Label>
                        <Input 
                          id="openTime" 
                          type="time" 
                          value={openTime}
                          onChange={(e) => setOpenTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="closeTime">Fermeture</Label>
                        <Input 
                          id="closeTime" 
                          type="time" 
                          value={closeTime}
                          onChange={(e) => setCloseTime(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

            </div>
            )}
          </TabsContent>

          <TabsContent value="planning">
            <div className="space-y-5">
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-800">Rendez-vous</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-950">Règles de planification</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                      Définissez le rythme habituel de l’agenda. Ces choix préremplissent les nouveaux rendez-vous et restent modifiables au cas par cas.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-slate-800">
                      <Clock3 className="h-4 w-4 text-teal-800" />
                      <Label htmlFor="appointmentDefaultDuration" className="font-semibold">Durée proposée par défaut</Label>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Appliquée à la création d’un rendez-vous, sans modifier les rendez-vous déjà enregistrés.
                    </p>
                    <Select value={appointmentDefaultDuration} onValueChange={setAppointmentDefaultDuration}>
                      <SelectTrigger id="appointmentDefaultDuration" className="mt-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[15, 20, 30, 45, 60, 90].map((duration) => (
                          <SelectItem key={duration} value={String(duration)}>
                            {duration} minutes{duration === 30 ? " · standard" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-slate-800">
                      <CalendarDays className="h-4 w-4 text-teal-800" />
                      <Label htmlFor="appointmentSlotInterval" className="font-semibold">Pas des créneaux</Label>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Contrôle les heures de début autorisées et les suggestions de prochain créneau libre.
                    </p>
                    <Select value={appointmentSlotInterval} onValueChange={setAppointmentSlotInterval}>
                      <SelectTrigger id="appointmentSlotInterval" className="mt-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">Toutes les 15 minutes</SelectItem>
                        <SelectItem value="30">Toutes les 30 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-800">
                    <CalendarDays className="h-4 w-4 text-teal-800" />
                    <p className="text-sm font-semibold">Jours de consultation</p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Les nouveaux rendez-vous actifs ne pourront pas être enregistrés les jours décochés. Les rendez-vous déjà au planning restent consultables.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {WEEKDAYS.map(({ value, label }) => (
                      <label
                        key={value}
                        htmlFor={`working-day-${value}`}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Checkbox
                          id={`working-day-${value}`}
                          checked={cabinetWorkingDays.includes(value)}
                          onCheckedChange={(checked) => {
                            setCabinetWorkingDays((current) => checked
                              ? [...new Set([...current, value])].sort((first, second) => first - second)
                              : current.filter((day) => day !== value));
                          }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {cabinetWorkingDays.length === 0 && (
                    <p role="alert" className="mt-3 text-xs font-medium text-amber-800">
                      Aucun jour n’est ouvert : aucun nouveau rendez-vous actif ne pourra être planifié.
                    </p>
                  )}
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-800" />
                  <p className="text-xs leading-5 text-sky-900">
                    Les horaires d’ouverture et de fermeture définis dans « Cabinet & praticien » sont contrôlés lors de la planification. Les chevauchements avec un rendez-vous actif sont également vérifiés avant l’enregistrement.
                  </p>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                  <BellRing className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-800">Sur cet appareil</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">Rappels de rendez-vous</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Recevez une notification navigateur avant les rendez-vous du jour. Le rappel ne contient aucun nom, motif ni donnée médicale et n’est envoyé à aucun patient.
                  </p>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <Label htmlFor="appointmentReminderMinutes" className="font-semibold text-slate-900">
                        Délai du rappel
                      </Label>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Le réglage est conservé dans ce navigateur pour votre compte.
                      </p>
                      <Select
                        value={String(reminderMinutes)}
                        onValueChange={(value) => setReminderMinutes(Number(value))}
                        disabled={!browserNotificationsSupported}
                      >
                        <SelectTrigger id="appointmentReminderMinutes" className="mt-3 max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 15, 30].map((minutes) => (
                            <SelectItem key={minutes} value={String(minutes)}>
                              {minutes} minutes avant
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void sendTestNotification()}
                        disabled={!browserNotificationsSupported}
                        className="gap-2"
                      >
                        <Bell className="h-4 w-4" />
                        Tester
                      </Button>
                      {browserRemindersEnabled && browserNotificationPermission === "granted" ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={disableReminders}
                          className="gap-2 border-emerald-200 text-emerald-900"
                        >
                          <Check className="h-4 w-4" />
                          Rappels activés
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => void enableReminders()}
                          disabled={!browserNotificationsSupported}
                          className="gap-2 bg-[#155b48] text-white hover:bg-[#104a3b]"
                        >
                          <BellRing className="h-4 w-4" />
                          Activer les rappels
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className={`mt-4 flex items-start gap-3 rounded-xl border p-4 ${
                    !browserNotificationsSupported || browserNotificationPermission === "denied"
                      ? "border-amber-200 bg-amber-50"
                      : browserRemindersEnabled
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-slate-50"
                  }`}>
                    {!browserNotificationsSupported || browserNotificationPermission === "denied"
                      ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
                      : browserRemindersEnabled
                        ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" />
                        : <Bell className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />}
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        {!browserNotificationsSupported
                          ? "Notifications indisponibles dans ce navigateur ou contexte"
                          : browserNotificationPermission === "denied"
                            ? "Autorisation refusée par le navigateur"
                            : browserRemindersEnabled
                              ? "Rappels actifs sur cet appareil"
                              : "Rappels désactivés"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {!browserNotificationsSupported
                          ? "Utilisez un navigateur compatible sur une connexion sécurisée (HTTPS ou localhost)."
                          : browserNotificationPermission === "denied"
                            ? "Modifiez l’autorisation des notifications dans les réglages du navigateur, puis réactivez les rappels ici."
                            : "Ils fonctionnent uniquement quand Shifalyx est ouvert et que votre session est déverrouillée. Il ne s’agit ni de SMS, ni de courriels, ni d’une notification en arrière-plan."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-5">
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800">Protection de session active</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-950">Sécurité du cabinet</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      L’accès à l’application est géré par des comptes d’équipe protégés par PIN. L’authentification à deux facteurs et les mots de passe ne sont pas proposés par le mécanisme de connexion actuel.
                    </p>
                  </div>
                </div>
                <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="flex items-center gap-3">
                      <LockKeyhole className="h-4 w-4 text-teal-800" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Verrouillage automatique</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          La session se verrouille après {Math.round(getSessionInactivityTimeoutMs(sessionInactivityTimeoutMinutes) / 60000)} minutes d’inactivité.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sessionInactivityTimeout" className="text-xs text-slate-600">Délai</Label>
                      <Select
                        value={sessionInactivityTimeoutMinutes}
                        onValueChange={setSessionInactivityTimeoutMinutes}
                      >
                        <SelectTrigger id="sessionInactivityTimeout" className="h-9 w-[150px] bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SESSION_INACTIVITY_TIMEOUT_MINUTES_OPTIONS.map((minutes) => (
                            <SelectItem key={minutes} value={String(minutes)}>
                              {minutes} minutes
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="flex items-center gap-3">
                      <KeyRound className="h-4 w-4 text-teal-800" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Codes d’accès de l’équipe</p>
                        <p className="mt-0.5 text-xs text-slate-500">Le médecin peut réinitialiser un PIN depuis la rubrique Équipe.</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-500">{currentUser?.role === "medecin" ? "Gestion disponible" : "Géré par le médecin"}</span>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Verrouiller cette session</p>
                    <p className="mt-0.5 text-xs text-slate-500">Votre écran de saisie sera masqué jusqu’à la prochaine vérification du PIN.</p>
                  </div>
                  <Button variant="outline" onClick={lock} className="gap-2 border-slate-300 bg-white">
                    <LockKeyhole className="h-4 w-4" />
                    Verrouiller maintenant
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sync">
            <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${settingsError ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>
                    {settingsError ? <Database className="h-5 w-5" /> : <Cloud className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">État de la plateforme</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-950">Données & cloud</h2>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">
                      Les données de l’application sont lues et enregistrées par le service cloud configuré. Il n’y a pas de synchronisation manuelle ni de mode hors ligne pilotable depuis cet écran.
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => void refetchSettings()} disabled={settingsRefreshing} className="gap-2">
                  <RotateCcw className={`h-4 w-4 ${settingsRefreshing ? "animate-spin" : ""}`} />
                  Actualiser l’état
                </Button>
              </div>
              <div className={`mt-6 flex items-start gap-3 rounded-xl border p-4 ${settingsError ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
                {settingsError ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />}
                <div>
                  <p className={`text-sm font-semibold ${settingsError ? "text-rose-900" : "text-emerald-900"}`}>
                    {settingsRefreshing ? "Vérification en cours…" : settingsError ? "Connexion aux réglages impossible" : "Lecture des paramètres confirmée"}
                  </p>
                  <p className={`mt-1 text-xs leading-5 ${settingsError ? "text-rose-800" : "text-emerald-800"}`}>
                    {settingsRefreshing
                      ? "L’application vérifie l’accès au service de données."
                      : settingsError
                        ? "Vérifiez votre connexion réseau. Les fonctions de l’application qui nécessitent le cloud peuvent être indisponibles."
                        : "Cette vérification confirme l’accès aux réglages du cabinet uniquement; elle ne constitue pas un rapport de sauvegarde ou de synchronisation de toutes les données."}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                <p className="text-xs leading-5 text-slate-600">
                  Les sauvegardes, la disponibilité et la rétention des données dépendent de la configuration du projet cloud. Consultez son tableau de bord d’administration pour vérifier ces politiques.
                </p>
              </div>
            </Card>
          </TabsContent>
          </div>
          {hasUnsavedChanges && (
            <div className="sticky bottom-20 z-20 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white/95 p-3 shadow-[0_12px_36px_-18px_rgba(15,23,42,0.35)] backdrop-blur md:bottom-3 md:px-5 md:py-4">
              <p className="flex items-center gap-2 text-xs text-slate-600">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Des changements attendent votre validation.
              </p>
              <div className="ml-auto flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={restoreFormFromSettings} disabled={updateSetting.isPending} className="h-10 gap-2 text-slate-600">
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">Annuler</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={updateSetting.isPending || isUploadingLogo || settingsError}
                  className="h-10 gap-2 rounded-xl bg-[#155b48] px-4 text-white hover:bg-[#104a3b]"
                >
                  {updateSetting.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {updateSetting.isPending ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </div>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Parametres;
