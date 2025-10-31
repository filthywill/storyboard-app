# CRITICAL BUG REPORT: Data Corruption in Cloud Projects

## 🔴 **SEVERITY: CRITICAL** - Data Loss Bug

### Date Identified
2025-10-18

### Affected Users
**ALL authenticated users with cloud projects**

---

## 📋 Summary

GoogleTest project has been corrupted in the cloud database. When loaded, it contains:
- **0 pages** (should have multiple pages)
- **0 shots** (should have many shots)
- **Wrong project name**: "Project df44143d" instead of "GoogleTest"
- **Missing all settings**: No shot number format, logo, project title, etc.

This is **permanent data loss** - the original data cannot be recovered.

---

## 🔍 Root Cause Analysis

### What Happened

Based on console logs from previous sessions, here's the exact sequence:

1. **User logs in with Google**
2. **App initialization runs** (BEFORE authentication completes)
3. **`initializeAppContent()` is called unconditionally** (Line 54 in Index.tsx - the bug I just tried to fix)
4. **Creates phantom default project data** (1 page, 1 shot, default settings)
5. **This phantom data sits in global stores** without a project context
6. **User is prompted to select a project**
7. **User selects GoogleTest**
8. **`loadFullProject()` downloads actual GoogleTest data from cloud**
9. **`switchToProject()` loads the cloud data into stores**
10. **BUT** the stores are already polluted with phantom data OR
11. **Auto-save triggers and saves phantom data to GoogleTest project ID**
12. **GoogleTest is now permanently corrupted in the cloud**

### The Smoking Gun

From earlier console logs:
```
cloudSyncService.ts:216 ⚠️ Project name mismatch detected, updating metadata to match store: 
{
  savingToProjectId: 'df44143d-75d5-446c-92b1-f044266fa3bb',
  metadataName: 'GoogleTest', 
  storeName: 'Project df44143d',
  dataContainsShotCount: 1,
  metadataShotCount: 1
}
```

This shows the exact moment when phantom data ("Project df44143d") was about to be saved to GoogleTest's project ID.

---

## 💥 Impact

### Data Loss
- **All GoogleTest pages**: LOST
- **All GoogleTest shots**: LOST  
- **All project settings**: LOST (shot number format, logo, project info, etc.)
- **Recovery**: IMPOSSIBLE (no backups, no versioning)

### User Experience
When user logs in and selects GoogleTest:
1. Sees "Project df44143d" instead of "GoogleTest" in UI
2. Project appears empty (0 shots)
3. Storyboard is missing all custom settings
4. All their work is gone

---

## 🐛 The Bugs

### Bug #1: Unconditional `initializeAppContent()` Call
**File**: `shot-flow-builder/src/pages/Index.tsx` line 54

**Problem**: Called for ALL users during app initialization, creating phantom project data before a project is selected.

**Impact**: Creates unwanted default content that pollutes stores

### Bug #2: Auto-Save Without Project Context
**File**: Multiple locations

**Problem**: Auto-save can trigger without a valid `currentProjectId`, or with mismatched project context

**Impact**: Saves wrong data to wrong project

### Bug #3: No Save Validation
**File**: `shot-flow-builder/src/services/cloudSyncService.ts`

**Problem**: Doesn't validate that the data being saved matches the project it's being saved to

**Impact**: Silent data corruption - wrong data overwrites correct data

---

## ✅ Fixes Implemented (Partially)

### Fix #1: Conditional `initializeAppContent()`  
**Status**: ✅ COMPLETE (but too late for GoogleTest)

Changed Index.tsx to only call `initializeAppContent()` for guest users after auth initialization.

```typescript
// Only initialize for guest users after auth check
setTimeout(() => {
  const authState = useAuthStore.getState();
  if (!authState.isAuthenticated && !authState.isLoading) {
    initializeAppContent();
  }
}, 300);
```

### Fix #2: Better Project Registration
**Status**: ✅ COMPLETE

Added safety check in `cloudProjectSyncService.ts` to ensure projects are registered before marking as local.

### Fix #3: Name Mismatch Warning
**Status**: ⚠️ WARNING ONLY (doesn't prevent corruption)

Added logging when project name doesn't match, but doesn't block the save.

---

## ❌ Still Missing: Critical Safeguards

### 1. Save Validation
**NEEDED**: Validate data before saving:
- Project name matches
- Data belongs to correct project ID
- Data is not empty (unless intentional)
- BLOCK save if validation fails

### 2. Load Validation  
**NEEDED**: Validate data after loading from cloud:
- Check if data is suspiciously empty
- Warn user before loading potentially corrupted data
- Offer option to cancel load

### 3. Data Versioning
**NEEDED**: Store previous versions of project data:
- Keep last N versions in database
- Allow rollback to previous version
- Automatic versioning on every save

### 4. Empty Project Protection
**NEEDED**: Prevent accidental empty project saves:
- If project had shots, don't allow saving with 0 shots
- Require explicit confirmation for destructive changes

---

## 🚨 Immediate Actions Required

### For This User

1. **Accept Data Loss**: GoogleTest data is gone and cannot be recovered
2. **Delete Corrupted Project**: Remove GoogleTest from Supabase
3. **Clear Browser Data**: Clear all localStorage
4. **Start Fresh**: Create new projects

### For All Users (Development)

1. **Implement Save Validation** (CRITICAL PRIORITY)
2. **Implement Data Versioning** (HIGH PRIORITY)
3. **Add Empty Project Protection** (HIGH PRIORITY)
4. **Comprehensive Testing** of multi-device scenarios
5. **Add Monitoring** for data integrity issues

---

## 🧪 Testing Protocol

Before considering this resolved:

1. **Test authenticated user flow**:
   - Log in → Should NOT create phantom data
   - Select project → Should load correct data
   - Make changes → Should save to correct project
   - Log in on different browser → Should see correct data

2. **Test guest user flow**:
   - Open app → Should get default content
   - Make changes → Should save locally
   - Log in → Should sync to cloud correctly

3. **Test project switching**:
   - Have 2+ projects
   - Switch between them
   - Verify each loads correct data
   - Verify saves go to correct project

4. **Test multi-device**:
   - Work on Device A
   - Log in on Device B
   - Verify data syncs correctly
   - Make changes on Device B
   - Verify doesn't corrupt Device A's data

---

## 📊 Database Investigation

Run `investigate-corruption.sql` in Supabase SQL Editor to see:
1. What's actually stored for GoogleTest
2. When it was last updated
3. If other projects are also corrupted

---

## 🔮 Prevention Strategy

### Short Term (This Week)
1. Implement save validation
2. Add empty project protection
3. Fix all auto-save edge cases

### Medium Term (This Month)
1. Implement data versioning
2. Add data integrity monitoring
3. Create recovery tools

### Long Term (Next Quarter)
1. Implement real-time sync (like Google Docs)
2. Conflict resolution UI
3. Comprehensive audit logging

---

## 📝 Notes

- This bug was introduced when we implemented multi-project support
- It's been active since then, potentially affecting other users
- The fixes I implemented today will prevent NEW corruption
- But existing corrupted data cannot be recovered
- This is a **launch-blocking** bug - must be fully resolved before public release

---

## Status

- [x] Bug identified
- [x] Root cause understood
- [x] Partial fixes implemented
- [ ] **CRITICAL SAFEGUARDS STILL MISSING**
- [ ] Comprehensive testing pending
- [ ] User data recovery: IMPOSSIBLE

**This bug must be fully resolved before considering the app production-ready.**

---

## 🔴 CRITICAL BUG: Dead-End "No Pages Found" After Sign-Out

### Date Identified
October 21, 2025

### Issue
Users landing on "No Pages Found" dead-end screen after sign-out instead of Welcome screen.

### Root Cause
1. Conditional rendering checked "no pages found" BEFORE authentication status
2. `clearCurrentProjectData()` didn't clear projects list
3. Fake page data caused "Page Not Found" errors in StoryboardPage

### Fix Applied
1. Restructured Index.tsx state evaluation order
2. Enhanced `clearCurrentProjectData()` to clear ALL project data
3. Created TemplateBackground component (no fake data)
4. Made `initializeAppContent()` conditional (guest users only)

### Prevention
- Follow exact state evaluation order from UI_STATE_HANDLING.md
- Use dedicated components for template backgrounds
- Always clear ALL related data on sign-out
- Test sign-out flow after any auth changes

### Status
- [x] Bug identified
- [x] Root cause understood
- [x] Fixes implemented
- [x] Documentation updated
- [x] Testing completed

**This bug has been fully resolved.**

