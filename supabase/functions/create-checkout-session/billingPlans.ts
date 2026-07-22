/**
 * Server-side checkout allowlist. Stripe Price IDs must never be sent to the browser.
 * Only the four current prices below are valid checkout / interval-change destinations.
 */
export const CHECKOUT_PLAN_IDS = [
  "pro_monthly",
  "pro_annual",
  "founding_monthly",
  "founding_annual",
] as const;

export type CheckoutPlanId = (typeof CHECKOUT_PLAN_IDS)[number];

/** Current LIVE checkout prices — the only selectable destination prices. */
const STRIPE_PRICE_BY_PLAN: Record<CheckoutPlanId, string> = {
  pro_monthly: "price_1TvMxCAB8QpWwxxscOO7sNum",
  pro_annual: "price_1TvMxBAB8QpWwxxsHdOol8De",
  founding_monthly: "price_1TvMxAAB8QpWwxxstMwVzn3J",
  founding_annual: "price_1TvMx9AB8QpWwxxs6dsnQ4Gr",
};

export function resolveCheckoutPlan(
  planId: unknown
): { ok: true; planId: CheckoutPlanId; stripePriceId: string } | { ok: false; error: string } {
  if (typeof planId !== "string" || planId.trim() === "") {
    return { ok: false, error: "Missing or invalid planId" };
  }

  if (!(CHECKOUT_PLAN_IDS as readonly string[]).includes(planId)) {
    return { ok: false, error: "Unsupported checkout plan" };
  }

  const resolvedPlanId = planId as CheckoutPlanId;
  const stripePriceId = STRIPE_PRICE_BY_PLAN[resolvedPlanId];

  if (!stripePriceId) {
    return { ok: false, error: "Checkout plan is not configured" };
  }

  return { ok: true, planId: resolvedPlanId, stripePriceId };
}
