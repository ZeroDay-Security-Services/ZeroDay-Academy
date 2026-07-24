// labs/host-header-poisoning.js
// VULNERABILITY: Host header poisoning in password-reset links (CWE-644).
// The reset link is built using the incoming Host header instead of a
// fixed, trusted server-side base URL, so an attacker who controls the
// Host header (trivial -- it's just a request header) can make the
// generated link point at a domain they control.
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/host-header-poisoning", { link: null });
});

// --- VULNERABLE: trusts req.headers.host to build an absolute URL ---
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
