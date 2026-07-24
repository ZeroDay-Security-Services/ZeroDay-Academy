// labs/insecure-deserialization.js
// VULNERABILITY: Insecure Deserialization (CWE-502). The "remember me"
// cookie is a base64-encoded JSON object that the server deserializes and
// trusts completely -- no signature (e.g. HMAC) protects it from tampering,
// so an attacker can modify fields like `role` before the server reads them.
const express = require("express");
const router = express.Router();

const FLAG = "ZDS{unsign3d_c00k1es_ar3_just_suggest10ns}";

function makeCookie(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
}

// --- VULNERABLE: no signature/HMAC, just base64(JSON.stringify(...)) ---
function readCookie(raw) {
  return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
}

router.get("/", (req, res) => {
  let rememberMe = req.cookies.rememberMe;
  if (!rememberMe) {
    rememberMe = makeCookie({ username: "guest", role: "user" });
    res.cookie("rememberMe", rememberMe, { httpOnly: false, sameSite: "lax" });
  }

  let session = null, error = null, flag = null;
  try {
    session = readCookie(rememberMe);
    if (session.role === "admin") flag = FLAG;
  } catch (e) {
    error = "Could not deserialize rememberMe cookie: " + e.message;
  }

  res.render("labs/insecure-deserialization", { session, error, flag, exampleCookie: makeCookie({ username: "guest", role: "user" }) });
});

router.post("/reset", (req, res) => {
  res.clearCookie("rememberMe");
  res.redirect("/labs/insecure-deserialization");
});

module.exports = router;
