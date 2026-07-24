// models/LabCoupon.js -- single-use coupons for the business-logic race condition lab
const { mongoose } = require("../db/mongo");
const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountPercent: { type: Number, required: true },
  usesRemaining: { type: Number, required: true, default: 1 }
});
module.exports = mongoose.models.LabCoupon || mongoose.model("LabCoupon", schema);
