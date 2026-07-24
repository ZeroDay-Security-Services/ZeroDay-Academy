// labs/clickjacking-missing-xfo.js
// VULNERABILITY: Clickjacking via missing frame protection (CWE-1021). No
// X-Frame-Options or CSP frame-ancestors header is set, so the page can be
// embedded in an invisible iframe on an attacker's page and a victim can
// be tricked into clicking a sensitive button they never intentionally saw.
const express = require("express");
const router = express.Router();

function getState(req) {
  if (!req.session.clickjackLab) req.session.clickjackLab = { deleted: false };
  return req.session.clickjackLab;
}

router.get("/", (req, res) => {
  const s = getState(req);
  // --- VULNERABLE: no X-Frame-Options / frame-ancestors set at all ---
  res.render("labs/clickjacking-missing-xfo", { deleted: s.deleted, framed: false });
});

router.post("/delete-account", (req, res) => {
  const s = getState(req);
  s.deleted = true;
  res.redirect("/labs/clickjacking-missing-xfo?framed=1");
});

router.get("/attacker-page", (req, res) => {
  res.set("Content-Type", "text/html");
  res.send(`<html><body style="font-family:sans-serif;">
    <h3>Win a free prize! Click below:</h3>
    <div style="position:relative; width:220px; height:60px;">
      <iframe src="/labs/clickjacking-missing-xfo/frame-target" style="position:absolute; top:-40px; left:-20px; width:400px; height:200px; opacity:0.001; border:0;"></iframe>
      <button style="position:absolute; top:0; left:0; width:220px; height:60px; font-size:1.1rem;">Claim prize</button>
    </div>
  </body></html>`);
});

router.get("/frame-target", (req, res) => {
  const s = getState(req);
  res.render("labs/clickjacking-missing-xfo", { deleted: s.deleted, framed: true });
});


router.post("/reset", (req, res) => {
  req.session.clickjackLab = null;
  res.redirect("/labs/clickjacking-missing-xfo");
});

module.exports = router;
