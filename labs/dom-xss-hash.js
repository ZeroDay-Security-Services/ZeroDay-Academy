const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.cookie("_pref_theme", "ZDS{d0m_xss_n3v3r_touch3s_th3_s3rv3r}", { httpOnly: false, sameSite: "lax", encode: (v) => v });
  res.cookie("_ga_track", "GA1.2.5839201746.1719430800", { httpOnly: false, sameSite: "lax" });
  res.cookie("_cf_bm", "qR7tY3uI9oP2aS5dF8gH1jK4", { httpOnly: false, sameSite: "lax" });
  res.cookie("_ui_lang", "en", { httpOnly: false, sameSite: "lax" });
  res.render("labs/dom-xss-hash");
});

router.post("/reset", (req, res) => {

  res.redirect("/labs/dom-xss-hash");
});

module.exports = router;
