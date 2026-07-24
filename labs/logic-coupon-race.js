// labs/logic-coupon-race.js
// VULNERABILITY: Race condition on a single-use coupon (CWE-362). The
// "redeem" endpoint reads the remaining-uses count and, in a SEPARATE
// later write, decrements it -- a real TOCTOU (time-of-check to
// time-of-use) gap. Firing several requests concurrently against the real
// database lets more than one succeed before any of them finish
// decrementing, double-spending a coupon meant for one use.
const express = require("express");
const LabCoupon = require("../models/LabCoupon");
const router = express.Router();

async function ensureSeed() {
  const existing = await LabCoupon.findOne({ code: "WELCOME10" });
  if (!existing) {
    await LabCoupon.create({ code: "WELCOME10", discountPercent: 10, usesRemaining: 1 });
  }
}

function getState(req) {
  if (!req.session.couponRaceLab) req.session.couponRaceLab = { successfulRedemptions: 0 };
  return req.session.couponRaceLab;
}

router.get("/", async (req, res) => {
  await ensureSeed();
  const coupon = await LabCoupon.findOne({ code: "WELCOME10" }).lean();
  const state = getState(req);
  res.render("labs/logic-coupon-race", {
    usesRemaining: coupon.usesRemaining,
    successfulRedemptions: state.successfulRedemptions,
    flag: state.successfulRedemptions > 1 ? "ZDS{r4c3_c0nd1t10ns_d0ubl3_sp3nd_c0up0ns}" : null
  });
});

// --- VULNERABLE: read-then-write, not an atomic findOneAndUpdate ---
router.post("/redeem", async (req, res) => {
  await ensureSeed();
  const state = getState(req);
  const coupon = await LabCoupon.findOne({ code: "WELCOME10" });
  // Simulated processing delay -- widens the race window, mirroring real
  // request handling time (payment gateway calls, etc.) that makes races
  // like this exploitable in production.
  await new Promise(r => setTimeout(r, 150));
  if (coupon.usesRemaining > 0) {
    coupon.usesRemaining -= 1;
    await coupon.save();
    state.successfulRedemptions += 1;
  }
  res.json({ redeemed: coupon.usesRemaining >= 0, successfulRedemptions: state.successfulRedemptions });
});

router.post("/reset", async (req, res) => {
  await LabCoupon.updateOne({ code: "WELCOME10" }, { $set: { usesRemaining: 1 } });
  req.session.couponRaceLab = { successfulRedemptions: 0 };
  res.redirect("/labs/logic-coupon-race");
});

module.exports = router;
