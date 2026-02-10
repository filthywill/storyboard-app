# 📋 Documentation Maintenance - Quick Reference Card

*Print this or keep it handy!*

---

## 🔄 **Daily Workflow**

### **Before Starting Work:**
```
"Before we begin, please review .cursorrules 
and confirm you understand the critical rules 
for this work."
```

### **After Completing Work:**
```
🔍 Documentation Review for Today's Session

Please review our changes today and check:

1. Files Modified: [list]
2. State Changes: [any new/modified UI states?]
3. Flow Changes: [auth/project/sync changes?]
4. New Rules: [any "never do" discovered?]
5. Bug Fixes: [document significant bugs?]
6. Testing: [new test scenarios needed?]

List which docs need updates. Don't make changes yet.
```

---

## 📅 **Maintenance Schedule**

| When | What | Time |
|------|------|------|
| **Every Session** | End-of-session review | 5 min |
| **Every Commit** | Git hook reminder | Auto |
| **Weekly** | Health check | 5 min |
| **Monthly** | Deep audit | 30 min |

---

## 📂 **Critical Files**

| File | Update When |
|------|-------------|
| `.cursorrules` | New rule discovered |
| `docs/architecture/UI_STATE_HANDLING.md` | States change |
| `docs/architecture/ARCHITECTURE_PRINCIPLES.md` | Patterns change |
| `docs/sync-and-data/TIMESTAMP_SYNC_IMPLEMENTATION.md` | Sync/autosave behavior changes |
| `docs/business/Stripe_billing_notes.md` | Billing/gating changes |

---

## ⚠️ **Red Flags**

Documentation needs attention if:
- ❌ Same bug keeps recurring
- ❌ AI suggests anti-patterns
- ❌ Code doesn't match docs
- ❌ "Last Updated" > 1 month

---

## 🎯 **File Change Triggers**

**Index.tsx** → Update `docs/architecture/UI_STATE_HANDLING.md`  
**authStore.ts** → Update `.cursorrules` + `docs/architecture/UI_STATE_HANDLING.md`  
**ProjectSwitcher** → Update `docs/architecture/ARCHITECTURE_PRINCIPLES.md`  
**CloudSyncService** → Update `.cursorrules` (sync rules) + `docs/sync-and-data/TIMESTAMP_SYNC_IMPLEMENTATION.md`  
**writerLeaseService.ts** → Update `docs/architecture/ARCHITECTURE_PRINCIPLES.md` (Principle 8)  
**cloudAccessService.ts** → Update `docs/business/Stripe_billing_notes.md` + ARCHITECTURE_PRINCIPLES (Principle 9)  
**autoSave.ts** → Update `docs/sync-and-data/TIMESTAMP_SYNC_IMPLEMENTATION.md`  

---

## 🚨 **Emergency: If Docs Out of Sync**

1. Update `.cursorrules` first (most critical)
2. Sync `docs/architecture/UI_STATE_HANDLING.md` with Index.tsx
3. Test AI assistant with updated rules
4. Schedule full review

---

## 🔗 **Quick Links**

**Full Guide:** `docs/maintenance/DOCUMENTATION_MAINTENANCE.md`  
**Index:** `docs/maintenance/DOCUMENTATION_INDEX.md`  
**Billing Ref:** `docs/business/Stripe_billing_notes.md`  

---

## ✅ **Doc Sanity Checks**

- **Tokens/keys:** Store in `.env.local` or a secrets manager. Never commit real tokens.
- **Quick lease test:** Open same project in two tabs → Tab B shows read-only → "Take over" reloads from cloud.

---

## 🔧 **Dev How-To: Common Tasks**

### Apply Supabase migrations (hosted project)
```bash
# Link to your project (one-time)
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```
Writer lease migration: `supabase/migrations/20260209_add_writer_leases.sql`

### Where writer leases are enforced
| Layer | File | What it does |
|-------|------|-------------|
| DB | `claim_writer_lease` RPC | Row-level lock, ownership check |
| DB | `save_project_if_unchanged` RPC | Validates `writer_id` + expiry on save |
| Service | `writerLeaseService.ts` | Heartbeat (30s), acquire/release lifecycle |
| Service | `cloudSyncService.ts` → `ensureWriterLeaseForSave()` | Blocks saves in read-only mode |
| UI | `Index.tsx` read-only overlay | Blocks interaction, shows takeover button |

### Test multi-tab writer behavior
1. Open same project in Tab A and Tab B
2. Tab A should be writer (no overlay)
3. Tab B should show read-only overlay
4. Tab B clicks "Take over editing" → Tab A gets overlay instantly (BroadcastChannel)
5. Close Tab A → Tab B should be able to claim lease after ~60s (or immediately if unload fires)

### Test billing locally
1. Set Stripe test keys in Supabase edge function secrets
2. Run `supabase functions serve` for local edge functions
3. Navigate to `/billing` to see subscription status
4. Use test card `4242 4242 4242 4242` for checkout
5. Use Stripe CLI: `stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook`

### BroadcastChannel: server lease is still source of truth
- BroadcastChannel (`storyboardflow-writer-lease`) provides instant same-browser tab coordination
- But the DB lease is the authoritative source — BroadcastChannel is an optimization
- Cross-device/cross-browser coordination relies on the 30s heartbeat + 60s expiry cycle

---

## 🧪 **Testing Essentials (Condensed)**

- Sign in/out shows Welcome or ProjectPicker as expected.
- Offline work + reconnect handles local-newer vs cloud-newer correctly.
- Multi-tab writer lease: second tab read-only; takeover reloads from cloud.
- Workspace conflict modal appears for free users with local + cloud projects.
- Free plan limit shows UpgradeToProDialog on 2nd cloud project.

---

## 💡 **Remember:**

> "Update documentation in the same session as code changes,
> not later in a 'documentation sprint'."

> "If you're adding a rule to .cursorrules, something went wrong.
> Document what and why."

> "Documentation is code. Treat it the same way."

---

*Last Updated: February 9, 2026*
*See docs/maintenance/DOCUMENTATION_MAINTENANCE.md for detailed instructions.*







