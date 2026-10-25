import { useLayoutEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PwaStatus } from "@/components/PwaStatus";
import { AppointmentReminderProvider } from "@/contexts/AppointmentReminderContext";
import Index from "./pages/Index";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import Agenda from "./pages/Agenda";
import FileAttente from "./pages/FileAttente";
import FollowUps from "./pages/FollowUps";
import Consultation from "./pages/Consultation";
import Comptabilite from "./pages/Comptabilite";
import Statistiques from "./pages/Statistiques";
import Parametres from "./pages/Parametres";
import PrescriptionTemplates from "./pages/PrescriptionTemplates";
import MedicalActTemplates from "./pages/MedicalActTemplates";
import Login from "./pages/Login";
import SharedPrescription from "./pages/SharedPrescription";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const routeScrollPositions = new Map<string, number>();

const ScrollToTop = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollKey = `shifalyx:scroll:${location.pathname}${location.search}`;

  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    const shouldRestore = navigationType === "POP" || location.state?.restoreScroll === true;
    const savedPosition = shouldRestore ? routeScrollPositions.get(scrollKey) ?? 0 : 0;
    window.scrollTo(0, Number.isFinite(savedPosition) ? savedPosition : 0);

    return () => {
      routeScrollPositions.set(scrollKey, window.scrollY);
    };
  }, [location.key, location.pathname, location.search, location.state, navigationType, scrollKey]);

  return null;
};

const AppRoutes = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
          <Route path="/login" element={<div className="app-route-enter"><Login /></div>} />
          <Route path="/partage-ordonnance/:token" element={<SharedPrescription />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
          <Route path="/file-attente" element={<ProtectedRoute><FileAttente /></ProtectedRoute>} />
          <Route path="/suivis" element={<ProtectedRoute requiredRoles={['medecin', 'secretaire', 'assistant']}><FollowUps /></ProtectedRoute>} />
          <Route path="/consultations/:queueId" element={<ProtectedRoute requiredRoles={['medecin']}><Consultation /></ProtectedRoute>} />
          <Route path="/patients" element={<ProtectedRoute requiredRoles={['medecin']}><Patients /></ProtectedRoute>} />
          <Route path="/patients/:id" element={<ProtectedRoute requiredRoles={['medecin']}><PatientDetail /></ProtectedRoute>} />
          <Route path="/comptabilite" element={<ProtectedRoute requiredRoles={['medecin', 'secretaire', 'assistant']}><Comptabilite /></ProtectedRoute>} />
          <Route path="/statistiques" element={<ProtectedRoute requiredRoles={['medecin']}><Statistiques /></ProtectedRoute>} />
          <Route path="/parametres" element={<ProtectedRoute requiredRoles={['medecin']}><Parametres /></ProtectedRoute>} />
          <Route path="/modeles-prescription" element={<ProtectedRoute requiredRoles={['medecin']}><PrescriptionTemplates /></ProtectedRoute>} />
          <Route path="/actes-medicaux" element={<ProtectedRoute requiredRoles={['medecin']}><MedicalActTemplates /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PwaStatus />
      <BrowserRouter>
        <AuthProvider>
          <AppointmentReminderProvider>
            <AppRoutes />
          </AppointmentReminderProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;