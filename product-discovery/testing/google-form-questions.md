# Google Form — Alpha Feedback Questions

Use this document to create the Google Form in Phase B. Suggested form title: **StoryboardFlow Alpha — Session Feedback**.

**Settings recommendations:**
- Collect email addresses: Optional (or required if invite list is known)
- Limit to 1 response: Off (allow retests)
- Response destination: Google Sheets → weekly import to Notion Feedback Inbox

---

## Section A — About you

### Q1. Display name or alias
- **Type:** Short answer
- **Required:** Yes
- **Description:** Use the same alias from your invite (e.g. Tester A) if you prefer not to use your real name.

### Q2. Your role
- **Type:** Multiple choice
- **Options:** Filmmaker | Animator | Storyboard Artist | Student | Other
- **Required:** Yes

### Q3. Primary storyboard tool today
- **Type:** Short answer
- **Required:** No
- **Description:** e.g. Photoshop, Storyboarder, Figma, paper, other

---

## Section B — Session completion

### Q4. Did you complete the alpha test script?
- **Type:** Multiple choice
- **Options:** Yes, fully | Partially | No, I stopped early
- **Required:** Yes

### Q5. If you stopped early, why?
- **Type:** Paragraph
- **Required:** No (show if Q4 = Partially or No)

### Q6. Approximate session length (minutes)
- **Type:** Short answer (number)
- **Required:** No

---

## Section C — Task-level feedback

### Q7. Creating a project
- **Type:** Linear scale 1–5
- **Labels:** 1 = Very difficult, 5 = Very easy
- **Required:** Yes

### Q8. Adding and editing shots
- **Type:** Linear scale 1–5
- **Required:** Yes

### Q9. Finding and using export (PDF/PNG)
- **Type:** Linear scale 1–5
- **Required:** Yes

### Q10. Saving and account/sign-up clarity
- **Type:** Linear scale 1–5
- **Required:** Yes

---

## Section D — Open feedback

### Q11. What was the most confusing part of StoryboardFlow?
- **Type:** Paragraph
- **Required:** No

### Q12. What worked well?
- **Type:** Paragraph
- **Required:** No

### Q13. What's missing for you to use this on a real project?
- **Type:** Paragraph
- **Required:** No

### Q14. Verbatim quote (optional)
- **Type:** Paragraph
- **Description:** One sentence we may quote internally, e.g. "Export was hidden but the PDF looked great."

### Q15. Overall satisfaction
- **Type:** Linear scale 1–10
- **Labels:** 1 = Would not use, 10 = Would use immediately
- **Required:** Yes

### Q16. Would you recommend StoryboardFlow to a colleague?
- **Type:** Multiple choice
- **Options:** Yes | Maybe | No
- **Required:** Yes

### Q17. May we contact you for a follow-up interview?
- **Type:** Multiple choice
- **Options:** Yes | No
- **Required:** Yes

### Q18. Anything else?
- **Type:** Paragraph
- **Required:** No

---

## Mapping to Notion Feedback Inbox

| Form field | Notion property |
|------------|-----------------|
| Q11–Q13 combined or Q11 alone | Summary (title) — use first line of Q11 |
| Q1 | Tester (relation by name) |
| Submission timestamp | Date |
| — | Source = `Google Form` |
| Q15 + Q16 | Sentiment (derive: 8–10 + Yes → Positive; 4–7 → Mixed; 1–3 or No → Negative) |
| Q7–Q10 lowest scores | Theme (map to Onboarding, Editing, Export, etc.) |
| Q14 | Verbatim Quote |
| Full response export | Full Response |
| Any Q5, Q11, Q13 | Actionable = checked |

---

## Confirmation message (suggested)

> Thank you! Your feedback helps us improve StoryboardFlow. We'll review responses weekly. If you agreed to a follow-up, we'll reach out to schedule a short interview.
