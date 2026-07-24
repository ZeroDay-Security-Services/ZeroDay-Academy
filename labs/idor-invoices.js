// labs/idor-invoices.js
// VULNERABILITY: Insecure Direct Object Reference / Broken Access Control
// (CWE-639). Invoices are fetched purely by numeric ID (a real MongoDB
// document field, invoiceNumber) with no check that the requester actually
// owns that record.
const express = require("express");
const LabInvoice = require("../models/LabInvoice");

const router = express.Router();

router.get("/", async (req, res) => {
  const myInvoices = await LabInvoice.find({ ownerUsername: "guest" }).lean();
  res.render("labs/idor-invoices", { myInvoices, invoice: null, error: null });
});

router.get("/invoice/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  // --- VULNERABLE: no ownership / authorization check on `id` ---
  const invoice = await LabInvoice.findOne({ invoiceNumber: id }).lean();
  const myInvoices = await LabInvoice.find({ ownerUsername: "guest" }).lean();

  if (!invoice) {
    return res.status(404).render("labs/idor-invoices", { myInvoices, invoice: null, error: `No invoice with id ${id}.` });
  }
  res.render("labs/idor-invoices", { myInvoices, invoice, error: null });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/idor-invoices");
});

module.exports = router;
