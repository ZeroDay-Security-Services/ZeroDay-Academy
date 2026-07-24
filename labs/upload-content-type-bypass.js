// labs/upload-content-type-bypass.js
// VULNERABILITY: File-type allowlist that only checks the client-supplied
// Content-Type header (CWE-434/CWE-646), not the actual file content. An
// attacker can upload an HTML/JS payload while simply lying about the
// Content-Type, then have it served back and rendered as HTML because the
// serving route infers type from the (attacker-chosen) filename extension.
const express = require("express");
const LabFile = require("../models/LabFile");
const router = express.Router();

const ALLOWED_TYPES = ["image/png", "image/jpeg"];

router.get("/", async (req, res) => {
  res.cookie("upload_bypass_flag_token", "ZDS{c0nt3nt_typ3_ch3cks_ar3n7_c0nt3nt_v4l1d4t10n}", { httpOnly: false, sameSite: "lax", encode: (v) => v });
  const files = await LabFile.find({ labSlug: "upload-content-type-bypass" }).sort({ createdAt: -1 }).lean();
  res.render("labs/upload-content-type-bypass", { files, error: null });
});

router.post("/upload", express.text({ type: "*/*", limit: "50kb" }), async (req, res) => {
  const declaredType = req.get("X-Declared-Type") || "";
  const filename = (req.query.filename || "avatar.png").replace(/[^a-zA-Z0-9._-]/g, "_");
  // --- VULNERABLE: only the client-declared type is checked, never the
  // actual bytes or the real extension being uploaded. ---
  if (!ALLOWED_TYPES.includes(declaredType)) {
    const files = await LabFile.find({ labSlug: "upload-content-type-bypass" }).sort({ createdAt: -1 }).lean();
    return res.status(400).render("labs/upload-content-type-bypass", { files, error: "Only PNG/JPEG allowed." });
  }
  await LabFile.create({ labSlug: "upload-content-type-bypass", filename, contentType: declaredType, content: req.body || "" });
  const files = await LabFile.find({ labSlug: "upload-content-type-bypass" }).sort({ createdAt: -1 }).lean();
  res.render("labs/upload-content-type-bypass", { files, error: null });
});

// --- VULNERABLE: serves based on the uploaded FILENAME's real extension,
// not the (fake) declared type -- so a .html file renders as HTML. ---
router.get("/view/:id", async (req, res) => {
  const file = await LabFile.findById(req.params.id).lean();
  if (!file) return res.status(404).send("Not found");
  const realType = file.filename.endsWith(".html") ? "text/html" : file.contentType;
  res.set("Content-Type", realType);
  res.send(file.content);
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/upload-content-type-bypass");
});

module.exports = router;
