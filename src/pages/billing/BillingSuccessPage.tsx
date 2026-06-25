import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/layout/AppHeader";
import { getGlassmorphismStyles, getColor } from "@/styles/glassmorphism-styles";
import { APP_HOME } from "@/config/routes";

function hasStripeReturnParams(searchParams: URLSearchParams): boolean {
  return (
    searchParams.has("session_id") ||
    searchParams.has("checkout") ||
    searchParams.has("portal")
  );
}

const REDIRECT_DELAY_MS = 2000;

export default function BillingSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isStripeReturn = hasStripeReturnParams(searchParams);

  useEffect(() => {
    if (!isStripeReturn) return;
    const t = setTimeout(() => navigate("/billing"), REDIRECT_DELAY_MS);
    return () => clearTimeout(t);
  }, [isStripeReturn, navigate]);

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ position: "relative", zIndex: 2 }}
    >
      <AppHeader logoClickable />

      <div className="flex-1 max-w-xl mx-auto px-6 py-8 w-full">
        <button
          type="button"
          onClick={() => navigate(APP_HOME)}
          className="flex items-center gap-2 mb-6 text-sm font-medium transition-colors hover:opacity-90"
          style={{ color: getColor("text", "secondary") }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </button>

        <div
          className="p-8 rounded-lg space-y-6"
          style={getGlassmorphismStyles("content")}
        >
          <div>
            <h1
              className="text-2xl font-semibold mb-1"
              style={{ color: getColor("text", "primary") }}
            >
              Payment successful
            </h1>
            <p
              className="text-sm"
              style={{ color: getColor("text", "secondary") }}
            >
              You're account is now Pro.
              {isStripeReturn && " Redirecting to billing…"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => navigate("/billing")}
              style={getGlassmorphismStyles("buttonAccent")}
            >
              Continue
            </Button>
            <Button
              onClick={() => navigate(APP_HOME)}
              style={getGlassmorphismStyles("button")}
            >
              Back to App
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
