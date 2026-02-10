# Storyboard Flow - Documentation Index

## 📚 Quick Reference Guide

This index helps you find the right documentation for your needs.

> **Note:** `shot-flow-builder/` was removed/merged (Feb 2026). Older docs may reference historical paths.

---

## 🚨 **Start Here: Critical Rules**

- `.cursorrules` — `/storyboard-app-claude/.cursorrules` (read before auth/state/sync changes)

---

## 🏗️ **Architecture & Design**
- `ARCHITECTURE_PRINCIPLES.md` — `/storyboard-app-claude/docs/architecture/ARCHITECTURE_PRINCIPLES.md` (principles, critical paths, writer lease, billing)

---

## 🎨 **UI State Management**
- `UI_STATE_HANDLING.md` — `/storyboard-app-claude/docs/architecture/UI_STATE_HANDLING.md` (state variables + decision tree)

---

## 🛠️ **Technical Details**
- `shot-flow-builder/` docs were removed/merged (Feb 2026). See `docs/README.md` for current entry points.

---

## 🌐 **Hosting & Headers (Vercel)**
- `vercel.json` — security headers (X-Frame-Options, CSP frame-ancestors).

---

## 🎨 **Styling & Design System**
- `docs/styling/UNIFIED_COLOR_SYSTEM_IMPLEMENTATION.md` — unified color system.
- `docs/styling/GLASSMORPHISM_AUDIT.md` — migration audit.
- `docs/styling/SCALING_ALIGNMENT_PATTERNS.md` — alignment patterns.

---

## 🔄 **Migrations & Phase Completions**
- `docs/migrations/PHASES_4-6_MIGRATION_SUMMARY.md` — color migration summary.
- `docs/migrations/PHASE_1_AND_2_COMPLETE.md` — earlier phases.

---

## ⚙️ **Setup & Configuration**
- `docs/setup/SUPABASE_MIGRATION_INSTRUCTIONS.md` — Supabase setup + migrations.
- `docs/setup/SOCIAL_LOGIN_SETUP.md` — OAuth setup.

---

## 🐛 **Historical Issues & Fixes**
- `docs/bugs-and-fixes/CRITICAL-BUG-REPORT.md` — data corruption history.
- `docs/bugs-and-fixes/DATA_LOSS_FIX_SUMMARY.md` — validation layers.
- `docs/bugs-and-fixes/SIGNOUT_FLOW_FIX_SUMMARY.md` — sign-out fixes.

---

## 📋 **Planning & Specs**
- `docs/tasks/plan-consolidated.md` — shot ordering and switching plan.

---

## 🔍 **Quick Navigation by Task**
- **Add a UI state:** `UI_STATE_HANDLING.md` + `.cursorrules`.
- **Auth flow work:** `.cursorrules` + `ARCHITECTURE_PRINCIPLES.md`.
- **Sync issues:** `TIMESTAMP_SYNC_IMPLEMENTATION.md` + `DATA_LOSS_FIX_SUMMARY.md`.
- **Writer lease issues:** `ARCHITECTURE_PRINCIPLES.md` (Principle 8) + `UI_STATE_HANDLING.md`.
- **Billing:** `Stripe_billing_notes.md` + `ARCHITECTURE_PRINCIPLES.md` (Principle 9).
- **Styling:** `UNIFIED_COLOR_SYSTEM_IMPLEMENTATION.md`.

---

## 📁 **File Organization**
- Full tree: `docs/README.md`.
- Maintenance rules: `docs/maintenance/DOCUMENTATION_MAINTENANCE.md`.

---

## 📝 **Recent Updates**
- **Feb 9, 2026:** Docs cleanup, writer lease + billing references, trimmed UI state guide.
- **Jan 7, 2026:** Docs reorganized into `/docs`.
- **Oct 30, 2025:** Semantic color separation update.

---

*Last Updated: February 9, 2026*
*Keep this index updated as documentation evolves.*



