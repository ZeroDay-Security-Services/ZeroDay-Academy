
const { mongoose } = require("../db/mongo");
const schema = new mongoose.Schema({
  labSlug: { type: String, required: true, index: true },
  kind: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true }
});
module.exports = mongoose.models.LabRecord || mongoose.model("LabRecord", schema);
