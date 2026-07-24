// labs/dom-xss-hash.js
// VULNERABILITY: DOM-based XSS (CWE-79). The client-side JS reads
// location.hash and writes it into the page via innerHTML with no
// sanitization. The server never sees the payload -- it lives entirely in
// the URL fragment and executes purely client-side.
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.cookie("dom_xss_flag_token", "ZDS{d0m_xss_n3v3r_touch3s_th3_s3rv3r}", { httpOnly: false, sameSite: "lax", encode: (v) => v });
  res.render("labs/dom-xss-hash");
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/dom-xss-hash");
});

module.exports = router;
