#!/bin/bash

echo "📚 Setting up Documentation Maintenance System..."
echo ""

# Check if we're in the right directory
if [ ! -d ".git" ]; then
  echo "❌ Error: Must run from shot-flow-builder directory (where .git exists)"
  exit 1
fi

# Install git hook
echo "1️⃣ Installing git pre-commit hook..."
if [ -f ".git-hooks/pre-commit-docs-reminder.sh" ]; then
  cp .git-hooks/pre-commit-docs-reminder.sh .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit
  echo "   ✅ Git hook installed: .git/hooks/pre-commit"
else
  echo "   ⚠️  Hook file not found: .git-hooks/pre-commit-docs-reminder.sh"
  echo "   Skipping git hook installation"
fi

echo ""
echo "2️⃣ Documentation files ready:"
echo "   📄 ../.cursorrules"
echo "   📄 ../ARCHITECTURE_PRINCIPLES.md"
echo "   📄 ../UI_STATE_HANDLING.md"
echo "   📄 ../DOCUMENTATION_INDEX.md"
echo "   📄 ../DOCUMENTATION_MAINTENANCE.md"

echo ""
echo "✅ Setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Read the maintenance guide:"
echo "   cat ../DOCUMENTATION_MAINTENANCE.md"
echo ""
echo "2. Test the git hook:"
echo "   # Make a small change to Index.tsx"
echo "   # git add src/pages/Index.tsx"
echo "   # git commit -m 'test'"
echo "   # You should see documentation reminder"
echo ""
echo "3. Use end-of-session review prompt (see DOCUMENTATION_MAINTENANCE.md)"
echo ""
echo "4. Set monthly calendar reminder for documentation audit"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Quick Reference:"
echo "   - Before changes: Read ../.cursorrules"
echo "   - After session: Run end-of-session review"
echo "   - Monthly: Run documentation audit"
echo ""
echo "For full instructions: ../DOCUMENTATION_MAINTENANCE.md"
echo ""



