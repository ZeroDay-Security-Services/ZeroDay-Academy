'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const root = path.join(__dirname, '..');
const devSecretsPath = path.join(root, '.dev-secrets.json');

function loadDevSecrets() {
  try {
    return JSON.parse(fs.readFileSync(devSecretsPath, 'utf8'));
  } catch {
    return {};
  }
}

function saveDevSecrets(secrets) {
  fs.writeFileSync(devSecretsPath, JSON.stringify(secrets, null, 2), { mode: 0o600 });
}

const devSecrets = isProduction ? {} : loadDevSecrets();

function secret(name, length = 48) {
  const fromEnv = process.env[name];
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (isProduction) return null;
  if (!devSecrets[name]) {
    devSecrets[name] = crypto.randomBytes(length).toString('hex');
    saveDevSecrets(devSecrets);
  }
  return devSecrets[name];
}

const sessionSecret = secret('SESSION_SECRET');
const flagSecret = secret('FLAG_SECRET');

if (isProduction) {
  const missing = [];
  if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');
  if (!sessionSecret) missing.push('SESSION_SECRET');
  if (!flagSecret) missing.push('FLAG_SECRET');
  if (missing.length) {
    throw new Error(`Missing required production configuration: ${missing.join(', ')}`);
  }
}

const config = Object.freeze({
  root,
  isProduction,
  port: Number(process.env.PORT || 3000),
  mongoUri: process.env.MONGODB_URI || null,
  sessionSecret,
  flagSecret,
  admin: {
    username: process.env.ADMIN_USERNAME || 'founder',
    email: (process.env.ADMIN_EMAIL || 'founder.zeroday@gmail.com').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || null
  },
  session: {
    name: 'zda.sid',
    maxAgeMs: 1000 * 60 * 60 * 8
  },
  lab: {
    ttlMinutes: Number(process.env.LAB_INSTANCE_TTL_MINUTES || 120),
    maxActivePerUser: Number(process.env.LAB_MAX_ACTIVE || 6)
  },
  limits: {
    loginWindowMs: 15 * 60 * 1000,
    loginMax: 10,
    registerWindowMs: 60 * 60 * 1000,
    registerMax: 6,
    submitWindowMs: 5 * 60 * 1000,
    submitMax: 20,
    hintWindowMs: 60 * 60 * 1000,
    hintMax: 60,
    botWindowMs: 10 * 60 * 1000,
    botMax: 12
  }
});

module.exports = { config };
