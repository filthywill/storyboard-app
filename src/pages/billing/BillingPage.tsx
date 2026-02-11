import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BILLING } from "@/config/billing";
import { supabase } from "@/lib/supabase";

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
  const [portalLoading, setPortalLoading] = useState(false);

  const refreshBilling = useCallback(() => {
    setLoading(true);
    fetchBillingStatus().then((data) => {
      setBilling(data);
      setLoading(false);
    });
  }, []);

  // Load billing on mount; if returning from Stripe (params in URL), refresh and clean URL
  useEffect(() => {
    refreshBilling();
    if (hasStripeReturnParams()) {
      clearStripeReturnParams();
    }
  }, [refreshBilling]);

  // Decide if user is Pro (unchanged gating logic)
  const isPro = billing?.status === "active" || billing?.status === "trialing";
  const nonProMessage = !isPro && billing ? getNonProStatusMessage(billing.status) : null;
  

  // This is the "JSX return"
  if (loading) {
    return <div className="mx-auto max-w-xl p-6">Loading billing status…</div>;
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">StoryboardFlow Pro</h1>

      {isPro ? (
        <>
          <p className="text-green-600 font-medium">✅ You’re a Pro subscriber</p>

          {billing?.cancel_at_period_end && (
            <p className="text-sm text-muted-foreground">
              Your subscription is set to cancel at period end
              {billing.current_period_end
                ? ` (${new Date(billing.current_period_end).toLocaleDateString()}).`
                : "."}
            </p>
          )}

          <p className="text-sm text-muted-foreground">
            Status: <span className="font-medium">{billing?.status ?? "unknown"}</span>
          </p>

          <button
            type="button"
            onClick={() => refreshBilling()}
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            Refresh status
          </button>

          <Button
            variant="secondary"
            disabled={portalLoading}
            onClick={() => openPortal(setPortalLoading)}
          >
            {portalLoading ? "Opening…" : "Manage billing"}
          </Button>
        </>
      ) : (
        <>
          {nonProMessage && (
            <p className="text-sm text-muted-foreground" role="status">
              {nonProMessage}
            </p>
          )}

          <p>Unlock Pro features with a monthly or annual subscription.</p>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => startCheckout(BILLING.proMonthlyPriceId)}>
              Go Pro (Monthly)
            </Button>

            <Button variant="secondary" onClick={() => startCheckout(BILLING.proAnnualPriceId)}>
              Go Pro (Annual)
            </Button>

            <button
              type="button"
              onClick={() => refreshBilling()}
              className="text-sm text-muted-foreground underline hover:text-foreground"
            >
              Refresh status
            </button>
          </div>
        </>
      )}
    </div>
  );
}
