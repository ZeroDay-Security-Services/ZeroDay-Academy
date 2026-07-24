// models/LabAccount.js -- shared fixture data for the sqli-login lab
const { mongoose } = require("../db/mongo");
const schema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" }
});
module.exports = mongoose.models.LabAccount || mongoose.model("LabAccount", schema);
