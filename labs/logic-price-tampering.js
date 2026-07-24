// labs/logic-price-tampering.js
// VULNERABILITY: Client-trusted price (CWE-602). The checkout form
// includes the price as a hidden field for display convenience, but the
// server uses whatever price value the client submits instead of looking
// the canonical price up itself.
const express = require("express");
const router = express.Router();

const CATALOG_PRICE = 1200;

router.get("/", (req, res) => {
  res.render("labs/logic-price-tampering", { result: null });
});

// --- VULNERABLE: trusts req.body.price instead of CATALOG_PRICE ---
router.post("/checkout", (req, res) => {
  const price = parseFloat(req.body.price);
  const charged = isNaN(price) ? CATALOG_PRICE : price;
  const flag = charged < 10 ? "ZDS{cl13nt_pr1c3s_ar3_just_su663st10ns}" : null;
  res.render("labs/logic-price-tampering", { result: { charged, flag } });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/logic-price-tampering");
});

module.exports = router;
