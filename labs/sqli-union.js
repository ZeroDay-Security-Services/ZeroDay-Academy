// labs/sqli-union.js
// VULNERABILITY: UNION-based SQL Injection (CWE-89). The product search
// concatenates user input into a query with a known column count, letting
// an attacker append a UNION SELECT to pull data from an unrelated table.
const express = require("express");
const db = require("../db/sqlLabDb");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/sqli-union", { category: "", results: null, error: null, query: null });
});

router.post("/", (req, res) => {
  const category = req.body.category || "";
  // --- VULNERABLE: string concatenation, 3 selected columns (name, category, price) ---
  const sql = `SELECT name, category, price FROM sqli_products WHERE category = '${category}' AND released = 1`;
  let results = [], error = null;
  try {
    results = db.prepare(sql).all();
  } catch (e) {
    error = e.message;
  }
  res.render("labs/sqli-union", { category, results, error, query: sql });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/sqli-union");
});

module.exports = router;
