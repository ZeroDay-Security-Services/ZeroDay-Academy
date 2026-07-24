// labs/sqli-login.js
// VULNERABILITY: SQL Injection (CWE-89) via string concatenation.
// The query below is intentionally built with string concatenation instead
// of parameterized placeholders, against a real embedded SQL database
// dedicated to the SQL injection lab set (see db/sqlLabDb.js).
const express = require("express");
const db = require("../db/sqlLabDb");

const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/sqli-login", { result: null, error: null, query: null });
});

router.post("/", (req, res) => {
  const { username, password } = req.body;

  // --- VULNERABLE: raw string concatenation into SQL ---
  const sql = `SELECT * FROM sqli_accounts WHERE username = '${username}' AND password = '${password}'`;

  let rows = [];
  let error = null;
  try {
    rows = db.prepare(sql).all();
  } catch (e) {
    error = "Query error: " + e.message;
  }

  if (rows.length > 0) {
    const account = rows[0];
    const flag = account.username === "admin" ? "ZDS{sql1_4uth_byp4ss_c0ncat3nat10n}" : null;
    return res.render("labs/sqli-login", { result: { success: true, account, flag }, error: null, query: sql });
  }

  res.render("labs/sqli-login", { result: { success: false }, error, query: sql });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/sqli-login");
});

module.exports = router;
