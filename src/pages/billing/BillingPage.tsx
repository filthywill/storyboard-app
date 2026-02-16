import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/layout/AppHeader";
import { BILLING } from "@/config/billing";
import { supabase } from "@/lib/supabase";
import { getGlassmorphismStyles, getColor } from "@/styles/glassmorphism-styles";

// 1) Helper: fetch billing row for the currently logged-in user
async function fetchBillingStatus() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("getSession error:", sessionError);
    return null;
  }

  const user = sessionData?.session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select("status, cancel_at_period_end, current_period_end, price_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Billing fetch error:", error);
    return null;
  }

  return data;
}

// Display-only message for non-Pro status (no state transitions)
function getNonProStatusMessage(status: string | undefined): string | null {
  if (!status) return null;
  switch (status) {
    case "canceled":
      return "Your subscription has ended.";
    case "past_due":
    case "unpaid":
      return "Your subscription payment failed. Please resubscribe or update billing.";
    case "incomplete":
    case "incomplete_expired":
      return "Subscription setup incomplete. Please try again.";
    default:
      return `Status: ${status}`;
  }
}

// Check if URL suggests return from Stripe (checkout or portal)
function hasStripeReturnParams(): boolean {
  const params = new URLSearchParams(window.location.search);
  return (
    params.has("session_id") || params.has("checkout") || params.has("portal")
  );
}

// Remove Stripe return params from URL without navigation
function clearStripeReturnParams(): void {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("session_id") && !params.has("checkout") && !params.has("portal"))
    return;
  params.delete("session_id");
  params.delete("checkout");
  params.delete("portal");
  const search = params.toString();
  const url =
    window.location.pathname + (search ? `?${search}` : "") + window.location.hash;
  window.history.replaceState({}, "", url);
}

// 2) Existing: start checkout (now also refresh billing state after returning later)
async function startCheckout(priceId: string) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  console.log("sessionError", sessionError);
  console.log("session", sessionData?.session);

  if (!sessionData?.session) {
    alert("You are not logged in (no Supabase session). Please log in again.");
    return;
  }

  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { priceId },
  });

  console.log("invoke result", { data, error });

  if (error) {
    alert(`Checkout error: ${error.message}`);
    return;
  }

  if (!data?.url) {
    alert("No checkout URL returned");
    return;
  }

  window.location.href = data.url;
}

// 3) Open Stripe Customer Portal (manage payment, cancel, invoices)
// Note: openPortal receives setPortalLoading so the button can be disabled during the request.
async function openPortal(setPortalLoading: (v: boolean) => void) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    alert("You are not logged in. Please log in again.");
    return;
  }

  setPortalLoading(true);
  try {
    const { data, error } = await supabase.functions.invoke("create-portal-session", {});

    if (error) {
      alert(`Could not open billing portal: ${error.message}`);
      return;
    }

    if (!data?.url) {
      alert(typeof data?.error === "string" ? data.error : "No portal URL returned.");
      return;
    }

    window.location.href = data.url;
  } finally {
    setPortalLoading(false);
  }
}

// 4) THIS is your component
export default function BillingPage() {
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"annual" | "monthly">("annual");

  const refreshBilling = useCallback((opts?: { showFullScreen?: boolean }) => {
    const showFullScreen = opts?.showFullScreen ?? false;
    if (showFullScreen) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    fetchBillingStatus().then((data) => {
      setBilling(data);
      if (showFullScreen) setLoading(false);
      else setRefreshing(false);
    });
  }, []);

  // Load billing on mount; if returning from Stripe (params in URL), refresh and clean URL
  useEffect(() => {
    refreshBilling({ showFullScreen: true });
    if (hasStripeReturnParams()) {
      clearStripeReturnParams();
    }
  }, [refreshBilling]);

  // Decide if user is Pro (unchanged gating logic)
  const isPro = billing?.status === "active" || billing?.status === "trialing";
  const nonProMessage = !isPro && billing ? getNonProStatusMessage(billing.status) : null;
  

  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col relative" style={{ position: "relative", zIndex: 2 }}>
        <AppHeader logoClickable />
        <div className="flex-1 max-w-xl mx-auto px-6 py-12 w-full flex flex-col items-center justify-center">
          <p style={{ color: getColor("text", "secondary") }}>Loading billing status…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative" style={{ position: "relative", zIndex: 2 }}>
      <AppHeader logoClickable />

      <div className={`flex-1 mx-auto px-6 py-8 w-full ${isPro ? "max-w-xl" : "max-w-4xl"}`}>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 mb-6 text-sm font-medium transition-colors hover:opacity-90"
          style={{ color: getColor("text", "secondary") }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </button>

        <div className="p-8 rounded-lg space-y-6" style={getGlassmorphismStyles("content")}>
          {isPro ? (
            <>
              <div>
                <h1 className="text-2xl font-semibold mb-1" style={{ color: getColor("text", "primary") }}>
                  PRO Account
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <p className="text-sm" style={{ color: getColor("text", "secondary") }}>
                  Status: <span className="font-medium" style={{ color: getColor("text", "primary") }}>{billing?.status ?? "unknown"}</span>
                </p>
                {isPro && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        disabled={refreshing}
                        onClick={() => refreshBilling({ showFullScreen: false })}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors hover:opacity-80 disabled:opacity-50 disabled:pointer-events-none"
                        style={{ color: getColor("text", "secondary") }}
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh subscription status</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {billing?.current_period_end && (
                <p className="text-sm" style={{ color: getColor("text", "secondary") }}>
                  {billing.cancel_at_period_end
                    ? `Cancels on ${new Date(billing.current_period_end).toLocaleDateString()}`
                    : `Renews on ${new Date(billing.current_period_end).toLocaleDateString()}`}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  disabled={portalLoading}
                  onClick={() => openPortal(setPortalLoading)}
                  style={getGlassmorphismStyles("button")}
                >
                  {portalLoading ? "Opening…" : "Manage billing"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-semibold mb-1" style={{ color: getColor("text", "primary") }}>
                  Upgrade to Pro
                </h1>
              </div>

              {nonProMessage && (
                <p className="text-sm mb-4" role="status" style={{ color: getColor("text", "secondary") }}>
                  {nonProMessage}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Free (current) card */}
                <div
                  className="relative rounded-xl p-6 flex flex-col"
                  style={{
                    ...getGlassmorphismStyles("content"),
                    border: `1px solid ${getColor("interaction", "active")}`,
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                  }}
                >
                  <span
                    className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: "#ffffff",
                      color: getColor("text", "dark"),
                    }}
                  >
                    Basic
                  </span>
                  <h2 className="text-xl font-semibold mt-2 mb-1" style={{ color: getColor("text", "primary") }}>
                    Free
                  </h2>
                  <p className="text-sm mb-4" style={{ color: getColor("text", "secondary") }}>
                    For getting started with storyboards.
                  </p>
                  <p className="text-2xl font-bold mb-4" style={{ color: getColor("text", "primary") }}>
                    $0
                  </p>
                  <p className="text-xs mb-4" style={{ color: getColor("text", "muted") }}>
                    Billed Annually
                  </p>
                  <p className="text-sm font-medium mb-2" style={{ color: getColor("text", "primary") }}>
                    Includes:
                  </p>
                  <ul className="space-y-2 flex-1">
                    {[
                      "One saved storyboard project",
                      "Cloud sync & backup",
                      "Export to PDF",
                      "Basic templates",
                      "Up to 3 pages per project",
                      "Up to 25 shots per project",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm" style={{ color: getColor("text", "secondary") }}>
                        <Check className="h-4 w-4 flex-shrink-0" style={{ color: getColor("status", "successGlow") }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pro card */}
                <div
                  className="relative rounded-xl p-6 flex flex-col"
                  style={{
                    ...getGlassmorphismStyles("content"),
                    border: `1px solid ${getColor("border", "subtle")}`,
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <span
                    className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: getColor("background", "accent"),
                      color: getColor("text", "primary"),
                    }}
                  >
                    Pro
                  </span>
                  <h2 className="text-xl font-semibold mt-2 mb-1" style={{ color: getColor("text", "primary") }}>
                    Professional
                  </h2>
                  <p className="text-sm mb-4" style={{ color: getColor("text", "secondary") }}>
                    Unlock the full power of Storyboard Flow with unlimited pages and priority support.
                  </p>

                  <div className="flex rounded-lg overflow-visible mb-4" style={{ backgroundColor: getColor("input", "background") }}>
                    <button
                      type="button"
                      onClick={() => setBillingInterval("monthly")}
                      className="flex-1 py-3 px-2 flex flex-col items-center gap-0.5 text-sm font-medium transition-colors rounded-l-lg"
                      style={{
                        color: billingInterval === "monthly" ? getColor("text", "primary") : getColor("text", "muted"),
                        backgroundColor: billingInterval === "monthly" ? getColor("button", "secondary") : "transparent",
                      }}
                    >
                      <span>Monthly</span>
                      <span className="text-xs font-normal opacity-90">{BILLING.proMonthlyDisplay}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingInterval("annual")}
                      className="flex-1 py-3 px-2 flex flex-col items-center gap-0.5 text-sm font-medium transition-colors rounded-r-lg"
                      style={{
                        color: billingInterval === "annual" ? getColor("text", "primary") : getColor("text", "muted"),
                        backgroundColor: billingInterval === "annual" ? getColor("button", "secondary") : "transparent",
                      }}
                    >
                      <span>Annual</span>
                      <span className="text-xs font-normal opacity-90">
                        {BILLING.proAnnualMonthlyEquivalent} ({BILLING.proAnnualSavingsLabel})
                      </span>
                    </button>
                  </div>

                  {billingInterval === "annual" ? (
                    <>
                      <p className="text-2xl font-bold mb-0.5" style={{ color: getColor("text", "primary") }}>
                        {BILLING.proAnnualMonthlyEquivalent}{" "}
                        <span className="text-sm font-normal" style={{ color: getColor("text", "muted") }}>
                          ({BILLING.proAnnualSavingsLabel})
                        </span>
                      </p>
                      <p className="text-xs mb-4" style={{ color: getColor("text", "muted") }}>
                        {BILLING.proAnnualBilledLabel}
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold mb-4" style={{ color: getColor("text", "primary") }}>
                      {BILLING.proMonthlyDisplay}
                    </p>
                  )}

                  <p className="text-sm font-medium mb-2" style={{ color: getColor("text", "primary") }}>
                    Free features, plus:
                  </p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {[
                      "Unlimited pages per project",
                      "Priority support",
                      "Advanced export options",
                      "Premium templates",
                      "Team collaboration (coming soon)",
                      "Early access to new features",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm" style={{ color: getColor("text", "secondary") }}>
                        <Check className="h-4 w-4 flex-shrink-0" style={{ color: getColor("status", "successGlow") }} />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() =>
                      startCheckout(billingInterval === "annual" ? BILLING.proAnnualPriceId : BILLING.proMonthlyPriceId)
                    }
                    style={getGlassmorphismStyles("buttonAccent")}
                    className="w-full mt-auto"
                  >
                    Upgrade to Pro
                  </Button>
                </div>
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
}
