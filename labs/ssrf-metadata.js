
const express = require("express");
const router = express.Router();

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

    if (parsed.hostname === "169.254.169.254") {
      const body = FAKE_METADATA[parsed.pathname] || "404 not found";
      result = { status: 200, body };
    } else {
      const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(5000) });
      const body = await r.text();
      result = { status: r.status, body: body.slice(0, 2000) };
    }
  } catch (e) {
    error = "Could not fetch the URL.";
  }

  res.render("labs/ssrf-metadata", { result, url, error });
});

router.post("/reset", (req, res) => {
  
  res.redirect("/labs/ssrf-metadata");
});

module.exports = router;
