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
| `UI_STATE_HANDLING.md` | States change |
| `ARCHITECTURE_PRINCIPLES.md` | Patterns change |

---

## ⚠️ **Red Flags**

Documentation needs attention if:
- ❌ Same bug keeps recurring
- ❌ AI suggests anti-patterns
- ❌ Code doesn't match docs
- ❌ "Last Updated" > 1 month

---

## 🎯 **File Change Triggers**

**Index.tsx** → Update `UI_STATE_HANDLING.md`  
**authStore.ts** → Update `.cursorrules` + `UI_STATE_HANDLING.md`  
**ProjectSwitcher** → Update `ARCHITECTURE_PRINCIPLES.md`  
**CloudSyncService** → Update `.cursorrules` (sync rules)  

---

## 🚨 **Emergency: If Docs Out of Sync**

1. Update `.cursorrules` first (most critical)
2. Sync `UI_STATE_HANDLING.md` with Index.tsx
3. Test AI assistant with updated rules
4. Schedule full review

---

## 🔗 **Quick Links**

**Full Guide:** `DOCUMENTATION_MAINTENANCE.md`  
**Index:** `DOCUMENTATION_INDEX.md`  
**Setup:** `shot-flow-builder/setup-doc-maintenance.sh`

---

## 💡 **Remember:**

> "Update documentation in the same session as code changes,
> not later in a 'documentation sprint'."

> "If you're adding a rule to .cursorrules, something went wrong.
> Document what and why."

> "Documentation is code. Treat it the same way."

---

*Keep this visible during development!*
*See DOCUMENTATION_MAINTENANCE.md for detailed instructions.*







