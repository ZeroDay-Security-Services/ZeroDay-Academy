const express = require("express");
const router = express.Router();

const UNIT_PRICE = 89;

function getState(req) {
  if (!req.session.negQtyLab) req.session.negQtyLab = { balance: 0 };
  return req.session.negQtyLab;
}

router.get("/", (req, res) => {
  const state = getState(req);
  res.render("labs/logic-negative-quantity", { balance: state.balance, flag: state.balance > 500 ? "ZDS{n3g4t1v3_qu4nt1ty_turns_purch4s3s_1nt0_r3funds}" : null });
});

router.post("/checkout", (req, res) => {
  const state = getState(req);
  const qty = parseInt(req.body.quantity, 10) || 0;
  const total = qty * UNIT_PRICE;
  state.balance -= total;
  res.redirect("/labs/logic-negative-quantity");
});

router.post("/reset", (req, res) => {
  req.session.negQtyLab = null;
  res.redirect("/labs/logic-negative-quantity");
});

module.exports = router;
