// labs/jwt-alg-none.js
// VULNERABILITY: Broken Authentication via JWT algorithm confusion
// (CWE-347). The verification step accepts tokens with `alg: "none"` and
// skips signature checking, so an attacker can hand-craft an unsigned token
// with any claims (e.g. role: admin) and have it trusted.
const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const SECRET = "zds-lab-jwt-secret-do-not-reuse";
const FLAG = "ZDS{alg_n0ne_m3ans_n0_v3r1f1cat10n_at_all}";

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// --- VULNERABLE: decodes and trusts the token's own declared `alg`, and
// explicitly permits "none" as an accepted algorithm alongside HS256. ---
function vulnerableVerify(token) {
  const [headerB64] = token.split(".");
  const header = JSON.parse(Buffer.from(headerB64, "base64").toString("utf8"));

  if (header.alg === "none") {
    // No signature check performed at all for "none" tokens.
    const payloadB64 = token.split(".")[1];
    return JSON.parse(Buffer.from(payloadB64, "base64").toString("utf8"));
  }
  return jwt.verify(token, SECRET, { algorithms: ["HS256", "none"] });
}

router.get("/", (req, res) => {
  const userToken = jwt.sign({ username: "guest", role: "user" }, SECRET, { algorithm: "HS256", expiresIn: "1h" });
  res.render("labs/jwt-alg-none", { issuedToken: userToken, verifyResult: null, error: null, flag: null });
});

router.post("/verify", (req, res) => {
  const token = (req.body.token || "").trim();
  let verifyResult = null, error = null, flag = null;
  try {
    verifyResult = vulnerableVerify(token);
    if (verifyResult.role === "admin") flag = FLAG;
  } catch (e) {
    error = e.message;
  }
  const userToken = jwt.sign({ username: "guest", role: "user" }, SECRET, { algorithm: "HS256", expiresIn: "1h" });
  res.render("labs/jwt-alg-none", { issuedToken: userToken, verifyResult, error, flag, submittedToken: token });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/jwt-alg-none");
});

module.exports = router;
