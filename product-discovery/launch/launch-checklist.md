# Alpha Launch Checklist

StoryboardFlow alpha launch readiness. Check items before inviting the first external cohort.

---

## Product readiness

### Core flows
- [ ] Unauthenticated users see Welcome screen (not 404 or empty editor)
- [ ] Sign up / sign in completes without blocker
- [ ] Create project works (guest and authenticated paths)
- [ ] Add shot, reorder shots, multi-page editing works
- [ ] PDF export completes successfully on reference project
- [ ] PNG export completes (if in scope for alpha)
- [ ] Refresh preserves project data (cloud sync)
- [ ] Sign out returns to Welcome screen with data cleared appropriately

### Edge cases (from `.cursorrules`)
- [ ] No 404 during auth/project state transitions
- [ ] Offline banner appears; sign-out blocked when offline with unsynced changes
- [ ] Reconnect sync uses timestamp conflict resolution
- [ ] Forced logout shows `LoggedOutElsewhereScreen`

---

## Analytics readiness

- [ ] `VITE_POSTHOG_KEY` configured in alpha environment
- [ ] `app_started` verified in PostHog live events
- [ ] `project_created` verified on project creation
- [ ] `first_shot_added` verified on first shot per project
- [ ] `export_completed` verified on successful export
- [ ] `signup_completed` verified on new signup
- [ ] PostHog Dashboard 1 (Activation) built per `analytics/dashboard-plan.md`
- [ ] Alpha cohort person property strategy documented

---

## Discovery kit readiness

- [ ] `product-discovery/` folder reviewed and merged to main branch
- [ ] Notion workspace plan reviewed (`notion/workspace-overview.md`)
- [ ] CSV templates validated (headers match `database-schema.md`)
- [ ] Alpha test script finalized (`testing/alpha-test-script.md`)
- [ ] Tester instructions sent template ready (`testing/tester-instructions.md`)
- [ ] Google Form created from `testing/google-form-questions.md` (Phase B)
- [ ] Weekly review cadence scheduled (e.g. Mondays)

---

## Tester operations

- [ ] Alpha cohort size defined (recommend 8–15 for first wave)
- [ ] Invite email template includes URL, script link, form link, contact
- [ ] Test user tracking process defined (Notion or CSV)
- [ ] Coordinator assigned for feedback triage
- [ ] Response SLA defined (e.g. acknowledge within 48h, triage within 7 days)
- [ ] Escalation path for blockers (data loss, auth failure)

---

## Legal and privacy

- [ ] Privacy policy mentions analytics (PostHog) and feedback collection
- [ ] Tester consent for interviews/recording if applicable
- [ ] No real PII in repository CSV templates
- [ ] Google Form data retention policy defined

---

## Infrastructure

- [ ] Production (or dedicated staging) URL stable for alpha duration
- [ ] Supabase/auth stable for test period
- [ ] Error monitoring in place (PostHog `app_error_boundary` + logs)
- [ ] Rollback plan if critical bug found in week 1

---

## GitHub workflow

- [ ] Issue labels: `alpha`, `ux`, `feedback`, `analytics`
- [ ] Process: Notion triage → GitHub issue with link back
- [ ] PR template mentions discovery link when fixing reported issues

---

## Launch day

- [ ] Send invites to Cohort A
- [ ] Monitor PostHog live for first 2 hours
- [ ] Coordinator available for blocker reports
- [ ] Log launch date in Weekly Reviews

---

## Week 1 post-launch

- [ ] Import/form feedback into Feedback Inbox
- [ ] Complete first weekly review
- [ ] Update activation metrics in Metrics database
- [ ] Triage top 3 UX issues to GitHub
- [ ] Schedule 2–3 interviews with activated testers

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Product | | | |
| Engineering | | | |
| Design | | | |
