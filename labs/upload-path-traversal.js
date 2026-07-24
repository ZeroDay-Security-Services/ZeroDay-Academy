// labs/upload-path-traversal.js
// VULNERABILITY: Path traversal on upload filenames (CWE-22). The uploaded
// file's name is joined directly onto the destination directory with no
// normalization or containment check, so a filename like
// "../protected/pwned.txt" writes outside the intended uploads folder.
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const baseDir = path.join(__dirname, "..", "db", "upload-traversal-fs");
const uploadsDir = path.join(baseDir, "uploads");
const protectedDir = path.join(baseDir, "protected");
[baseDir, uploadsDir, protectedDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });
if (!fs.existsSync(path.join(protectedDir, "README.txt"))) {
  fs.writeFileSync(path.join(protectedDir, "README.txt"), "This directory should be unreachable from the uploads feature.\n");
}

router.get("/", (req, res) => {
  const uploaded = fs.readdirSync(uploadsDir);
  const protectedFiles = fs.readdirSync(protectedDir);
  const escaped = protectedFiles.some(f => f !== "README.txt");
  res.render("labs/upload-path-traversal", {
    uploaded, protectedFiles,
    flag: escaped ? "ZDS{p4th_tr4v3rs4l_3sc4p3s_th3_upl04ds_f0ld3r}" : null
  });
});

// --- VULNERABLE: filename joined directly with no path.basename() / containment check ---
router.post("/upload", express.text({ type: "*/*", limit: "10kb" }), (req, res) => {
  const filename = req.query.filename || "file.txt";
  const destination = path.join(uploadsDir, filename);
  fs.writeFileSync(destination, req.body || "");
  res.redirect("/labs/upload-path-traversal");
});

router.post("/reset", (req, res) => {
  fs.readdirSync(protectedDir).forEach(f => { if (f !== "README.txt") fs.unlinkSync(path.join(protectedDir, f)); });
  fs.readdirSync(uploadsDir).forEach(f => fs.unlinkSync(path.join(uploadsDir, f)));
  res.redirect("/labs/upload-path-traversal");
});

module.exports = router;
