// labs/broken-password-reset.js
// VULNERABILITY: Predictable password reset tokens (CWE-330/CWE-640). Reset
// tokens are generated from a simple sequential counter instead of a
// cryptographically random value, so anyone can predict another user's
// token by requesting their own reset first and incrementing.
const express = require("express");
const LabToken = require("../models/LabToken");
const router = express.Router();

function getState(req) {
  if (!req.session.resetLab) req.session.resetLab = { counter: 1000 };
  return req.session.resetLab;
}

router.get("/", (req, res) => {
  res.render("labs/broken-password-reset", { issuedToken: null, result: null, error: null });
});

router.post("/request-reset", async (req, res) => {
  const state = getState(req);
  const username = (req.body.username || "").trim();
  state.counter += 1;
  // --- VULNERABLE: sequential, guessable token instead of crypto-random ---
  const token = "RST-" + state.counter;
  await LabToken.create({ labSlug: "broken-password-reset", purpose: "password-reset", ownerUsername: username, token, used: false });

  // Simulates the token being emailed only to the account owner -- we only
  // show it back to the player when it's their own ("guest") account.
  const issuedToken = username === "guest" ? token : null;
  res.render("labs/broken-password-reset", { issuedToken, result: null, error: null });
});

router.post("/complete-reset", async (req, res) => {
  const token = (req.body.token || "").trim();
  const newPassword = req.body.newPassword || "";
  const rec = await LabToken.findOne({ labSlug: "broken-password-reset", token, used: false });
  let result = null, error = null;
  if (!rec) {
    error = "Invalid or already-used token.";
  } else {
    rec.used = true;
    await rec.save();
    const flag = rec.ownerUsername === "admin" && newPassword ? "ZDS{pr3d1ct4bl3_r3s3t_t0k3ns_l34k_4cc0unts}" : null;
    result = { owner: rec.ownerUsername, flag };
  }
  res.render("labs/broken-password-reset", { issuedToken: null, result, error });
});


router.post("/reset", (req, res) => {
  req.session.resetLab = null;
  res.redirect("/labs/broken-password-reset");
});

module.exports = router;
