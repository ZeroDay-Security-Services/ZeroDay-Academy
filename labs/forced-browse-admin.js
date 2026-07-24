// labs/forced-browse-admin.js
// VULNERABILITY: Forced browsing / missing authorization entirely (CWE-425).
// There's no authentication concept on this app at all -- the admin panel
// is simply never linked from the public pages. Anyone who guesses or
// discovers the URL gets full access.
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/forced-browse-admin", { isAdminPage: false, flag: null });
});

// --- VULNERABLE: reachable by anyone who knows/guesses the path, no auth check ---
router.get("/panel-x29a", (req, res) => {
  res.render("labs/forced-browse-admin", { isAdminPage: true, flag: "ZDS{f0rc3d_br0ws1ng_h1dd3n_1s_n0t_pr0t3ct3d}" });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/forced-browse-admin");
});

module.exports = router;
