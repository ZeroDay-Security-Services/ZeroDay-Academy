const express = require("express");
const path = require("path");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/disclosure-env-file");
});

router.use(express.static(path.join(__dirname, "static", "disclosure"), { dotfiles: "allow" }));

router.post("/reset", (req, res) => {

  res.redirect("/labs/disclosure-env-file");
});

module.exports = router;
