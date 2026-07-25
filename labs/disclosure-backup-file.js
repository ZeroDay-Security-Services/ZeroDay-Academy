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
