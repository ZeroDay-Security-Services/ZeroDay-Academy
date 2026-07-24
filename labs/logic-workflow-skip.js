// labs/logic-workflow-skip.js
// VULNERABILITY: Business logic workflow bypass (CWE-841). The order
// process has three steps (cart -> payment -> confirm), but "confirm"
// never actually checks that the payment step was completed -- it's just
// assumed because the UI normally enforces the order.
const express = require("express");
const router = express.Router();

function getState(req) {
  if (!req.session.workflowLab) req.session.workflowLab = { paymentCompleted: false, orderConfirmed: false };
  return req.session.workflowLab;
}

router.get("/", (req, res) => {
  const state = getState(req);
  res.render("labs/logic-workflow-skip", { state, flag: (state.orderConfirmed && !state.paymentCompleted) ? "ZDS{sk1pp3d_st3ps_st1ll_c0mpl3t3_th3_0rd3r}" : null });
});

router.post("/pay", (req, res) => {
  // Deliberately left unimplemented / always fails, simulating a declined card --
  // the point of the lab is that skipping straight to /confirm still works.
  res.redirect("/labs/logic-workflow-skip");
});

// --- VULNERABLE: no server-side check that /pay ever succeeded ---
router.post("/confirm", (req, res) => {
  const state = getState(req);
  state.orderConfirmed = true;
  res.redirect("/labs/logic-workflow-skip");
});


router.post("/reset", (req, res) => {
  req.session.workflowLab = null;
  res.redirect("/labs/logic-workflow-skip");
});

module.exports = router;
