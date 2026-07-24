// labs/api-mass-assignment.js
// VULNERABILITY: Mass assignment on a REST PATCH endpoint (OWASP
// API6:2019 / CWE-915). The account-tier upgrade API merges the entire
// submitted JSON body onto the account record with no field allowlist.
const express = require("express");
const router = express.Router();

function getAccount(req) {
  if (!req.session.apiMaAccount) req.session.apiMaAccount = { id: "acct_884", accountTier: "free" };
  return req.session.apiMaAccount;
}

router.get("/", (req, res) => {
  const account = getAccount(req);
  res.render("labs/api-mass-assignment", { account, flag: account.accountTier === "enterprise" ? "ZDS{4p1_m4ss_4ss1gnm3nt_uns3t_t13rs}" : null });
});

// --- VULNERABLE: entire req.body merged onto the account with no allowlist ---
router.patch("/api/account", express.json(), (req, res) => {
  const account = getAccount(req);
  Object.assign(account, req.body);
  res.json(account);
});


router.post("/reset", (req, res) => {
  req.session.apiMaAccount = null;
  res.redirect("/labs/api-mass-assignment");
});

module.exports = router;
