#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const STORAGE_BUCKETS = [
  {
    name: 'project-images',
    // App uploads use: {authUserId}/{projectId}/{shotId}-{timestamp}.{ext}
    // Project logos use: {authUserId}/{projectId}/project-logo-{timestamp}.{ext}
    userPrefix: (userId) => `${userId}/`,
  },
];

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

function printHelp() {
  console.log(`
Delete one Supabase test user and all app data.

Usage:
  npm run cleanup:test-user -- user@example.com
  npm run cleanup:test-user -- user@example.com --confirm-delete

Required environment variables:
  SUPABASE_URL        Supabase project URL
  SERVICE_ROLE_KEY    Supabase service role key

Default mode is DRY RUN. Add --confirm-delete to actually delete data.
`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const confirmDelete = args.includes('--confirm-delete');
  const help = args.includes('--help') || args.includes('-h');
  const emails = args.filter((arg) => !arg.startsWith('--'));

  if (help) {
    printHelp();
    process.exit(0);
  }

  if (emails.length !== 1) {
    throw new Error('Pass exactly one email address.');
  }

  const email = emails[0].trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error(`Invalid email address: ${emails[0]}`);
  }

  const unknownFlags = args.filter(
    (arg) => arg.startsWith('--') && arg !== '--confirm-delete'
  );
  if (unknownFlags.length > 0) {
    throw new Error(`Unknown flag(s): ${unknownFlags.join(', ')}`);
  }

  return { email, confirmDelete };
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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

async function main() {
  const { email, confirmDelete } = parseArgs(process.argv);
  const supabase = createAdminClient();

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
  }
}

main().catch((error) => {
  console.error('\nCleanup failed.');
  console.error(error?.message ?? error);
  process.exitCode = 1;
});
