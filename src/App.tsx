import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthModal } from "@/components/AuthModal";
import Index from "./pages/Index";
import TestIndex from "./pages/TestIndex";
import AuthCallback from "./pages/AuthCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";

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

const App = () => {
  const { isAuthModalOpen, closeAuthModal } = useAuthModalStore();

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* Global singleton AuthModal (mounted once) */}
        <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/test" element={<TestIndex />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />

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
      </BrowserRouter>
      <AppVersionStamp />
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
