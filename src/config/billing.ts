export const BILLING_PLAN_IDS = {
  PRO_MONTHLY: "pro_monthly",
  PRO_ANNUAL: "pro_annual",
  FOUNDING_MONTHLY: "founding_monthly",
  FOUNDING_ANNUAL: "founding_annual",
} as const;

export type BillingPlanId =
  (typeof BILLING_PLAN_IDS)[keyof typeof BILLING_PLAN_IDS];

export type BillingInterval = "monthly" | "annual";

export type BillingOfferKind = "standard" | "founding";

/** Public checkout offer for new Free users (env: VITE_PUBLIC_PRO_OFFER). */
export type PublicProOffer = "founding" | "standard";

const PUBLIC_PRO_OFFER_ALLOWED: PublicProOffer[] = ["founding", "standard"];

function parsePublicProOffer(raw: string | undefined): PublicProOffer {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized || normalized === "founding") {
    return "founding";
  }
  if (normalized === "standard") {
    return "standard";
  }
  if (import.meta.env.DEV) {
    console.warn(
      `[billing] Invalid VITE_PUBLIC_PRO_OFFER "${raw ?? ""}". ` +
        `Allowed values: ${PUBLIC_PRO_OFFER_ALLOWED.join(", ")}. Falling back to "founding".`
    );
  }
  return "founding";
}

/**
 * Which Pro offer new checkout users see. Does not affect existing subscribers
 * (those are resolved from stored Stripe price_id).
 */
export const PUBLIC_PRO_OFFER: PublicProOffer = parsePublicProOffer(
  import.meta.env.VITE_PUBLIC_PRO_OFFER
);

export function isFoundingOffer(): boolean {
  return PUBLIC_PRO_OFFER === "founding";
}

export function isStandardOffer(): boolean {
  return PUBLIC_PRO_OFFER === "standard";
}

/** Canonical plan amounts in cents (USD). Source of truth for checkout display. */
export const BILLING_PLAN_AMOUNT_CENTS: Record<BillingPlanId, number> = {
  [BILLING_PLAN_IDS.PRO_MONTHLY]: 799,
  [BILLING_PLAN_IDS.PRO_ANNUAL]: 5900,
  [BILLING_PLAN_IDS.FOUNDING_MONTHLY]: 599,
  [BILLING_PLAN_IDS.FOUNDING_ANNUAL]: 4500,
};

/** Grandfathered subscription price_ids → amount in cents (read-only display; not used for checkout). */
const HISTORICAL_SUBSCRIPTION_AMOUNT_CENTS: Record<string, number> = {
  price_1Sn3aFA0uFpyWFFpqJoLMwJ4: 400,
  price_1Sn3bbA0uFpyWFFpXAgYw8wl: 3000,
  price_1TribnA0uFpyWFFpeebDRymR: 499,
  price_1TribnA0uFpyWFFpaR8O8QjY: 3900,
  price_1TrkVDA0uFpyWFFpXxHnLdU7: 4900,
};

/** Monthly amount used to compute savings for a grandfathered annual price_id. */
const HISTORICAL_ANNUAL_COMPARISON_MONTHLY_CENTS: Record<string, number> = {
  price_1Sn3bbA0uFpyWFFpXAgYw8wl: 400,
  price_1TribnA0uFpyWFFpaR8O8QjY: 499,
  price_1TrkVDA0uFpyWFFpXxHnLdU7: 599,
};

function formatUsdFromCents(cents: number): string {
  const dollars = cents / 100;
  return cents % 100 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function formatMonthlyPriceLine(cents: number): string {
  return `${formatUsdFromCents(cents)}/month`;
}

function formatAnnualPriceLine(cents: number): string {
  return `${formatUsdFromCents(cents)}/year`;
}

function formatMonthlyEquivalent(annualCents: number): string {
  const perMonth = annualCents / 12 / 100;
  return `$${perMonth.toFixed(2)}/mo`;
}

/** Savings vs paying monthly for 12 months, rounded to nearest whole percent. */
export function computeAnnualSavingsPercent(
  monthlyCents: number,
  annualCents: number
): number {
  const monthlyAnnualized = monthlyCents * 12;
  if (monthlyAnnualized <= 0) return 0;
  return Math.round(((monthlyAnnualized - annualCents) / monthlyAnnualized) * 100);
}

function formatSavingsLabel(monthlyCents: number, annualCents: number): string {
  return `Save ${computeAnnualSavingsPercent(monthlyCents, annualCents)}%`;
}

function buildAnnualDisplay(monthlyCents: number, annualCents: number) {
  return {
    price: formatAnnualPriceLine(annualCents),
    monthlyEquivalent: formatMonthlyEquivalent(annualCents),
    savingsLabel: formatSavingsLabel(monthlyCents, annualCents),
    billedLabel: `Billed ${formatUsdFromCents(annualCents)} yearly`,
  };
}

export interface BillingPlanOffer {
  id: BillingPlanId;
  interval: BillingInterval;
  offer: BillingOfferKind;
  /** Display-only strings (do not hardcode in components). */
  display: {
    /** Short label for plan type, e.g. "Pro Monthly" */
    label: string;
    /** Primary price line, e.g. "$7.99/month" */
    price: string;
    /** Annual-only: monthly equivalent for toggle summary */
    monthlyEquivalent?: string;
    /** Annual-only: savings vs paying monthly */
    savingsLabel?: string;
    /** Annual-only: yearly billing summary */
    billedLabel?: string;
  };
}

function buildBillingPlans(): Record<BillingPlanId, BillingPlanOffer> {
  const proMonthlyCents = BILLING_PLAN_AMOUNT_CENTS[BILLING_PLAN_IDS.PRO_MONTHLY];
  const proAnnualCents = BILLING_PLAN_AMOUNT_CENTS[BILLING_PLAN_IDS.PRO_ANNUAL];
  const foundingMonthlyCents =
    BILLING_PLAN_AMOUNT_CENTS[BILLING_PLAN_IDS.FOUNDING_MONTHLY];
  const foundingAnnualCents =
    BILLING_PLAN_AMOUNT_CENTS[BILLING_PLAN_IDS.FOUNDING_ANNUAL];

  return {
    [BILLING_PLAN_IDS.PRO_MONTHLY]: {
      id: BILLING_PLAN_IDS.PRO_MONTHLY,
      interval: "monthly",
      offer: "standard",
      display: {
        label: "Pro Monthly",
        price: formatMonthlyPriceLine(proMonthlyCents),
      },
    },
    [BILLING_PLAN_IDS.PRO_ANNUAL]: {
      id: BILLING_PLAN_IDS.PRO_ANNUAL,
      interval: "annual",
      offer: "standard",
      display: {
        label: "Pro Annual",
        ...buildAnnualDisplay(proMonthlyCents, proAnnualCents),
      },
    },
    [BILLING_PLAN_IDS.FOUNDING_MONTHLY]: {
      id: BILLING_PLAN_IDS.FOUNDING_MONTHLY,
      interval: "monthly",
      offer: "founding",
      display: {
        label: "Founding Member",
        price: formatMonthlyPriceLine(foundingMonthlyCents),
      },
    },
    [BILLING_PLAN_IDS.FOUNDING_ANNUAL]: {
      id: BILLING_PLAN_IDS.FOUNDING_ANNUAL,
      interval: "annual",
      offer: "founding",
      display: {
        label: "Founding Member",
        ...buildAnnualDisplay(foundingMonthlyCents, foundingAnnualCents),
      },
    },
  };
}

/** All supported logical plans (including founding; not all are shown in default UI). */
export const BILLING_PLANS: Record<BillingPlanId, BillingPlanOffer> =
  buildBillingPlans();

/** Standard Pro checkout plan ids (when PUBLIC_PRO_OFFER is "standard"). */
export const STANDARD_CHECKOUT_PLAN_IDS: BillingPlanId[] = [
  BILLING_PLAN_IDS.PRO_ANNUAL,
  BILLING_PLAN_IDS.PRO_MONTHLY,
];

/** Founding Member checkout plan ids (when PUBLIC_PRO_OFFER is "founding"). */
export const FOUNDING_CHECKOUT_PLAN_IDS: BillingPlanId[] = [
  BILLING_PLAN_IDS.FOUNDING_ANNUAL,
  BILLING_PLAN_IDS.FOUNDING_MONTHLY,
];

/** Logical plan ids offered at checkout for the configured public offer. */
export function getPublicCheckoutPlanIds(): BillingPlanId[] {
  return isFoundingOffer()
    ? FOUNDING_CHECKOUT_PLAN_IDS
    : STANDARD_CHECKOUT_PLAN_IDS;
}

export function getBillingPlan(id: BillingPlanId): BillingPlanOffer {
  return BILLING_PLANS[id];
}

export function getStandardPlanForInterval(
  interval: BillingInterval
): BillingPlanOffer {
  return interval === "annual"
    ? BILLING_PLANS[BILLING_PLAN_IDS.PRO_ANNUAL]
    : BILLING_PLANS[BILLING_PLAN_IDS.PRO_MONTHLY];
}

export function getFoundingPlanForInterval(
  interval: BillingInterval
): BillingPlanOffer {
  return interval === "annual"
    ? BILLING_PLANS[BILLING_PLAN_IDS.FOUNDING_ANNUAL]
    : BILLING_PLANS[BILLING_PLAN_IDS.FOUNDING_MONTHLY];
}

/** Checkout plan for new subscribers based on PUBLIC_PRO_OFFER. */
export function getPublicCheckoutPlanForInterval(
  interval: BillingInterval
): BillingPlanOffer {
  return isFoundingOffer()
    ? getFoundingPlanForInterval(interval)
    : getStandardPlanForInterval(interval);
}

/** @deprecated Use getPublicCheckoutPlanForInterval for new checkout UI. */
export function getBillingPlanForInterval(
  interval: BillingInterval
): BillingPlanOffer {
  return getPublicCheckoutPlanForInterval(interval);
}

/** Resolve logical plan from stored subscription price_id (display only). */
export function resolvePlanIdFromPriceId(priceId: string | null | undefined): BillingPlanId | null {
  if (!priceId) return null;
  return PRICE_ID_TO_PLAN[priceId] ?? null;
}

/**
 * Display plan for an existing subscription, preserving grandfathered amounts.
 * Does not use PUBLIC_PRO_OFFER. Not used for new checkout pricing.
 */
export function getSubscriptionPlanDisplay(
  priceId: string | null | undefined
): BillingPlanOffer | null {
  const planId = resolvePlanIdFromPriceId(priceId);
  if (!planId) return null;

  const historicalCents =
    priceId && priceId in HISTORICAL_SUBSCRIPTION_AMOUNT_CENTS
      ? HISTORICAL_SUBSCRIPTION_AMOUNT_CENTS[priceId]
      : null;

  if (historicalCents == null) {
    return BILLING_PLANS[planId];
  }

  const base = BILLING_PLANS[planId];
  if (base.interval === "monthly") {
    return {
      ...base,
      display: {
        label: base.display.label,
        price: formatMonthlyPriceLine(historicalCents),
      },
    };
  }

  const comparisonMonthlyCents =
    (priceId && HISTORICAL_ANNUAL_COMPARISON_MONTHLY_CENTS[priceId]) ??
    BILLING_PLAN_AMOUNT_CENTS[
      base.offer === "founding"
        ? BILLING_PLAN_IDS.FOUNDING_MONTHLY
        : BILLING_PLAN_IDS.PRO_MONTHLY
    ];

  return {
    ...base,
    display: {
      label: base.display.label,
      ...buildAnnualDisplay(comparisonMonthlyCents, historicalCents),
    },
  };
}

/** Other interval within the same offer family (standard or founding). */
export function getAlternatePlanInOffer(planId: BillingPlanId): BillingPlanOffer {
  switch (planId) {
    case BILLING_PLAN_IDS.PRO_MONTHLY:
      return BILLING_PLANS[BILLING_PLAN_IDS.PRO_ANNUAL];
    case BILLING_PLAN_IDS.PRO_ANNUAL:
      return BILLING_PLANS[BILLING_PLAN_IDS.PRO_MONTHLY];
    case BILLING_PLAN_IDS.FOUNDING_MONTHLY:
      return BILLING_PLANS[BILLING_PLAN_IDS.FOUNDING_ANNUAL];
    case BILLING_PLAN_IDS.FOUNDING_ANNUAL:
      return BILLING_PLANS[BILLING_PLAN_IDS.FOUNDING_MONTHLY];
    default:
      return BILLING_PLANS[BILLING_PLAN_IDS.PRO_ANNUAL];
  }
}

export function formatBillingInterval(interval: BillingInterval): string {
  return interval === "monthly" ? "Monthly" : "Annual";
}

export function formatSubscriptionStatus(
  status: string | undefined,
  cancelAtPeriodEnd: boolean | undefined
): string {
  if (!status) return "Unknown";
  if (cancelAtPeriodEnd && (status === "active" || status === "trialing")) {
    return "Canceling";
  }
  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Trialing";
    case "past_due":
      return "Past due";
    case "canceled":
      return "Canceled";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
  }
}

/**
 * Read-only resolution: stored subscription price_id → logical plan (includes archived prices).
 * Checkout uses planId allowlist server-side; these IDs are never sent from the client.
 */
const CURRENT_PRICE_ID_TO_PLAN: Record<string, BillingPlanId> = {
  price_1TvMxCAB8QpWwxxscOO7sNum: BILLING_PLAN_IDS.PRO_MONTHLY,
  price_1TvMxBAB8QpWwxxsHdOol8De: BILLING_PLAN_IDS.PRO_ANNUAL,
  price_1TvMxAAB8QpWwxxstMwVzn3J: BILLING_PLAN_IDS.FOUNDING_MONTHLY,
  price_1TvMx9AB8QpWwxxs6dsnQ4Gr: BILLING_PLAN_IDS.FOUNDING_ANNUAL,
};

/** Archived price_ids retained so existing subscriptions display correctly. */
const HISTORICAL_PRICE_ID_TO_PLAN: Record<string, BillingPlanId> = {
  // Legacy standard/test
  price_1TribmA0uFpyWFFpKlVbq64G: BILLING_PLAN_IDS.PRO_MONTHLY,
  price_1TribmA0uFpyWFFpsRyxPx3Y: BILLING_PLAN_IDS.PRO_ANNUAL,
  // Legacy founding/test
  price_1TrkV9A0uFpyWFFpwR7et6Se: BILLING_PLAN_IDS.FOUNDING_MONTHLY,
  price_1Trka6A0uFpyWFFpldozeOVw: BILLING_PLAN_IDS.FOUNDING_ANNUAL,
  // Archived founding
  price_1TrkVDA0uFpyWFFpXxHnLdU7: BILLING_PLAN_IDS.FOUNDING_ANNUAL,
  price_1TribnA0uFpyWFFpeebDRymR: BILLING_PLAN_IDS.FOUNDING_MONTHLY,
  price_1TribnA0uFpyWFFpaR8O8QjY: BILLING_PLAN_IDS.FOUNDING_ANNUAL,
  price_1Sn3aFA0uFpyWFFpqJoLMwJ4: BILLING_PLAN_IDS.PRO_MONTHLY,
  price_1Sn3bbA0uFpyWFFpXAgYw8wl: BILLING_PLAN_IDS.PRO_ANNUAL,
};

const PRICE_ID_TO_PLAN: Record<string, BillingPlanId> = {
  ...CURRENT_PRICE_ID_TO_PLAN,
  ...HISTORICAL_PRICE_ID_TO_PLAN,
};
