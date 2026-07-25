
const express = require("express");
const router = express.Router();

function naiveFilter(input) {
  
  return input.replace(/<script>/gi, "").replace(/<\/script>/gi, "");
}

router.get("/", (req, res) => {
  const name = req.query.name || "";
  const filtered = naiveFilter(name);
  
  res.cookie("cf_uid", "ZDS{bl4ckl1st_f1lt3rs_4lw4ys_h4v3_g4ps}", { httpOnly: false, sameSite: "lax", encode: (v) => v });
  
  res.cookie("_ga_track", "GA1.2.7261839450.1719430800", { httpOnly: false, sameSite: "lax" });
  res.cookie("_ui_pref", "compact", { httpOnly: false, sameSite: "lax" });
  res.render("labs/xss-filter-bypass", { name, filtered });
});

router.post("/reset", (req, res) => {
  
  res.redirect("/labs/xss-filter-bypass");
});

module.exports = router;
