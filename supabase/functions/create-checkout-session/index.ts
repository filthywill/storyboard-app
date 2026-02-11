import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import Stripe from "npm:stripe@17.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// CORS
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

// Env
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:8080";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// IMPORTANT: don't use SUPABASE_* here (CLI blocks it). Use SERVICE_ROLE_KEY.
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");

if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
if (!SERVICE_ROLE_KEY) throw new Error("Missing SERVICE_ROLE_KEY");

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

Deno.serve(async (req) => {
  const ch = corsHeaders(req);

  // Preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: ch });

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: ch });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const jwt = authHeader.replace(/^Bearer\s+/i, "");

    // Client used only to validate the user JWT
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: authHeader, apikey: SUPABASE_ANON_KEY } },
    });

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid user session", details: userError?.message }), {
        status: 401,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    // Parse request
    const body = await req.json().catch(() => ({}));
    const priceId = body?.priceId;
    if (!priceId || typeof priceId !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid priceId" }), {
        status: 400,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    // Admin client to read/write billing_subscriptions (bypasses RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // 1) Try DB mapping first
    const { data: billingRow, error: billingReadError } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (billingReadError) console.error("billing_subscriptions read error:", billingReadError);

    let customerId = billingRow?.stripe_customer_id ?? null;

    // 2) If not found, try Stripe lookup by email
    if (!customerId && user.email) {
      const existing = await stripe.customers.list({ email: user.email, limit: 10 });
      const match =
        existing.data.find((c) => c.metadata?.supabase_user_id === user.id) ??
        existing.data[0] ??
        null;

      customerId = match?.id ?? null;
    }

    // 3) If still not found, create Stripe customer
    if (!customerId) {
      const created = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = created.id;
    } else {
      // Best-effort: ensure metadata
      try {
        await stripe.customers.update(customerId, { metadata: { supabase_user_id: user.id } });
      } catch (e) {
        console.warn("Could not update Stripe customer metadata:", e);
      }
    }

    // 4) Persist mapping in DB (THIS is the missing part you don't have right now)
    const { error: upsertError } = await supabaseAdmin
      .from("billing_subscriptions")
      .upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("billing_subscriptions upsert error:", upsertError);
      // don't block checkout if DB write fails
    }

    // 5) Create Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${SITE_URL}/billing/success`,
      cancel_url: `${SITE_URL}/billing/canceled`,
      client_reference_id: user.id,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...ch, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
