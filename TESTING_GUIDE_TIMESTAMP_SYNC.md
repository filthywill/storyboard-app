# Testing Guide: Hybrid Timestamp-Based Sync

## Quick Test Suite

### Test 1: Normal Sync (Baseline)
**Goal**: Verify basic sync still works

1. Create a new project "Test1" with 5 shots
2. Save and log out
3. Log back in
4. **Expected**: Project syncs to cloud successfully
5. **Console check**: Look for "✅ All validation passed for Test1. Syncing to cloud."

---

### Test 2: Offline Work Preservation
**Goal**: Verify local changes made offline are preserved and synced

**Setup:**
1. Create project "OfflineTest" with 3 shots
2. Save to cloud
3. Close browser but stay logged in

**Test:**
1. Open DevTools → Network tab → Click "Offline"
2. Reopen app (should load from local storage)
3. Add 4 more shots (total 7)
4. Go back online
5. Refresh page

**Expected Results:**
- Console shows timestamp comparison
- Local timestamp is newer than cloud
- All 7 shots sync to cloud
- No data loss warnings

**Console check:**
```
Timestamp comparison for OfflineTest: {
  local: "2025-10-20T14:30:00.000Z",
  cloud: "2025-10-20T14:00:00.000Z",
  diff: "1800000ms",
  localIsNewer: true
}
✅ All validation passed for OfflineTest. Syncing to cloud.
```

---

### Test 3: Empty Data Corruption Protection
**Goal**: Verify system prevents empty local data from overwriting cloud

**Setup:**
1. Create project "CorruptTest" with 10 shots
2. Save to cloud
3. Verify it's in cloud (refresh and check)

**Test:**
1. Open DevTools → Application → Local Storage
2. Find `shot-storage-project-{projectId}` for CorruptTest
3. Delete this key entirely (simulates corruption)
4. Keep `project-manager-storage` intact (metadata still shows 10 shots)
5. Refresh page

**Expected Results:**
- Console shows "❌ CRITICAL: No localStorage data found"
- Toast notification: "Local data for CorruptTest is corrupted. Cloud data preserved"
- Sync skipped
- Cloud still has 10 shots

**Console check:**
```
❌ CRITICAL: No localStorage data found for project xxx (CorruptTest)
✅ Guest project sync completed: {synced: 0, skipped: 1, reasons: "Check logs above"}
```

---

### Test 4: Partial Data Loss Protection
**Goal**: Verify >50% data loss is detected and prevented

**Setup:**
1. Create project "PartialTest" with 10 shots
2. Save to cloud

**Test:**
1. Open DevTools → Application → Local Storage
2. Find `shot-storage-project-{projectId}`
3. Double-click the value to edit
4. Copy JSON to text editor
5. Delete 7 out of 10 shots from `.state.shots` object (keep only 3)
6. Update `.state.shotOrder` to match (keep only 3 IDs)
7. Paste back and save
8. Refresh page

**Expected Results:**
- Console shows "⚠️ AMBIGUOUS CONFLICT: PartialTest local=3 shots vs cloud=10 shots"
- Toast notification: "Conflict detected... Preserving cloud data for safety"
- Sync skipped
- Cloud still has 10 shots

**Console check:**
```
Data validation for PartialTest: {
  expectedShots: 10,
  actualShots: 3,
  pages: 1
}
⚠️ AMBIGUOUS CONFLICT: PartialTest local=3 shots vs cloud=10 shots
```

---

### Test 5: Intentional Deletion
**Goal**: Verify intentional deletions sync correctly when timestamps confirm

**Setup:**
1. Create project "DeleteTest" with 10 shots
2. Save to cloud
3. Wait 10 seconds

**Test:**
1. Delete 7 shots normally through the UI (leave 3)
2. Save project
3. Log out and log back in

**Expected Results:**
- Cloud has more data (10 shots) than local (3 shots)
- BUT local timestamp is clearly newer (>5 seconds)
- System treats as intentional deletion
- 3 shots sync to cloud successfully

**Console check:**
```
⚠️ CLOUD HAS MORE DATA: DeleteTest local=3 shots vs cloud=10 shots
Local is newer by 12000ms - treating as intentional deletion
✅ All validation passed for DeleteTest. Syncing to cloud.
```

---

### Test 6: Cloud Newer than Local
**Goal**: Verify cloud data is preserved when it's more recent

**Setup:**
1. Have two browser sessions (A and B) logged in as same user
2. In Browser A: Create project "CloudNew" with 5 shots
3. Save to cloud

**Test:**
1. Browser B: Refresh to get the project
2. Browser B: Add 3 more shots (total 8) and save
3. Browser A: Still shows 5 shots locally (stale)
4. Browser A: Refresh page

**Expected Results:**
- Timestamp comparison shows cloud is newer
- Local sync is skipped
- Browser A downloads fresh data from cloud (8 shots)
- No data loss

**Console check:**
```
Timestamp comparison for CloudNew: {
  local: "2025-10-20T14:00:00.000Z",
  cloud: "2025-10-20T14:05:00.000Z",
  diff: "-300000ms",
  localIsNewer: false
}
✅ Cloud is newer for CloudNew, skipping sync
```

---

### Test 7: LastModified Only on Data Changes
**Goal**: Verify opening/switching projects doesn't update lastModified

**Test:**
1. Create project "TimestampTest" with 3 shots
2. Save and note the `lastModified` timestamp in console
3. Switch to another project
4. Switch back to "TimestampTest" (just viewing)
5. Check `lastModified` timestamp

**Expected Results:**
- `lastModified` timestamp unchanged
- Only `shotCount` and `pageCount` updated

**Test 2:**
1. Add 1 shot to "TimestampTest"
2. Save project
3. Check `lastModified` timestamp

**Expected Results:**
- `lastModified` timestamp updated to current time
- Confirms timestamp only updates on actual data changes

---

### Test 8: Clock Skew Tolerance
**Goal**: Verify ±5 seconds doesn't cause false positives

**Setup:**
1. Create project "SkewTest" with 5 shots
2. Save to cloud

**Test:**
1. Change system clock forward by 3 seconds
2. Refresh page
3. Add 1 shot (total 6)
4. Save

**Expected Results:**
- Despite 3-second skew, sync proceeds normally
- No false "cloud is newer" warnings
- 6 shots sync successfully

---

## Console Log Checklist

When testing, look for these key log patterns:

### ✅ Good Signs:
- `Timestamp comparison for X:` - Shows decision-making
- `✅ Cloud is newer for X, skipping sync` - Correct behavior
- `✅ All validation passed for X. Syncing to cloud.` - Safe to proceed
- `✅ Guest project sync completed: {synced: X, skipped: Y}` - Summary

### ⚠️ Safety Triggers (Expected):
- `❌ CRITICAL: No localStorage data found` - Corruption detected
- `❌ LOCAL DATA CORRUPTED` - Empty data when expecting data
- `⚠️ AMBIGUOUS CONFLICT` - Significant data loss detected
- `⚠️ CLOUD HAS MORE DATA` - Cloud protection activated

### ❌ Bad Signs (Should NOT see):
- No timestamp comparison logs (implementation not working)
- Sync proceeding despite corrupted data
- Toast errors about data loss after sync
- Projects with 0 shots in cloud when they had data before

---

## Quick Validation Commands

### Check Project Timestamps in Database:
```sql
SELECT 
  p.name,
  p.updated_at as project_updated,
  pd.updated_at as data_updated,
  jsonb_array_length(pd.pages) as pages,
  (SELECT COUNT(*) FROM jsonb_object_keys(pd.shots)) as shots
FROM projects p
LEFT JOIN project_data pd ON p.id = pd.project_id
WHERE p.user_id = 'your-user-id'
ORDER BY pd.updated_at DESC;
```

### Check Local Storage in Console:
```javascript
// Get all project metadata
const metadata = JSON.parse(localStorage.getItem('project-manager-storage'));
console.table(metadata.state.projects);

// Check specific project data
const projectId = 'your-project-id';
const shotData = JSON.parse(localStorage.getItem(`shot-storage-project-${projectId}`));
console.log('Shot count:', Object.keys(shotData.state.shots).length);
```

---

## Expected Test Outcomes Summary

| Test | Should Sync? | Cloud Preserved? | Toast Shown? |
|------|--------------|------------------|--------------|
| 1. Normal | ✅ Yes | N/A | Success |
| 2. Offline | ✅ Yes | N/A | Success |
| 3. Empty corruption | ❌ No | ✅ Yes | Warning |
| 4. Partial loss | ❌ No | ✅ Yes | Warning |
| 5. Intentional delete | ✅ Yes | ❌ No | Success |
| 6. Cloud newer | ❌ No | ✅ Yes | None (silent) |
| 7. Just viewing | N/A | N/A | None |
| 8. Clock skew | ✅ Yes | N/A | Success |

---

## Debugging Tips

If sync isn't working as expected:

1. **Check Console Logs**: Look for timestamp comparisons and validation results
2. **Verify Timestamps**: Check both `lastModified` (local) and `data_updated_at` (cloud)
3. **Inspect Local Storage**: Ensure data actually exists and matches metadata
4. **Check Network Tab**: Verify Supabase queries are fetching `data_updated_at`
5. **Clear Cache**: Sometimes stale metadata causes issues - clear and retry

## Reporting Issues

When reporting bugs, include:
- Test scenario being run
- Console logs (timestamp comparison + validation)
- Local storage state (shot counts)
- Cloud database state (use SQL query above)
- Toast notifications shown
- Expected vs actual behavior




