// labs/disclosure-backup-file.js
// VULNERABILITY: Leftover backup file disclosure (CWE-530). An old
// `.bak` copy of a source file was left inside the publicly-served
// directory when the "real" file was updated -- a very common real
// incident caused by editors/deploy scripts leaving `.bak`/`~`/`.old`
// copies behind.
const express = require("express");
const path = require("path");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/disclosure-backup-file");
});

router.use(express.static(path.join(__dirname, "static", "disclosure")));


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/disclosure-backup-file");
});

module.exports = router;
