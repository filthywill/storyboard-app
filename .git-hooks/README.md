# Git Hooks for Documentation Maintenance

## 📋 Installation

### Option 1: Automatic (Recommended)

Run this command from the `shot-flow-builder` directory:

```bash
cp .git-hooks/pre-commit-docs-reminder.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

### Option 2: Manual

1. Copy the hook file:
   ```bash
   cd shot-flow-builder
   cp .git-hooks/pre-commit-docs-reminder.sh .git/hooks/pre-commit
   ```

2. Make it executable:
   ```bash
   chmod +x .git/hooks/pre-commit
   ```

3. Verify it works:
   ```bash
   # Make a small change to Index.tsx
   git add src/pages/Index.tsx
   git commit -m "test"
   # You should see the documentation reminder
   ```

## 🔧 What It Does

The pre-commit hook checks if you're committing changes to critical files:

**Critical Files Monitored:**
- `src/pages/Index.tsx`
- `src/store/authStore.ts`
- `src/utils/projectSwitcher.ts`
- `src/services/cloudSyncService.ts`
- `src/services/projectService.ts`

**When You Commit Changes to These Files:**
- Hook displays a reminder to update documentation
- Asks for confirmation before proceeding
- You can cancel commit to update docs first

## 🎯 Example Output

```
🔍 Checking if documentation updates may be needed...
  ⚠️  Modified: src/pages/Index.tsx

┌─────────────────────────────────────────────────────┐
│  📚 DOCUMENTATION UPDATE REMINDER                   │
├─────────────────────────────────────────────────────┤
│  You modified critical files. Consider updating:   │
│                                                     │
│  ✓ .cursorrules (if new rules added)               │
│  ✓ UI_STATE_HANDLING.md (if states changed)        │
│  ✓ ARCHITECTURE_PRINCIPLES.md (if patterns changed)│
│                                                     │
│  Have you updated relevant documentation? (y/n)    │
└─────────────────────────────────────────────────────┘

Continue with commit? (y/n):
```

## 🚫 Disabling the Hook

If you need to temporarily disable:

```bash
# Rename the hook
mv .git/hooks/pre-commit .git/hooks/pre-commit.disabled

# Re-enable later
mv .git/hooks/pre-commit.disabled .git/hooks/pre-commit
```

Or skip for a single commit:
```bash
git commit --no-verify -m "your message"
```

## 🔄 Updating the Hook

When the hook file is updated:

```bash
# Re-copy from .git-hooks directory
cp .git-hooks/pre-commit-docs-reminder.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## 📝 Adding More Critical Files

To monitor additional files, edit `.git-hooks/pre-commit-docs-reminder.sh`:

```bash
CRITICAL_FILES=(
  "src/pages/Index.tsx"
  "src/store/authStore.ts"
  "src/utils/projectSwitcher.ts"
  "src/services/cloudSyncService.ts"
  "src/services/projectService.ts"
  "path/to/your/new/file.ts"  # Add here
)
```

Then re-install the hook.

## ✅ Benefits

- **Catch Missing Updates:** Reminds you before committing
- **Maintain Consistency:** Keeps docs in sync with code
- **Zero Friction:** Only prompts when needed
- **Team Alignment:** Everyone gets same reminders

## 🆘 Troubleshooting

**Hook Not Running?**
- Check it's executable: `ls -la .git/hooks/pre-commit`
- Should show: `-rwxr-xr-x`
- If not: `chmod +x .git/hooks/pre-commit`

**Want to Bypass Once?**
- Use: `git commit --no-verify -m "message"`

**Hook Causing Issues?**
- Temporarily disable (see above)
- Report issue and we'll fix the hook

---

*Part of the Documentation Maintenance System*
*See: `../DOCUMENTATION_MAINTENANCE.md` for full guide*



