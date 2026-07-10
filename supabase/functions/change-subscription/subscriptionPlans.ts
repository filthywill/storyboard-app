import {
  type CheckoutPlanId,
  resolveCheckoutPlan,
} from "../create-checkout-session/billingPlans.ts";

/**
 * Read-only resolution for existing subscription price_ids (includes archived prices).
 * Interval-change destinations always come from resolveCheckoutPlan() — current prices only.
 */
const HISTORICAL_STRIPE_PRICE_TO_PLAN: Record<string, CheckoutPlanId> = {
  // Current standard
  price_1TribmA0uFpyWFFpKlVbq64G: "pro_monthly",
  price_1TribmA0uFpyWFFpsRyxPx3Y: "pro_annual",
  // Current founding
  price_1TrkV9A0uFpyWFFpwR7et6Se: "founding_monthly",
  price_1Trka6A0uFpyWFFpldozeOVw: "founding_annual",
  // Archived founding
  price_1TrkVDA0uFpyWFFpXxHnLdU7: "founding_annual",
  price_1TribnA0uFpyWFFpeebDRymR: "founding_monthly",
  price_1TribnA0uFpyWFFpaR8O8QjY: "founding_annual",
  // Archived legacy standard
  price_1Sn3aFA0uFpyWFFpqJoLMwJ4: "pro_monthly",
  price_1Sn3bbA0uFpyWFFpXAgYw8wl: "pro_annual",
};

const PLAN_OFFER: Record<CheckoutPlanId, "standard" | "founding"> = {
  pro_monthly: "standard",
  pro_annual: "standard",
  founding_monthly: "founding",
  founding_annual: "founding",
};

const PLAN_INTERVAL: Record<CheckoutPlanId, "monthly" | "annual"> = {
  pro_monthly: "monthly",
  pro_annual: "annual",
  founding_monthly: "monthly",
  founding_annual: "annual",
};

export function resolvePlanFromStripePriceId(
  priceId: unknown
): { ok: true; planId: CheckoutPlanId } | { ok: false; error: string } {
  if (typeof priceId !== "string" || !priceId) {
    return { ok: false, error: "Missing current subscription price" };
  }
  const planId = HISTORICAL_STRIPE_PRICE_TO_PLAN[priceId];
  if (!planId) {
    return { ok: false, error: "Unsupported subscription price" };
  }
  return { ok: true, planId };
}

export function validateSubscriptionTransition(
  currentPlanId: CheckoutPlanId,
  targetPlanId: CheckoutPlanId
): { ok: true } | { ok: false; error: string } {
  if (currentPlanId === targetPlanId) {
    return { ok: false, error: "You are already on this billing interval" };
  }

  const currentOffer = PLAN_OFFER[currentPlanId];
  const targetOffer = PLAN_OFFER[targetPlanId];
  if (currentOffer !== targetOffer) {
    return { ok: false, error: "Cannot change between plan families" };
  }

  const currentInterval = PLAN_INTERVAL[currentPlanId];
  const targetInterval = PLAN_INTERVAL[targetPlanId];
  if (currentInterval === targetInterval) {
    return { ok: false, error: "Invalid billing interval change" };
  }

  return { ok: true };
}

export function resolveSubscriptionChange(
  currentStripePriceId: unknown,
  targetPlanId: unknown
):
  | {
      ok: true;
      currentPlanId: CheckoutPlanId;
      targetPlanId: CheckoutPlanId;
      stripePriceId: string;
      direction: "monthly_to_annual" | "annual_to_monthly";
    }
  | { ok: false; error: string } {
  const current = resolvePlanFromStripePriceId(currentStripePriceId);
  if (!current.ok) return current;

  const target = resolveCheckoutPlan(targetPlanId);
  if (!target.ok) return target;

  const transition = validateSubscriptionTransition(current.planId, target.planId);
  if (!transition.ok) return transition;

  const direction =
    PLAN_INTERVAL[current.planId] === "monthly" ? "monthly_to_annual" : "annual_to_monthly";

  return {
    ok: true,
    currentPlanId: current.planId,
    targetPlanId: target.planId,
    stripePriceId: target.stripePriceId,
    direction,
  };
}
