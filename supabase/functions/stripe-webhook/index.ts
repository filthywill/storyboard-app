import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import Stripe from "npm:stripe@17.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY"); // <-- same key name you set earlier
const EMAIL_PROVIDER_API_KEY = Deno.env.get("EMAIL_PROVIDER_API_KEY");
const EMAIL_FROM_ADDRESS = Deno.env.get("EMAIL_FROM_ADDRESS");
const SITE_URL = Deno.env.get("SITE_URL");

if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
if (!STRIPE_WEBHOOK_SECRET) throw new Error("Missing STRIPE_WEBHOOK_SECRET");
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SERVICE_ROLE_KEY) throw new Error("Missing SERVICE_ROLE_KEY");

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing stripe-signature", { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }
  

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        if (!customerId || !subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["items.data.price"],
        });

        await upsertFromSubscription(sub, customerId);
        break;
      }

      case "customer.subscription.created":
case "customer.subscription.updated":
case "customer.subscription.deleted": {
  const subLite = event.data.object as Stripe.Subscription;
  const customerId =
    typeof subLite.customer === "string" ? subLite.customer : subLite.customer?.id;
  if (!customerId) break;

  // Always fetch the canonical subscription from Stripe
  const sub = await stripe.subscriptions.retrieve(subLite.id, {
    expand: ["items.data.price"],
  });

  await upsertFromSubscription(sub, customerId);
  break;
}

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionReference = resolveInvoiceSubscriptionReference(invoice);
        if (
          event.type !== "invoice.paid" ||
          invoice.billing_reason !== "subscription_create"
        ) {
          logInitialPaidInvoiceSkip(event.id, invoice, subscriptionReference, "invoice_not_subscription_create");
          break;
        }

        if (invoice.status !== "paid") {
          logInitialPaidInvoiceSkip(event.id, invoice, subscriptionReference, "invoice_not_paid");
          break;
        }

        const subscriptionId = subscriptionReference.subscriptionId;
        if (!subscriptionId) {
          logInitialPaidInvoiceSkip(
            event.id,
            invoice,
            subscriptionReference,
            subscriptionReference.isAmbiguous
              ? "subscription_reference_ambiguous"
              : "subscription_reference_missing"
          );
          break;
        }

        await syncInitialPaidSubscription(invoice, subscriptionId, event.id, subscriptionReference);
        break;
      }


      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Webhook handler failed", { status: 500 });
  }
});

async function upsertFromSubscription(sub: Stripe.Subscription, customerId: string) {
  // Find user_id by customer mapping
  const { data: row, error } = await supabaseAdmin
    .from("billing_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    console.error("billing_subscriptions lookup error:", error);
    return;
  }

  const userId =
    row?.user_id ??
    (sub.metadata?.supabase_user_id as string | undefined) ??
    undefined;

  if (!userId) {
    console.warn("No userId for customer:", customerId);
    return;
  }

  const priceId = sub.items.data?.[0]?.price?.id ?? null;

  const { error: upsertError } = await supabaseAdmin.from("billing_subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      price_id: priceId,
      status: sub.status,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertError) console.error("billing_subscriptions upsert error:", upsertError);
}

function getStripeObjectId(
  value: unknown
): string | null {
  const id =
    typeof value === "string"
      ? value
      : typeof value === "object" && value !== null && "id" in value
        ? value.id
        : null;
  return typeof id === "string" && id.trim() !== "" ? id : null;
}

type InvoiceSubscriptionReference = {
  subscriptionId: string | null;
  parentType: string | null;
  isAmbiguous: boolean;
};

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function resolveInvoiceSubscriptionReference(invoice: Stripe.Invoice): InvoiceSubscriptionReference {
  const invoiceRecord = invoice as unknown as Record<string, unknown>;
  const parent = getRecord(invoiceRecord.parent);
  const parentType = typeof parent?.type === "string" ? parent.type : null;

  if (parentType === "subscription_details") {
    const subscriptionId = getStripeObjectId(
      getRecord(parent?.subscription_details)?.subscription
    );
    if (subscriptionId) return { subscriptionId, parentType, isAmbiguous: false };
  }

  // Older invoice payloads exposed this field at the top level.
  const legacySubscriptionId = getStripeObjectId(invoiceRecord.subscription);
  if (legacySubscriptionId) {
    return { subscriptionId: legacySubscriptionId, parentType, isAmbiguous: false };
  }

  const lines = getRecord(invoiceRecord.lines);
  const subscriptionLines = Array.isArray(lines?.data)
    ? lines.data.filter((line): line is Record<string, unknown> => {
      const lineParent = getRecord(getRecord(line)?.parent);
      return lineParent?.type === "subscription_item_details";
    })
    : [];

  if (subscriptionLines.length !== 1) {
    return {
      subscriptionId: null,
      parentType,
      isAmbiguous: subscriptionLines.length > 1,
    };
  }

  const subscriptionItemDetails = getRecord(
    getRecord(getRecord(subscriptionLines[0])?.parent)?.subscription_item_details
  );

  return {
    subscriptionId: getStripeObjectId(subscriptionItemDetails?.subscription),
    parentType,
    isAmbiguous: false,
  };
}

function logInitialPaidInvoiceSkip(
  eventId: string,
  invoice: Stripe.Invoice,
  subscriptionReference: InvoiceSubscriptionReference,
  skipReason:
    | "invoice_not_subscription_create"
    | "invoice_not_paid"
    | "subscription_reference_missing"
    | "subscription_reference_ambiguous"
    | "subscription_not_active"
    | "subscription_price_ambiguous"
    | "user_mapping_missing"
) {
  console.warn("Initial paid subscription invoice skipped", {
    eventId,
    invoiceId: invoice.id,
    billingReason: invoice.billing_reason,
    invoiceStatus: invoice.status,
    parentType: subscriptionReference.parentType,
    subscriptionReferenceFound: Boolean(subscriptionReference.subscriptionId),
    skipReason,
  });
}

function getSupabaseUserId(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const userId = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    ? userId
    : null;
}

async function resolveUserIdForInitialPaidSubscription(
  sub: Stripe.Subscription,
  customerId: string
): Promise<string | null> {
  const subscriptionUserId = getSupabaseUserId(sub.metadata?.supabase_user_id);
  if (subscriptionUserId) return subscriptionUserId;

  let customer: Stripe.Customer | Stripe.DeletedCustomer;
  try {
    customer = await stripe.customers.retrieve(customerId);
  } catch {
    throw new Error("Failed to retrieve Stripe customer for initial paid subscription");
  }

  if (!("deleted" in customer && customer.deleted)) {
    const customerUserId = getSupabaseUserId(customer.metadata?.supabase_user_id);
    if (customerUserId) return customerUserId;
  }

  const { data: billingRow, error: billingLookupError } = await supabaseAdmin
    .from("billing_subscriptions")
    .select("user_id, stripe_customer_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (billingLookupError) {
    throw new Error("Failed to resolve billing mapping for initial paid subscription");
  }

  if (billingRow?.stripe_customer_id !== customerId) return null;
  return getSupabaseUserId(billingRow?.user_id);
}

async function syncInitialPaidSubscription(
  invoice: Stripe.Invoice,
  subscriptionId: string,
  eventId: string,
  subscriptionReference: InvoiceSubscriptionReference
) {
  let sub: Stripe.Subscription;
  try {
    sub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });
  } catch {
    console.error("Initial paid subscription retrieval failed", {
      eventId,
      invoiceId: invoice.id,
      subscriptionId,
    });
    throw new Error("Failed to retrieve canonical subscription");
  }

  const customerId = getStripeObjectId(sub.customer);
  const price = sub.items.data.length === 1 ? sub.items.data[0]?.price : null;
  const priceId = getStripeObjectId(price);

  if (sub.status !== "active") {
    logInitialPaidInvoiceSkip(eventId, invoice, subscriptionReference, "subscription_not_active");
    return;
  }

  if (!priceId) {
    logInitialPaidInvoiceSkip(eventId, invoice, subscriptionReference, "subscription_price_ambiguous");
    return;
  }

  if (!customerId) {
    logInitialPaidInvoiceSkip(eventId, invoice, subscriptionReference, "user_mapping_missing");
    return;
  }

  const userId = await resolveUserIdForInitialPaidSubscription(sub, customerId);
  if (!userId) {
    logInitialPaidInvoiceSkip(eventId, invoice, subscriptionReference, "user_mapping_missing");
    return;
  }

  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
    "sync_billing_subscription_and_enqueue_welcome",
    {
      p_user_id: userId,
      p_stripe_customer_id: customerId,
      p_stripe_subscription_id: sub.id,
      p_price_id: priceId,
      p_status: sub.status,
      p_current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      p_cancel_at_period_end: sub.cancel_at_period_end ?? false,
    }
  );

  const result = Array.isArray(rpcResult) ? rpcResult[0] : null;
  if (rpcError || result?.billing_synchronized !== true) {
    console.error("Initial paid subscription lifecycle RPC failed", {
      eventId,
      invoiceId: invoice.id,
      subscriptionId: sub.id,
      customerId,
      hasRpcError: Boolean(rpcError),
    });
    throw new Error("Failed to synchronize initial paid subscription");
  }

  console.info("Initial paid subscription synchronized", {
    eventId,
    invoiceId: invoice.id,
    subscriptionId: sub.id,
    customerId,
    outboxInserted: result.outbox_inserted === true,
  });

  const outboxId = getSupabaseUserId(result.outbox_id);
  if (result.outbox_inserted === true && outboxId) {
    await deliverWelcomeEmail(outboxId, userId);
  } else if (result.outbox_inserted === true) {
    console.error("New lifecycle-email intent has no usable outbox ID", {
      eventId,
      invoiceId: invoice.id,
      subscriptionId: sub.id,
    });
  }
}

async function deliverWelcomeEmail(outboxId: string, userId: string): Promise<void> {
  const processingStarted = await markOutboxProcessing(outboxId);
  if (!processingStarted) return;

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authError) {
      await updateOutbox(outboxId, {
        status: "retry",
        last_error_code: "recipient_lookup_failed",
      });
      return;
    }

    const recipientEmail = authData.user?.email?.trim();
    if (!recipientEmail) {
      await updateOutbox(outboxId, {
        status: "blocked",
        last_error_code: "recipient_email_missing",
      });
      return;
    }

    const emailConfig = getEmailConfig();
    if (!emailConfig) {
      await updateOutbox(outboxId, {
        status: "retry",
        last_error_code: "email_configuration_missing",
      });
      return;
    }

    const displayName = await getOptionalDisplayName(userId);
    let email: { html: string; text: string };
    try {
      email = buildWelcomeEmail(displayName, emailConfig.siteUrl);
    } catch {
      await updateOutbox(outboxId, {
        status: "retry",
        last_error_code: "email_render_error",
      });
      return;
    }

    let response: Response;
    try {
      response = await fetchResend(emailConfig, outboxId, recipientEmail, email);
    } catch (error) {
      await updateOutbox(outboxId, {
        status: "retry",
        last_error_code: error instanceof Error && error.name === "AbortError"
          ? "provider_timeout"
          : "provider_network_error",
      });
      return;
    }

    const responseBody: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      await updateOutbox(outboxId, {
        status: response.status === 429 || response.status >= 500 ? "retry" : "failed",
        last_error_code: response.status === 429
          ? "provider_rate_limited"
          : response.status >= 500
            ? "provider_server_error"
            : "provider_rejected",
      });
      return;
    }

    const providerMessageId =
      typeof responseBody === "object" &&
      responseBody !== null &&
      "id" in responseBody &&
      typeof responseBody.id === "string"
        ? responseBody.id
        : null;

    if (!providerMessageId) {
      await updateOutbox(outboxId, {
        status: "retry",
        last_error_code: "provider_response_invalid",
      });
      return;
    }

    await updateOutbox(outboxId, {
      status: "sent",
      provider_message_id: providerMessageId,
      sent_at: new Date().toISOString(),
      last_error_code: null,
    });
  } catch {
    console.error("Welcome email delivery path failed", { outboxId });
    await updateOutbox(outboxId, {
      status: "retry",
      last_error_code: "email_delivery_unexpected_error",
    });
  }
}

function getEmailConfig(): {
  apiKey: string;
  fromAddress: string;
  siteUrl: string;
} | null {
  const apiKey = EMAIL_PROVIDER_API_KEY?.trim();
  const fromAddress = EMAIL_FROM_ADDRESS?.trim();
  const rawSiteUrl = SITE_URL?.trim();
  if (!apiKey || !fromAddress || !rawSiteUrl) return null;

  try {
    const siteUrl = new URL(rawSiteUrl);
    if (siteUrl.protocol !== "https:" && siteUrl.protocol !== "http:") return null;

    return {
      apiKey,
      fromAddress,
      siteUrl: siteUrl.toString().replace(/\/+$/, ""),
    };
  } catch {
    return null;
  }
}

async function markOutboxProcessing(outboxId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from("lifecycle_email_outbox")
      .update({
        status: "processing",
        attempts: 1,
        last_error_code: null,
      })
      .eq("id", outboxId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (!error && data?.id) return true;
  } catch {
    // Fall through to the operational diagnostic below.
  }

  console.error("Welcome email outbox could not enter processing", { outboxId });
  return false;
}

async function updateOutbox(
  outboxId: string,
  values: Record<string, string | null>
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("lifecycle_email_outbox")
      .update(values)
      .eq("id", outboxId);

    if (!error) return true;
  } catch {
    // Do not surface email-state persistence failures to Stripe.
  }

  console.error("Welcome email outbox state update failed", { outboxId });
  return false;
}

async function getOptionalDisplayName(userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    return typeof data?.display_name === "string" && data.display_name.trim() !== ""
      ? data.display_name.trim()
      : null;
  } catch {
    return null;
  }
}

function buildWelcomeEmail(
  displayName: string | null,
  siteUrl: string
): { html: string; text: string } {
  const appUrl = `${siteUrl}/app`;
  const billingUrl = `${siteUrl}/billing`;
  const greeting = displayName ? `Hi ${escapeHtml(displayName)},` : "Hi,";

  return {
    text: `${displayName ? `Hi ${displayName},` : "Hi,"}

Welcome to StoryboardFlow Pro. Your Pro subscription is active.

You now have access to multiple cloud projects, unlimited saved storyboard themes, and cloud-backed project access.

Open StoryboardFlow: ${appUrl}
Manage billing: ${billingUrl}`,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f5f5f5;color:#1f2937;font-family:Arial,sans-serif;">
    <main style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px;border-radius:8px;">
      <h1 style="margin:0 0 20px;font-size:24px;line-height:1.25;">Welcome to StoryboardFlow Pro</h1>
      <p style="margin:0 0 16px;line-height:1.5;">${greeting}</p>
      <p style="margin:0 0 16px;line-height:1.5;">Your Pro subscription is active. Thanks for supporting StoryboardFlow.</p>
      <p style="margin:0 0 20px;line-height:1.5;">You now have access to multiple cloud projects, unlimited saved storyboard themes, and cloud-backed project access.</p>
      <p style="margin:0 0 20px;">
        <a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">Open StoryboardFlow</a>
      </p>
      <p style="margin:0;line-height:1.5;">
        <a href="${escapeHtml(billingUrl)}" style="color:#2563eb;">Manage billing</a>
      </p>
    </main>
  </body>
</html>`,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

async function fetchResend(
  config: { apiKey: string; fromAddress: string; siteUrl: string },
  outboxId: string,
  recipientEmail: string,
  email: { html: string; text: string }
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    return await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `lifecycle-email/${outboxId}/welcome_pro`,
      },
      body: JSON.stringify({
        from: config.fromAddress,
        to: [recipientEmail],
        subject: "Welcome to StoryboardFlow Pro",
        html: email.html,
        text: email.text,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
