# Stripe Billing & Subscription Notes

## Plan Tiers

| Plan | Cloud Projects | Workspace Mode | Price |
|------|---------------|----------------|-------|
| Free | 1 max | Must choose local OR cloud | $0 |
| Pro | Unlimited | Both local and cloud | See pricing below |

## Stripe Product & Price IDs

- **Product ID:** `prod_TkYhj9N6JE4Ml7`
- **Monthly:** `price_1Sn3aFA0uFpyWFFpqJoLMwJ4`
- **Bi-Annual:** `price_1Sn3bbA0uFpyWFFpzL9ZwxkB`
- **Annual:** `price_1Sn3bbA0uFpyWFFpXAgYw8wl`

Active in `src/config/billing.ts`: Monthly and Annual only.

## Redirect URLs

**Local dev (Vite):**
- `http://localhost:8080/billing/success`
- `http://localhost:8080/billing/canceled`

**Production (set later):**
- `https://yourdomain.com/billing/success`
- `https://yourdomain.com/billing/canceled`

## Stripe Customer Portal

Path: Settings → Billing → Customer portal

Return URL: `https://storyboardflow.com/billing` (set when ready)

> This is not the same as Checkout success/cancel. Can be ignored until after Checkout works.

---

## Architecture Overview

### Gating Service Chain

```
User action (create project, open project)
    ↓
CloudAccessService.getAccessState()
    ↓
Queries billing_subscriptions table (cached 30s)
    ↓
Returns: { plan, canCreateCloudProject, cloudProjectLimit, ... }
    ↓
UI enforces: UpgradeToProDialog, WorkspaceChoiceModal, LockedProjectModal
```

### Key Files

| File | Purpose |
|------|---------|
| `src/config/billing.ts` | Price IDs |
| `src/services/cloudAccessService.ts` | Plan checks, access state, caching |
| `src/services/projectOpenGate.ts` | Pre-switch validation |
| `src/services/workspaceModeService.ts` | Local vs cloud mode (localStorage) |
| `src/utils/projectCreationGate.ts` | Server-side creation limit check |
| `src/pages/billing/BillingPage.tsx` | Subscription status, upgrade buttons |
| `src/pages/billing/BillingSuccessPage.tsx` | Checkout success redirect |
| `src/pages/billing/BillingCanceledPage.tsx` | Checkout cancel redirect |
| `src/components/UpgradeToProDialog.tsx` | "Upgrade to Pro" prompt |
| `src/components/WorkspaceChoiceModal.tsx` | Workspace choice for free users |
| `src/components/LockedProjectModal.tsx` | Blocked project modal |

### Supabase Edge Functions

| Function | Purpose |
|----------|---------|
| `supabase/functions/create-checkout-session/` | Creates Stripe Checkout session; maps Supabase user → Stripe customer |
| `supabase/functions/stripe-webhook/` | Handles Stripe events; updates `billing_subscriptions` table |

### Webhook Events Handled

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### Database Table: `billing_subscriptions`

| Column | Type | Purpose |
|--------|------|---------|
| `user_id` | UUID (PK) | Supabase user reference |
| `stripe_customer_id` | TEXT | Stripe customer mapping |
| `stripe_subscription_id` | TEXT | Active subscription |
| `price_id` | TEXT | Which price plan |
| `status` | TEXT | `'active'`, `'trialing'`, `'canceled'`, etc. |
| `current_period_end` | TIMESTAMPTZ | Billing period end |
| `cancel_at_period_end` | BOOLEAN | Pending cancellation |

---

## Environment Variables (Edge Functions)

| Variable | Required | Purpose |
|----------|----------|---------|
| `STRIPE_SECRET_KEY` | Yes | Stripe API key (use test key for dev) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signature verification |
| `SITE_URL` | Yes | Base URL for redirects (default: `http://localhost:8080`) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SERVICE_ROLE_KEY` | Yes | Supabase service role key (admin operations) |

## Test Mode Notes

- Use Stripe test keys (`sk_test_...`) during development
- Billing page links to test dashboard: `https://dashboard.stripe.com/test/subscriptions`
- Test cards: `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (decline)
- Webhook testing: Use Stripe CLI (`stripe listen --forward-to ...`) or dashboard test events

## CORS Configuration

Allowed origins in `create-checkout-session`: `http://localhost:8080`

> Add production URLs before deployment.

---

## Supabase CLI Access Token

`<SUPABASE_ACCESS_TOKEN>`

**Warning:** Do not commit real tokens/keys to the repository.

---

*Last Updated: February 9, 2026*
*Expanded from raw notes to structured reference.*
