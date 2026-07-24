// labs/no-rate-limit-bruteforce.js
// VULNERABILITY: Missing rate limiting / no account lockout (CWE-307). A
// 4-digit PIN login has 10,000 possible combinations and no throttling,
// no lockout, and no CAPTCHA -- fully automatable by brute force.
const express = require("express");
const router = express.Router();

const CORRECT_PIN = "7391"; // genuine, fixed target -- no rate limiting protects it

router.get("/", (req, res) => {
  res.render("labs/no-rate-limit-bruteforce", { result: null });
});

// --- VULNERABLE: no delay, no attempt counter, no lockout of any kind ---
router.post("/try-pin", (req, res) => {
  const pin = (req.body.pin || "").trim();
  const correct = pin === CORRECT_PIN;
  res.render("labs/no-rate-limit-bruteforce", {
    result: { correct, flag: correct ? "ZDS{n0_r4t3_l1m1t_m34ns_10000_tr13s_ar3_fr33}" : null }
  });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/no-rate-limit-bruteforce");
});

module.exports = router;
