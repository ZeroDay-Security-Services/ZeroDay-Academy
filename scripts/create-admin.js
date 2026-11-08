'use strict';

/**
 * Idempotent founder-administrator bootstrap.
 *
 * Usage:
 *   MONGODB_URI=... ADMIN_EMAIL=founder.zeroday@gmail.com \
 *   ADMIN_USERNAME=founder ADMIN_PASSWORD='a-long-unique-password' \
 *   npm run create-admin
 *
 * The password is read from the environment only and is never written to a
 * tracked file. Re-running the command promotes the account if needed and
 * leaves an existing password intact unless --reset-password is supplied.
 */

require('dotenv').config();

const { connectMongo, disconnectMongo } = require('../db/mongo');
const { bootstrapFounder } = require('../services/bootstrapAdmin');
const { config } = require('../config');

const FOUNDER_EMAIL = (process.env.ADMIN_EMAIL || config.admin.email || 'founder.zeroday@gmail.com').toLowerCase();
const FOUNDER_USERNAME = process.env.ADMIN_USERNAME || config.admin.username || 'founder';
const PASSWORD = process.env.ADMIN_PASSWORD || '';
const RESET_PASSWORD = process.argv.includes('--reset-password');

async function main() {
  if (!process.env.MONGODB_URI && !config.isProduction) {
    console.warn('[create-admin] MONGODB_URI is not set. A temporary in-memory database will be used; the account will not persist after this process exits.');
  }

  await connectMongo();

  const result = await bootstrapFounder({
    email: FOUNDER_EMAIL,
    username: FOUNDER_USERNAME,
    password: PASSWORD,
    resetPassword: RESET_PASSWORD,
    source: 'scripts/create-admin.js'
  });

  console.log(`[create-admin] ${result.action}: ${result.user.username} <${result.user.email}> (role: ${result.user.role})`);
  console.log('[create-admin] Sign in with the ADMIN_PASSWORD value from the environment. No password was printed or stored.');
  await disconnectMongo();
}

main().catch(async (error) => {
  console.error(`[create-admin] ${error.message || error}`);
  await disconnectMongo().catch(() => {});
  process.exitCode = 1;
});
