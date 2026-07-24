// labs/two-factor-bypass.js
// VULNERABILITY: 2FA logic flaw (CWE-287). After correct username/password,
// the OTP verification step trusts a client-supplied flag as an alternate
// success path -- a real (if clumsy) leftover-debug-code pattern seen in
// production apps more often than you'd hope.
const express = require("express");
const router = express.Router();

function getState(req) {
  if (!req.session.mfaLab) req.session.mfaLab = { step1Done: false };
  return req.session.mfaLab;
}

router.get("/", (req, res) => {
  const state = getState(req);
  res.render("labs/two-factor-bypass", { step1Done: state.step1Done, result: null });
});

router.post("/step1", (req, res) => {
  const state = getState(req);
  const { username, password } = req.body;
  if (username === "admin" && password === "adminpass") {
    state.step1Done = true;
  }
  res.render("labs/two-factor-bypass", { step1Done: state.step1Done, result: state.step1Done ? null : { error: "Invalid credentials." } });
});

router.post("/step2", (req, res) => {
  const state = getState(req);
  if (!state.step1Done) {
    return res.render("labs/two-factor-bypass", { step1Done: false, result: { error: "Complete step 1 first." } });
  }
  const otp = req.body.otp || "";
  // --- VULNERABLE: `debugSkip` is a leftover client-trusted bypass path ---
  const verified = otp === "482913" || req.body.debugSkip === "true";
  res.render("labs/two-factor-bypass", {
    step1Done: true,
    result: { success: verified, flag: verified ? "ZDS{2f4_l0g1c_fl4ws_tru5t_th3_cl13nt}" : null }
  });
});


router.post("/reset", (req, res) => {
  req.session.mfaLab = null;
  res.redirect("/labs/two-factor-bypass");
});

module.exports = router;
