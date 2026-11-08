'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, 'sql-lab-dbs');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const cache = new Map();

function busySleep(ms) {
  const capped = Math.max(0, Math.min(3000, Number(ms) || 0));
  const end = Date.now() + capped;
  while (Date.now() < end) {
    // Intentionally blocking: the time-based lab needs a measurable delay.
  }
  return 1;
}

function seed(db, flag) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sqli_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user'
    );
    CREATE TABLE IF NOT EXISTS sqli_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price TEXT NOT NULL,
      released INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS sqli_secrets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sqli_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT ''
    );
  `);

  const accounts = db.prepare('SELECT COUNT(*) AS c FROM sqli_accounts').get().c;
  if (accounts === 0) {
    const adminPassword = `Adm!${crypto.randomBytes(8).toString('hex')}`;
    db.prepare('INSERT INTO sqli_accounts (username, password, role) VALUES (?, ?, ?)').run('admin', adminPassword, 'admin');
    db.prepare('INSERT INTO sqli_accounts (username, password, role) VALUES (?, ?, ?)').run('guest', 'guest123', 'user');
  }

  const products = db.prepare('SELECT COUNT(*) AS c FROM sqli_products').get().c;
  if (products === 0) {
    const insert = db.prepare('INSERT INTO sqli_products (name, category, price, released) VALUES (?, ?, ?, ?)');
    insert.run('Titanium Lockpick Set', 'Tools', '$89.00', 1);
    insert.run('RFID Signal Blocker Wallet', 'Accessories', '$24.00', 1);
    insert.run('Faraday Laptop Sleeve', 'Accessories', '$59.00', 1);
    insert.run('Prototype Zero-Day Scanner', 'Unreleased', '$1,200.00', 0);
  }

  const secrets = db.prepare('SELECT COUNT(*) AS c FROM sqli_secrets').get().c;
  if (secrets === 0) {
    const insert = db.prepare('INSERT INTO sqli_secrets (label, value) VALUES (?, ?)');
    insert.run('union-flag', flag);
    insert.run('blind-flag', flag);
    insert.run('time-flag', flag);
  }

  const orders = db.prepare('SELECT COUNT(*) AS c FROM sqli_orders').get().c;
  if (orders === 0) {
    db.prepare('INSERT INTO sqli_orders (customer, note) VALUES (?, ?)').run('guest', 'Standard shipping');
  }
}

function getSqlDb(req) {
  const key = req.lab?.instance?.instanceKey;
  if (!key) throw new Error('getSqlDb requires an active lab instance');
  if (cache.has(key)) return cache.get(key);

  const file = path.join(dataDir, `${key.replace(/[^a-f0-9]/gi, '')}.db`);
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.function('sleep', (ms) => busySleep(ms));
  seed(db, req.lab.flag());
  cache.set(key, db);

  if (cache.size > 64) {
    const oldest = cache.keys().next().value;
    const oldDb = cache.get(oldest);
    try { oldDb.close(); } catch { /* noop */ }
    cache.delete(oldest);
  }
  return db;
}

function closeSqlDb(instanceKey) {
  const db = cache.get(instanceKey);
  if (db) {
    try { db.close(); } catch { /* noop */ }
    cache.delete(instanceKey);
  }
  const file = path.join(dataDir, `${String(instanceKey).replace(/[^a-f0-9]/gi, '')}.db`);
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(file + suffix); } catch { /* noop */ }
  }
}

module.exports = { getSqlDb, closeSqlDb };
