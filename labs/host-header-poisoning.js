const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/host-header-poisoning", { link: null });
});

router.post("/request-reset", (req, res) => {
  const host = req.headers.host;
  const token = "rst-" + Math.random().toString(36).slice(2, 10);
  const link = `http://${host}/reset?token=${token}`;
  const flag = /evil-attacker\.test/.test(host) ? "ZDS{h0st_h3ad3r_p01s0ns_r3s3t_l1nks}" : null;
  res.render("labs/host-header-poisoning", { link, flag });
});

router.post("/reset", (req, res) => {

  res.redirect("/labs/host-header-poisoning");
});

module.exports = router;
