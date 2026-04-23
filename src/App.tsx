import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { AuthModal } from "@/components/AuthModal";
import Index from "./pages/Index";
import TestIndex from "./pages/TestIndex";
import AuthCallback from "./pages/AuthCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import ExportPdfRender from "./pages/ExportPdfRender";

import BillingPage from "./pages/billing/BillingPage";
import BillingSuccessPage from "./pages/billing/BillingSuccessPage";
import BillingCanceledPage from "./pages/billing/BillingCanceledPage";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { AppVersionStamp } from "@/components/system/AppVersionStamp";

const queryClient = new QueryClient();

type RequireAuthProps = {
  children: JSX.Element;
};

const RequireAuth = ({ children }: RequireAuthProps) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppContent = () => {
  const location = useLocation();
  const { isAuthModalOpen, closeAuthModal } = useAuthModalStore();
  const isExportRenderRoute = location.pathname === "/export/pdf/render";

  if (isExportRenderRoute) {
    return (
      <Routes>
        <Route path="/export/pdf/render" element={<ExportPdfRender />} />
      </Routes>
    );
  }

  return (
    <>
      <Toaster />
      <Sonner />
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/test" element={<TestIndex />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/export/pdf/render" element={<ExportPdfRender />} />

        {/* Billing routes */}
        <Route
          path="/billing"
          element={
            <RequireAuth>
              <BillingPage />
            </RequireAuth>
          }
        />
        <Route
          path="/billing/success"
          element={
            <RequireAuth>
              <BillingSuccessPage />
            </RequireAuth>
          }
        />
        <Route
          path="/billing/canceled"
          element={
            <RequireAuth>
              <BillingCanceledPage />
            </RequireAuth>
          }
        />

        {/* Catch-all MUST be last */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <AppVersionStamp />
    </>
  );
};

const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
