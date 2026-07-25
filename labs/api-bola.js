
const express = require("express");
const LabRecord = require("../models/LabRecord");
const router = express.Router();

async function ensureSeed() {
  const count = await LabRecord.countDocuments({ labSlug: "api-bola" });
  if (count === 0) {
    await LabRecord.insertMany([
      { labSlug: "api-bola", kind: "order", data: { id: "ord_1001", owner: "guest", amount: "42.00", status: "shipped" } },
      { labSlug: "api-bola", kind: "order", data: { id: "ord_1002", owner: "j.harrington", amount: "18204.50", status: "processing", notes: "Flag: ZDS{4p1_b0l4_1s_1d0r_w34r1ng_4_su1t}" } },
      { labSlug: "api-bola", kind: "order", data: { id: "ord_1003", owner: "s.chen", amount: "350.00", status: "delivered" } },
      { labSlug: "api-bola", kind: "order", data: { id: "ord_1004", owner: "m.kowalski", amount: "1200.00", status: "pending" } }
    ]);
  }
}

router.get("/", async (req, res) => {
  await ensureSeed();
  const myOrders = await LabRecord.find({ labSlug: "api-bola", "data.owner": "guest" }).lean();
  res.render("labs/api-bola", { myOrders, selectedOrder: null, error: null });
});

router.get("/api/order/:id", async (req, res) => {
  await ensureSeed();
  const order = await LabRecord.findOne({ labSlug: "api-bola", "data.id": req.params.id }).lean();
  if (!order) return res.status(404).json({ error: "not found" });
  res.json(order.data);
});

router.get("/api/orders/:id", async (req, res) => {
  await ensureSeed();
  const order = await LabRecord.findOne({ labSlug: "api-bola", "data.id": req.params.id }).lean();
  if (!order) return res.status(404).json({ error: "not found" });
  res.json(order.data);
});

router.post("/reset", (req, res) => {

  res.redirect("/labs/api-bola");
});

module.exports = router;
