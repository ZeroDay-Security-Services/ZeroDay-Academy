const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const WEAK_SECRET = "letmein123";

router.get("/", (req, res) => {
  res.render("labs/jwt-weak-secret", { issuedToken: null, verifyResult: null, error: null, flag: null });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "guest" && password === "guest123") {
    const userToken = jwt.sign({ username: "guest", role: "user" }, WEAK_SECRET, { algorithm: "HS256", expiresIn: "1h" });
    return res.render("labs/jwt-weak-secret", { issuedToken: userToken, verifyResult: null, error: null, flag: null });
  }
  res.render("labs/jwt-weak-secret", { issuedToken: null, verifyResult: null, error: "Invalid credentials.", flag: null });
});

router.post("/verify", (req, res) => {
  const token = (req.body.token || "").trim();
  let verifyResult = null, error = null, flag = null;
  try {
    verifyResult = jwt.verify(token, WEAK_SECRET, { algorithms: ["HS256"] });
    if (verifyResult.role === "admin") flag = "ZDS{w34k_jwt_s3cr3ts_ar3_brut3f0rc34bl3}";
  } catch (e) {
    error = "Unauthorized.";
  }
  res.render("labs/jwt-weak-secret", { issuedToken: null, verifyResult: verifyResult ? { role: verifyResult.role } : null, error, flag });
});

router.post("/reset", (req, res) => {

  res.redirect("/labs/jwt-weak-secret");
});

module.exports = router;
