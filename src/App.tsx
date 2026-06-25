import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { AuthModal } from "@/components/AuthModal";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import TestIndex from "./pages/TestIndex";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import ExportPdfRender from "./pages/ExportPdfRender";

import BillingPage from "./pages/billing/BillingPage";
import BillingSuccessPage from "./pages/billing/BillingSuccessPage";
import BillingCanceledPage from "./pages/billing/BillingCanceledPage";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { AppFooterLinks } from "@/components/system/AppFooterLinks";
import {
  APP_HOME,
  AUTH_CALLBACK,
  BILLING,
  BILLING_CANCELED,
  BILLING_SUCCESS,
  EXPORT_PDF_RENDER,
  MARKETING_HOME,
  PRIVACY,
  RESET_PASSWORD,
  TERMS,
} from "@/config/routes";

const queryClient = new QueryClient();

type RequireAuthProps = {
  children: JSX.Element;
};

const RequireAuth = ({ children }: RequireAuthProps) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to={APP_HOME} replace />;
  }

  return children;
};

const AppContent = () => {
  const location = useLocation();
  const { isAuthModalOpen, closeAuthModal } = useAuthModalStore();
  const isExportRenderRoute = location.pathname === EXPORT_PDF_RENDER;

  if (isExportRenderRoute) {
    return (
      <Routes>
        <Route path={EXPORT_PDF_RENDER} element={<ExportPdfRender />} />
      </Routes>
    );
  }

  return (
    <>
      <Toaster />
      <Sonner />
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <Routes>
        <Route path={MARKETING_HOME} element={<LandingPage />} />
        <Route path={APP_HOME} element={<Index />} />
        <Route path="/test" element={<TestIndex />} />
        <Route path={AUTH_CALLBACK} element={<AuthCallback />} />
        <Route path={RESET_PASSWORD} element={<ResetPassword />} />
        <Route path={PRIVACY} element={<PrivacyPolicy />} />
        <Route path={TERMS} element={<TermsOfService />} />
        <Route path={EXPORT_PDF_RENDER} element={<ExportPdfRender />} />

        {/* Billing routes */}
        <Route
          path={BILLING}
          element={
            <RequireAuth>
              <BillingPage />
            </RequireAuth>
          }
        />
        <Route
          path={BILLING_SUCCESS}
          element={
            <RequireAuth>
              <BillingSuccessPage />
            </RequireAuth>
          }
        />
        <Route
          path={BILLING_CANCELED}
          element={
            <RequireAuth>
              <BillingCanceledPage />
            </RequireAuth>
          }
        />

        {/* Catch-all MUST be last */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <AppFooterLinks />
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
