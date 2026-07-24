// labs/reflected-xss.js
// VULNERABILITY: Reflected XSS (CWE-79). The search term is written directly
// into the HTML response with no output encoding.
//
// BUG FIX: the "prize" cookie below must be set with encode: v => v.
// Express's res.cookie() URL-encodes values by default (encodeURIComponent),
// so a raw flag like ZDS{...} would appear in document.cookie as
// ZDS%7B...%7D and never match on submission. Disabling encoding for this
// cookie makes the value a player reads via document.cookie exactly equal
// to the flag they need to submit.
const express = require("express");
const router = express.Router();

const PRODUCTS = [
  { name: "Titanium Lockpick Set", price: "$89.00" },
  { name: "RFID Signal Blocker Wallet", price: "$24.00" },
  { name: "Faraday Laptop Sleeve", price: "$59.00" },
  { name: "USB Data Blocker (2-pack)", price: "$12.00" },
  { name: "Hardware Security Key", price: "$45.00" }
];

router.get("/", (req, res) => {
  const q = req.query.q || "";
  const matches = q
    ? PRODUCTS.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))
    : PRODUCTS;

  res.cookie("session_debug_token", "ZDS{r3fl3ct3d_xss_1s_st1ll_ev3rywh3r3}", {
    httpOnly: false,
    sameSite: "lax",
    encode: (v) => v // keep the raw value readable via document.cookie
  });

  // --- VULNERABLE: `q` is interpolated straight into HTML, unescaped ---
  res.render("labs/reflected-xss", { q, matches });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/reflected-xss");
});

module.exports = router;
