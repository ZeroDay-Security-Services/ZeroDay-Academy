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

router.post("/redeem", async (req, res) => {
  await ensureSeed();
  const state = getState(req);
  const coupon = await LabCoupon.findOne({ code: "WELCOME10" });
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
