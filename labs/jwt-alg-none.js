const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const SECRET = "zds-lab-jwt-secret-do-not-reuse";
const FLAG = "ZDS{alg_n0ne_m3ans_n0_v3r1f1cat10n_at_all}";

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function vulnerableVerify(token) {
  const [headerB64] = token.split(".");
  const header = JSON.parse(Buffer.from(headerB64, "base64").toString("utf8"));

  if (header.alg === "none") {
    const payloadB64 = token.split(".")[1];
    return JSON.parse(Buffer.from(payloadB64, "base64").toString("utf8"));
  }
  return jwt.verify(token, SECRET, { algorithms: ["HS256", "none"] });
}

router.get("/", (req, res) => {
  res.render("labs/jwt-alg-none", { issuedToken: null, verifyResult: null, error: null, flag: null });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "guest" && password === "guest123") {
    const userToken = jwt.sign({ username: "guest", role: "user" }, SECRET, { algorithm: "HS256", expiresIn: "1h" });
    return res.render("labs/jwt-alg-none", { issuedToken: userToken, verifyResult: null, error: null, flag: null });
  }
  res.render("labs/jwt-alg-none", { issuedToken: null, verifyResult: null, error: "Invalid credentials.", flag: null });
});

router.post("/verify", (req, res) => {
  const token = (req.body.token || "").trim();
  let verifyResult = null, error = null, flag = null;
  try {
    verifyResult = vulnerableVerify(token);
    if (verifyResult.role === "admin") flag = FLAG;
  } catch (e) {
    error = "Unauthorized.";
  }
  res.render("labs/jwt-alg-none", { issuedToken: null, verifyResult: verifyResult ? { role: verifyResult.role } : null, error, flag });
});

router.post("/reset", (req, res) => {

  res.redirect("/labs/jwt-alg-none");
});

module.exports = router;
