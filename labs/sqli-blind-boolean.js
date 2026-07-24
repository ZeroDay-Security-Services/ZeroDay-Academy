// labs/sqli-blind-boolean.js
// VULNERABILITY: Boolean-based blind SQL Injection (CWE-89). The order
// lookup only ever reveals "found" / "not found" -- no data is printed
// directly -- but that boolean oracle is enough to extract arbitrary data
// one true/false question at a time by injecting conditions into the query.
const express = require("express");
const db = require("../db/sqlLabDb");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/sqli-blind-boolean", { id: "", found: null, error: null, checkResult: null });
});

router.post("/lookup", (req, res) => {
  const id = req.body.id || "";
  // --- VULNERABLE: string concatenation; only a boolean outcome is shown ---
  const sql = `SELECT * FROM sqli_orders WHERE id = ${id} AND customer = 'guest'`;
  let found = false, error = null;
  try {
    const rows = db.prepare(sql).all();
    found = rows.length > 0;
  } catch (e) {
    error = e.message;
  }
  res.render("labs/sqli-blind-boolean", { id, found, error, checkResult: null });
});

// The player reconstructs the secret themselves via the boolean oracle
// above, then submits their answer here. This is checked for real against
// a live, parameterized read of the same database -- no shortcuts.
router.post("/check", (req, res) => {
  const answer = (req.body.answer || "").trim();
  const row = db.prepare("SELECT value FROM sqli_secrets WHERE label = ?").get("blind-flag");
  const correct = row && answer === row.value;
  res.render("labs/sqli-blind-boolean", {
    id: "", found: null, error: null,
    checkResult: { correct, flag: correct ? row.value : null }
  });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/sqli-blind-boolean");
});

module.exports = router;
