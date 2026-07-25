
const express = require("express");
const router = express.Router();

const INTERNAL_ADMIN_API = {
  "/internal/admin/status": JSON.stringify({ status: "ok", service: "billing-internal" }),
  "/internal/admin/flag": JSON.stringify({ flag: "ZDS{ssrf_w3bh00ks_r34ch_1nt3rn4l_4p1s}" })
};

router.get("/", (req, res) => {
  res.render("labs/ssrf-webhook", { result: null, url: "", error: null });
});

router.post("/", async (req, res) => {
  const url = (req.body.url || "").trim();
  let result = null, error = null;
  try {
    const parsed = new URL(url);
    
    if (parsed.hostname === "internal-admin.local") {
      const body = INTERNAL_ADMIN_API[parsed.pathname] || "404 not found";
      result = { status: 200, body };
    } else {
      const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(5000) });
      const body = await r.text();
      result = { status: r.status, body: body.slice(0, 1500) };
    }
  } catch (e) {
    error = "Could not reach the endpoint.";
  }
  res.render("labs/ssrf-webhook", { result, url, error });
});

router.post("/reset", (req, res) => {
  
  res.redirect("/labs/ssrf-webhook");
});

module.exports = router;
