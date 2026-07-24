// models/LabComment.js -- shared fixture data for the stored-xss lab
const { mongoose } = require("../db/mongo");
const schema = new mongoose.Schema({
  author: { type: String, required: true },
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.models.LabComment || mongoose.model("LabComment", schema);
