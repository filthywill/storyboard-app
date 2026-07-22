#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ADMIN_ENV_FILE = '.env.admin';
const REQUIRED_ADMIN_ENV_VARS = ['SUPABASE_URL', 'SERVICE_ROLE_KEY'];

function printUsage() {
  console.log(`
Revoke complimentary Pro access from one existing user.

Usage:
  npm run revoke-beta -- user@example.com

Required environment variables:
  SUPABASE_URL        Supabase project URL
  SERVICE_ROLE_KEY    Supabase service role key

You can set these in your shell or in a local ${ADMIN_ENV_FILE} file.
Shell environment variables take precedence over ${ADMIN_ENV_FILE}.
`);
}

function parseEmail(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  if (args.length !== 1) {
    throw new Error('Pass exactly one email address. Example: npm run revoke-beta -- user@example.com');
  }

  const email = args[0].trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error(`Invalid email address: ${args[0]}`);
  }

  return email;
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

async function findAuthUserByEmail(supabase, email) {
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Could not list Auth users: ${error.message}`);

    const users = data?.users ?? [];
    const matches = users.filter((user) => user.email?.toLowerCase() === email);
    if (matches.length > 1) {
      throw new Error(`Found multiple Auth users for ${email}; refusing to revoke access.`);
    }
    if (matches.length === 1) return matches[0];
    if (users.length < perPage) return null;
  }
}

function getStripeManagedFields(subscription) {
  if (!subscription) return [];

  return ['stripe_customer_id', 'stripe_subscription_id', 'price_id'].filter((field) => {
    const value = subscription[field];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

async function revokeComplimentaryPro(supabase, user) {
  const { data: subscriptions, error: readError } = await supabase
    .from('billing_subscriptions')
    .select('user_id,stripe_customer_id,stripe_subscription_id,price_id')
    .eq('user_id', user.id);

  if (readError) {
    throw new Error(`Could not read billing subscription: ${readError.message}`);
  }
  if ((subscriptions?.length ?? 0) > 1) {
    throw new Error(`Found multiple billing subscriptions for ${user.email}; refusing to continue.`);
  }
  if (!subscriptions?.length) return false;

  const stripeManagedFields = getStripeManagedFields(subscriptions[0]);
  if (stripeManagedFields.length > 0) {
    throw new Error(
      `Subscription appears Stripe-managed (${stripeManagedFields.join(', ')}); Stripe-managed subscriptions cannot be revoked using this tool.`
    );
  }

  const { error: updateError } = await supabase
    .from('billing_subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (updateError) {
    throw new Error(`Could not revoke complimentary Pro access: ${updateError.message}`);
  }

  return true;
}

async function main() {
  const email = parseEmail(process.argv);
  loadAdminEnvironment();
  const supabase = createAdminClient();

  console.log(`Looking up Auth user: ${email}`);
  const user = await findAuthUserByEmail(supabase, email);
  if (!user) {
    throw new Error(`No Supabase Auth user found for ${email}. No billing data was changed.`);
  }

  console.log(`✔ User found (${user.id})`);
  const revoked = await revokeComplimentaryPro(supabase, user);
  console.log(revoked
    ? '✔ Complimentary Pro revoked'
    : 'ℹ No subscription row exists');
}

main().catch((error) => {
  console.error('\nRevoke failed.');
  console.error(error?.message ?? error);
  process.exitCode = 1;
});
