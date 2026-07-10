import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import Stripe from "npm:stripe@17.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { resolveSubscriptionChange } from "./subscriptionPlans.ts";

const ALLOWED_ORIGINS = new Set<string>([
  "https://www.storyboardflow.com",
  "https://storyboardflow.com",
  "http://localhost:8080",
  "http://localhost:3000",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else {
    headers["Access-Control-Allow-Origin"] = "null";
  }
  return headers;
}

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");

if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
if (!SERVICE_ROLE_KEY) throw new Error("Missing SERVICE_ROLE_KEY");

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

type ChangeResult = {
  success: true;
  effective: "immediate" | "period_end";
  planId: string;
  effectiveAt: string;
  status: string;
};

function toIsoFromUnix(seconds: number | null | undefined): string {
  return seconds ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
}

function getScheduleId(subscription: Stripe.Subscription): string | null {
  const schedule = subscription.schedule;
  if (!schedule) return null;
  return typeof schedule === "string" ? schedule : schedule.id;
}

async function releaseExistingSchedule(subscription: Stripe.Subscription): Promise<Stripe.Subscription> {
  const scheduleId = getScheduleId(subscription);
  if (!scheduleId) return subscription;

  await stripe.subscriptionSchedules.release(scheduleId);
  return stripe.subscriptions.retrieve(subscription.id);
}

/** Monthly → annual: update existing item, invoice proration immediately. */
async function applyImmediateUpgrade(
  subscription: Stripe.Subscription,
  subscriptionItemId: string,
  targetStripePriceId: string,
  targetPlanId: string
): Promise<ChangeResult> {
  const activeSub = await releaseExistingSchedule(subscription);

  const updated = await stripe.subscriptions.update(activeSub.id, {
    items: [{ id: subscriptionItemId, price: targetStripePriceId }],
    proration_behavior: "always_invoice",
  });

  return {
    success: true,
    effective: "immediate",
    planId: targetPlanId,
    effectiveAt: new Date().toISOString(),
    status: updated.status,
  };
}

/** Annual → monthly: schedule monthly price at current period end (no immediate refund). */
async function scheduleDowngradeAtPeriodEnd(
  subscription: Stripe.Subscription,
  currentStripePriceId: string,
  targetStripePriceId: string,
  targetPlanId: string
): Promise<ChangeResult> {
  const periodEnd = subscription.current_period_end;
  if (!periodEnd) {
    throw new Error("Subscription is missing current_period_end");
  }

  let scheduleId = getScheduleId(subscription);
  if (!scheduleId) {
    const created = await stripe.subscriptionSchedules.create({
      from_subscription: subscription.id,
    });
    scheduleId = created.id;
  }

  const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
  const phaseStart = schedule.phases[0]?.start_date ?? subscription.current_period_start;

  await stripe.subscriptionSchedules.update(scheduleId, {
    end_behavior: "release",
    phases: [
      {
        items: [{ price: currentStripePriceId, quantity: 1 }],
        start_date: phaseStart,
        end_date: periodEnd,
      },
      {
        items: [{ price: targetStripePriceId, quantity: 1 }],
        start_date: periodEnd,
      },
    ],
  });

  const refreshed = await stripe.subscriptions.retrieve(subscription.id);

  return {
    success: true,
    effective: "period_end",
    planId: targetPlanId,
    effectiveAt: toIsoFromUnix(periodEnd),
    status: refreshed.status,
  };
}

Deno.serve(async (req) => {
  const ch = corsHeaders(req);

  if (req.method === "OPTIONS") return new Response("ok", { headers: ch });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const jwt = authHeader.replace(/^Bearer\s+/i, "");

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: authHeader, apikey: SUPABASE_ANON_KEY } },
    });

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid user session" }), {
        status: 401,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    if (body?.priceId !== undefined) {
      return new Response(JSON.stringify({ error: "priceId is not accepted; use planId" }), {
        status: 400,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: billingRow, error: billingReadError } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("stripe_subscription_id, price_id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (billingReadError) {
      console.error("billing_subscriptions read error:", billingReadError);
      return new Response(JSON.stringify({ error: "Failed to look up billing" }), {
        status: 500,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    if (!billingRow?.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: "No active subscription found" }), {
        status: 400,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    if (billingRow.status !== "active" && billingRow.status !== "trialing") {
      return new Response(JSON.stringify({ error: "Subscription is not active" }), {
        status: 400,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const change = resolveSubscriptionChange(billingRow.price_id, body?.planId);
    if (!change.ok) {
      return new Response(JSON.stringify({ error: change.error }), {
        status: 400,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const subscription = await stripe.subscriptions.retrieve(billingRow.stripe_subscription_id);
    const subscriptionItem = subscription.items.data[0];
    if (!subscriptionItem?.id) {
      return new Response(JSON.stringify({ error: "Subscription has no items" }), {
        status: 400,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    if (subscription.items.data.length > 1) {
      console.warn(
        "change-subscription: multiple subscription items; updating first item only",
        subscription.id
      );
    }

    const currentStripePriceId =
      typeof subscriptionItem.price === "string"
        ? subscriptionItem.price
        : subscriptionItem.price.id;

    let result: ChangeResult;
    if (change.direction === "monthly_to_annual") {
      result = await applyImmediateUpgrade(
        subscription,
        subscriptionItem.id,
        change.stripePriceId,
        change.targetPlanId
      );
    } else {
      result = await scheduleDowngradeAtPeriodEnd(
        subscription,
        currentStripePriceId,
        change.stripePriceId,
        change.targetPlanId
      );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...ch, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("change-subscription error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
