# StoryboardFlow Test User Cleanup

This guide documents the developer-only Supabase cleanup utility:

```bash
scripts/delete-test-user.js
```

Run it through the package command:

```bash
npm run cleanup:test-user
```

The utility is a local admin tool for inspecting, dry-running, and deleting test users from Supabase. It is safe by default: commands run in dry-run mode unless `--confirm-delete` is provided, bulk and range deletions require interactive `DELETE` confirmation, and confirmed deletions run post-deletion verification.

The script loads admin credentials from the current shell environment or from `.env.admin`.

---

## Setup

Run commands from the project root:

```bash
cd ~/projects/storyboard-app-claude
```

The script requires:

```env
SUPABASE_URL=your-supabase-project-url
SERVICE_ROLE_KEY=your-supabase-service-role-key
```

You can set these in your shell or in a local `.env.admin` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SERVICE_ROLE_KEY=your-service-role-key
```

Shell environment variables take precedence over `.env.admin`.

Never commit `.env.admin`. The service role key must be a Supabase `service_role` key and must never be exposed through frontend `VITE_*` variables.

Optional checks:

```bash
echo $SUPABASE_URL
echo ${#SERVICE_ROLE_KEY}
```

`SUPABASE_URL` should print your Supabase project URL. `SERVICE_ROLE_KEY` length should be a large number, not `0`.

---

## What Deletion Covers

For each target user, confirmed deletion removes:

- Supabase Auth user
- `user_profiles`
- `projects`
- `project_data`
- `project_images`
- `user_sessions`
- `billing_subscriptions`
- `user_storyboard_themes`
- Storage files under `project-images/{authUserId}/`

The deletion order is storage files, app database rows, then the Supabase Auth user.

The script deletes the Supabase-side billing mapping in `billing_subscriptions`; it does not delete external Stripe Customer, Subscription, Payment, or Invoice records.

---

## Supported Commands

### Single User

Dry-run one user:

```bash
npm run cleanup:test-user -- user@example.com
```

Confirmed deletion for one user:

```bash
npm run cleanup:test-user -- user@example.com --confirm-delete
```

The dry run prints the normal per-user cleanup inventory and does not delete data. Confirmed deletion permanently removes the matching Auth user and associated StoryboardFlow data, then runs post-deletion verification.

### Inventory

List all Supabase users:

```bash
npm run cleanup:test-user -- --list-users
```

List all users and write a CSV export:

```bash
npm run cleanup:test-user -- --list-users --csv
```

List all users and write a self-contained HTML report:

```bash
npm run cleanup:test-user -- --list-users --html
```

`--csv` and `--html` can be combined:

```bash
npm run cleanup:test-user -- --list-users --csv --html
```

### Standardized Test Accounts

List accounts matching:

```text
wsamatis+test*@gmail.com
```

```bash
npm run cleanup:test-user -- --list-tests
```

List test accounts and write a CSV export:

```bash
npm run cleanup:test-user -- --list-tests --csv
```

List test accounts and write a self-contained HTML report:

```bash
npm run cleanup:test-user -- --list-tests --html
```

`--csv` and `--html` can be combined:

```bash
npm run cleanup:test-user -- --list-tests --csv --html
```

### Bulk Test Account Cleanup

Dry-run cleanup for every standardized test account:

```bash
npm run cleanup:test-user -- --delete-tests
```

Confirmed deletion for every standardized test account:

```bash
npm run cleanup:test-user -- --delete-tests --confirm-delete
```

Bulk cleanup finds all accounts matching `wsamatis+test*@gmail.com`. Dry-run mode prints the per-user cleanup inventory for each matching account. Confirmed deletion lists the accounts, prompts for `DELETE`, processes each account independently, verifies each deletion, and reports failures.

### Range Cleanup

Dry-run a numbered subset of standardized test accounts:

```bash
npm run cleanup:test-user -- --delete-test-range 04 53
```

Confirmed deletion for a numbered subset:

```bash
npm run cleanup:test-user -- --delete-test-range 04 53 --confirm-delete
```

The range is inclusive. The script preserves leading zero padding based on the input width:

```text
04 to 53   -> wsamatis+test04@gmail.com ... wsamatis+test53@gmail.com
004 to 053 -> wsamatis+test004@gmail.com ... wsamatis+test053@gmail.com
```

Generated emails that do not exist in Supabase Auth are printed as missing and skipped. Found emails are processed with the same per-user cleanup inventory and deletion flow used by the other commands.

---

## Reporting

`--list-users` and `--list-tests` display a summary followed by an aligned terminal table. Reports are sorted by account creation date, newest first.

Table columns:

- Email
- User ID
- Plan
- Created
- Last Active
- Projects
- Images
- Storage (MB)
- Themes

Formatting:

- User ID is truncated to the first 8 characters followed by `…`
- Created uses `YYYY-MM-DD`
- Last Active uses `YYYY-MM-DD` or `Never`
- Storage displays MB with one decimal place
- Numeric columns are right-aligned

Summary statistics:

- Total Users
- Total Projects
- Total Images
- Total Storage (MB)
- Average Projects per User
- Average Images per User

Metrics are calculated from existing data:

- Project count from `projects`
- Image count from `project_images`
- Theme count from `user_storyboard_themes`
- Last Active from latest `user_sessions.last_activity`
- Storage from file sizes under the user's storage prefix
- Plan from `billing_subscriptions` when possible

Plan values are:

- `Guest`
- `Free`
- `Pro`
- `Unknown`

### CSV Exports

`--csv` is available only with `--list-users` and `--list-tests`.

CSV reports are written to:

```text
reports/test-user-cleanup/
```

The directory is created automatically if it does not already exist. It is intentionally excluded from Git.

CSV filenames are timestamped:

```text
cleanup-users-YYYY-MM-DD-HHMM.csv
cleanup-test-users-YYYY-MM-DD-HHMM.csv
```

CSV columns:

- Email
- User ID
- Plan
- Created
- Last Active
- Projects
- Images
- Storage MB
- Themes

The normal terminal report is still shown, and the generated relative path is printed.

### HTML Reports

`--html` is available only with `--list-users` and `--list-tests`.

HTML reports are written to:

```text
reports/test-user-cleanup/
```

The directory is created automatically if it does not already exist. It is intentionally excluded from Git.

HTML filenames are timestamped:

```text
cleanup-users-YYYY-MM-DD-HHMM.html
cleanup-test-users-YYYY-MM-DD-HHMM.html
```

The HTML report is self-contained: no CDN, external JavaScript, frameworks, or network requests.

HTML features:

- Responsive layout
- Search/filter box
- Sortable columns
- Sticky table header
- Totals row
- Alternating row colors
- Generated timestamp
- Supabase project URL when available
- Script version metadata
- Largest account by storage
- Largest account by project count
- Oldest account
- Newest account

Visual indicators:

- Project and image counts are gray when zero
- Storage uses a subtle heatmap
- Last Active is green within 30 days, amber from 30 to 90 days, red after 90 days, and gray when `Never`

---

## Safety Features

The script is intentionally conservative.

- Dry-run mode is the default.
- No data is deleted unless `--confirm-delete` is provided.
- `--list-users`, `--list-tests`, `--csv`, and `--html` never delete data.
- Bulk and range confirmed deletions require typing exactly `DELETE`.
- Any other confirmation input aborts before changes are made.
- Confirmed deletions run post-deletion verification.
- Bulk and range deletions continue processing remaining accounts if one account fails.
- Verification failures are reported and cause a non-zero exit code.

Successful verification prints checks like:

```text
Post-deletion verification...
PASS Auth user removed
PASS user_profiles empty
PASS projects empty
PASS project_data empty
PASS project_images empty
PASS user_sessions empty
PASS billing_subscriptions empty
PASS user_storyboard_themes empty
PASS Storage prefix empty
Post-deletion verification passed.
```

---

## Manual Verification

After deleting users, you can optionally verify in Supabase.

Authentication:

```text
Supabase -> Authentication -> Users
```

Confirm the deleted email no longer appears.

Database tables:

- `user_profiles`
- `projects`
- `project_data`
- `project_images`
- `user_sessions`
- `billing_subscriptions`
- `user_storyboard_themes`

Expected result: no remaining app-owned rows for the deleted user ID.

Storage:

```text
Supabase -> Storage -> project-images
```

Confirm the deleted user's folder no longer exists:

```text
project-images/{authUserId}/
```

---

## Notes

Deleting the Supabase Auth user removes the Supabase-side identity record. This should allow the same Gmail account to sign up again fresh through Google login.

This does not delete the Google account itself. To retest Google's consent screen, remove StoryboardFlow from the Google account's third-party app access settings.

Stripe-side cleanup, if needed, should be handled separately.

---

## Maintenance

Whenever new user-owned tables, project-owned tables, storage buckets, or storage paths are added to StoryboardFlow, run a cleanup audit and update `scripts/delete-test-user.js` if required.

Examples of future data that may require coverage:

- New user preference tables
- Project sharing or collaboration tables
- Export history tables
- Notification tables
- Comment or review tables
- New storage buckets
- New storage paths that do not start with `{authUserId}/`

---

## Command Reference

```bash
# Inspect one user
npm run cleanup:test-user -- user@example.com

# Delete one user
npm run cleanup:test-user -- user@example.com --confirm-delete

# List all users
npm run cleanup:test-user -- --list-users

# List all users and export CSV
npm run cleanup:test-user -- --list-users --csv

# List all users and export HTML
npm run cleanup:test-user -- --list-users --html

# List standardized test accounts
npm run cleanup:test-user -- --list-tests

# List standardized test accounts and export CSV
npm run cleanup:test-user -- --list-tests --csv

# List standardized test accounts and export HTML
npm run cleanup:test-user -- --list-tests --html

# Dry-run cleanup for all standardized test accounts
npm run cleanup:test-user -- --delete-tests

# Delete all standardized test accounts
npm run cleanup:test-user -- --delete-tests --confirm-delete

# Dry-run cleanup for a range of standardized test accounts
npm run cleanup:test-user -- --delete-test-range 04 53

# Delete a range of standardized test accounts
npm run cleanup:test-user -- --delete-test-range 04 53 --confirm-delete
```
