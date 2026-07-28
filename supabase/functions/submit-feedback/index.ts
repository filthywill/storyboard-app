import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ALLOWED_ORIGINS = new Set<string>([
  "https://www.storyboardflow.com",
  "https://storyboardflow.com",
  "http://localhost:8080",
  "http://localhost:3000",
]);

const MESSAGE_MAX_LENGTH = 5000;
const REQUEST_MAX_BYTES = 7500;
const EMAIL_MAX_LENGTH = 254;
const USER_AGENT_MAX_LENGTH = 512;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CATEGORIES = new Set(["bug", "improvement", "general"]);
const SUBJECTS: Record<string, string> = {
  bug: "[StoryboardFlow Feedback] Report a problem",
  improvement: "[StoryboardFlow Feedback] Suggest an improvement",
  general: "[StoryboardFlow Feedback] General feedback",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const EMAIL_PROVIDER_API_KEY = Deno.env.get("EMAIL_PROVIDER_API_KEY");
const EMAIL_FROM_ADDRESS = Deno.env.get("EMAIL_FROM_ADDRESS");
const FEEDBACK_TO_ADDRESS = Deno.env.get("FEEDBACK_TO_ADDRESS");

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function isOptionalBoundedString(value: unknown, maxLength: number): value is string | undefined {
  return value === undefined || isBoundedString(value, maxLength);
}

function isOptionalBoundedNumber(value: unknown, max: number): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max);
}

type FeedbackContext = {
  routePath?: string;
  appVersion?: string;
  viewport?: { width: number; height: number };
  isOnline?: boolean;
  workspaceMode?: "local" | "cloud";
  planCategory?: "free" | "pro";
  pageCount?: number;
  shotCount?: number;
  aspectRatio?: string;
  pageSize?: string;
  userAgent?: string;
};

type FeedbackRequest = {
  category: "bug" | "improvement" | "general";
  message: string;
  contactPermission: boolean;
  guestEmail?: string;
  context: FeedbackContext;
};

function parseFeedbackRequest(value: unknown): { ok: true; value: FeedbackRequest } | { ok: false } {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["category", "message", "contactPermission", "guestEmail", "context"]) ||
    !CATEGORIES.has(value.category as string) ||
    typeof value.message !== "string" ||
    typeof value.contactPermission !== "boolean" ||
    !isRecord(value.context) ||
    !hasOnlyKeys(value.context, [
      "routePath",
      "appVersion",
      "viewport",
      "isOnline",
      "workspaceMode",
      "planCategory",
      "pageCount",
      "shotCount",
      "aspectRatio",
      "pageSize",
      "userAgent",
    ])
  ) {
    return { ok: false };
  }

  const message = value.message.trim();
  const guestEmail = value.guestEmail;
  const context = value.context;
  const viewport = context.viewport;
  const validViewport = viewport === undefined ||
    (isRecord(viewport) &&
      hasOnlyKeys(viewport, ["width", "height"]) &&
      isOptionalBoundedNumber(viewport.width, 10000) &&
      isOptionalBoundedNumber(viewport.height, 10000) &&
      typeof viewport.width === "number" &&
      typeof viewport.height === "number");

  if (
    !message ||
    message.length > MESSAGE_MAX_LENGTH ||
    (guestEmail !== undefined && (!isBoundedString(guestEmail, EMAIL_MAX_LENGTH) || !EMAIL_PATTERN.test(guestEmail.trim()))) ||
    !isOptionalBoundedString(context.routePath, 512) ||
    (context.routePath !== undefined && !context.routePath.startsWith("/")) ||
    !isOptionalBoundedString(context.appVersion, 128) ||
    !validViewport ||
    (context.isOnline !== undefined && typeof context.isOnline !== "boolean") ||
    (context.workspaceMode !== undefined && context.workspaceMode !== "local" && context.workspaceMode !== "cloud") ||
    (context.planCategory !== undefined && context.planCategory !== "free" && context.planCategory !== "pro") ||
    !isOptionalBoundedNumber(context.pageCount, 100000) ||
    !isOptionalBoundedNumber(context.shotCount, 100000) ||
    !isOptionalBoundedString(context.aspectRatio, 64) ||
    !isOptionalBoundedString(context.pageSize, 64) ||
    !isOptionalBoundedString(context.userAgent, USER_AGENT_MAX_LENGTH) ||
    (!value.contactPermission && guestEmail !== undefined)
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    value: {
      category: value.category as FeedbackRequest["category"],
      message,
      contactPermission: value.contactPermission,
      guestEmail: guestEmail?.trim(),
      context: context as FeedbackContext,
    },
  };
}

function getEmailConfig(): { apiKey: string; fromAddress: string; toAddress: string } | null {
  const apiKey = EMAIL_PROVIDER_API_KEY?.trim();
  const fromAddress = EMAIL_FROM_ADDRESS?.trim();
  const toAddress = FEEDBACK_TO_ADDRESS?.trim();
  if (!apiKey || !fromAddress || !toAddress || !EMAIL_PATTERN.test(toAddress)) return null;
  return { apiKey, fromAddress, toAddress };
}

async function resolveAuthenticatedUser(authHeader: string | null) {
  if (!authHeader?.match(/^Bearer\s+\S+$/i) || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  return error || !data.user ? null : data.user;
}

function buildEmailText(
  feedback: FeedbackRequest,
  userType: "authenticated" | "guest",
  followUpEmail: string | null,
  receivedAt: string,
): string {
  const context = feedback.context;
  const contextLines = [
    ["Route", context.routePath],
    ["Workspace type", context.workspaceMode],
    ["Plan category", context.planCategory],
    ["App version", context.appVersion],
    ["Browser/client information", context.userAgent],
    ["Viewport", context.viewport ? `${context.viewport.width} × ${context.viewport.height}` : undefined],
    ["Online status", context.isOnline === undefined ? undefined : String(context.isOnline)],
    ["Page count", context.pageCount === undefined ? undefined : String(context.pageCount)],
    ["Shot count", context.shotCount === undefined ? undefined : String(context.shotCount)],
    ["Aspect ratio", context.aspectRatio],
    ["Page size", context.pageSize],
    ["Received timestamp", receivedAt],
  ].filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== "");

  return [
    `Category: ${feedback.category}`,
    `User type: ${userType}`,
    `Contact permitted: ${feedback.contactPermission ? "yes" : "no"}`,
    ...(followUpEmail ? [`Follow-up email: ${followUpEmail}`] : []),
    "",
    "Feedback:",
    feedback.message,
    "",
    "Safe context:",
    ...contextLines.map(([label, value]) => `- ${label}: ${value}`),
  ].join("\n");
}

async function sendWithResend(
  config: { apiKey: string; fromAddress: string; toAddress: string },
  requestId: string,
  feedback: FeedbackRequest,
  userType: "authenticated" | "guest",
  followUpEmail: string | null,
  receivedAt: string,
): Promise<{ ok: true } | { ok: false; statusClass: number; code: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `feedback/${requestId}`,
      },
      body: JSON.stringify({
        from: config.fromAddress,
        to: [config.toAddress],
        subject: SUBJECTS[feedback.category],
        text: buildEmailText(feedback, userType, followUpEmail, receivedAt),
        ...(followUpEmail ? { reply_to: followUpEmail } : {}),
      }),
      signal: controller.signal,
    });
    const data: unknown = await response.json().catch(() => null);
    if (
      response.ok &&
      isRecord(data) &&
      typeof data.id === "string" &&
      data.id.trim() !== ""
    ) {
      return { ok: true };
    }
    return {
      ok: false,
      statusClass: Math.floor(response.status / 100),
      code: response.ok ? "provider_response_invalid" : "provider_rejected",
    };
  } catch (error) {
    return {
      ok: false,
      statusClass: 0,
      code: error instanceof Error && error.name === "AbortError" ? "provider_timeout" : "provider_network_error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, 405, { error: "method_not_allowed" });

  const contentType = req.headers.get("Content-Type") ?? "";
  const contentLength = Number(req.headers.get("Content-Length") ?? "0");
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json(req, 415, { error: "unsupported_media_type" });
  }
  if (!Number.isFinite(contentLength) || contentLength > REQUEST_MAX_BYTES) {
    return json(req, 413, { error: "payload_too_large" });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return json(req, 400, { error: "invalid_request" });
  }
  if (new TextEncoder().encode(rawBody).byteLength > REQUEST_MAX_BYTES) {
    return json(req, 413, { error: "payload_too_large" });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return json(req, 400, { error: "invalid_request" });
  }
  const parsedFeedback = parseFeedbackRequest(parsedBody);
  if (!parsedFeedback.ok) return json(req, 400, { error: "invalid_request" });

  const requestId = crypto.randomUUID();
  const feedback = parsedFeedback.value;
  const user = await resolveAuthenticatedUser(req.headers.get("Authorization"));
  const userType = user ? "authenticated" : "guest";
  const emailConfig = getEmailConfig();
  if (!emailConfig) {
    console.error("Feedback configuration invalid", { requestId });
    return json(req, 500, { error: "feedback_unavailable" });
  }

  if (user && feedback.guestEmail !== undefined) {
    console.warn("Feedback request rejected", {
      requestId,
      userType,
      category: feedback.category,
      contactPermission: feedback.contactPermission,
      code: "authenticated_guest_email_rejected",
      messageLength: feedback.message.length,
    });
    return json(req, 400, { error: "invalid_request" });
  }

  const followUpEmail = feedback.contactPermission
    ? (user?.email?.trim() || feedback.guestEmail || null)
    : null;
  if (feedback.contactPermission && (!followUpEmail || !EMAIL_PATTERN.test(followUpEmail))) {
    return json(req, 400, { error: "invalid_request" });
  }

  const result = await sendWithResend(
    emailConfig,
    requestId,
    feedback,
    userType,
    followUpEmail,
    new Date().toISOString(),
  );
  if (!result.ok) {
    console.error("Feedback delivery failed", {
      requestId,
      userType,
      category: feedback.category,
      contactPermission: feedback.contactPermission,
      providerStatusClass: result.statusClass,
      code: result.code,
      messageLength: feedback.message.length,
    });
    return json(req, result.statusClass === 4 ? 422 : 502, { error: "feedback_delivery_failed" });
  }

  console.info("Feedback delivered", {
    requestId,
    userType,
    category: feedback.category,
    contactPermission: feedback.contactPermission,
    messageLength: feedback.message.length,
  });
  return json(req, 200, { success: true });
});
