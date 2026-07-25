
const express = require("express");
const db = require("../db/sqlLabDb");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/sqli-blind-boolean", { id: "", found: null, error: null, checkResult: null });
});

router.post("/lookup", (req, res) => {
  const id = req.body.id || "";
  
  const sql = `SELECT * FROM sqli_orders WHERE id = ${id} AND customer = 'guest'`;
  let found = false, error = null;
  try {
    const rows = db.prepare(sql).all();
    found = rows.length > 0;
  } catch (e) {
    error = "Lookup failed. Please check your input.";
  }
  res.render("labs/sqli-blind-boolean", { id, found, error, checkResult: null });
});

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
