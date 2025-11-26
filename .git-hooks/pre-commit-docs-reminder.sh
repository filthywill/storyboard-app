#!/bin/bash

# Git Hook: Documentation Update Reminder
# Copy this to .git/hooks/pre-commit and make executable: chmod +x .git/hooks/pre-commit

echo "🔍 Checking if documentation updates may be needed..."

# Files that should trigger documentation review
CRITICAL_FILES=(
  "src/pages/Index.tsx"
  "src/store/authStore.ts"
  "src/utils/projectSwitcher.ts"
  "src/services/cloudSyncService.ts"
  "src/services/projectService.ts"
)

# Check if any critical files are being committed
changed_files=$(git diff --cached --name-only)
needs_review=false

for file in "${CRITICAL_FILES[@]}"; do
  if echo "$changed_files" | grep -q "$file"; then
    needs_review=true
    echo "  ⚠️  Modified: $file"
  fi
done

if [ "$needs_review" = true ]; then
  echo ""
  echo "┌─────────────────────────────────────────────────────┐"
  echo "│  📚 DOCUMENTATION UPDATE REMINDER                   │"
  echo "├─────────────────────────────────────────────────────┤"
  echo "│  You modified critical files. Consider updating:   │"
  echo "│                                                     │"
  echo "│  ✓ .cursorrules (if new rules added)               │"
  echo "│  ✓ UI_STATE_HANDLING.md (if states changed)        │"
  echo "│  ✓ ARCHITECTURE_PRINCIPLES.md (if patterns changed)│"
  echo "│                                                     │"
  echo "│  Have you updated relevant documentation? (y/n)    │"
  echo "└─────────────────────────────────────────────────────┘"
  echo ""
  
  read -p "Continue with commit? (y/n): " response
  
  if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "Commit cancelled. Update documentation and try again."
    exit 1
  fi
fi

echo "✅ Proceeding with commit..."
exit 0







