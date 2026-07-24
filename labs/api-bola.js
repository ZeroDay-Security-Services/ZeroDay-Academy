// labs/api-bola.js
// VULNERABILITY: Broken Object Level Authorization (OWASP API1:2019 /
// CWE-639). The orders API trusts the :id in the URL with no check that
// the order belongs to the authenticated caller -- a JSON-API-flavored
// IDOR, the single most common API security finding in the wild.
const express = require("express");
const LabRecord = require("../models/LabRecord");
const router = express.Router();

async function ensureSeed() {
  const count = await LabRecord.countDocuments({ labSlug: "api-bola" });
  if (count === 0) {
    await LabRecord.insertMany([
      { labSlug: "api-bola", kind: "order", data: { orderId: "ord_1001", owner: "guest", total: "$42.00" } },
      { labSlug: "api-bola", kind: "order", data: { orderId: "ord_1002", owner: "j.harrington", total: "$18,204.50", notes: "Flag: ZDS{4p1_b0l4_1s_1d0r_w34r1ng_4_su1t}" } }
    ]);
  }
}

router.get("/", async (req, res) => {
  await ensureSeed();
  res.render("labs/api-bola");
});

// --- VULNERABLE: no check that req.query.as (the caller) owns this order ---
router.get("/api/orders/:id", async (req, res) => {
  await ensureSeed();
  const order = await LabRecord.findOne({ labSlug: "api-bola", "data.orderId": req.params.id }).lean();
  if (!order) return res.status(404).json({ error: "not found" });
  res.json(order.data);
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/api-bola");
});

module.exports = router;
