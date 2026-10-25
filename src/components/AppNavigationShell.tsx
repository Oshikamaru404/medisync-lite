import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bell,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Command as CommandIcon,
  Copy,
  CreditCard,
  Clock3,
  FilePlus2,
  Home,
  Loader2,
  ListChecks,
  LifeBuoy,
  Menu,
  Power,
  RefreshCw,
  Search,
  Settings2,
  Stethoscope,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useLocation, useNavigate, useNavigationType, useParams } from "react-router-dom";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { UserMenu } from "@/components/auth/UserMenu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { usePatient, usePatientDirectory } from "@/hooks/usePatients";
import { useOperationalAppointmentSummary } from "@/hooks/useAppointments";
import { getQueueDateKey, useQueueActionSummary } from "@/hooks/useQueue";
import { useFollowUpActionSummary } from "@/hooks/useFollowUpTasks";
import { useReceptionPaymentSummary } from "@/hooks/useInvoices";
import { APP_NAVIGATION_EVENT, requestAppNavigation } from "@/lib/appNavigation";
import logo from "@/assets/shifalyx-wordmark.png";
import { cn, formatPatientName } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getHelpContext } from "@/lib/shifalyxAssist";
import { toast } from "sonner";

type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: AppRole[];
  keywords?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const allRoles: AppRole[] = ["medecin", "secretaire", "assistant"];
const doctorRoles: AppRole[] = ["medecin"];
const staffRoles: AppRole[] = ["medecin", "secretaire", "assistant"];

const navigationGroups: NavGroup[] = [
  {
    label: "Ma journée",
    items: [
      { label: "Accueil", path: "/", icon: Home, roles: doctorRoles, keywords: "tableau de bord" },
      { label: "Agenda", path: "/agenda", icon: CalendarDays, roles: allRoles, keywords: "rendez-vous planning" },
      { label: "File d’attente", path: "/file-attente", icon: ListChecks, roles: allRoles, keywords: "patients attente accueil" },
      { label: "Suivis", path: "/suivis", icon: Activity, roles: staffRoles, keywords: "contrôle rappel" },
    ],
  },
  {
    label: "Soins",
    items: [
      { label: "Patients", path: "/patients", icon: UsersRound, roles: doctorRoles, keywords: "dossiers médicaux" },
      { label: "Actes médicaux", path: "/actes-medicaux", icon: Stethoscope, roles: doctorRoles, keywords: "catalogue tarifs" },
      { label: "Modèles d’ordonnance", path: "/modeles-prescription", icon: FilePlus2, roles: doctorRoles, keywords: "prescriptions ordonnance documents" },
    ],
  },
  {
    label: "Pilotage",
    items: [
      { label: "Comptabilité", path: "/comptabilite", icon: CreditCard, roles: staffRoles, keywords: "factures paiements recettes" },
      { label: "Statistiques", path: "/statistiques", icon: BarChart3, roles: doctorRoles, keywords: "activité rapports" },
      { label: "Paramètres", path: "/parametres", icon: Settings2, roles: doctorRoles, keywords: "configuration cabinet" },
    ],
  },
];

const mobilePrimaryByRole: Record<AppRole, string[]> = {
  medecin: ["/", "/file-attente", "/patients", "/agenda"],
  secretaire: ["/file-attente", "/agenda", "/suivis", "/comptabilite"],
  assistant: ["/file-attente", "/agenda", "/suivis", "/comptabilite"],
};

const COLLAPSED_KEY = "shifalyx.navigation.collapsed";
let routeHistory: string[] = [];
let routeHistoryOwner: string | null = null;

const getRouteTitle = (pathname: string) => {
  if (pathname === "/") return "Accueil";
  if (pathname.startsWith("/consultations/")) return "Consultation";
  if (pathname.startsWith("/patients/")) return "Dossier patient";
  return navigationGroups.flatMap((group) => group.items).find((item) =>
    item.path !== "/" && pathname.startsWith(item.path)
  )?.label ?? "Espace de travail";
};

const normalizeHelpSearch = (value: string) =>
  value.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const helpSearchMatches = (content: string, query: string) => {
  const normalizedContent = normalizeHelpSearch(content);
  return normalizeHelpSearch(query).split(/\s+/).filter(Boolean).every((term) => normalizedContent.includes(term));
};
const getCasablancaMinutes = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Casablanca",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Number(parts.find(({ type }) => type === "hour")?.value) * 60
    + Number(parts.find(({ type }) => type === "minute")?.value);
};

const getParentPath = (pathname: string, role: AppRole) => {
  if (pathname.startsWith("/consultations/")) return "/file-attente";
  if (pathname.startsWith("/patients/")) return "/patients";
  if (pathname === "/patients") return "/";
  if (pathname === "/agenda" || pathname === "/suivis") return "/file-attente";
  if (pathname === "/file-attente") return role === "medecin" ? "/" : "/agenda";
  if (pathname === "/comptabilite" && role !== "medecin") return "/file-attente";
  if (pathname === "/actes-medicaux" || pathname === "/modeles-prescription") return "/parametres";
  return "/";
};

const getHistory = (owner: string | null) => {
  if (routeHistoryOwner !== owner) {
    routeHistory = [];
    routeHistoryOwner = owner;
  }
  return routeHistory;
};

const saveHistory = (history: string[], owner: string | null) => {
  routeHistory = history.slice(-40);
  routeHistoryOwner = owner;
};

const isItemActive = (pathname: string, item: NavItem) =>
  item.path === "/"
    ? pathname === "/"
    : pathname.startsWith("/consultations/")
      ? item.path === "/file-attente"
      : pathname === item.path || pathname.startsWith(`${item.path}/`);

const isAllowed = (item: NavItem, role: AppRole) => item.roles.includes(role);

const QuickPatientSearch = ({ query, onSelect }: { query: string; onSelect: (patientId: string) => void }) => {
  const { data: patients = [], isLoading, isError } = usePatientDirectory();
  const matches = patients
    .filter((patient) => `${patient.prenom} ${patient.nom} ${patient.telephone ?? ""} ${patient.cin ?? ""}`.toLocaleLowerCase("fr").includes(query.trim().toLocaleLowerCase("fr")))
    .slice(0, 50);

  return (
    <CommandGroup heading="Dossiers patients">
      {isLoading && query.trim() && <p className="px-3 py-2 text-xs text-slate-500">Recherche dans les dossiers…</p>}
      {isError && <p className="px-3 py-2 text-xs text-rose-700">Les dossiers patients n’ont pas pu être chargés.</p>}
      {!query.trim() && <p className="px-3 py-2 text-xs text-slate-500">Saisissez un nom, téléphone ou CIN pour rechercher un dossier.</p>}
      {query.trim() && matches.map((patient) => (
        <CommandItem
          key={patient.id}
          value={`${patient.prenom} ${patient.nom} ${patient.telephone ?? ""} ${patient.cin ?? ""}`}
          onSelect={() => onSelect(patient.id)}
          className="gap-3"
        >
          <UsersRound className="h-4 w-4 text-teal-700" />
          <span className="min-w-0 flex-1 truncate">{formatPatientName(patient.prenom, patient.nom)}</span>
          {patient.telephone && <span className="truncate text-xs text-slate-400">{patient.telephone}</span>}
        </CommandItem>
      ))}
      {query.trim() && matches.length === 50 && <p className="px-3 py-2 text-xs text-slate-500">50 premiers résultats affichés — précisez votre recherche.</p>}
    </CommandGroup>
  );
};

export const AppNavigationShell = ({ children }: { children: ReactNode }) => {
  const { currentUser, hasRole, lock } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const { id: patientId } = useParams<{ id: string }>();
  const { data: patient } = usePatient(patientId);
  const currentPath = `${location.pathname}${location.search}`;
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [quickOpen, setQuickOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpQuery, setHelpQuery] = useState("");
  const [supportDraft, setSupportDraft] = useState("");
  const [supportPrivacyConfirmed, setSupportPrivacyConfirmed] = useState(false);
  const [notificationNow, setNotificationNow] = useState(() => new Date());
  const role = currentUser?.role ?? "medecin";
  const isClinicalRole = role === "medecin";
  const isReceptionRole = role === "secretaire" || role === "assistant";
  const historyOwner = currentUser?.id ?? null;
  const [history, setHistory] = useState<string[]>(() => getHistory(historyOwner));
  const [quickQuery, setQuickQuery] = useState("");
  const notificationDate = getQueueDateKey(notificationNow);
  const {
    data: todayAppointments = [],
    isLoading: appointmentsLoading,
    isError: appointmentsError,
    refetch: refetchAppointments,
  } = useOperationalAppointmentSummary(notificationDate, isReceptionRole);
  const {
    data: todayQueue = [],
    isLoading: queueLoading,
    isError: queueError,
    refetch: refetchQueue,
  } = useQueueActionSummary(notificationDate);
  const {
    data: activeFollowUps = [],
    isLoading: followUpsLoading,
    isError: followUpsError,
    refetch: refetchFollowUps,
  } = useFollowUpActionSummary(isReceptionRole);
  const {
    data: pendingReceptionPayments = [],
    isLoading: paymentsLoading,
    isError: paymentsError,
    refetch: refetchPayments,
  } = useReceptionPaymentSummary(isReceptionRole);
  const pendingAppointments = todayAppointments.filter((appointment) => appointment.statut === "pending");
  const lateAppointments = todayAppointments.filter((appointment) => {
    if (appointment.statut !== "confirmed") return false;
    if (["no_show", "arrived", "cancelled"].includes(appointment.attendance_status ?? "expected")) return false;
    const [hour, minute] = appointment.heure_debut.split(":").map(Number);
    if (getCasablancaMinutes(notificationNow) < hour * 60 + minute + 15) return false;
    const hasRecordedArrival = todayQueue.some((entry) =>
      entry.appointment_id === appointment.id
      || (
        entry.patient_id === appointment.patient_id
        && ["waiting", "in_consultation"].includes(entry.status)
      ),
    );
    return !hasRecordedArrival;
  });
  const waitingPatientsCount = todayQueue.filter((entry) => entry.status === "waiting").length;
  const overdueFollowUpsCount = activeFollowUps.filter((task) => task.due_date && task.due_date < notificationDate).length;
  const operationalActionsCount = waitingPatientsCount
    + (isReceptionRole
      ? pendingAppointments.length + lateAppointments.length + activeFollowUps.length + pendingReceptionPayments.length
      : 0);
  const hasOperationalDataError = appointmentsError
    || queueError
    || (isReceptionRole && (followUpsError || paymentsError));
  const notificationDateLabel = new Intl.DateTimeFormat("fr-MA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Casablanca",
  }).format(notificationNow);
  const helpContent = useMemo(() => getHelpContext(location.pathname), [location.pathname]);
  const normalizedHelpQuery = normalizeHelpSearch(helpQuery);
  const visibleHelpGuides = helpContent.suggestedGuides.filter((guide) =>
    !normalizedHelpQuery || helpSearchMatches([
      guide.title,
      ...guide.steps,
      ...guide.keywords,
    ].join(" "), normalizedHelpQuery),
  );
  const visibleTroubleshooting = helpContent.troubleshooting.filter((item) =>
    !normalizedHelpQuery || helpSearchMatches([
      item.question,
      item.answer,
      ...item.keywords,
    ].join(" "), normalizedHelpQuery),
  );
  const visibleHelpHints = helpContent.contextualSearchHints.filter((hint) =>
    !normalizedHelpQuery || helpSearchMatches(hint, normalizedHelpQuery),
  );
  const visibleGroups = useMemo(
    () => navigationGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => isAllowed(item, role)),
    })).filter((group) => group.items.length > 0),
    [role],
  );
  const allVisibleItems = useMemo(() => visibleGroups.flatMap((group) => group.items), [visibleGroups]);
  const usefulHelpDestinations = helpContent.usefulDestinations
    .map((path) => allVisibleItems.find((item) => item.path === path))
    .filter((item): item is NavItem => !!item && !isItemActive(location.pathname, item));
  const visibleHelpDestinations = usefulHelpDestinations.filter((item) =>
    !normalizedHelpQuery || helpSearchMatches(`${item.label} ${item.keywords ?? ""}`, normalizedHelpQuery),
  );
  const activeItem = allVisibleItems.find((item) => isItemActive(location.pathname, item));
  const parentPath = getParentPath(location.pathname, role);
  const parentItem = allVisibleItems.find((item) => item.path === parentPath);
  const safeHistory = history.filter((path) => {
    const route = new URL(path, window.location.origin).pathname;
    if (route === "/" || route.startsWith("/patients/") || route.startsWith("/consultations/")) {
      return role === "medecin";
    }
    return allVisibleItems.some((item) => isItemActive(route, item));
  });
  const historyBackPath = safeHistory.length > 1 ? safeHistory[safeHistory.length - 2] : null;
  const backPath = historyBackPath ?? parentPath;
  const canGoBack = !!historyBackPath || parentPath !== location.pathname;
  const crumbs = location.pathname.startsWith("/patients/")
    ? [
        { label: "Patients", path: "/patients" },
        { label: patient ? formatPatientName(patient.prenom, patient.nom) : "Dossier patient", path: null },
      ]
    : location.pathname.startsWith("/consultations/")
      ? [
          { label: "File d’attente", path: "/file-attente" },
          { label: "Consultation", path: null },
        ]
      : [
          { label: "Accueil", path: "/" },
          ...(location.pathname !== "/" ? [{ label: activeItem?.label ?? getRouteTitle(location.pathname), path: null }] : []),
        ];

  const goTo = useCallback((path: string, isBack = false) => {
    requestAppNavigation(path, isBack);
  }, []);

  useEffect(() => {
    let nextHistory: string[];
    if (location.state?.appBack === true) {
      const matchIndex = history.lastIndexOf(currentPath);
      nextHistory = matchIndex >= 0 ? history.slice(0, matchIndex + 1) : [currentPath];
    } else if (navigationType === "POP") {
      const matchIndex = history.lastIndexOf(currentPath);
      nextHistory = matchIndex >= 0 ? history.slice(0, matchIndex + 1) : [currentPath];
    } else if (navigationType === "REPLACE") {
      nextHistory = history.length ? [...history.slice(0, -1), currentPath] : [currentPath];
    } else {
      nextHistory = history[history.length - 1] === currentPath ? history : [...history, currentPath];
    }
    if (nextHistory.length !== history.length || nextHistory.some((path, index) => path !== history[index])) {
      saveHistory(nextHistory, historyOwner);
      setHistory(nextHistory);
    }
  }, [currentPath, history, historyOwner, location.state, navigationType]);

  useEffect(() => {
    const handleAppNavigation = (event: Event) => {
      const { to, isBack } = (event as CustomEvent<{ to: string; isBack?: boolean }>).detail;
      if (location.pathname.startsWith("/consultations/")) return;
      if (isBack && Number(window.history.state?.idx) > 0) {
        navigate(-1);
        return;
      }
      navigate(to, { state: { appNavigation: true, appBack: isBack === true, restoreScroll: isBack === true } });
    };
    window.addEventListener(APP_NAVIGATION_EVENT, handleAppNavigation);
    return () => window.removeEventListener(APP_NAVIGATION_EVENT, handleAppNavigation);
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setQuickOpen((open) => {
          if (open) setQuickQuery("");
          return !open;
        });
      }
      if (event.key === "Escape") {
        setMobileMoreOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNotificationNow(new Date());
      if (!document.hidden) {
        if (isReceptionRole) void refetchAppointments();
        void refetchQueue();
        if (isReceptionRole) {
          void refetchFollowUps();
          void refetchPayments();
        }
      }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [isReceptionRole, refetchAppointments, refetchFollowUps, refetchPayments, refetchQueue]);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next));
      } catch (error) {
        console.error("Unable to save navigation preference:", error);
      }
      return next;
    });
  };

  const selectPath = (path: string) => {
    setQuickOpen(false);
    setQuickQuery("");
    setMobileMoreOpen(false);
    if (path !== currentPath) goTo(path);
  };

  const selectPatient = (id: string) => selectPath(`/patients/${id}`);
  const copySupportRequest = async () => {
    if (!supportDraft.trim()) {
      toast.error("Décrivez brièvement le problème avant de préparer la demande.");
      return;
    }
    if (!supportPrivacyConfirmed) {
      toast.error("Confirmez l’absence de données patient avant de copier la demande.");
      return;
    }
    const supportRequest = [
      "Demande d’assistance Shifalyx",
      `Espace : ${helpContent.title}`,
      `Écran : ${helpContent.routePattern}`,
      `Description : ${supportDraft.trim()}`,
      "",
      "Aucune donnée patient ou information médicale ne doit être ajoutée à cette demande.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(supportRequest);
      toast.success("Demande copiée", { description: "Collez-la dans le canal de support habituel du cabinet." });
    } catch (error) {
      console.error("Unable to copy Shifalyx Assist support request:", error);
      toast.error("Copie impossible. Vérifiez les autorisations du navigateur.");
    }
  };

  useEffect(() => {
    setHelpQuery("");
    setSupportDraft("");
    setSupportPrivacyConfirmed(false);
  }, [location.pathname]);

  const mobileItems = (mobilePrimaryByRole[role] ?? mobilePrimaryByRole.medecin)
    .map((path) => allVisibleItems.find((item) => item.path === path))
    .filter((item): item is NavItem => !!item);
  const navItem = (item: NavItem, mobile = false) => {
    const Icon = item.icon;
    const active = isItemActive(location.pathname, item);
    return (
      <button
        key={item.path}
        type="button"
        onClick={() => selectPath(item.path)}
        aria-current={active ? "page" : undefined}
        aria-label={item.label}
        title={collapsed && !mobile ? item.label : undefined}
        className={cn(
          "group flex w-full items-center rounded-xl text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600",
          mobile
            ? "min-h-14 flex-col justify-center gap-1 px-2 text-[10px] font-medium"
            : cn(
                "gap-3 px-3 py-[9px] text-[13px] font-medium",
                collapsed && "justify-center px-2",
                active
                  ? "bg-[#e8f3ee] text-[#145b47] shadow-[inset_3px_0_0_#2f8066]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              ),
          mobile && active ? "text-[#17644e]" : mobile ? "text-slate-500 hover:bg-slate-100" : "",
        )}
      >
        <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-[#28745c]")} />
        <span className={cn("truncate", collapsed && !mobile && "sr-only")}>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="group/app-shell min-h-screen bg-[#f7f9fa]" data-app-navigation-shell data-nav-collapsed={collapsed}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden h-dvh flex-col overflow-hidden border-r border-slate-200/80 bg-white transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-[252px]",
        )}
      >
        <div className={cn("flex h-[68px] shrink-0 items-center border-b border-slate-100 px-4", collapsed ? "justify-center" : "justify-between")}>
          <button type="button" onClick={() => selectPath("/")} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600" aria-label="Aller à l’accueil">
            <img src={collapsed ? "/shifalyx-icon.png" : logo} alt="Shifalyx" className={cn("object-contain", collapsed ? "h-9 w-10" : "h-10 w-[160px]")} />
          </button>
          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-label="Réduire le menu"
              title="Réduire le menu"
            >
              <ChevronLeft className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="mx-auto mt-3 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            aria-label="Développer le menu"
            title="Développer le menu"
          >
            <ChevronRight className="h-[18px] w-[18px]" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setQuickOpen(true)}
          className={cn(
            "mx-3 mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs text-slate-500 transition hover:border-teal-200 hover:bg-teal-50/50",
            collapsed && "justify-center px-2",
          )}
        >
          <CommandIcon className="h-4 w-4 shrink-0" />
          {!collapsed && <><span className="flex-1">Aller à…</span><kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px]">Ctrl K</kbd></>}
        </button>

        <nav aria-label="Navigation principale" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400">{group.label}</p>}
              <div className="space-y-1.5">
                {group.items.map((item) => navItem(item))}
              </div>
              {group.items.some((item) => item.path === "/parametres") && (
                <div className="mt-4 border-t border-slate-100 pt-2.5">
                  <button
                    type="button"
                    onClick={lock}
                    aria-label="Verrouiller la session maintenant"
                    title="Verrouiller la session"
                    className={cn(
                      "group flex w-full items-center rounded-xl border border-transparent text-left text-rose-700 transition-colors hover:border-rose-100 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400",
                      collapsed
                        ? "justify-center px-2 py-2.5"
                        : "gap-3 px-3 py-[9px] text-[13px] font-medium",
                    )}
                  >
                    <Power className="h-[18px] w-[18px] shrink-0 text-rose-600 transition-colors group-hover:text-rose-700" />
                    <span className={cn("truncate", collapsed && "sr-only")}>Verrouiller la session</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className={cn("shrink-0 p-3", collapsed ? "flex justify-center" : "pt-4")}>
          <div className={cn("flex", collapsed ? "justify-center" : "justify-start")}>
            <UserMenu compact={collapsed} />
          </div>
        </div>
      </aside>

      <div className={cn("min-h-screen transition-[margin] duration-200", collapsed ? "lg:ml-16" : "lg:ml-[252px]")}>
        <header data-app-topbar className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/95 py-2 backdrop-blur">
          <div className="mx-auto grid min-h-10 max-w-[1440px] grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-3 gap-y-1.5 px-5 sm:grid-cols-[minmax(0,1fr)_minmax(220px,360px)_minmax(0,1fr)] sm:grid-rows-1 sm:px-8">
            <div className={cn(
              "col-start-1 row-start-1 flex min-w-0 items-center gap-2 text-xs",
              location.pathname === "/" && "pl-2 sm:pl-3",
            )}>
              {canGoBack && <button
                type="button"
                onClick={() => goTo(backPath, !!historyBackPath)}
                aria-label={`Retour à ${historyBackPath ? getRouteTitle(new URL(historyBackPath, window.location.origin).pathname) : parentItem?.label ?? "la rubrique précédente"}`}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Retour</span>
              </button>}
              {canGoBack && <span className="h-4 w-px shrink-0 bg-slate-200" />}
              <nav aria-label="Fil d’Ariane" className="flex min-w-0 items-center gap-1.5">
                {crumbs.map((crumb, index) => (
                  <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                    {index > 0 && <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 text-slate-300" />}
                    {crumb.path ? (
                      <button type="button" onClick={() => goTo(crumb.path!)} className="truncate text-slate-500 transition hover:text-teal-800 hover:underline">
                        {crumb.label}
                      </button>
                    ) : <span aria-current="page" className="truncate font-semibold text-slate-800">{crumb.label}</span>}
                  </span>
                ))}
              </nav>
            </div>

            <button
              type="button"
              onClick={() => setQuickOpen(true)}
              className="col-start-1 row-start-2 inline-flex h-8 w-full items-center justify-start rounded-xl border border-slate-200 bg-white px-2.5 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:col-start-2 sm:row-start-1 sm:h-9 sm:w-full sm:justify-self-stretch sm:gap-2 sm:px-3"
              aria-label="Rechercher un patient, un rendez-vous ou une rubrique"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-left text-xs text-slate-500">Patient, rendez-vous ou rubrique…</span>
              <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline">⌘ K</kbd>
            </button>

            <div className={cn(
              "col-start-2 row-start-1 flex shrink-0 items-center justify-end gap-1 sm:col-start-3 sm:gap-1.5",
              location.pathname === "/" && "mr-2 sm:mr-3",
            )}>
              <Popover
                open={notificationsOpen}
                onOpenChange={(open) => {
                  setNotificationsOpen(open);
                  if (open) {
                    if (isReceptionRole) void refetchAppointments();
                    void refetchQueue();
                    if (isReceptionRole) {
                      void refetchFollowUps();
                      void refetchPayments();
                    }
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={operationalActionsCount > 0 ? `Actions du cabinet, ${operationalActionsCount} à prendre en charge` : "Actions du cabinet"}
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    <Bell className="h-[18px] w-[18px]" />
                    {operationalActionsCount > 0 && (
                      <span className="absolute right-1 top-1 flex h-[13px] min-w-[13px] items-center justify-center rounded-full bg-blue-600 px-0.5 text-[8.5px] font-bold leading-none text-white">
                        {operationalActionsCount > 9 ? "9+" : operationalActionsCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={10} className="w-[min(92vw,390px)] overflow-hidden rounded-2xl border-slate-200 p-0 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {isClinicalRole ? "Actions de soin" : "Actions d’accueil"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {operationalActionsCount > 0
                          ? `${operationalActionsCount} action${operationalActionsCount > 1 ? "s" : ""} à prendre en charge`
                          : "Aucune action en attente"}
                        {" · "}{notificationDateLabel}
                      </p>
                    </div>
                    <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-800">Vue du jour</span>
                  </div>
                  {(appointmentsLoading || queueLoading || (isReceptionRole && (followUpsLoading || paymentsLoading))) && (
                    <div className="flex items-center gap-2 px-4 py-4 text-xs text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />Actualisation des actions…
                    </div>
                  )}
                  {hasOperationalDataError && (
                    <div className="space-y-2 border-b border-amber-100 bg-amber-50/70 px-4 py-3 text-xs text-amber-950" role="alert">
                      <p>Une partie des actions n’a pas pu être actualisée. Les éléments affichés peuvent être incomplets.</p>
                      <button
                        type="button"
                        onClick={() => {
                          if (isReceptionRole) void refetchAppointments();
                          void refetchQueue();
                          if (isReceptionRole) {
                            void refetchFollowUps();
                            void refetchPayments();
                          }
                        }}
                        className="inline-flex items-center gap-1.5 font-medium underline underline-offset-2"
                      >
                        <RefreshCw className="h-3 w-3" />Réessayer
                      </button>
                    </div>
                  )}
                  <div className="max-h-[min(65dvh,520px)] space-y-4 overflow-y-auto p-3">
                    <section>
                      <h3 className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {isClinicalRole ? "File de soins" : "Aujourd’hui"}
                      </h3>
                      <div className="mt-1 space-y-1">
                        {isReceptionRole && pendingAppointments.length > 0 && (
                          <button
                            type="button"
                            onClick={() => { setNotificationsOpen(false); selectPath("/agenda"); }}
                            className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><CalendarDays className="h-4 w-4" /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-semibold text-slate-800">Rendez-vous à confirmer</span>
                              <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{pendingAppointments.length} en attente · ouvrir l’agenda pour les traiter</span>
                            </span>
                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                          </button>
                        )}
                        {isReceptionRole && lateAppointments.length > 0 && (
                          <button
                            type="button"
                            onClick={() => { setNotificationsOpen(false); selectPath("/agenda"); }}
                            className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-amber-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Clock3 className="h-4 w-4" /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-semibold text-slate-800">Arrivée à vérifier</span>
                              <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{lateAppointments.length} rendez-vous sans arrivée enregistrée après 15 min · aucune absence automatique</span>
                            </span>
                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                          </button>
                        )}
                        {waitingPatientsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => { setNotificationsOpen(false); selectPath("/file-attente"); }}
                            className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><ListChecks className="h-4 w-4" /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-semibold text-slate-800">File d’attente</span>
                              <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{waitingPatientsCount} patient{waitingPatientsCount > 1 ? "s" : ""} en attente · consulter la file</span>
                            </span>
                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                          </button>
                        )}
                        {!appointmentsLoading && !queueLoading
                          && !appointmentsError && !queueError
                          && (!isReceptionRole || (pendingAppointments.length === 0 && lateAppointments.length === 0))
                          && waitingPatientsCount === 0 && (
                          <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">Rien à prendre en charge pour le moment.</p>
                        )}
                      </div>
                    </section>

                    {isReceptionRole && (
                    <section>
                      <h3 className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">À organiser</h3>
                      <div className="mt-1">
                        {activeFollowUps.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => { setNotificationsOpen(false); selectPath("/suivis"); }}
                            className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Activity className="h-4 w-4" /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-semibold text-slate-800">Suites de soins à organiser</span>
                              <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
                                {activeFollowUps.length} suivi{activeFollowUps.length > 1 ? "s" : ""} en attente
                                {overdueFollowUpsCount > 0 ? ` · ${overdueFollowUpsCount} échéance${overdueFollowUpsCount > 1 ? "s" : ""} dépassée${overdueFollowUpsCount > 1 ? "s" : ""}` : ""}
                              </span>
                            </span>
                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                          </button>
                        ) : !followUpsLoading && !followUpsError ? (
                          <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">Aucun suivi à organiser.</p>
                        ) : null}
                        {pendingReceptionPayments.length > 0 && (
                          <button
                            type="button"
                            onClick={() => { setNotificationsOpen(false); selectPath("/comptabilite"); }}
                            className="mt-1 flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CreditCard className="h-4 w-4" /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-semibold text-slate-800">Règlements à l’accueil</span>
                              <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{pendingReceptionPayments.length} facture{pendingReceptionPayments.length > 1 ? "s" : ""} à encaisser · ouvrir la comptabilité</span>
                            </span>
                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                          </button>
                        )}
                        {paymentsError && (
                          <p className="px-3 py-2 text-xs text-amber-800" role="status">Le résumé des règlements n’a pas pu être chargé.</p>
                        )}
                      </div>
                    </section>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5">
                    <p className="text-[10px] leading-4 text-slate-500">
                      {isClinicalRole ? "Les actions cliniques suivent l’état de la file." : "Les actions disparaissent une fois traitées dans leur espace."}
                    </p>
                    <button
                      type="button"
                      aria-label="Actualiser les actions du cabinet"
                      onClick={() => {
                        if (isReceptionRole) void refetchAppointments();
                        void refetchQueue();
                        if (isReceptionRole) {
                          void refetchFollowUps();
                          void refetchPayments();
                        }
                      }}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setHelpOpen(true)}
                    aria-label="Ouvrir Shifalyx Assist"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    <CircleHelp className="h-[18px] w-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Centre d’aide</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>
        <main className="min-w-0 pb-20 lg:pb-0">
          <div key={location.pathname} className="app-route-enter">{children}</div>
        </main>
      </div>

      <nav aria-label="Navigation mobile" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-8px_30px_-24px_rgba(15,23,42,0.35)] backdrop-blur lg:hidden">
        {mobileItems.map((item) => navItem(item, true))}
        <button type="button" onClick={() => setMobileMoreOpen(true)} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium text-slate-500 hover:bg-slate-100" aria-label="Afficher toutes les rubriques">
          <Menu className="h-[18px] w-[18px]" />
          Plus
        </button>
      </nav>

      <Sheet open={mobileMoreOpen} onOpenChange={setMobileMoreOpen}>
        <SheetContent side="bottom" className="max-h-[82dvh] rounded-t-3xl px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5">
          <SheetHeader className="mb-4 pr-8 text-left">
            <SheetTitle className="text-[#194d40]">Toutes les rubriques</SheetTitle>
            <SheetDescription>Accédez rapidement aux espaces de travail de votre rôle.</SheetDescription>
          </SheetHeader>
          <button type="button" onClick={() => { setMobileMoreOpen(false); setQuickOpen(true); }} className="mb-4 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <CommandIcon className="h-4 w-4" />Rechercher une rubrique ou un patient
            <kbd className="ml-auto rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
          </button>
          <div className="max-h-[55dvh] space-y-5 overflow-y-auto">
            {visibleGroups.map((group) => (
              <section key={group.label}>
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isItemActive(location.pathname, item);
                    return (
                      <button key={item.path} type="button" onClick={() => selectPath(item.path)} className={cn("flex min-h-14 items-center gap-2 rounded-xl border p-3 text-left text-xs font-medium", active ? "border-teal-200 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}>
                        <Icon className="h-4 w-4 shrink-0" />{item.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs text-slate-500">{currentUser?.prenom} {currentUser?.nom}</span>
            <UserMenu />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={helpOpen} onOpenChange={setHelpOpen}>
        <SheetContent
          side="right"
          closeLabel="Fermer Shifalyx Assist"
          overlayClassName="bg-slate-950/25 motion-reduce:animate-none"
          className="flex h-dvh w-[min(92vw,400px)] flex-col gap-0 overflow-hidden border-l border-slate-200 bg-white p-0 shadow-xl duration-200 data-[state=closed]:duration-200 data-[state=open]:duration-200 motion-reduce:animate-none motion-reduce:transition-none"
        >
          <SheetHeader className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-5 text-left sm:px-6">
            <div className="mb-2 flex items-center gap-2 text-teal-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-100 bg-teal-50">
                <CircleHelp className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide">Shifalyx Assist</span>
            </div>
            <SheetTitle className="pr-8 text-base text-slate-900">{helpContent.title}</SheetTitle>
            <SheetDescription className="text-xs leading-5">{helpContent.description}</SheetDescription>
            <div className="relative mt-2">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={helpQuery}
                onChange={(event) => setHelpQuery(event.target.value)}
                placeholder="Rechercher une aide sur cette page…"
                aria-label="Rechercher dans l’aide contextuelle"
                className="h-10 border-slate-200 pl-9 text-xs focus-visible:ring-teal-600"
              />
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            {helpContent.prerequisites && helpContent.prerequisites.length > 0 && (
              <section className="rounded-lg border border-sky-100 bg-sky-50/60 p-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-sky-900">À savoir</h3>
                <ul className="mt-2 space-y-1.5">
                  {helpContent.prerequisites.map((prerequisite) => (
                    <li key={prerequisite} className="text-xs leading-5 text-sky-950">{prerequisite}</li>
                  ))}
                </ul>
              </section>
            )}

            {visibleHelpGuides.length > 0 && (
              <section>
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <BookOpen className="h-4 w-4 text-teal-700" />Guides pratiques
                </h3>
                <div className="mt-3 space-y-2">
                  {visibleHelpGuides.map((guide) => (
                    <article key={guide.title} className="rounded-lg border border-slate-200 bg-white p-3">
                      <h4 className="text-xs font-semibold text-slate-800">{guide.title}</h4>
                      <ol className="mt-2 space-y-2">
                        {guide.steps.map((step, index) => (
                          <li key={step} className="flex gap-2.5 text-xs leading-5 text-slate-600">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[10px] font-semibold text-teal-800">{index + 1}</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {visibleHelpHints.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Recherches suggérées</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {visibleHelpHints.map((hint) => (
                    <button
                      key={hint}
                      type="button"
                      onClick={() => setHelpQuery(hint)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-[11px] text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {visibleTroubleshooting.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Dépannage</h3>
                <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white px-3">
                  {visibleTroubleshooting.map((item) => (
                    <details key={item.question} className="group py-3">
                      <summary className="cursor-pointer list-none pr-1 text-xs font-medium text-slate-800 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
                        <span className="inline-flex items-center gap-2">
                          <span className="text-teal-700">+</span>{item.question}
                        </span>
                      </summary>
                      <p className="mt-2 pl-4 text-xs leading-5 text-slate-600">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {visibleHelpDestinations.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Accès utiles</h3>
                <div className="mt-2 space-y-1">
                  {visibleHelpDestinations.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => { setHelpOpen(false); selectPath(item.path); }}
                        className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                      >
                        <Icon className="h-4 w-4 text-teal-700" />
                        <span className="flex-1">{item.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {visibleHelpGuides.length === 0
              && visibleTroubleshooting.length === 0
              && visibleHelpHints.length === 0
              && visibleHelpDestinations.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center">
                <p className="text-xs font-medium text-slate-700">Aucun résultat dans l’aide de cette page.</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Essayez un autre terme ou utilisez la recherche globale pour trouver une rubrique.</p>
              </div>
            )}

            <section className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <LifeBuoy className="h-4 w-4 text-teal-700" />Besoin d’une aide humaine ?
              </h3>
              <p className="mt-1 text-[11px] leading-5 text-slate-600">Préparez un résumé à transmettre dans le canal de support habituel du cabinet. N’y ajoutez aucune donnée patient.</p>
              <textarea
                value={supportDraft}
                onChange={(event) => setSupportDraft(event.target.value.slice(0, 500))}
                placeholder="Décrivez le problème, sans nom ni information médicale…"
                aria-label="Description non médicale du problème à transmettre au support"
                rows={3}
                className="mt-2 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              />
              <label className="mt-2 flex cursor-pointer items-start gap-2 text-[11px] leading-4 text-slate-600">
                <input
                  type="checkbox"
                  checked={supportPrivacyConfirmed}
                  onChange={(event) => setSupportPrivacyConfirmed(event.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                />
                <span>J’ai vérifié que la description ne contient aucune donnée patient ni information médicale.</span>
              </label>
              <button
                type="button"
                onClick={() => void copySupportRequest()}
                className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                <Copy className="h-3.5 w-3.5" />Copier la demande
              </button>
            </section>
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-3 sm:px-6">
            <p className="text-[10px] leading-4 text-slate-500">
              La recherche globale ouvre les rubriques accessibles · <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-medium text-slate-700">Ctrl K</kbd> / <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-medium text-slate-700">⌘ K</kbd>
            </p>
            <button
              type="button"
              onClick={() => {
                setQuickQuery(helpQuery.trim());
                setHelpOpen(false);
                setQuickOpen(true);
              }}
              className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-teal-800 px-3 text-xs font-medium text-white transition hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              <Search className="h-4 w-4" />Ouvrir la recherche globale
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <CommandDialog open={quickOpen} onOpenChange={setQuickOpen}>
        <CommandInput value={quickQuery} onValueChange={setQuickQuery} placeholder="Rechercher une rubrique ou un patient…" />
        <CommandList className="max-h-[min(65dvh,520px)]">
          <CommandEmpty>Aucune destination trouvée.</CommandEmpty>
          {visibleGroups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem key={item.path} value={`${item.label} ${item.keywords ?? ""}`} onSelect={() => selectPath(item.path)} className="gap-3">
                    <Icon className="h-4 w-4 text-teal-700" />
                    <span>{item.label}</span>
                    {item.path === location.pathname && <CommandShortcut>Ouvert</CommandShortcut>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
          {hasRole("medecin") && <QuickPatientSearch query={quickQuery} onSelect={selectPatient} />}
        </CommandList>
      </CommandDialog>
    </div>
  );
};
