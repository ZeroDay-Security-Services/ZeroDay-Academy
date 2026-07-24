// labs/ssrf-pdf-generator.js
// VULNERABILITY: SSRF via server-side HTML-to-PDF rendering (CWE-918). The
// "invoice PDF" feature fetches any external resource referenced in the
// submitted HTML (e.g. <img src="...">) from the SERVER, not the browser --
// a very common real-world SSRF vector in PDF/screenshot generation
// services.
const express = require("express");
const router = express.Router();

const INTERNAL_FILES = {
  "http://pdf-internal.local/config": "db_password=REDACTED\nflag=ZDS{ssrf_v14_pdf_r3nd3r3rs_1s_r34l}"
};

router.get("/", (req, res) => {
  res.render("labs/ssrf-pdf-generator", { html: defaultHtml(), fetched: null, error: null });
});

router.post("/", async (req, res) => {
  const html = req.body.html || "";
  // --- VULNERABLE: the "renderer" fetches every <img src="..."> from the
  // server, server-side, with no allowlist. ---
  const srcMatch = html.match(/<img[^>]+src="([^"]+)"/i);
  let fetched = null, error = null;
  if (srcMatch) {
    const url = srcMatch[1];
    try {
      if (INTERNAL_FILES[url]) {
        fetched = { url, body: INTERNAL_FILES[url], via: "simulated-internal-fetch" };
      } else {
        const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(5000) });
        fetched = { url, body: (await r.text()).slice(0, 800), via: "live-fetch" };
      }
    } catch (e) {
      error = e.message;
    }
  }
  res.render("labs/ssrf-pdf-generator", { html, fetched, error });
});

function defaultHtml() {
  return `<h1>Invoice #4471</h1>\n<img src="https://example.com/logo.png">`;
}


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/ssrf-pdf-generator");
});

module.exports = router;
