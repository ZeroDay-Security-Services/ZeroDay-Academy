// labs/ssrf-metadata.js
// VULNERABILITY: Server-Side Request Forgery (CWE-918). The "import avatar
// from URL" feature fetches any attacker-supplied URL server-side with no
// allowlist, letting an attacker pivot the server into fetching internal-only
// resources it would never expose directly.
const express = require("express");
const router = express.Router();

// A simulated internal metadata service, only reachable through this
// process (never exposed as its own public route), mimicking cloud
// metadata endpoints like 169.254.169.254.
const FAKE_METADATA = {
  "/latest/meta-data/": "iam/\nhostname\nsecurity-credentials/\n",
  "/latest/meta-data/iam/security-credentials/": "internal-deploy-role",
  "/latest/meta-data/iam/security-credentials/internal-deploy-role":
    JSON.stringify({ AccessKeyId: "AKIA_LAB_DEMO", SecretAccessKey: "ZDS{ssrf_turns_s3rv3rs_1nto_pr0xy_puppets}" }, null, 2)
};

router.get("/", (req, res) => {
  res.render("labs/ssrf-metadata", { result: null, url: "", error: null });
});

router.post("/", async (req, res) => {
  const url = (req.body.url || "").trim();
  let result = null, error = null;

  try {
    const parsed = new URL(url);

    // --- VULNERABLE: no allowlist on scheme/host; internal-looking hosts
    // are trusted the same as public ones. Here we intercept the specific
    // simulated metadata IP so the lab is self-contained (no real network
    // access to cloud metadata is performed or needed).
    if (parsed.hostname === "169.254.169.254") {
      const body = FAKE_METADATA[parsed.pathname] || "404 not found";
      result = { status: 200, body, via: "simulated-internal-metadata-service" };
    } else {
      const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(5000) });
      const body = await r.text();
      result = { status: r.status, body: body.slice(0, 2000), via: "live-fetch" };
    }
  } catch (e) {
    error = e.message;
  }

  res.render("labs/ssrf-metadata", { result, url, error });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/ssrf-metadata");
});

module.exports = router;
