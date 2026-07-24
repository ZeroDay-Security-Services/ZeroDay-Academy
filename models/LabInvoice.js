// models/LabInvoice.js -- shared fixture data for the idor-invoices lab
const { mongoose } = require("../db/mongo");
const schema = new mongoose.Schema({
  invoiceNumber: { type: Number, required: true, unique: true },
  ownerUsername: { type: String, required: true },
  amount: { type: String, required: true },
  status: { type: String, required: true }
});
module.exports = mongoose.models.LabInvoice || mongoose.model("LabInvoice", schema);
