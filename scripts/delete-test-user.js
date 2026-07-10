#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config as loadDotenv } from 'dotenv';
import Table from 'cli-table3';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { resolve } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';

const ADMIN_ENV_FILE = '.env.admin';
const REQUIRED_ADMIN_ENV_VARS = ['SUPABASE_URL', 'SERVICE_ROLE_KEY'];
const REPORT_OUTPUT_DIR = 'reports/test-user-cleanup';

const STORAGE_BUCKETS = [
  {
    name: 'project-images',
    // App uploads use: {authUserId}/{projectId}/{shotId}-{timestamp}.{ext}
    // Project logos use: {authUserId}/{projectId}/project-logo-{timestamp}.{ext}
    userPrefix: (userId) => `${userId}/`,
  },
];

// When new user-owned or project-owned tables are added to StoryboardFlow, they must be added to this cleanup script.
// Add any future public tables with a direct auth user id reference here.
// Keep this list explicit so dry runs show exactly which app rows are in scope.
const DIRECT_USER_TABLES = [
  {
    table: 'user_sessions',
    column: 'user_id',
    select: 'id,user_id,is_active,started_at,last_activity',
    optional: true,
  },
  {
    table: 'billing_subscriptions',
    column: 'user_id',
    select: 'user_id,stripe_customer_id,stripe_subscription_id,status',
    optional: true,
  },
  {
    table: 'user_storyboard_themes',
    column: 'user_id',
    select: 'id,user_id,name,created_at',
    optional: true,
  },
  {
    table: 'user_profiles',
    column: 'id',
    select: 'id,email,display_name,created_at',
    optional: false,
  },
];

const PROJECT_TABLES = [
  {
    table: 'project_images',
    select: 'id,project_id,shot_id,storage_path,file_size,mime_type',
  },
  {
    table: 'project_data',
    select: 'id,project_id,updated_at',
  },
  {
    table: 'projects',
    select: 'id,user_id,name,is_deleted,created_at,updated_at',
  },
];

const STORAGE_REMOVE_CHUNK_SIZE = 100;
const READ_PAGE_SIZE = 1000;
const TEST_ACCOUNT_EMAIL_PATTERN = /^wsamatis\+test.*@gmail\.com$/i;
const TEST_ACCOUNT_EMAIL_PREFIX = 'wsamatis+test';
const TEST_ACCOUNT_EMAIL_DOMAIN = '@gmail.com';
const KNOWN_FLAGS = new Set([
  '--confirm-delete',
  '--list-users',
  '--list-tests',
  '--delete-tests',
  '--delete-test-range',
  '--csv',
  '--html',
  '--help',
  '-h',
]);

function printHelp() {
  console.log(`
Delete one Supabase test user and all app data.

Usage:
  npm run cleanup:test-user -- user@example.com
  npm run cleanup:test-user -- user@example.com --confirm-delete
  npm run cleanup:test-user -- --list-users
  npm run cleanup:test-user -- --list-tests
  npm run cleanup:test-user -- --delete-tests
  npm run cleanup:test-user -- --delete-tests --confirm-delete
  npm run cleanup:test-user -- --delete-test-range 04 53
  npm run cleanup:test-user -- --delete-test-range 04 53 --confirm-delete

Required environment variables:
  SUPABASE_URL        Supabase project URL
  SERVICE_ROLE_KEY    Supabase service role key

You can set these in your shell or in a local ${ADMIN_ENV_FILE} file.
Shell environment variables take precedence over ${ADMIN_ENV_FILE}.

Default mode is DRY RUN. Add --confirm-delete to actually delete data.
Use --list-users for read-only user inventory.
Use --list-tests to list standardized test accounts (wsamatis+test*@gmail.com).
Use --csv with --list-users or --list-tests to export a CSV report.
Use --html with --list-users or --list-tests to export a self-contained HTML report.
Use --delete-tests to dry-run or delete all standardized test accounts.
Use --delete-test-range START END to dry-run or delete a numbered subset of standardized test accounts.
`);
}

function isTestAccountEmail(email) {
  if (!email) return false;
  return TEST_ACCOUNT_EMAIL_PATTERN.test(email.trim().toLowerCase());
}

function filterTestAuthUsers(users) {
  return users.filter((user) => isTestAccountEmail(user.email));
}

function sortUsersByEmail(users) {
  return [...users].sort((left, right) =>
    (left.email ?? '').localeCompare(right.email ?? '', undefined, { sensitivity: 'base' })
  );
}

function parseRangeEndpoint(value, label) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${label} range value must contain only digits: ${value}`);
  }

  return Number.parseInt(value, 10);
}

function generateTestRangeEmails(startRaw, endRaw) {
  const start = parseRangeEndpoint(startRaw, 'Start');
  const end = parseRangeEndpoint(endRaw, 'End');

  if (start > end) {
    throw new Error(`Start range value must be less than or equal to end range value: ${startRaw} ${endRaw}`);
  }

  const width = startRaw.length;
  const emails = [];

  for (let suffix = start; suffix <= end; suffix += 1) {
    emails.push(`${TEST_ACCOUNT_EMAIL_PREFIX}${String(suffix).padStart(width, '0')}${TEST_ACCOUNT_EMAIL_DOMAIN}`);
  }

  return emails;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const confirmDelete = args.includes('--confirm-delete');
  const listUsers = args.includes('--list-users');
  const listTests = args.includes('--list-tests');
  const deleteTests = args.includes('--delete-tests');
  const deleteTestRange = args.includes('--delete-test-range');
  const csv = args.includes('--csv');
  const html = args.includes('--html');
  const help = args.includes('--help') || args.includes('-h');
  const values = args.filter((arg) => !arg.startsWith('--'));

  if (help) {
    printHelp();
    process.exit(0);
  }

  const unknownFlags = args.filter((arg) => arg.startsWith('--') && !KNOWN_FLAGS.has(arg));
  if (unknownFlags.length > 0) {
    throw new Error(`Unknown flag(s): ${unknownFlags.join(', ')}`);
  }

  const modeFlags = [listUsers, listTests, deleteTests, deleteTestRange].filter(Boolean).length;
  if (modeFlags > 1) {
    throw new Error('Use only one of --list-users, --list-tests, --delete-tests, or --delete-test-range.');
  }

  if ((csv || html) && !listUsers && !listTests) {
    throw new Error('--csv and --html can only be combined with --list-users or --list-tests.');
  }

  if (listUsers) {
    if (confirmDelete) {
      throw new Error('--list-users cannot be combined with --confirm-delete.');
    }
    if (values.length !== 0) {
      throw new Error('--list-users does not accept an email address.');
    }
    return {
      email: null,
      confirmDelete: false,
      listUsers: true,
      listTests: false,
      deleteTests: false,
      deleteTestRange: null,
      csv,
      html,
    };
  }

  if (listTests) {
    if (confirmDelete) {
      throw new Error('--list-tests cannot be combined with --confirm-delete.');
    }
    if (values.length !== 0) {
      throw new Error('--list-tests does not accept an email address.');
    }
    return {
      email: null,
      confirmDelete: false,
      listUsers: false,
      listTests: true,
      deleteTests: false,
      deleteTestRange: null,
      csv,
      html,
    };
  }

  if (deleteTests) {
    if (values.length !== 0) {
      throw new Error('--delete-tests does not accept an email address.');
    }
    return {
      email: null,
      confirmDelete,
      listUsers: false,
      listTests: false,
      deleteTests: true,
      deleteTestRange: null,
      csv: false,
      html: false,
    };
  }

  if (deleteTestRange) {
    if (values.length !== 2) {
      throw new Error('--delete-test-range requires exactly two numeric arguments: START END.');
    }

    return {
      email: null,
      confirmDelete,
      listUsers: false,
      listTests: false,
      deleteTests: false,
      deleteTestRange: {
        startRaw: values[0],
        endRaw: values[1],
        emails: generateTestRangeEmails(values[0], values[1]),
      },
      csv: false,
      html: false,
    };
  }

  if (values.length !== 1) {
    throw new Error('Pass exactly one email address.');
  }

  const email = values[0].trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error(`Invalid email address: ${values[0]}`);
  }

  return {
    email,
    confirmDelete,
    listUsers: false,
    listTests: false,
    deleteTests: false,
    deleteTestRange: null,
    csv: false,
    html: false,
  };
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadAdminEnvironment() {
  const hasAllShellValues = REQUIRED_ADMIN_ENV_VARS.every((name) => Boolean(process.env[name]));
  if (hasAllShellValues) {
    console.log('Using environment variables from shell');
    return;
  }

  const envPath = resolve(process.cwd(), ADMIN_ENV_FILE);
  const envFileExists = existsSync(envPath);

  loadDotenv({
    path: envPath,
    override: false,
    quiet: true,
  });

  const hasAllValuesAfterLoad = REQUIRED_ADMIN_ENV_VARS.every((name) => Boolean(process.env[name]));
  if (hasAllValuesAfterLoad) {
    console.log(`Using environment variables from ${ADMIN_ENV_FILE}`);
  } else if (envFileExists) {
    console.log(`${ADMIN_ENV_FILE} was loaded, but required variables are incomplete`);
  } else {
    console.log(`No complete shell environment found and ${ADMIN_ENV_FILE} was not found`);
  }
}

function assertServiceRoleKey(key) {
  const jwtParts = key.split('.');
  if (jwtParts.length !== 3) return;

  try {
    const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64url').toString('utf8'));
    if (payload.role && payload.role !== 'service_role') {
      throw new Error(
        `SERVICE_ROLE_KEY appears to be a "${payload.role}" key, not a service_role key.`
      );
    }
  } catch (error) {
    if (error instanceof SyntaxError) return;
    throw error;
  }
}

function createAdminClient() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SERVICE_ROLE_KEY');
  assertServiceRoleKey(serviceRoleKey);

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isMissingRelationError(error) {
  return (
    error?.code === 'PGRST205' ||
    error?.code === '42P01' ||
    error?.message?.includes('Could not find the table') ||
    error?.message?.includes('relation') && error?.message?.includes('does not exist')
  );
}

function isMissingStorageBucketError(error) {
  return (
    error?.statusCode === '404' ||
    error?.status === 404 ||
    error?.message?.toLowerCase().includes('bucket not found')
  );
}

async function findAuthUserByEmail(supabase, email) {
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const matches = users.filter((user) => user.email?.toLowerCase() === email);
    if (matches.length > 1) {
      throw new Error(`Found multiple Auth users for ${email}; refusing to continue.`);
    }
    if (matches.length === 1) return matches[0];
    if (users.length < perPage) return null;
  }
}

async function findAuthUserById(supabase, userId) {
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const match = users.find((user) => user.id === userId);
    if (match) return match;
    if (users.length < perPage) return null;
  }
}

async function listAuthUsers(supabase) {
  const perPage = 1000;
  const users = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);
    if (pageUsers.length < perPage) break;
  }

  return users;
}

async function selectRows(supabase, table, select, filter, optional = false) {
  const rows = [];

  for (let offset = 0; ; offset += READ_PAGE_SIZE) {
    let query = supabase
      .from(table)
      .select(select)
      .range(offset, offset + READ_PAGE_SIZE - 1);
    query = filter(query);

    const { data, error } = await query;
    if (error) {
      if (optional && isMissingRelationError(error)) {
        return { rows: [], missing: true };
      }
      throw new Error(`${table} read failed: ${error.message}`);
    }

    rows.push(...(data ?? []));
    if (!data || data.length < READ_PAGE_SIZE) break;
  }

  return { rows, missing: false };
}

function uniqueBy(rows, keyFn) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = keyFn(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function listStorageFiles(supabase, bucketName, prefix) {
  const files = [];

  async function walk(currentPrefix) {
    for (let offset = 0; ; offset += READ_PAGE_SIZE) {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(currentPrefix, {
          limit: READ_PAGE_SIZE,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) {
        if (isMissingStorageBucketError(error)) return { missing: true };
        throw new Error(`${bucketName} storage list failed: ${error.message}`);
      }

      for (const item of data ?? []) {
        const path = `${currentPrefix}${item.name}`;
        if (item.id || item.metadata) {
          files.push({
            bucket: bucketName,
            path,
            size: item.metadata?.size ?? null,
            updated_at: item.updated_at ?? null,
          });
        } else {
          const result = await walk(`${path}/`);
          if (result?.missing) return result;
        }
      }

      if (!data || data.length < READ_PAGE_SIZE) break;
    }

    return { missing: false };
  }

  const result = await walk(prefix);
  return { files, missing: result?.missing ?? false };
}

function incrementCount(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

async function buildProjectCountByUser(supabase) {
  const { rows: projects } = await selectRows(
    supabase,
    'projects',
    'id,user_id',
    (query) => query.not('user_id', 'is', null),
    false
  );
  const counts = new Map();

  for (const project of projects) {
    incrementCount(counts, project.user_id);
  }

  return counts;
}

async function buildStorageStatsByUser(supabase) {
  const stats = new Map();

  for (const bucket of STORAGE_BUCKETS) {
    const result = await listStorageFiles(supabase, bucket.name, '');
    if (result.missing) continue;

    for (const file of result.files) {
      const userId = file.path.split('/')[0];
      if (!userId) continue;

      const current = stats.get(userId) ?? { files: 0, bytes: 0 };
      const size = Number(file.size);
      stats.set(userId, {
        files: current.files + 1,
        bytes: current.bytes + (Number.isFinite(size) ? size : 0),
      });
    }
  }

  return stats;
}

async function buildImageCountByUser(supabase) {
  const { rows: projects } = await selectRows(
    supabase,
    'projects',
    'id,user_id',
    (query) => query.not('user_id', 'is', null),
    false
  );
  const projectToUser = new Map(projects.map((project) => [project.id, project.user_id]));
  const { rows: images } = await selectRows(
    supabase,
    'project_images',
    'id,project_id,storage_path',
    (query) => query,
    false
  );

  const counts = new Map();
  const seenByUser = new Map();

  for (const image of images) {
    const ownerIds = new Set();
    const projectOwner = projectToUser.get(image.project_id);
    if (projectOwner) ownerIds.add(projectOwner);

    const prefixUserId = image.storage_path?.split('/')[0];
    if (prefixUserId) ownerIds.add(prefixUserId);

    const imageKey = image.id ?? image.storage_path;
    for (const userId of ownerIds) {
      if (!seenByUser.has(userId)) seenByUser.set(userId, new Set());
      if (seenByUser.get(userId).has(imageKey)) continue;
      seenByUser.get(userId).add(imageKey);
      incrementCount(counts, userId);
    }
  }

  return counts;
}

async function buildThemeCountByUser(supabase) {
  const tableConfig = DIRECT_USER_TABLES.find((item) => item.table === 'user_storyboard_themes');
  const result = await selectRows(
    supabase,
    tableConfig.table,
    'user_id',
    (query) => query,
    tableConfig.optional
  );

  if (result.missing) return new Map();

  const counts = new Map();
  for (const row of result.rows) {
    incrementCount(counts, row.user_id);
  }

  return counts;
}

async function buildLastActiveByUser(supabase) {
  const tableConfig = DIRECT_USER_TABLES.find((item) => item.table === 'user_sessions');
  const result = await selectRows(
    supabase,
    tableConfig.table,
    'user_id,last_activity',
    (query) => query,
    tableConfig.optional
  );

  if (result.missing) return new Map();

  const latestByUser = new Map();
  for (const row of result.rows) {
    if (!row.user_id || !row.last_activity) continue;

    const current = latestByUser.get(row.user_id);
    if (!current || Date.parse(row.last_activity) > Date.parse(current)) {
      latestByUser.set(row.user_id, row.last_activity);
    }
  }

  return latestByUser;
}

async function buildPlanDataByUser(supabase) {
  const tableConfig = DIRECT_USER_TABLES.find((item) => item.table === 'billing_subscriptions');
  const result = await selectRows(
    supabase,
    tableConfig.table,
    'user_id,status',
    (query) => query,
    tableConfig.optional
  );

  if (result.missing) return { plansByUser: new Map(), missing: true };

  const statusesByUser = new Map();
  for (const row of result.rows) {
    if (!row.user_id) continue;
    if (!statusesByUser.has(row.user_id)) statusesByUser.set(row.user_id, []);
    statusesByUser.get(row.user_id).push(String(row.status ?? '').toLowerCase());
  }

  const plansByUser = new Map();
  for (const [userId, statuses] of statusesByUser) {
    plansByUser.set(
      userId,
      statuses.some((status) => status === 'active' || status === 'trialing') ? 'Pro' : 'Free'
    );
  }

  return { plansByUser, missing: false };
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function formatLastActive(value) {
  return value ? formatDate(value) : 'Never';
}

function formatStorageMb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function determinePlan(user, planData) {
  if (user.is_anonymous || !user.email) return 'Guest';
  if (planData.missing) return 'Unknown';
  return planData.plansByUser.get(user.id) ?? 'Free';
}

function sortReportRows(rows) {
  return [...rows].sort((left, right) => {
    const rightCreated = Date.parse(right.createdRaw) || 0;
    const leftCreated = Date.parse(left.createdRaw) || 0;
    return rightCreated - leftCreated;
  });
}

async function buildUserReportRows(supabase, users) {
  const [projectCounts, imageCounts, themeCounts] = await Promise.all([
    buildProjectCountByUser(supabase),
    buildImageCountByUser(supabase),
    buildThemeCountByUser(supabase),
  ]);
  const [storageStats, lastActiveByUser, planData] = await Promise.all([
    buildStorageStatsByUser(supabase),
    buildLastActiveByUser(supabase),
    buildPlanDataByUser(supabase),
  ]);

  return sortReportRows(users.map((user) => {
    const storage = storageStats.get(user.id) ?? { files: 0, bytes: 0 };
    const lastActiveRaw = lastActiveByUser.get(user.id) ?? null;

    return {
      email: user.email ?? '(no email)',
      userId: user.id,
      userIdShort: `${user.id.slice(0, 8)}…`,
      plan: determinePlan(user, planData),
      createdRaw: user.created_at ?? '',
      created: formatDate(user.created_at),
      lastActiveRaw,
      lastActive: formatLastActive(lastActiveRaw),
      projects: projectCounts.get(user.id) ?? 0,
      images: imageCounts.get(user.id) ?? 0,
      storageBytes: storage.bytes,
      storageMb: Number(formatStorageMb(storage.bytes)),
      storageMbDisplay: formatStorageMb(storage.bytes),
      themes: themeCounts.get(user.id) ?? 0,
    };
  }));
}

function buildSummary(rows) {
  const totalUsers = rows.length;
  const totalProjects = rows.reduce((sum, row) => sum + row.projects, 0);
  const totalImages = rows.reduce((sum, row) => sum + row.images, 0);
  const totalStorageBytes = rows.reduce((sum, row) => sum + row.storageBytes, 0);

  return {
    totalUsers,
    totalProjects,
    totalImages,
    totalStorageMb: Number(formatStorageMb(totalStorageBytes)),
    totalStorageMbDisplay: formatStorageMb(totalStorageBytes),
    averageProjects: totalUsers ? (totalProjects / totalUsers).toFixed(1) : '0.0',
    averageImages: totalUsers ? (totalImages / totalUsers).toFixed(1) : '0.0',
    largestStorageAccount: rows.reduce((largest, row) =>
      !largest || row.storageBytes > largest.storageBytes ? row : largest, null),
    largestProjectAccount: rows.reduce((largest, row) =>
      !largest || row.projects > largest.projects ? row : largest, null),
    oldestAccount: rows.reduce((oldest, row) => {
      if (!oldest) return row;
      return (Date.parse(row.createdRaw) || Infinity) < (Date.parse(oldest.createdRaw) || Infinity) ? row : oldest;
    }, null),
    newestAccount: rows[0] ?? null,
  };
}

function printSummary(summary) {
  console.log('Summary');
  console.log(`  Total Users: ${summary.totalUsers}`);
  console.log(`  Total Projects: ${summary.totalProjects}`);
  console.log(`  Total Images: ${summary.totalImages}`);
  console.log(`  Total Storage (MB): ${summary.totalStorageMbDisplay}`);
  console.log(`  Average Projects per User: ${summary.averageProjects}`);
  console.log(`  Average Images per User: ${summary.averageImages}`);
  console.log('');
}

function printUserReportTable(rows) {
  const table = new Table({
    head: ['Email', 'User ID', 'Plan', 'Created', 'Last Active', 'Projects', 'Images', 'Storage (MB)', 'Themes'],
    colAligns: ['left', 'left', 'left', 'left', 'left', 'right', 'right', 'right', 'right'],
    wordWrap: true,
  });

  for (const row of rows) {
    table.push([
      row.email,
      row.userIdShort,
      row.plan,
      row.created,
      row.lastActive,
      row.projects,
      row.images,
      row.storageMbDisplay,
      row.themes,
    ]);
  }

  console.log(table.toString());
}

function reportTimestamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    `${pad(date.getHours())}${pad(date.getMinutes())}`,
  ].join('-');
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildCsv(rows) {
  const headers = ['Email', 'User ID', 'Plan', 'Created', 'Last Active', 'Projects', 'Images', 'Storage MB', 'Themes'];
  const lines = [headers.map(csvEscape).join(',')];

  for (const row of rows) {
    lines.push([
      row.email,
      row.userId,
      row.plan,
      row.created,
      row.lastActive,
      row.projects,
      row.images,
      row.storageMbDisplay,
      row.themes,
    ].map(csvEscape).join(','));
  }

  return `${lines.join('\n')}\n`;
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function lastActiveClass(row) {
  if (!row.lastActiveRaw) return 'status-never';

  const ageDays = (Date.now() - Date.parse(row.lastActiveRaw)) / 86400000;
  if (ageDays <= 30) return 'status-recent';
  if (ageDays <= 90) return 'status-aging';
  return 'status-stale';
}

function storageClass(row, maxStorageBytes) {
  if (row.storageBytes <= 0 || maxStorageBytes <= 0) return 'storage-0';

  const ratio = row.storageBytes / maxStorageBytes;
  if (ratio >= 0.75) return 'storage-4';
  if (ratio >= 0.5) return 'storage-3';
  if (ratio >= 0.25) return 'storage-2';
  return 'storage-1';
}

function accountLabel(row) {
  return row ? `${row.email} (${row.created || row.storageMbDisplay || row.projects})` : 'None';
}

function buildHtmlReport({ title, rows, summary }) {
  const generatedAt = new Date().toISOString();
  const projectUrl = process.env.SUPABASE_URL || 'Unavailable';
  const scriptVersion = '1.0.0';
  const maxStorageBytes = Math.max(0, ...rows.map((row) => row.storageBytes));
  const totalThemes = rows.reduce((sum, row) => sum + row.themes, 0);
  const tableRows = rows.map((row) => `
          <tr>
            <td>${htmlEscape(row.email)}</td>
            <td title="${htmlEscape(row.userId)}">${htmlEscape(row.userIdShort)}</td>
            <td>${htmlEscape(row.plan)}</td>
            <td data-sort="${htmlEscape(row.createdRaw)}">${htmlEscape(row.created)}</td>
            <td class="${lastActiveClass(row)}" data-sort="${htmlEscape(row.lastActiveRaw ?? '')}">${htmlEscape(row.lastActive)}</td>
            <td class="${row.projects === 0 ? 'zero' : ''}" data-sort="${row.projects}">${row.projects}</td>
            <td class="${row.images === 0 ? 'zero' : ''}" data-sort="${row.images}">${row.images}</td>
            <td class="${storageClass(row, maxStorageBytes)}" data-sort="${row.storageMb}">${row.storageMbDisplay}</td>
            <td data-sort="${row.themes}">${row.themes}</td>
          </tr>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(title)}</title>
  <style>
    :root { color-scheme: light; --bg: #f6f7fb; --card: #ffffff; --text: #172033; --muted: #64748b; --line: #d9e0ea; --accent: #2563eb; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; background: var(--bg); color: var(--text); font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 1180px; margin: 0 auto; }
    h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 38px); }
    .meta, .hint { color: var(--muted); }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin: 24px 0; }
    .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px; box-shadow: 0 10px 30px rgb(15 23 42 / 6%); }
    .card span { display: block; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
    .card strong { display: block; margin-top: 6px; font-size: 22px; }
    .panel { background: var(--card); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgb(15 23 42 / 6%); }
    .toolbar { padding: 14px; border-bottom: 1px solid var(--line); display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
    input[type="search"] { min-width: min(360px, 100%); padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; font: inherit; }
    .table-wrap { overflow: auto; max-height: 70vh; }
    table { width: 100%; border-collapse: collapse; min-width: 920px; }
    th, td { padding: 10px 12px; border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap; }
    th { position: sticky; top: 0; background: #eef3fb; cursor: pointer; user-select: none; z-index: 1; }
    tbody tr:nth-child(even) { background: #fafcff; }
    tbody tr:hover { background: #eff6ff; }
    td:nth-child(6), td:nth-child(7), td:nth-child(8), td:nth-child(9), tfoot td:nth-child(6), tfoot td:nth-child(7), tfoot td:nth-child(8), tfoot td:nth-child(9) { text-align: right; }
    tfoot td { position: sticky; bottom: 0; background: #e2e8f0; font-weight: 700; }
    .zero, .status-never { color: #94a3b8; }
    .status-recent { color: #15803d; font-weight: 700; }
    .status-aging { color: #b45309; font-weight: 700; }
    .status-stale { color: #b91c1c; font-weight: 700; }
    .storage-0 { color: #94a3b8; }
    .storage-1 { background: #eff6ff; }
    .storage-2 { background: #bfdbfe; }
    .storage-3 { background: #93c5fd; }
    .storage-4 { background: #60a5fa; color: #0f172a; font-weight: 700; }
    @media (max-width: 720px) { body { padding: 16px; } .toolbar { align-items: stretch; } input[type="search"] { width: 100%; } }
  </style>
</head>
<body>
  <main>
    <h1>${htmlEscape(title)}</h1>
    <p class="meta">Generated ${htmlEscape(generatedAt)} · Supabase: ${htmlEscape(projectUrl)} · Script version: ${htmlEscape(scriptVersion)}</p>

    <section class="cards" aria-label="Summary statistics">
      <div class="card"><span>Total Users</span><strong>${summary.totalUsers}</strong></div>
      <div class="card"><span>Total Projects</span><strong>${summary.totalProjects}</strong></div>
      <div class="card"><span>Total Images</span><strong>${summary.totalImages}</strong></div>
      <div class="card"><span>Total Storage MB</span><strong>${summary.totalStorageMbDisplay}</strong></div>
      <div class="card"><span>Average Projects/User</span><strong>${summary.averageProjects}</strong></div>
      <div class="card"><span>Average Images/User</span><strong>${summary.averageImages}</strong></div>
      <div class="card"><span>Largest Account Storage</span><strong>${htmlEscape(summary.largestStorageAccount ? `${summary.largestStorageAccount.email} (${summary.largestStorageAccount.storageMbDisplay} MB)` : 'None')}</strong></div>
      <div class="card"><span>Largest Project Count</span><strong>${htmlEscape(summary.largestProjectAccount ? `${summary.largestProjectAccount.email} (${summary.largestProjectAccount.projects})` : 'None')}</strong></div>
      <div class="card"><span>Oldest Account</span><strong>${htmlEscape(accountLabel(summary.oldestAccount))}</strong></div>
      <div class="card"><span>Newest Account</span><strong>${htmlEscape(accountLabel(summary.newestAccount))}</strong></div>
    </section>

    <section class="panel">
      <div class="toolbar">
        <input id="filter" type="search" placeholder="Search or filter accounts..." aria-label="Search accounts">
        <span class="hint">Click any column header to sort.</span>
      </div>
      <div class="table-wrap">
        <table id="report-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>User ID</th>
              <th>Plan</th>
              <th>Created</th>
              <th>Last Active</th>
              <th>Projects</th>
              <th>Images</th>
              <th>Storage MB</th>
              <th>Themes</th>
            </tr>
          </thead>
          <tbody>${tableRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5">Totals</td>
              <td>${summary.totalProjects}</td>
              <td>${summary.totalImages}</td>
              <td>${summary.totalStorageMbDisplay}</td>
              <td>${totalThemes}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  </main>
  <script>
    const table = document.getElementById('report-table');
    const tbody = table.querySelector('tbody');
    const filter = document.getElementById('filter');
    let sortState = { index: 3, ascending: false };

    function cellValue(row, index) {
      const cell = row.children[index];
      return cell.dataset.sort ?? cell.textContent.trim();
    }

    function sortRows(index) {
      sortState = {
        index,
        ascending: sortState.index === index ? !sortState.ascending : true,
      };
      const rows = Array.from(tbody.rows);
      rows.sort((a, b) => {
        const left = cellValue(a, index);
        const right = cellValue(b, index);
        const leftNumber = Number(left);
        const rightNumber = Number(right);
        const comparison = Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
          ? leftNumber - rightNumber
          : left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
        return sortState.ascending ? comparison : -comparison;
      });
      tbody.replaceChildren(...rows);
    }

    function applyFilter() {
      const needle = filter.value.trim().toLowerCase();
      for (const row of tbody.rows) {
        row.hidden = needle && !row.textContent.toLowerCase().includes(needle);
      }
    }

    table.querySelectorAll('th').forEach((header, index) => {
      header.addEventListener('click', () => sortRows(index));
    });
    filter.addEventListener('input', applyFilter);
  </script>
</body>
</html>
`;
}

async function maybeWriteExports(rows, summary, options, reportKind) {
  const timestamp = reportTimestamp();
  const baseName = reportKind === 'tests' ? 'cleanup-test-users' : 'cleanup-users';
  const title = reportKind === 'tests' ? 'Standardized Test Account Report' : 'Supabase User Inventory Report';

  if (options.csv || options.html) {
    await mkdir(REPORT_OUTPUT_DIR, { recursive: true });
  }

  if (options.csv) {
    const filename = `${baseName}-${timestamp}.csv`;
    const reportPath = `${REPORT_OUTPUT_DIR}/${filename}`;
    await writeFile(reportPath, buildCsv(rows), 'utf8');
    console.log(`CSV report written:\n${reportPath}`);
  }

  if (options.html) {
    const filename = `${baseName}-${timestamp}.html`;
    const reportPath = `${REPORT_OUTPUT_DIR}/${filename}`;
    await writeFile(reportPath, buildHtmlReport({ title, rows, summary }), 'utf8');
    console.log(`HTML report written:\n${reportPath}`);
  }
}

async function printListReport(supabase, users, options, reportKind) {
  const rows = await buildUserReportRows(supabase, users);
  const summary = buildSummary(rows);

  if (reportKind === 'tests') {
    console.log('Standardized test accounts');
    console.log('Mode: LIST TESTS ONLY - no data will be deleted.');
    console.log('Pattern: wsamatis+test*@gmail.com');
  } else {
    console.log('Supabase user inventory');
    console.log('Mode: LIST USERS ONLY - no data will be deleted.');
  }
  console.log('');

  printSummary(summary);
  printUserReportTable(rows);
  console.log('');
  console.log(reportKind === 'tests'
    ? `Total matching test accounts: ${rows.length}`
    : `Total users: ${rows.length}`);

  await maybeWriteExports(rows, summary, options, reportKind);
}

async function listUsersReport(supabase, options = {}) {
  const users = await listAuthUsers(supabase);
  await printListReport(supabase, users, options, 'users');
}

async function listTestsReport(supabase, options = {}) {
  const users = filterTestAuthUsers(await listAuthUsers(supabase));
  await printListReport(supabase, users, options, 'tests');
}

async function promptDeleteConfirmation() {
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question('Type DELETE to continue: ');
    if (answer !== 'DELETE') {
      throw new Error('Deletion aborted. Confirmation did not match DELETE.');
    }
  } finally {
    rl.close();
  }
}

async function dryRunUsers(supabase, users) {
  for (const user of users) {
    const inventory = await buildInventory(supabase, user);
    printInventory(inventory, false);
  }
}

async function deleteUsersWithVerification(supabase, users) {
  let processed = 0;
  let successful = 0;
  const failures = [];

  for (const user of users) {
    processed += 1;
    console.log(`\n=== Processing ${user.email} (${processed}/${users.length}) ===`);

    try {
      const inventory = await buildInventory(supabase, user);
      await performDeletion(supabase, inventory);
      await verifyDeletion(supabase, inventory);
      successful += 1;
    } catch (error) {
      const message = error?.message ?? String(error);
      failures.push({ email: user.email, message });
      console.error(`Failed for ${user.email}: ${message}`);
    }
  }

  return { processed, successful, failures };
}

async function deleteTestsReport(supabase, confirmDelete) {
  const users = sortUsersByEmail(filterTestAuthUsers(await listAuthUsers(supabase)));

  if (users.length === 0) {
    console.log('No matching test accounts found.');
    console.log('Pattern: wsamatis+test*@gmail.com');
    return;
  }

  console.log(`Found ${users.length} matching test account(s).`);
  for (const user of users) {
    console.log(`  - ${user.email}`);
  }

  if (!confirmDelete) {
    console.log('\nMode: DRY RUN');
    await dryRunUsers(supabase, users);

    console.log(`\nTotal matching test accounts: ${users.length}`);
    console.log('Run again with --delete-tests --confirm-delete to permanently delete all matching accounts.');
    return;
  }

  await promptDeleteConfirmation();

  const { processed, successful, failures } = await deleteUsersWithVerification(supabase, users);

  console.log('\nFinal summary:');
  console.log(`Accounts processed: ${processed}`);
  console.log(`Successful deletions: ${successful}`);
  console.log(`Failures: ${failures.length}`);

  if (failures.length > 0) {
    for (const failure of failures) {
      console.log(`  - ${failure.email}: ${failure.message}`);
    }
    throw new Error('One or more test account deletions failed.');
  }
}

function buildRangeUserSets(allUsers, requestedEmails) {
  const requestedEmailSet = new Set(requestedEmails.map((email) => email.toLowerCase()));
  const userByEmail = new Map();

  for (const user of allUsers) {
    const email = user.email?.toLowerCase();
    if (!email || !requestedEmailSet.has(email)) continue;

    if (userByEmail.has(email)) {
      throw new Error(`Found multiple Auth users for ${email}; refusing to continue.`);
    }

    userByEmail.set(email, user);
  }

  const foundUsers = [];
  const missingEmails = [];

  for (const email of requestedEmails) {
    const user = userByEmail.get(email.toLowerCase());
    if (user) {
      foundUsers.push(user);
    } else {
      missingEmails.push(email);
    }
  }

  return { foundUsers, missingEmails };
}

function printRangeSummary(range, foundUsers, missingEmails) {
  console.log(`Requested range: ${range.startRaw} through ${range.endRaw}`);
  console.log(`Generated count: ${range.emails.length}`);
  console.log(`Found count: ${foundUsers.length}`);
  console.log(`Missing count: ${missingEmails.length}`);

  console.log('\nFound emails:');
  if (foundUsers.length === 0) {
    console.log('  (none)');
  } else {
    for (const user of foundUsers) {
      console.log(`  - ${user.email}`);
    }
  }

  console.log('\nMissing emails:');
  if (missingEmails.length === 0) {
    console.log('  (none)');
  } else {
    for (const email of missingEmails) {
      console.log(`  - ${email}`);
    }
  }
}

async function deleteTestRangeReport(supabase, range, confirmDelete) {
  const { foundUsers, missingEmails } = buildRangeUserSets(await listAuthUsers(supabase), range.emails);

  printRangeSummary(range, foundUsers, missingEmails);

  if (foundUsers.length === 0) {
    console.log('\nNo generated test accounts exist. Nothing to delete.');
    return;
  }

  if (!confirmDelete) {
    console.log('\nMode: DRY RUN');
    await dryRunUsers(supabase, foundUsers);
    console.log('\nRun again with --delete-test-range START END --confirm-delete to permanently delete found accounts.');
    return;
  }

  console.log('\nAccounts selected for permanent deletion:');
  for (const user of foundUsers) {
    console.log(`  - ${user.email}`);
  }

  await promptDeleteConfirmation();

  const { successful, failures } = await deleteUsersWithVerification(supabase, foundUsers);

  console.log('\nFinal summary:');
  console.log(`Accounts requested: ${range.emails.length}`);
  console.log(`Accounts found: ${foundUsers.length}`);
  console.log(`Accounts missing: ${missingEmails.length}`);
  console.log(`Successful deletions: ${successful}`);
  console.log(`Failures: ${failures.length}`);

  if (failures.length > 0) {
    for (const failure of failures) {
      console.log(`  - ${failure.email}: ${failure.message}`);
    }
    throw new Error('One or more test account deletions failed.');
  }
}

async function buildInventory(supabase, user) {
  const projectsResult = await selectRows(
    supabase,
    'projects',
    PROJECT_TABLES.find((item) => item.table === 'projects').select,
    (query) => query.eq('user_id', user.id),
    false
  );
  const projects = projectsResult.rows;
  const projectIds = projects.map((project) => project.id);

  const projectData = projectIds.length
    ? (await selectRows(
        supabase,
        'project_data',
        PROJECT_TABLES.find((item) => item.table === 'project_data').select,
        (query) => query.in('project_id', projectIds),
        false
      )).rows
    : [];

  const imageRowsByProject = projectIds.length
    ? (await selectRows(
        supabase,
        'project_images',
        PROJECT_TABLES.find((item) => item.table === 'project_images').select,
        (query) => query.in('project_id', projectIds),
        false
      )).rows
    : [];

  const imageRowsByPrefix = (await selectRows(
    supabase,
    'project_images',
    PROJECT_TABLES.find((item) => item.table === 'project_images').select,
    (query) => query.like('storage_path', `${user.id}/%`),
    false
  )).rows;

  const projectImages = uniqueBy(
    [...imageRowsByProject, ...imageRowsByPrefix],
    (row) => row.id ?? row.storage_path
  );

  const directTables = [];
  for (const tableConfig of DIRECT_USER_TABLES) {
    const result = await selectRows(
      supabase,
      tableConfig.table,
      tableConfig.select,
      (query) => query.eq(tableConfig.column, user.id),
      tableConfig.optional
    );

    directTables.push({ ...tableConfig, ...result });
  }

  const storageBuckets = [];
  for (const bucket of STORAGE_BUCKETS) {
    const result = await listStorageFiles(supabase, bucket.name, bucket.userPrefix(user.id));
    storageBuckets.push({ ...bucket, ...result });
  }

  return {
    authUser: user,
    projects,
    projectData,
    projectImages,
    directTables,
    storageBuckets,
  };
}

function formatRow(row) {
  return JSON.stringify(row);
}

function printRows(title, rows) {
  console.log(`\n${title}: ${rows.length}`);
  if (rows.length === 0) return;

  for (const row of rows) {
    console.log(`  - ${formatRow(row)}`);
  }
}

function printVerificationPass(message) {
  console.log(`PASS ${message}`);
}

function printVerificationFail(message) {
  console.log(`FAIL ${message}`);
}

function printInventory(inventory, confirmDelete) {
  const mode = confirmDelete ? 'CONFIRM DELETE' : 'DRY RUN';

  console.log(`Mode: ${mode}`);
  console.log(`Target Auth user: ${inventory.authUser.email} (${inventory.authUser.id})`);
  console.log('Deletion order: storage files, app database rows, then Supabase Auth user.');

  for (const bucket of inventory.storageBuckets) {
    if (bucket.missing) {
      console.log(`\nStorage bucket ${bucket.name}: missing, nothing to delete`);
      continue;
    }
    printRows(
      `Storage files in ${bucket.name}/${bucket.userPrefix(inventory.authUser.id)}`,
      bucket.files
    );
  }

  printRows('project_images rows', inventory.projectImages);
  printRows('project_data rows', inventory.projectData);
  printRows('projects rows', inventory.projects);

  for (const table of inventory.directTables) {
    if (table.missing) {
      console.log(`\n${table.table} rows: table missing, skipped`);
      continue;
    }
    printRows(`${table.table} rows`, table.rows);
  }

  console.log('\nAuth user: 1');
  console.log(`  - ${inventory.authUser.id} ${inventory.authUser.email}`);

  if (!confirmDelete) {
    console.log('\nDry run complete. No data was deleted.');
    console.log('Run again with --confirm-delete to permanently delete this one user.');
  }
}

async function removeStorageFiles(supabase, bucketName, files) {
  if (files.length === 0) return;

  for (let index = 0; index < files.length; index += STORAGE_REMOVE_CHUNK_SIZE) {
    const chunk = files.slice(index, index + STORAGE_REMOVE_CHUNK_SIZE);
    const paths = chunk.map((file) => file.path);
    const { error } = await supabase.storage.from(bucketName).remove(paths);
    if (error) throw new Error(`${bucketName} storage remove failed: ${error.message}`);
    console.log(`Deleted ${paths.length} storage file(s) from ${bucketName}`);
  }
}

async function deleteFromTable(supabase, table, applyFilter, optional = false) {
  let query = supabase.from(table).delete();
  query = applyFilter(query);

  const { error } = await query;
  if (error) {
    if (optional && isMissingRelationError(error)) {
      console.log(`Skipped missing table: ${table}`);
      return;
    }
    throw new Error(`${table} delete failed: ${error.message}`);
  }

  console.log(`Deleted rows from ${table}`);
}

async function performDeletion(supabase, inventory) {
  console.log('\nStarting permanent deletion...');

  for (const bucket of inventory.storageBuckets) {
    if (bucket.missing) {
      console.log(`Skipped missing storage bucket: ${bucket.name}`);
      continue;
    }
    await removeStorageFiles(supabase, bucket.name, bucket.files);
  }

  const projectImageIds = inventory.projectImages.map((row) => row.id).filter(Boolean);
  if (projectImageIds.length > 0) {
    await deleteFromTable(supabase, 'project_images', (query) => query.in('id', projectImageIds));
  }
  await deleteFromTable(
    supabase,
    'project_images',
    (query) => query.like('storage_path', `${inventory.authUser.id}/%`)
  );

  const projectIds = inventory.projects.map((project) => project.id);
  if (projectIds.length > 0) {
    await deleteFromTable(supabase, 'project_data', (query) => query.in('project_id', projectIds));
    await deleteFromTable(supabase, 'projects', (query) => query.in('id', projectIds));
  } else {
    console.log('No project_data or projects rows to delete');
  }

  for (const tableConfig of DIRECT_USER_TABLES) {
    await deleteFromTable(
      supabase,
      tableConfig.table,
      (query) => query.eq(tableConfig.column, inventory.authUser.id),
      tableConfig.optional
    );
  }

  const { error } = await supabase.auth.admin.deleteUser(inventory.authUser.id, false);
  if (error) throw new Error(`Auth user delete failed: ${error.message}`);
  console.log(`Deleted Supabase Auth user ${inventory.authUser.id}`);

  console.log('Permanent deletion complete.');
}

async function verifyEmptyRows(supabase, tableConfig, applyFilter, label, failures) {
  const result = await selectRows(
    supabase,
    tableConfig.table,
    tableConfig.select,
    applyFilter,
    tableConfig.optional ?? false
  );

  if (result.missing || result.rows.length === 0) {
    printVerificationPass(`${label} empty`);
    return;
  }

  printVerificationFail(`${label} not empty`);
  printRows(`Remaining ${label} rows`, result.rows);
  failures.push(label);
}

async function verifyDeletion(supabase, inventory) {
  console.log('\nPost-deletion verification...');

  const failures = [];
  const userId = inventory.authUser.id;
  const projectIds = inventory.projects.map((project) => project.id);
  const directTableByName = new Map(DIRECT_USER_TABLES.map((config) => [config.table, config]));
  const projectTableByName = new Map(PROJECT_TABLES.map((config) => [config.table, config]));

  const authUser = await findAuthUserById(supabase, userId);
  if (authUser) {
    printVerificationFail('Auth user still exists');
    printRows('Remaining Auth user', [
      {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
      },
    ]);
    failures.push('Auth user');
  } else {
    printVerificationPass('Auth user removed');
  }

  const userProfilesConfig = directTableByName.get('user_profiles');
  await verifyEmptyRows(
    supabase,
    userProfilesConfig,
    (query) => query.eq(userProfilesConfig.column, userId),
    'user_profiles',
    failures
  );

  const projectsConfig = projectTableByName.get('projects');
  await verifyEmptyRows(
    supabase,
    projectsConfig,
    (query) => query.eq('user_id', userId),
    'projects',
    failures
  );

  const projectDataConfig = projectTableByName.get('project_data');
  await verifyEmptyRows(
    supabase,
    projectDataConfig,
    (query) => projectIds.length ? query.in('project_id', projectIds) : query.is('project_id', null),
    'project_data',
    failures
  );

  const projectImagesConfig = projectTableByName.get('project_images');
  const imageRowsByProject = projectIds.length
    ? (await selectRows(
        supabase,
        projectImagesConfig.table,
        projectImagesConfig.select,
        (query) => query.in('project_id', projectIds),
        false
      )).rows
    : [];
  const imageRowsByPrefix = (await selectRows(
    supabase,
    projectImagesConfig.table,
    projectImagesConfig.select,
    (query) => query.like('storage_path', `${userId}/%`),
    false
  )).rows;
  const projectImages = uniqueBy(
    [...imageRowsByProject, ...imageRowsByPrefix],
    (row) => row.id ?? row.storage_path
  );

  if (projectImages.length === 0) {
    printVerificationPass('project_images empty');
  } else {
    printVerificationFail('project_images not empty');
    printRows('Remaining project_images rows', projectImages);
    failures.push('project_images');
  }

  for (const tableName of ['user_sessions', 'billing_subscriptions', 'user_storyboard_themes']) {
    const tableConfig = directTableByName.get(tableName);
    await verifyEmptyRows(
      supabase,
      tableConfig,
      (query) => query.eq(tableConfig.column, userId),
      tableName,
      failures
    );
  }

  for (const bucket of STORAGE_BUCKETS) {
    const prefix = bucket.userPrefix(userId);
    const result = await listStorageFiles(supabase, bucket.name, prefix);
    const label = STORAGE_BUCKETS.length === 1
      ? 'Storage prefix'
      : `Storage prefix ${bucket.name}/${prefix}`;

    if (result.missing || result.files.length === 0) {
      printVerificationPass(`${label} empty`);
      continue;
    }

    printVerificationFail(`${label} not empty`);
    printRows(`Remaining storage files in ${bucket.name}/${prefix}`, result.files);
    failures.push(label);
  }

  if (failures.length > 0) {
    throw new Error(`Post-deletion verification failed for: ${failures.join(', ')}`);
  }

  console.log('Post-deletion verification passed.');
}

async function main() {
  const { email, confirmDelete, listUsers, listTests, deleteTests, deleteTestRange, csv, html } = parseArgs(process.argv);
  loadAdminEnvironment();
  const supabase = createAdminClient();
  const reportOptions = { csv, html };

  if (listUsers) {
    await listUsersReport(supabase, reportOptions);
    return;
  }

  if (listTests) {
    await listTestsReport(supabase, reportOptions);
    return;
  }

  if (deleteTests) {
    console.log('Developer-only Supabase test user cleanup');
    await deleteTestsReport(supabase, confirmDelete);
    return;
  }

  if (deleteTestRange) {
    console.log('Developer-only Supabase test user cleanup');
    await deleteTestRangeReport(supabase, deleteTestRange, confirmDelete);
    return;
  }

  console.log('Developer-only Supabase test user cleanup');
  console.log(`Looking up Auth user by email: ${email}`);

  const user = await findAuthUserByEmail(supabase, email);
  if (!user) {
    throw new Error(`No Supabase Auth user found for ${email}. Nothing was deleted.`);
  }

  const inventory = await buildInventory(supabase, user);
  printInventory(inventory, confirmDelete);

  if (confirmDelete) {
    await performDeletion(supabase, inventory);
    await verifyDeletion(supabase, inventory);
  }
}

main().catch((error) => {
  console.error('\nCleanup failed.');
  console.error(error?.message ?? error);
  process.exitCode = 1;
});
