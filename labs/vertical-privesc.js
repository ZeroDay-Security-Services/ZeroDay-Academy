// labs/vertical-privesc.js
// VULNERABILITY: Broken function-level authorization / vertical privilege
// escalation (CWE-863). You're logged in as a normal "user" role. The
// admin action endpoint is simply not linked from the UI -- but the
// server never actually checks your role before performing it.
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/vertical-privesc", { role: "user", flag: null, actionTaken: false });
});

// --- VULNERABLE: no role check on the server; "hidden" only via missing UI link ---
router.post("/admin/grant-flag", (req, res) => {
  res.render("labs/vertical-privesc", { role: "user", flag: "ZDS{v3rt1c4l_pr1v3sc_h1dd3n_1sn7_pr0t3ct3d}", actionTaken: true });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/vertical-privesc");
});

module.exports = router;
