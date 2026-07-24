// labs/cors-wildcard-credentials.js
// VULNERABILITY: Insecure CORS reflecting any Origin with credentials
// allowed (CWE-942). The API reflects whatever Origin header the browser
// sends back in Access-Control-Allow-Origin AND sets
// Access-Control-Allow-Credentials: true -- letting a malicious page on
// any domain read authenticated API responses on behalf of a logged-in
// victim.
const express = require("express");
const router = express.Router();

function getSession(req) {
  if (!req.session.corsLab) req.session.corsLab = { apiKey: "sk_live_" + Math.random().toString(36).slice(2) };
  return req.session.corsLab;
}

router.get("/", (req, res) => {
  const s = getSession(req);
  res.render("labs/cors-wildcard-credentials", { apiKeyPreview: s.apiKey.slice(0, 10) + "…" });
});

// --- VULNERABLE: reflects Origin + allows credentials, no allowlist ---
router.get("/api/secret", (req, res) => {
  const origin = req.headers.origin || "*";
  res.set("Access-Control-Allow-Origin", origin);
  res.set("Access-Control-Allow-Credentials", "true");
  const s = getSession(req);
  res.json({ apiKey: s.apiKey, flag: "ZDS{r3fl3ct3d_c0rs_w1th_cr3d3nt14ls_l34ks_d4t4}" });
});

// A small "attacker page" hosted on this same server for you to test with
// (in a real exploit it would live on a completely different origin).
router.get("/attacker-page", (req, res) => {
  res.set("Content-Type", "text/html");
  res.send(`<html><body>
    <h3>Simulated attacker page</h3>
    <pre id="out">fetching...</pre>
    <script>
      fetch('${req.protocol}://${req.get("host")}/labs/cors-wildcard-credentials/api/secret', { credentials: 'include' })
        .then(r => r.json()).then(d => document.getElementById('out').textContent = JSON.stringify(d, null, 2))
        .catch(e => document.getElementById('out').textContent = 'error: ' + e.message);
    </script>
  </body></html>`);
});


router.post("/reset", (req, res) => {
  req.session.corsLab = null;
  res.redirect("/labs/cors-wildcard-credentials");
});

module.exports = router;
