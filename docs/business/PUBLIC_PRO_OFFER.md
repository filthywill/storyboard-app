# Public Pro Offer Configuration

StoryboardFlow exposes one frontend configuration value that controls which **logical plan ids** are shown and submitted for **new** Pro checkouts. Existing subscribers are never relabeled or re-mapped by this setting.

## Configuration

| Name | Scope | Allowed values | Default |
|------|--------|----------------|---------|
| `VITE_PUBLIC_PRO_OFFER` | Vite frontend (build-time) | `founding`, `standard` | `founding` |

Invalid or missing values log a console warning and **fall back to `founding`**.

## Launch configuration (TEST / current phase)

```env
VITE_PUBLIC_PRO_OFFER=founding
```

Or omit the variable entirely — founding is the default.

### Checkout behavior when `founding`

| Interval | Logical planId | Display |
|----------|----------------|---------|
| Monthly | `founding_monthly` | $5.99/month |
| Annual | `founding_annual` | $45/year |

### Checkout behavior when `standard`

| Interval | Logical planId | Display |
|----------|----------------|---------|
| Monthly | `pro_monthly` | $7.99/month |
| Annual | `pro_annual` | $59/year |

Checkout still sends **logical `planId` only**. Stripe Price IDs remain server-side in `create-checkout-session/billingPlans.ts`.

## Existing subscribers (unchanged)

`PUBLIC_PRO_OFFER` does **not** affect:

- `resolvePlanIdFromPriceId()` — maps stored `billing_subscriptions.price_id`
- Pro account billing view labels
- Interval-change validation (`change-subscription` offer family)
- Webhooks, entitlements, or Customer Portal

Founding, standard, and legacy grandfathered subscribers continue to resolve from their stored Stripe price.

## Close Founding offer — future procedure

When ready to end public Founding Member pricing:

1. **Change the environment setting** from `founding` to `standard`:
   ```env
   VITE_PUBLIC_PRO_OFFER=standard
   ```
2. **Redeploy the frontend** so the new build is served (Vite inlines env at build time).
3. **Verify new checkout** uses standard logical plans:
   - Billing page shows $7.99/month and $59/year
   - Network request to `create-checkout-session` sends `planId: "pro_monthly"` or `"pro_annual"`
4. **Leave existing Founding subscriptions unchanged** — they keep their stored price_id and Founding labels in the account billing view.
5. **Optionally archive Founding Stripe prices** only after confirming:
   - No active Founding checkout sessions in progress
   - Application no longer creates new Founding checkouts
   - Zero new sign-ups on founding prices for a reasonable observation window

Do **not** modify existing Stripe subscriptions when switching the public offer.

## Manual verification checklist

- [ ] With `VITE_PUBLIC_PRO_OFFER=founding`: billing page shows Founding Member copy and $5.99 / $45
- [ ] Checkout invokes `create-checkout-session` with `founding_monthly` or `founding_annual`
- [ ] With `VITE_PUBLIC_PRO_OFFER=standard`: billing page shows standard copy and $7.99 / $59
- [ ] Checkout invokes `create-checkout-session` with `pro_monthly` or `pro_annual`
- [ ] Invalid value (e.g. `VITE_PUBLIC_PRO_OFFER=beta`) warns in console and defaults to founding
- [ ] Active Founding subscriber billing view still shows Founding Member (not affected by env)
- [ ] Active Standard subscriber billing view still shows Pro Monthly/Annual
- [ ] Legacy $4 / $30 subscriber still resolves correctly

---

*Last updated: July 2026*
