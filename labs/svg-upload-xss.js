// labs/svg-upload-xss.js
// VULNERABILITY: Stored XSS via unrestricted SVG upload (CWE-79/CWE-434).
// SVG is treated as "just an image" and served back with no sanitization
// and a real image/svg+xml content type. Browsers execute <script> tags
// inside an SVG document when it's opened directly (not via <img>), so an
// uploaded SVG becomes a same-origin script execution vector.
const express = require("express");
const LabFile = require("../models/LabFile");
const router = express.Router();

router.get("/", async (req, res) => {
  res.cookie("gallery_secret", "ZDS{svg_upl04ds_ar3_x_ss_1n_d1sgu1s3}", { httpOnly: false, sameSite: "lax", encode: (v) => v });
  const files = await LabFile.find({ labSlug: "svg-upload-xss" }).sort({ createdAt: -1 }).lean();
  res.render("labs/svg-upload-xss", { files, uploaded: false });
});

router.post("/upload", express.text({ type: "*/*", limit: "200kb" }), async (req, res) => {
  const filename = (req.query.filename || "upload.svg").replace(/[^a-zA-Z0-9._-]/g, "_");
  // --- VULNERABLE: no content validation, no sanitization of SVG markup ---
  await LabFile.create({ labSlug: "svg-upload-xss", filename, contentType: "image/svg+xml", content: req.body || "" });
  const files = await LabFile.find({ labSlug: "svg-upload-xss" }).sort({ createdAt: -1 }).lean();
  res.render("labs/svg-upload-xss", { files, uploaded: true });
});

router.get("/raw/:id", async (req, res) => {
  const file = await LabFile.findById(req.params.id).lean();
  if (!file) return res.status(404).send("Not found");
  res.set("Content-Type", file.contentType);
  res.send(file.content);
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/svg-upload-xss");
});

module.exports = router;
