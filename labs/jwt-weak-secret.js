// labs/jwt-weak-secret.js
// VULNERABILITY: JWT signed with a weak, guessable secret (CWE-326/CWE-521).
// The signature IS genuinely verified (unlike the alg:none lab) -- but the
// HMAC secret is a common, brute-forceable word. Anyone who cracks it can
// forge arbitrary valid tokens.
const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Deliberately weak -- appears in common wordlists (rockyou/jwt-secrets lists).
const WEAK_SECRET = "letmein123";

router.get("/", (req, res) => {
  const userToken = jwt.sign({ username: "guest", role: "user" }, WEAK_SECRET, { algorithm: "HS256", expiresIn: "1h" });
  res.render("labs/jwt-weak-secret", { issuedToken: userToken, verifyResult: null, error: null, flag: null, submittedToken: userToken });
});

router.post("/verify", (req, res) => {
  const token = (req.body.token || "").trim();
  let verifyResult = null, error = null, flag = null;
  try {
    verifyResult = jwt.verify(token, WEAK_SECRET, { algorithms: ["HS256"] });
    if (verifyResult.role === "admin") flag = "ZDS{w34k_jwt_s3cr3ts_ar3_brut3f0rc34bl3}";
  } catch (e) {
    error = e.message;
  }
  const userToken = jwt.sign({ username: "guest", role: "user" }, WEAK_SECRET, { algorithm: "HS256", expiresIn: "1h" });
  res.render("labs/jwt-weak-secret", { issuedToken: userToken, verifyResult, error, flag, submittedToken: token });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/jwt-weak-secret");
});

module.exports = router;
