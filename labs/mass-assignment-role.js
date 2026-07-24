// labs/mass-assignment-role.js
// VULNERABILITY: Mass assignment (CWE-915). The "update profile" endpoint
// blindly merges the entire submitted JSON object onto the session's
// profile record, including fields the UI never exposes -- like `role`.
const express = require("express");
const router = express.Router();

function getProfile(req) {
  if (!req.session.maProfile) {
    req.session.maProfile = { displayName: "guest_user", role: "user" };
  }
  return req.session.maProfile;
}

router.get("/", (req, res) => {
  const profile = getProfile(req);
  res.render("labs/mass-assignment-role", { profile, flag: profile.role === "admin" ? "ZDS{m4ss_4ss1gnm3nt_tru5ts_ev3ry_f13ld}" : null });
});

router.post("/update", (req, res) => {
  const profile = getProfile(req);
  let submitted = {};
  try { submitted = JSON.parse(req.body.json || "{}"); } catch (e) {}
  // --- VULNERABLE: every key from the client is merged in, no allowlist ---
  Object.assign(profile, submitted);
  res.render("labs/mass-assignment-role", { profile, flag: profile.role === "admin" ? "ZDS{m4ss_4ss1gnm3nt_tru5ts_ev3ry_f13ld}" : null });
});


router.post("/reset", (req, res) => {
  req.session.maProfile = null;
  res.redirect("/labs/mass-assignment-role");
});

module.exports = router;
