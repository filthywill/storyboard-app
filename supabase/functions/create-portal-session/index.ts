import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import Stripe from "npm:stripe@17.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// CORS (same as create-checkout-session)
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
const SITE_URL = (Deno.env.get("SITE_URL") ?? "http://localhost:8080").replace(/\/+$/, "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");

if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
if (!SERVICE_ROLE_KEY) throw new Error("Missing SERVICE_ROLE_KEY");

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

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
      return new Response(JSON.stringify({ error: "Invalid user session", details: userError?.message }), {
        status: 401,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: billingRow, error: billingReadError } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (billingReadError) {
      console.error("billing_subscriptions read error");
      return new Response(JSON.stringify({ error: "Failed to look up billing" }), {
        status: 500,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const stripeCustomerId = billingRow?.stripe_customer_id ?? null;
    if (!stripeCustomerId) {
      return new Response(
        JSON.stringify({ error: "No billing customer found. Subscribe first to manage billing." }),
        { status: 400, headers: { ...ch, "Content-Type": "application/json" } }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${SITE_URL}/billing`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      status: 200,
      headers: { ...ch, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-portal-session error");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
