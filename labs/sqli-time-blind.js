
const express = require("express");
const db = require("../db/sqlLabDb");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/sqli-time-blind", { username: "", elapsedMs: null, error: null, checkResult: null });
});

router.post("/lookup", (req, res) => {
  const username = req.body.username || "";
  
  const sql = `SELECT * FROM sqli_accounts WHERE username = '${username}'`;
  const start = Date.now();
  let error = null;
  try {
    db.prepare(sql).all();
  } catch (e) {
    error = "Request failed.";
  }
  const elapsedMs = Date.now() - start;
  res.render("labs/sqli-time-blind", { username, elapsedMs, error, checkResult: null });
});

router.post("/check", (req, res) => {
  const answer = (req.body.answer || "").trim();
  const row = db.prepare("SELECT value FROM sqli_secrets WHERE label = ?").get("time-flag");
  const correct = row && answer === row.value;
  res.render("labs/sqli-time-blind", {
    username: "", elapsedMs: null, error: null,
    checkResult: { correct, flag: correct ? row.value : null }
  });
});

router.post("/reset", (req, res) => {
  
  res.redirect("/labs/sqli-time-blind");
});

module.exports = router;
