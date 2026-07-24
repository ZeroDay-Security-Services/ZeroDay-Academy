// labs/file-access-idor.js
// VULNERABILITY: IDOR on a file-download endpoint (CWE-639). Reports are
// fetched by a predictable, sequential numeric ID with no ownership check.
const express = require("express");
const LabFile = require("../models/LabFile");
const router = express.Router();

async function ensureSeed() {
  const count = await LabFile.countDocuments({ labSlug: "file-access-idor" });
  if (count === 0) {
    await LabFile.insertMany([
      { labSlug: "file-access-idor", filename: "guest-report-1.txt", contentType: "text/plain", content: "Q1 usage summary for guest account. Nothing sensitive here." },
      { labSlug: "file-access-idor", filename: "internal-report-2.txt", contentType: "text/plain", content: "Board meeting notes -- confidential." },
      { labSlug: "file-access-idor", filename: "internal-report-3.txt", contentType: "text/plain", content: "Infra credentials rotation log. Flag: ZDS{f1l3_id0r_s3qu3nt14l_1ds_l34k}" }
    ]);
  }
}

router.get("/", async (req, res) => {
  await ensureSeed();
  const mine = await LabFile.find({ labSlug: "file-access-idor", filename: /^guest-report/ }).lean();
  res.render("labs/file-access-idor", { myFiles: mine, file: null, error: null });
});

router.get("/download/:id", async (req, res) => {
  await ensureSeed();
  // --- VULNERABLE: no ownership check on the requested file id ---
  const file = await LabFile.findById(req.params.id).lean();
  const mine = await LabFile.find({ labSlug: "file-access-idor", filename: /^guest-report/ }).lean();
  if (!file) return res.status(404).render("labs/file-access-idor", { myFiles: mine, file: null, error: "No such file." });
  res.render("labs/file-access-idor", { myFiles: mine, file, error: null });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/file-access-idor");
});

module.exports = router;
