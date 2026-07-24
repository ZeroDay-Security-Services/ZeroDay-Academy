// models/LabToken.js -- password reset / 2FA / misc token records
const { mongoose } = require("../db/mongo");
const schema = new mongoose.Schema({
  labSlug: { type: String, required: true, index: true },
  purpose: { type: String, required: true },
  ownerUsername: { type: String, required: true },
  token: { type: String, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.models.LabToken || mongoose.model("LabToken", schema);
