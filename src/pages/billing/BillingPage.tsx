import { useEffect, useState } from "react";
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

// 3) THIS is your component
export default function BillingPage() {
  // This is the "state" I was referring to
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load billing state once when the page loads
  useEffect(() => {
    fetchBillingStatus().then((data) => {
      setBilling(data);
      setLoading(false);
    });
  }, []);

  // Decide if user is Pro
  const isPro = billing?.status === "active" || billing?.status === "trialing";
  

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

          <Button
            variant="secondary"
            onClick={() => window.open("https://dashboard.stripe.com/test/subscriptions", "_blank")}
          >
            Manage billing (for now)
          </Button>
        </>
      ) : (
        <>
          <p>Unlock Pro features with a monthly or annual subscription.</p>

          <div className="flex gap-3">
            <Button onClick={() => startCheckout(BILLING.proMonthlyPriceId)}>
              Go Pro (Monthly)
            </Button>

            <Button variant="secondary" onClick={() => startCheckout(BILLING.proAnnualPriceId)}>
              Go Pro (Annual)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
