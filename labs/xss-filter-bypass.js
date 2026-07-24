// labs/xss-filter-bypass.js
// VULNERABILITY: Reflected XSS behind a naive blacklist filter (CWE-79/CWE-116).
// The app strips the literal substring "<script>" (case-insensitive) and
// believes that's sufficient sanitization -- classic incomplete denylist,
// bypassable with alternate tags/event handlers/case tricks.
const express = require("express");
const router = express.Router();

function naiveFilter(input) {
  // --- VULNERABLE: only removes one exact pattern, case-insensitively ---
  return input.replace(/<script>/gi, "").replace(/<\/script>/gi, "");
}

router.get("/", (req, res) => {
  const name = req.query.name || "";
  const filtered = naiveFilter(name);
  res.cookie("filter_bypass_flag_token", "ZDS{bl4ckl1st_f1lt3rs_4lw4ys_h4v3_g4ps}", { httpOnly: false, sameSite: "lax", encode: (v) => v });
  res.render("labs/xss-filter-bypass", { name, filtered });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/xss-filter-bypass");
});

module.exports = router;
