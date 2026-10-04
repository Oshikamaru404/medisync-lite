import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import Agenda from "./pages/Agenda";
import FileAttente from "./pages/FileAttente";
import Consultation from "./pages/Consultation";
import Comptabilite from "./pages/Comptabilite";
import Statistiques from "./pages/Statistiques";
import Parametres from "./pages/Parametres";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
            <Route path="/file-attente" element={<ProtectedRoute><FileAttente /></ProtectedRoute>} />
            <Route path="/consultations/:queueId" element={<ProtectedRoute requiredRoles={['medecin']}><Consultation /></ProtectedRoute>} />
            <Route path="/patients" element={<ProtectedRoute requiredRoles={['medecin']}><Patients /></ProtectedRoute>} />
            <Route path="/patients/:id" element={<ProtectedRoute requiredRoles={['medecin']}><PatientDetail /></ProtectedRoute>} />
            <Route path="/comptabilite" element={<ProtectedRoute requiredRoles={['medecin', 'secretaire', 'assistant']}><Comptabilite /></ProtectedRoute>} />
            <Route path="/statistiques" element={<ProtectedRoute requiredRoles={['medecin']}><Statistiques /></ProtectedRoute>} />
            <Route path="/parametres" element={<ProtectedRoute requiredRoles={['medecin']}><Parametres /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;