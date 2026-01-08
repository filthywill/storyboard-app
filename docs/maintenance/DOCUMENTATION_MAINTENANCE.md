# Documentation Maintenance Guide

## 📅 **When to Update Documentation**

### **Immediate Updates Required:**

Update documentation **during the same session** when you:

1. **Add/Change UI States**
   - Update: `docs/architecture/UI_STATE_HANDLING.md`
   - Add state to decision tree
   - Document what user sees
   - Add state transition examples

2. **Modify Auth Flows**
   - Update: `.cursorrules` (if rules change)
   - Update: `docs/architecture/ARCHITECTURE_PRINCIPLES.md` (Critical Paths section)
   - Update: `docs/architecture/UI_STATE_HANDLING.md` (Auth transitions)

3. **Change Offline/Online Behavior**
   - Update: `.cursorrules` (Section 6: Offline/Online Sync)
   - Update: `docs/architecture/ARCHITECTURE_PRINCIPLES.md` (Principle 4: Offline-First)
   - Update: `docs/architecture/UI_STATE_HANDLING.md` (Offline transitions)

4. **Discover New "Never Do" Rules**
   - Update: `.cursorrules` (Section 9: Critical "Never Do" Rules)
   - Add example of what went wrong
   - Add correct approach

5. **Fix Major Bugs**
   - Create new bug report (like `docs/bugs-and-fixes/CRITICAL-BUG-REPORT.md`) OR
   - Update existing bug report with resolution
   - Update `.cursorrules` if new prevention rules needed

6. **Change Data Validation**
   - Update: `docs/bugs-and-fixes/DATA_LOSS_FIX_SUMMARY.md` (validation layers)
   - Update: `.cursorrules` (if validation rules change)

7. **Modify File Responsibilities**
   - Update: `docs/architecture/ARCHITECTURE_PRINCIPLES.md` (File Responsibilities section)

---

## 🔄 **End-of-Session Review Process**

### **Step 1: Use This Prompt**

At the end of any development session, ask your AI assistant:

```
🔍 Documentation Review for Today's Session

Please review our changes today and check:

1. Files Modified:
   - List all files we edited
   - Identify which are "critical" (Index.tsx, authStore, ProjectSwitcher, etc.)

2. State Changes:
   - Did we add/modify any UI states?
   - Did we change when states trigger?
   - Did we modify the state decision tree?

3. Flow Changes:
   - Did we change sign-in/sign-out flow?
   - Did we modify project switching?
   - Did we change offline/online sync?

4. New Rules:
   - Did we discover any "never do this" situations?
   - Should any new rules be added to .cursorrules?

5. Bug Fixes:
   - Did we fix any significant bugs?
   - Should they be documented?

6. Testing:
   - Do we need to add new test scenarios?
   - Should testing checklist be updated?

Based on your findings, please:
- List which documentation files need updates
- Provide specific sections to modify
- Draft the updates if changes are needed
- Update "Last Updated" dates

DO NOT make changes yet - just provide a review and recommendations.
```

### **Step 2: Review AI's Findings**

The AI will tell you:
- ✅ Which docs need updates
- ✅ Specific sections to modify
- ✅ Draft content for updates
- ✅ Whether any updates are needed at all

### **Step 3: Approve Updates**

If you agree with the AI's assessment, say:
```
Approved. Please update the documentation as recommended.
```

---

## 📊 **Weekly/Monthly Maintenance**

### **Weekly Check (5 minutes)**

Every week, verify:

```
Weekly Documentation Health Check:

1. Do the "Last Updated" dates reflect recent work?
2. Are there any TODO items in comments that should be documented?
3. Have we been following .cursorrules consistently?
4. Are there patterns we're repeating that should be documented?

If any issues found, note them for the next session.
```

### **Monthly Deep Review (30 minutes)**

Once a month, do a comprehensive review:

```
Monthly Documentation Audit:

1. Read through .cursorrules
   - Are all rules still relevant?
   - Are there new rules needed based on recent work?
   - Remove outdated rules

2. Review docs/architecture/UI_STATE_HANDLING.md
   - Are all current states documented?
   - Are transitions accurate?
   - Update screenshots/diagrams if UI changed

3. Review docs/architecture/ARCHITECTURE_PRINCIPLES.md
   - Does it still match how the app works?
   - Have responsibilities shifted?
   - Update examples if outdated

4. Check Historical Docs
   - Are bug reports still relevant?
   - Should resolved issues be moved to archive?

5. Update docs/maintenance/DOCUMENTATION_INDEX.md
   - Add any new docs
   - Update "Priority Reading" if needed
   - Verify all links work

After review, update all "Last Updated" dates to current date.
```

---

## 🎯 **File-Specific Update Triggers**

### **`.cursorrules`**

**Update When:**
- ❗ New critical rule discovered (bug prevention)
- ❗ State handling logic changes
- ❗ Auth/navigation flow changes
- ❗ Offline/online behavior changes
- ❗ Testing requirements change

**How Often:** Immediately when trigger occurs

**Template for New Rules:**
```markdown
### X. New Rule Title
**Brief description of what must/must not be done.**

Explanation of why this rule exists.

Example:
```typescript
// ❌ BAD
[code that violates rule]

// ✅ GOOD
[code that follows rule]
```

**When to apply:** [specific scenarios]
```

---

### **`docs/architecture/UI_STATE_HANDLING.md`**

**Update When:**
- ❗ New UI state added
- ❗ State transition logic changes
- ❗ State decision tree order changes
- 📝 New common mistake discovered

**How Often:** Immediately when UI states change

**What to Update:**
1. State Variables table (if new variables)
2. State Decision Tree (if logic changes)
3. Required UI Components (if new states)
4. State Transitions (if flows change)
5. Common Mistakes (if new issues found)
6. "Last Updated" date

---

### **`docs/architecture/ARCHITECTURE_PRINCIPLES.md`**

**Update When:**
- 📝 New design pattern established
- 📝 File responsibilities change
- 📝 Critical path modified
- 📝 Data validation strategy changes

**How Often:** Quarterly or when major refactoring occurs

**What to Update:**
1. Principles (if philosophy changes)
2. File Responsibilities (if roles shift)
3. Critical Paths (if flows change)
4. Examples (if outdated)
5. "Last Updated" date

---

### **Bug Reports / Fix Summaries**

**Update When:**
- ❗ Major bug discovered
- ❗ Data corruption issue
- ✅ Bug resolved

**How Often:** As bugs occur/resolve

**Create New Report For:**
- Critical bugs causing data loss
- Bugs affecting multiple users
- Bugs revealing systemic issues

**Update Existing Report For:**
- Bug resolution
- New related issues
- Implementation of fixes

---

## 🤖 **AI Assistant Integration**

### **Standard Prompts to Use**

#### **Before Starting Work:**
```
Before we begin, please review:
1. .cursorrules for critical rules
2. docs/architecture/UI_STATE_HANDLING.md for affected states
3. Relevant sections of docs/architecture/ARCHITECTURE_PRINCIPLES.md

Confirm you understand the rules and constraints for this work.
```

#### **During Work:**
```
[When about to make significant changes]

Pause: Does this change affect:
- UI states?
- Auth flows?
- Offline/online behavior?
- Data validation?

If yes, what documentation will need updating?
```

#### **After Work:**
```
Session complete. Please:
1. Summarize what we changed
2. Identify documentation that needs updates
3. Check if we violated any rules from .cursorrules
4. Recommend any new rules based on issues encountered
```

---

## 📝 **Documentation Quality Checklist**

Before considering documentation "updated":

### **For ALL Documentation:**
- [ ] Clear, concise language
- [ ] Code examples included
- [ ] "Last Updated" date current
- [ ] No broken references to other docs
- [ ] Consistent formatting

### **For `.cursorrules`:**
- [ ] Rules are actionable (not vague)
- [ ] Examples show both wrong and right way
- [ ] Rules reference relevant docs for details
- [ ] Critical rules prominently marked

### **For `docs/architecture/UI_STATE_HANDLING.md`:**
- [ ] All current states documented
- [ ] Decision tree matches Index.tsx logic
- [ ] Transitions have before/after examples
- [ ] Testing checklist includes new scenarios

### **For `docs/architecture/ARCHITECTURE_PRINCIPLES.md`:**
- [ ] Principles still match actual architecture
- [ ] File responsibilities accurate
- [ ] Examples use current codebase patterns
- [ ] Critical paths reflect current flows

---

## 🚨 **Red Flags: Documentation Out of Sync**

**Signs documentation needs immediate attention:**

1. **Code Review Confusion**
   - Reviewers asking "why are we doing it this way?"
   - Patterns don't match documented principles
   - Fix: Update principles or refactor code

2. **Repeated Mistakes**
   - Same bug/issue keeps occurring
   - Team members violating same rule
   - Fix: Add to `.cursorrules` prominently

3. **Onboarding Friction**
   - New developers confused by documentation
   - Documentation doesn't match actual code
   - Fix: Update docs to reflect reality

4. **AI Assistant Confusion**
   - Cursor AI making same mistakes repeatedly
   - AI suggesting patterns that violate rules
   - Fix: Update `.cursorrules` with clearer guidance

5. **State Mismatch**
   - UI shows states not in `docs/architecture/UI_STATE_HANDLING.md`
   - Decision tree doesn't match Index.tsx
   - Fix: Immediate sync required

---

## 🔧 **Tools to Help**

### **Git Commit Hook** (Reminder)

To install the documentation reminder hook:

```bash
cd shot-flow-builder
cp .git-hooks/pre-commit-docs-reminder.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

This will prompt you before commits that modify critical files.

### **Documentation Diff Check**

Before major releases, run:

```bash
# Check when docs were last updated
ls -la *.md | grep "Last Updated"

# Check git history of documentation
git log --since="1 month ago" --oneline -- "*.md"

# If no updates in a month but code changed significantly, review docs
```

### **AI-Assisted Review**

Use this prompt monthly:

```
Documentation Consistency Audit:

Compare our current codebase structure with our documentation:

1. Check Index.tsx state logic vs docs/architecture/UI_STATE_HANDLING.md decision tree
2. Check .cursorrules rules vs actual code patterns
3. Check docs/architecture/ARCHITECTURE_PRINCIPLES.md file responsibilities vs actual files
4. Identify any mismatches

Report findings and recommend specific updates.
```

---

## 📈 **Success Metrics**

**Good documentation health:**
- ✅ All critical files have "Last Updated" within 1 month
- ✅ .cursorrules matches current code patterns
- ✅ docs/architecture/UI_STATE_HANDLING.md matches Index.tsx logic
- ✅ No repeated bugs that should have been caught by rules
- ✅ New team members can onboard using docs
- ✅ AI assistants follow documented patterns

**Poor documentation health:**
- ❌ "Last Updated" dates > 3 months old
- ❌ Code patterns violate documented principles
- ❌ AI assistants suggesting anti-patterns
- ❌ Repeated mistakes not documented in .cursorrules
- ❌ Index.tsx has states not in documentation

---

## 🎓 **Training for Team Members**

If adding team members, ensure they understand:

1. **Documentation is Code**
   - Treat doc updates like code changes
   - Review documentation in PRs
   - Test examples in documentation

2. **Update on Change**
   - Don't wait for "documentation sprint"
   - Update docs in same PR as code changes
   - Use end-of-session review prompt

3. **Reference Before Changing**
   - Read .cursorrules before ANY changes
   - Check docs/architecture/UI_STATE_HANDLING.md before state changes
   - Verify docs/architecture/ARCHITECTURE_PRINCIPLES.md before refactoring

---

## 📅 **Recommended Schedule**

| Frequency | Activity | Time | Tool/Prompt |
|-----------|----------|------|-------------|
| **Every Session** | End-of-session review | 5 min | End-of-Session Prompt |
| **Every Commit** | Critical file check | Auto | Git Pre-Commit Hook |
| **Weekly** | Health check | 5 min | Weekly Check Prompt |
| **Monthly** | Deep audit | 30 min | Monthly Audit Prompt |
| **Quarterly** | Architecture review | 2 hours | Full team review |

---

## 🆘 **When Documentation Gets Out of Sync**

If documentation falls behind:

### **Quick Recovery Plan:**

**Week 1: Triage**
- Identify most critical docs (.cursorrules, docs/architecture/UI_STATE_HANDLING.md)
- Compare with current code
- List specific mismatches

**Week 2: Critical Updates**
- Update .cursorrules to match current patterns
- Sync docs/architecture/UI_STATE_HANDLING.md with Index.tsx
- Fix any "never do" rules that are wrong

**Week 3: Comprehensive Review**
- Update docs/architecture/ARCHITECTURE_PRINCIPLES.md
- Review all bug reports
- Update testing checklists

**Week 4: Validation**
- Have team member follow updated docs
- Use AI assistant with updated .cursorrules
- Test onboarding new person with docs

---

## 🎯 **Summary: Your Action Items**

### **Setup (One-Time):**
1. ✅ Install git pre-commit hook
2. ✅ Add end-of-session review to workflow
3. ✅ Set monthly calendar reminder for deep audit

### **Every Session:**
1. ✅ Start: Read .cursorrules before changes
2. ✅ End: Run end-of-session review prompt
3. ✅ Commit: Respond to documentation reminder

### **Monthly:**
1. ✅ Run documentation consistency audit
2. ✅ Update "Last Updated" dates
3. ✅ Archive/update bug reports as needed

---

*Keep this guide handy and reference it regularly!*
*Good documentation is the foundation of maintainable software.*

---

## 📁 **Where to Put New Documentation**

When creating new documentation files, follow this directory structure:

### **`docs/architecture/`**
**Put here:** Design principles, architectural patterns, state management
- Example: New UI pattern documentation
- Example: State machine updates
- Example: Component architecture changes

### **`docs/bugs-and-fixes/`**
**Put here:** Bug reports, post-mortems, fix summaries, test plans
- Example: `FEATURE_X_BUG_REPORT.md`
- Example: `PERFORMANCE_FIX_SUMMARY.md`
- Example: `TEST_PLAN_FEATURE_Y.md`

### **`docs/features/`**
**Put here:** Feature implementation guides, technical specs, how-to guides
- Example: `NEW_EXPORT_FEATURE.md`
- Example: `ADVANCED_FILTERING_IMPLEMENTATION.md`
- Example: `API_INTEGRATION_GUIDE.md`

### **`docs/sync-and-data/`**
**Put here:** Data synchronization, offline behavior, database operations
- Example: `CONFLICT_RESOLUTION_V2.md`
- Example: `CACHE_STRATEGY.md`
- Example: `DATABASE_MIGRATION_GUIDE.md`

### **`docs/component-docs/`**
**Put here:** Component-specific documentation, FAQs, usage guides
- Example: `ComponentName-faq.md`
- Example: `ComponentName-API.md`
- Example: `ComponentName-Styling-Guide.md`

### **`docs/maintenance/`**
**Put here:** Documentation about documentation, maintenance guides, reference cards
- Example: Updates to DOCUMENTATION_INDEX.md
- Example: New quick reference cards
- **Note:** This directory is for meta-documentation only

### **`docs/business/`**
**Put here:** Business logic, billing, security policies, compliance
- Example: `Payment_processing_notes.md`
- Example: `GDPR_compliance.md`
- Example: `API_rate_limiting.md`

### **`docs/drafts/`**
**Put here:** Work-in-progress documentation, incomplete guides, brainstorming
- Move to appropriate directory when complete
- Clean up old drafts regularly

### **Root `.cursorrules`**
**Keep at root:** This file MUST stay at project root for Cursor AI auto-loading
- Never move this file
- Update when adding critical rules

### **After Creating New Documentation:**
1. ✅ Add entry to `docs/README.md` (if new category or major doc)
2. ✅ Add entry to `docs/maintenance/DOCUMENTATION_INDEX.md`
3. ✅ Update cross-references in related documents
4. ✅ Follow naming convention: `FEATURE_NAME_TYPE.md` (uppercase with underscores)
5. ✅ Include "Last Updated" date at bottom
6. ✅ Add to git and commit with descriptive message

---

## 📝 **January 7, 2026 - Documentation Reorganization**

All documentation has been reorganized into a structured `/docs` directory:
- ✅ Created 8 logical subdirectories for different doc types
- ✅ Migrated 23 markdown files from root to appropriate locations
- ✅ Updated all path references across all documentation
- ✅ Created `docs/README.md` as entry point
- ✅ Maintained consistency across all maintenance procedures
- ✅ `.cursorrules` remains at root as required
- ✅ Added clear guidelines for where to put new documentation

**See also:** `docs/MIGRATION_SUMMARY.md` for complete migration details

---

**Last Updated:** January 7, 2026







