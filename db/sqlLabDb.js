// db/sqlLabDb.js -- a small, dedicated SQL database used ONLY by the SQL
// Injection category labs. The rest of the platform runs on MongoDB Atlas
// as requested; but genuine SQL injection requires a real SQL engine
// underneath it (that's the entire vulnerability class), so these five
// labs run against a real embedded SQL database instead of faking it.
const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "sqli-labs.db"));
db.pragma("journal_mode = WAL");

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
  label TEXT NOT NULL,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sqli_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);
`);

function seedIfEmpty() {
  const acctCount = db.prepare("SELECT COUNT(*) c FROM sqli_accounts").get().c;
  if (acctCount === 0) {
    db.prepare("INSERT INTO sqli_accounts (username, password, role) VALUES (?, ?, ?)").run("admin", "K9#mP2vQx!7z", "admin");
    db.prepare("INSERT INTO sqli_accounts (username, password, role) VALUES (?, ?, ?)").run("guest", "guest123", "user");
  }
  const prodCount = db.prepare("SELECT COUNT(*) c FROM sqli_products").get().c;
  if (prodCount === 0) {
    const insert = db.prepare("INSERT INTO sqli_products (name, category, price, released) VALUES (?, ?, ?, ?)");
    insert.run("Titanium Lockpick Set", "Tools", "$89.00", 1);
    insert.run("RFID Signal Blocker Wallet", "Accessories", "$24.00", 1);
    insert.run("Faraday Laptop Sleeve", "Accessories", "$59.00", 1);
    insert.run("Prototype Zero-Day Scanner", "Unreleased", "$1,200.00", 0);
  }
  const secretCount = db.prepare("SELECT COUNT(*) c FROM sqli_secrets").get().c;
  if (secretCount === 0) {
    db.prepare("INSERT INTO sqli_secrets (label, value) VALUES (?, ?)").run("union-flag", "ZDS{un10n_b4s3d_sql1_3xtr4ct5_4ny_t4bl3}");
    db.prepare("INSERT INTO sqli_secrets (label, value) VALUES (?, ?)").run("blind-flag", "ZDS{bl1nd_b00l34n_sql1_1s_sl0w_but_sur3}");
    db.prepare("INSERT INTO sqli_secrets (label, value) VALUES (?, ?)").run("time-flag", "ZDS{t1m3_b4s3d_bl1nd_sql1_us3s_d3l4ys}");
  }
  const orderCount = db.prepare("SELECT COUNT(*) c FROM sqli_orders").get().c;
  if (orderCount === 0) {
    db.prepare("INSERT INTO sqli_orders (customer, note) VALUES (?, ?)").run("guest", "Standard shipping");
  }
}
seedIfEmpty();

module.exports = db;
