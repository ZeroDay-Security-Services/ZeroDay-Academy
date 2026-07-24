// labs/disclosure-env-file.js
// VULNERABILITY: Sensitive config file served over HTTP (CWE-538/CWE-200).
// Static file serving is pointed at the app's own directory, so the
// production .env file -- which was only ever meant to be read by the
// server process -- is directly downloadable.
const express = require("express");
const path = require("path");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/disclosure-env-file");
});

// --- VULNERABLE: serves the real app directory, including dotfiles ---
router.use(express.static(path.join(__dirname, "static", "disclosure"), { dotfiles: "allow" }));


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/disclosure-env-file");
});

module.exports = router;
