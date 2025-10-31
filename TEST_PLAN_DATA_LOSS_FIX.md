# Test Plan: Data Loss Prevention Fix

## Setup
- Two browsers: Browser A (Chrome) and Browser B (Firefox/Incognito)
- Clear all localStorage before starting
- Have browser console open to see validation logs

---

## Test 1: Normal Multi-Project Sync ✅
**Objective**: Verify that normal sync works without false positives

### Steps
1. Browser A: Sign up/login
2. Create "TestProject1" with 3 shots (add some content)
3. Create "TestProject2" with 5 shots (add some content)
4. Verify both projects show correct shot counts in project selector
5. Log out
6. Log back in
7. Open project picker modal

### Expected Results
- ✅ Both projects appear with correct shot counts
- ✅ Console shows: `✅ Data validation passed for TestProject1. Proceeding with sync.`
- ✅ Console shows: `✅ Data validation passed for TestProject2. Proceeding with sync.`
- ✅ Console shows: `✅ Guest project sync completed: 2 synced, 0 skipped`
- ✅ Toast: "✅ Synced 2 projects to cloud"

---

## Test 2: Detect Empty localStorage (CRITICAL) 🔴
**Objective**: Reproduce the Saturday1 bug and verify it's fixed

### Steps
1. Browser A: Login and create "ProjectWithData" with 5 shots
2. Let it auto-save to cloud (wait 3 seconds)
3. Create "EmptyProject" with 0 shots (just empty)
4. Log out
5. Open browser DevTools → Application → Local Storage
6. Delete these keys for "ProjectWithData":
   - `page-storage-project-{projectId}`
   - `shot-storage-project-{projectId}`
7. Log back in

### Expected Results
- ✅ Console shows: `❌ CRITICAL DATA MISMATCH: ProjectWithData expects 5 shots but localStorage has 0!`
- ✅ Console shows: `This would result in DATA LOSS. Skipping sync for safety.`
- ✅ Console shows: `Cloud has 5 shots. Local localStorage may be corrupted or cleared.`
- ✅ Toast warning: "Project 'ProjectWithData' has local data issues. Skipping sync to preserve cloud data."
- ✅ Console shows: `Guest project sync completed: 0 synced, 1 skipped`
- ✅ Cloud data remains intact with 5 shots

---

## Test 3: Detect Partial Data Loss 🟡
**Objective**: Catch scenarios where some data is lost

### Steps
1. Browser A: Create "ProjectHalf" with 10 shots
2. Let it save to cloud
3. Log out
4. Open DevTools → Local Storage
5. Find `shot-storage-project-{projectId}` and manually edit it
6. Remove 6 shots from the JSON (leave only 4)
7. Save the edited localStorage
8. Log back in

### Expected Results
- ✅ Console shows: `⚠️ WARNING: ProjectHalf expects 10 shots but only found 4`
- ✅ Console shows: `This is a 50%+ data loss. Skipping sync for safety.`
- ✅ Toast warning: "Project 'ProjectHalf' may have incomplete data. Skipping sync for safety."
- ✅ Sync skipped, cloud data preserved

---

## Test 4: Cloud Has More Data Protection 🟣
**Objective**: Prevent local stale data from overwriting fresher cloud data

### Steps
1. Browser A: Create "CloudProject" with 8 shots
2. Let it save to cloud
3. Log out
4. Browser B: Log in to same account
5. Open "CloudProject" and delete 5 shots (leave 3)
6. Log out from Browser B (do NOT sync - cloud still has 8)
7. Open DevTools on Browser B
8. Edit localStorage for "CloudProject" to have only 3 shots
9. Update `project-manager-storage` to show shotCount: 3
10. Log back in on Browser B

### Expected Results
- ✅ Console shows: `❌ CLOUD DATA PROTECTION: CloudProject has 8 shots in cloud but only 3 locally`
- ✅ Console shows: `This would result in DATA LOSS. Skipping sync to preserve cloud data.`
- ✅ Toast error with shot count mismatch
- ✅ Cloud maintains 8 shots

---

## Test 5: Project Switching Integrity 🔵
**Objective**: Ensure data is properly saved when switching between projects

### Steps
1. Browser A: Create "Alpha" with 3 shots
2. Create "Beta" with 5 shots
3. Switch to "Alpha" (add 2 more shots = 5 total)
4. Switch to "Beta" (add 1 more shot = 6 total)
5. Switch back to "Alpha"
6. Wait 5 seconds for auto-save
7. Log out
8. Log back in

### Expected Results
- ✅ "Alpha" shows 5 shots
- ✅ "Beta" shows 6 shots
- ✅ Both sync successfully
- ✅ All data intact in cloud

---

## Test 6: New Empty Project (No False Positive) 🟢
**Objective**: Ensure validation doesn't block legitimate empty projects

### Steps
1. Browser A: Login
2. Create "EmptyProject" with 0 shots
3. Log out immediately
4. Log back in

### Expected Results
- ✅ Empty project syncs without error
- ✅ No validation warnings
- ✅ Console shows: `✅ Validation passed: Saving empty project data is allowed (cloud is also empty or new project)`
- ✅ Project appears in project picker with "0 shots"

---

## Test 7: Concurrent Session Handling 🔶
**Objective**: Verify fix works with session management

### Steps
1. Browser A: Login and create "SessionTest" with 4 shots
2. Browser B: Login with same account (this logs out Browser A)
3. Browser B: Open "SessionTest" - should load correctly
4. Browser A: Refresh page, login again
5. Check if "SessionTest" data is correct

### Expected Results
- ✅ Data consistency maintained across sessions
- ✅ No data loss during session transitions
- ✅ All 4 shots preserved

---

## Test 8: Edge Case - Corrupted Project Manager 🔴
**Objective**: Handle cases where project manager metadata is wrong

### Steps
1. Browser A: Create "CorruptMetadata" with 7 shots
2. Let it save to cloud
3. Log out
4. Open DevTools → Local Storage
5. Edit `project-manager-storage` JSON:
   - Set "CorruptMetadata" shotCount to 15 (wrong!)
6. Edit shot storage to actually have 0 shots
7. Log back in

### Expected Results
- ✅ Console shows: `❌ CRITICAL DATA MISMATCH: CorruptMetadata expects 15 shots but localStorage has 0!`
- ✅ Sync skipped
- ✅ Cloud data preserved (7 shots)

---

## Test 9: Database Layer Protection 🛡️
**Objective**: Verify ProjectService.saveProject catches issues

### Steps
1. Create project with 10 shots in cloud
2. Use browser console to manually call:
```javascript
// Inject test
const { ProjectService } = await import('./src/services/projectService');
await ProjectService.saveProject('project-id-here', {
  pages: [],
  shots: {},
  projectSettings: {},
  uiSettings: {}
});
```

### Expected Results
- ✅ Console error: `❌ CRITICAL: Prevented data loss! Cloud has 10 shots, refusing to overwrite with 0 shots.`
- ✅ Error thrown: "Data validation failed: Cannot overwrite 10 shots with empty data"
- ✅ Cloud data remains intact

---

## Validation Checklist

After running all tests:

### Console Messages to Verify
- [ ] ✅ markers for successful validations
- [ ] ❌ markers for critical errors
- [ ] ⚠️ markers for warnings
- [ ] Detailed shot count comparisons in logs
- [ ] Clear skip reasons

### User Experience
- [ ] Toast notifications appear for all data issues
- [ ] No false positives (empty projects work fine)
- [ ] Cloud data never corrupted
- [ ] Project picker shows accurate shot counts

### Data Integrity
- [ ] No valid cloud data overwritten
- [ ] All projects maintain correct shot counts
- [ ] localStorage corruption detected and skipped
- [ ] Metadata mismatches caught

---

## Quick Smoke Test (2 minutes)

For rapid verification after deployment:

1. Login → Create 2 projects with shots → Logout
2. Clear localStorage for one project → Login
3. Verify: Console shows skip warning for cleared project
4. Verify: Other project syncs normally
5. ✅ Core fix confirmed working

---

## Regression Test

Ensure existing functionality still works:

- [ ] Creating new projects
- [ ] Editing shots
- [ ] Deleting shots  
- [ ] Switching projects
- [ ] Auto-save functionality
- [ ] Manual sync
- [ ] Project deletion
- [ ] Image uploads
- [ ] Export functionality

---

## Success Criteria

**Fix is validated when:**
1. ✅ All 9 tests pass
2. ✅ No false positives (Test 6)
3. ✅ Original bug (Test 2) is prevented
4. ✅ User receives clear feedback for data issues
5. ✅ No regression in existing features

---

## If Tests Fail

1. Check console for specific validation messages
2. Verify file changes were applied correctly
3. Clear browser cache and restart dev server
4. Check if TypeScript compiled without errors
5. Review `DATA_LOSS_FIX_SUMMARY.md` for implementation details

---

**Test Status**: ⏳ Ready to execute
**Estimated Time**: 30-45 minutes for full suite
**Quick Test**: 2-5 minutes for smoke test




