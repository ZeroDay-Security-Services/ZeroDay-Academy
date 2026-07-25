
const { mongoose } = require("../db/mongo");
const schema = new mongoose.Schema({
  labSlug: { type: String, required: true, index: true },
  filename: { type: String, required: true },
  contentType: { type: String, required: true },
  content: { type: String, required: true }, 
  ownerNote: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.models.LabFile || mongoose.model("LabFile", schema);
