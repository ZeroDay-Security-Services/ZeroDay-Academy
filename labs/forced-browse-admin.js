const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/forced-browse-admin", { isAdminPage: false, flag: null });
});

router.get("/panel-x29a", (req, res) => {
  res.render("labs/forced-browse-admin", { isAdminPage: true, flag: "ZDS{f0rc3d_br0ws1ng_h1dd3n_1s_n0t_pr0t3ct3d}" });
});

router.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send("User-agent: *\nDisallow: /labs/forced-browse-admin/panel-x29a\n");
});

router.post("/reset", (req, res) => {

  res.redirect("/labs/forced-browse-admin");
});

module.exports = router;
