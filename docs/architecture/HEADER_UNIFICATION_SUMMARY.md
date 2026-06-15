# Header Unification Summary

## Objective
Unified the app's top header across all internal pages (Index + Billing routes) by creating a single shared header component.

## What Was Done

### 1. Created New Shared Component
**File:** `src/components/layout/AppHeader.tsx`

The unified header component includes:
- **Logo** (left side) - 36px height, consistent across all pages
- **Auth UI** (right side) - Sign In button (when logged out) or UserAccountDropdown (when logged in)
- **OfflineBanner** - Shows connection status and sync information
- **AuthModal** - Modal for sign-in/sign-up flows

**Props:**
- `rightSlot?: React.ReactNode` - Optional content to render before auth UI
- `showOfflineBanner?: boolean` - Control offline banner display (default: true)
- `logoClickable?: boolean` - Make logo navigate to home (default: false)

### 2. Refactored ProjectSelector
**File:** `src/components/ProjectSelector.tsx`

Added `renderAuthUI?: boolean` prop (default: true) to control whether ProjectSelector renders auth UI.

**Purpose:** ProjectSelector originally contained both:
1. Auth UI rendering (Sign In button / UserAccountDropdown)
2. Project management dialogs (Create Project, Upgrade, Limits)

With the new AppHeader handling auth UI, ProjectSelector now focuses on project management dialogs only when used with AppHeader.

### 3. Updated Pages

#### Index.tsx
- **Replaced:** Inline header markup with `<AppHeader />`
- **Kept:** ProjectSelector with `renderAuthUI={false}` to maintain project creation dialog logic
- **Removed:** Unused OfflineBanner import (now handled by AppHeader)
- **Preserved:** AuthModal and showAuthModal state for programmatic auth triggers (forced logout, project limits, etc.)

#### Billing Pages
Updated all three billing pages to use unified header:
- `src/pages/billing/BillingPage.tsx`
- `src/pages/billing/BillingSuccessPage.tsx`
- `src/pages/billing/BillingCanceledPage.tsx`

**Changes:**
- Replaced inline header markup with `<AppHeader logoClickable />`
- Logo now clickable on billing pages (navigates to `/`)
- OfflineBanner now visible on billing pages (was previously absent)
- Removed UserAccountDropdown imports (now handled by AppHeader)

### 4. Pages Not Changed
**Privacy Policy and Terms of Service** pages were intentionally left unchanged. These are public/static content pages with different header requirements:
- Same logo asset as main app (`/storyboardflow-whc_01.png`)
- Different logo size (42px)
- Simple "Back to App" button instead of auth UI
- No offline banner needed

## Key Differences: Before vs After

### Logo
- **Before:** Index (36px, not clickable), Billing (48px, clickable button)
- **After:** All pages (36px, clickable on billing via `logoClickable` prop)

### Auth UI
- **Before:** Inline in each page, different implementations
- **After:** Centralized in AppHeader, consistent across all pages

### OfflineBanner
- **Before:** Only on Index page
- **After:** On all internal pages (Index + Billing)

### Code Duplication
- **Before:** Header markup duplicated across 4+ files
- **After:** Single source of truth in AppHeader.tsx

## Project Selection
Project selection UI is **NOT** part of the unified header. It remains separate:
- ProjectSelector component manages project creation dialogs
- These dialogs are triggered from Index.tsx logic, not from header
- This separation maintains clean architecture: header = navigation/auth shell, project management = app-specific logic

## Testing Checklist
- [x] No TypeScript errors
- [x] No linter errors
- [ ] Manual test: Index page shows header with logo + auth UI
- [ ] Manual test: Billing pages show header with clickable logo + auth UI
- [ ] Manual test: OfflineBanner appears on all pages when offline
- [ ] Manual test: Sign In button opens auth modal correctly
- [ ] Manual test: UserAccountDropdown shows when logged in
- [ ] Manual test: Logo click on billing pages navigates to home
- [ ] Manual test: Project creation flow still works on Index

## Benefits
1. **Consistency:** All internal pages have identical header styling and behavior
2. **Maintainability:** Update header once, changes apply everywhere
3. **Reduced Code:** ~100+ lines of duplicate header markup removed
4. **Flexibility:** Optional props allow per-page customization without breaking consistency
5. **Better UX:** OfflineBanner now appears on billing pages, improving user awareness

## Files Modified
- ✅ `src/components/layout/AppHeader.tsx` (created)
- ✅ `src/components/ProjectSelector.tsx` (refactored)
- ✅ `src/pages/Index.tsx` (updated)
- ✅ `src/pages/billing/BillingPage.tsx` (updated)
- ✅ `src/pages/billing/BillingSuccessPage.tsx` (updated)
- ✅ `src/pages/billing/BillingCanceledPage.tsx` (updated)

## Notes
- Two AuthModal instances exist (AppHeader's and Index's) - this is intentional. AppHeader's modal handles Sign In button clicks; Index's modal handles programmatic auth triggers (forced logout, project limits, etc.)
- Logo size standardized to 36px (from Index) rather than 48px (from billing) per user requirements
- Backward compatibility maintained: ProjectSelector still works standalone with `renderAuthUI={true}` (default)
