
const express = require("express");
const db = require("../db/sqlLabDb");

const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/sqli-login", { result: null, error: null });
});

router.post("/", (req, res) => {
  const { username, password } = req.body;

  const sql = `SELECT * FROM sqli_accounts WHERE username = '${username}' AND password = '${password}'`;

  let rows = [];
  let error = null;
  try {
    rows = db.prepare(sql).all();
  } catch (e) {
    error = "Something went wrong. Please try again.";
  }

  if (rows.length > 0) {
    const account = rows[0];
    const flag = account.username === "admin" ? "ZDS{sql1_4uth_byp4ss_c0ncat3nat10n}" : null;
    return res.render("labs/sqli-login", { result: { success: true, account, flag }, error: null });
  }

  res.render("labs/sqli-login", { result: { success: false }, error: error || null });
});

router.post("/reset", (req, res) => {
  
  res.redirect("/labs/sqli-login");
});

module.exports = router;
