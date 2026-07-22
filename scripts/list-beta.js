#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config as loadDotenv } from 'dotenv';
import Table from 'cli-table3';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ADMIN_ENV_FILE = '.env.admin';
const REQUIRED_ADMIN_ENV_VARS = ['SUPABASE_URL', 'SERVICE_ROLE_KEY'];
const READ_PAGE_SIZE = 1000;

function printUsage() {
  console.log(`
List users with billing subscription rows.

Usage:
  npm run list-beta

Required environment variables:
  SUPABASE_URL        Supabase project URL
  SERVICE_ROLE_KEY    Supabase service role key

You can set these in your shell or in a local ${ADMIN_ENV_FILE} file.
Shell environment variables take precedence over ${ADMIN_ENV_FILE}.
`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }
  if (args.length > 0) {
    throw new Error('list-beta does not accept arguments.');
  }
}

function loadAdminEnvironment() {
  const hasAllShellValues = REQUIRED_ADMIN_ENV_VARS.every((name) => Boolean(process.env[name]));
  if (hasAllShellValues) return;

  const envPath = resolve(process.cwd(), ADMIN_ENV_FILE);
  loadDotenv({ path: envPath, override: false, quiet: true });

  if (!REQUIRED_ADMIN_ENV_VARS.every((name) => Boolean(process.env[name]))) {
    const source = existsSync(envPath) ? `${ADMIN_ENV_FILE} is incomplete` : `${ADMIN_ENV_FILE} was not found`;
    throw new Error(`Missing SUPABASE_URL or SERVICE_ROLE_KEY. ${source}.`);
  }
}

function createAdminClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function listAuthUsers(supabase) {
  const usersById = new Map();

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: READ_PAGE_SIZE });
    if (error) throw new Error(`Could not list Auth users: ${error.message}`);

    const users = data?.users ?? [];
    for (const user of users) {
      usersById.set(user.id, user);
    }
    if (users.length < READ_PAGE_SIZE) break;
  }

  return usersById;
}

async function listSubscriptions(supabase) {
  const subscriptions = [];

  for (let offset = 0; ; offset += READ_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('billing_subscriptions')
      .select('user_id,status,updated_at,stripe_customer_id,stripe_subscription_id,price_id')
      .order('updated_at', { ascending: false })
      .range(offset, offset + READ_PAGE_SIZE - 1);

    if (error) throw new Error(`Could not list billing subscriptions: ${error.message}`);

    subscriptions.push(...(data ?? []));
    if (!data || data.length < READ_PAGE_SIZE) break;
  }

  return subscriptions;
}

function getSubscriptionType(subscription) {
  const hasStripeIdentifier = ['stripe_customer_id', 'stripe_subscription_id', 'price_id'].some((field) => {
    const value = subscription[field];
    return typeof value === 'string' && value.trim().length > 0;
  });

  return hasStripeIdentifier ? 'Stripe' : 'Unknown';
}

function formatUpdatedAt(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function printSubscriptions(subscriptions, usersById) {
  if (subscriptions.length === 0) {
    console.log('No billing subscription rows found.');
    return;
  }

  const table = new Table({
    head: ['Email', 'User ID', 'Type', 'Status', 'Updated At'],
    wordWrap: true,
  });

  for (const subscription of subscriptions) {
    const user = usersById.get(subscription.user_id);
    table.push([
      user?.email ?? 'Orphaned / missing Auth user',
      subscription.user_id,
      getSubscriptionType(subscription),
      subscription.status ?? '—',
      formatUpdatedAt(subscription.updated_at),
    ]);
  }

  console.log(table.toString());
  console.log(`\nTotal billing subscription rows: ${subscriptions.length}`);
  console.log('Type is Stripe when a Stripe identifier is present; rows without one are Unknown because the schema has no manual-grant marker.');
}

async function main() {
  parseArgs(process.argv);
  loadAdminEnvironment();
  const supabase = createAdminClient();

  const [usersById, subscriptions] = await Promise.all([
    listAuthUsers(supabase),
    listSubscriptions(supabase),
  ]);

  printSubscriptions(subscriptions, usersById);
}

main().catch((error) => {
  console.error('\nList failed.');
  console.error(error?.message ?? error);
  process.exitCode = 1;
});
