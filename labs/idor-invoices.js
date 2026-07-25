
const express = require("express");
const LabInvoice = require("../models/LabInvoice");

const router = express.Router();

router.get("/", async (req, res) => {
  const myInvoices = await LabInvoice.find({ ownerUsername: "guest" }).lean();
  res.render("labs/idor-invoices", { myInvoices, selectedInvoice: null, error: null });
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  const invoice = await LabInvoice.findOne({ invoiceNumber: id }).lean();
  const myInvoices = await LabInvoice.find({ ownerUsername: "guest" }).lean();

  if (!invoice) {
    return res.status(404).render("labs/idor-invoices", { myInvoices, selectedInvoice: null, error: "Invoice not found." });
  }
  res.render("labs/idor-invoices", { myInvoices, selectedInvoice: invoice.data || invoice, error: null });
});

router.post("/reset", (req, res) => {

  res.redirect("/labs/idor-invoices");
});

module.exports = router;
