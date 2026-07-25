const express = require("express");
const router = express.Router();

function getState(req) {
  if (!req.session.csrfGetLab) {
    req.session.csrfGetLab = { balance: 500, transferredToAttacker: false };
  }
  return req.session.csrfGetLab;
}

router.get("/", (req, res) => {
  const state = getState(req);
  res.render("labs/csrf-get-based", { balance: state.balance, flag: state.transferredToAttacker ? "ZDS{g3t_r3qu3sts_sh0uld_n3v3r_ch4ng3_st4t3}" : null });
});

router.get("/transfer", (req, res) => {
  const state = getState(req);
  const to = req.query.to || "";
  const amount = parseInt(req.query.amount, 10) || 0;
  if (amount > 0 && amount <= state.balance) {
    state.balance -= amount;
    if (to === "attacker") state.transferredToAttacker = true;
  }
  res.redirect("/labs/csrf-get-based");
});

router.post("/reset", (req, res) => {
  req.session.csrfGetLab = null;
  res.redirect("/labs/csrf-get-based");
});

module.exports = router;
