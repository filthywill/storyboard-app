# StoryboardFlow Alpha Test Script

**Version:** 1.0 (Phase A template)  
**Duration:** 45–60 minutes  
**Environment:** Production or staging URL provided by the team  

---

## Before you begin

- Use a desktop browser (Chrome, Firefox, or Edge recommended).
- Allow 45–60 uninterrupted minutes.
- You may use a real project idea or the sample scenario below.
- Think aloud when something is confusing — there are no wrong answers.

**Sample scenario (optional):** Storyboard a 30-second product demo with 6–8 shots across 2 pages.

---

## Part 1 — First impression (10 min)

### 1.1 Land on the app

1. Open the StoryboardFlow URL provided in your invite.
2. Without signing in, explore the welcome screen for 2 minutes.

**Observe:**
- What is the product for?
- What would you click first?

**Note for facilitator (if present):** PostHog should record `app_started`, `welcome_viewed`.

### 1.2 Guest exploration (optional branch)

If the welcome screen allows guest use:

1. Start without an account.
2. Create or open a project if prompted.

**Observe:** Is it clear whether your work is saved?

---

## Part 2 — Project setup (10 min)

### 2.1 Create a project

1. Sign up or sign in if required (use credentials from your invite).
2. Create a new project named **Alpha Test — [Your Name or Alias]**.

**Success criteria:**
- Project appears in project list or opens in editor.
- PostHog: `project_created` (properties: `is_guest`, `is_cloud`, `project_count`).

### 2.2 Orient in the editor

1. Identify where pages and shots are shown.
2. Change layout or page settings if available.

**Observe:**
- Can you find how to add a page?
- Is the grid/layout understandable?

---

## Part 3 — Core editing (15 min)

### 3.1 Add your first shot

1. Add at least one shot to the storyboard.
2. Add a title or description to the shot if the UI supports it.

**Success criteria:**
- First shot appears on the canvas/grid.
- PostHog: `first_shot_added` (once per project).

### 3.2 Build out the storyboard

1. Add at least **5 more shots** (6+ total).
2. Use at least **2 pages** if multi-page is supported.
3. Reorder at least one shot via drag-and-drop.

**Observe:**
- Is adding shots fast or repetitive?
- Does reordering feel predictable?

### 3.3 Optional — Theme or styling

1. Apply or change a theme if available.
2. Note anything surprising about limits or prompts.

---

## Part 4 — Export (10 min)

### 4.1 Export your storyboard

1. Find the export feature.
2. Export as **PDF** (primary path).
3. If time allows, try **PNG** export.

**Success criteria:**
- File downloads or opens successfully.
- Content matches what you built.
- PostHog: `export_started`, then `export_completed` (or `export_failed`).

**Observe:**
- How long did it take to find export?
- Is the output quality acceptable for your use case?

---

## Part 5 — Account and sync (5 min)

### 5.1 Persistence check

1. Refresh the browser.
2. Confirm your project and shots are still present.

### 5.2 Optional — Second device or incognito

If instructed by the coordinator:

1. Sign in on a second browser or device.
2. Open the same project and note sync behavior.

---

## Part 6 — Wrap-up (5 min)

### 6.1 Post-session form

Complete the Google Form linked in your invite (see `google-form-questions.md` for question list).

### 6.2 Optional interview

If scheduled, the facilitator will use `interview-guide.md` for a 20–30 minute follow-up.

---

## Facilitator scoring rubric (internal)

| Step | Event | Pass if |
|------|-------|---------|
| App load | `app_started` | Fires once per session |
| Project | `project_created` | User creates or opens project |
| Activation | `first_shot_added` | Within 15 min of project_created |
| Value | `export_completed` | Valid file received |
| Account | `signup_completed` | If signup was part of test path |

---

## Known issues (update during alpha)

| Issue | Workaround |
|-------|------------|
| _Add rows as discovered_ | |

---

## Tester debrief prompts (quick)

1. What almost made you stop?
2. What felt better than your current tool?
3. Would you use this for a real project next week? Why or why not?
