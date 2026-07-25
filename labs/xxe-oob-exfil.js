
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const labDir = path.join(__dirname, "..", "db", "xxe-oob-fs");
if (!fs.existsSync(labDir)) fs.mkdirSync(labDir, { recursive: true });
const secretPath = path.join(labDir, "db_credentials.conf");
if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, "ZDS{00b_xxe_3xf1ltr4t3s_v14_dtd_f3tch}\n");

function getState(req) {
  if (!req.session.xxeOob) {
    req.session.xxeOob = { dtd: "", received: null };
  }
  return req.session.xxeOob;
}

router.get("/", (req, res) => {
  const state = getState(req);
  res.render("labs/xxe-oob-exfil", { dtd: state.dtd, received: state.received, result: null });
});

router.post("/craft-dtd", (req, res) => {
  const state = getState(req);
  state.dtd = req.body.dtd || state.dtd;
  res.render("labs/xxe-oob-exfil", { dtd: state.dtd, received: state.received, result: null });
});

router.get("/evil.dtd", (req, res) => {
  const state = getState(req);
  res.set("Content-Type", "application/xml-dtd");
  res.send(state.dtd);
});

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
        result = { status: collectRes.status, message: "External DTD processed." };
      } else {
        result = { message: "DTD fetched but could not be expanded." };
      }
    } catch (e) {
      result = { error: e.message };
    }
  } else {
    result = { error: "Could not process the submitted XML." };
  }
  res.render("labs/xxe-oob-exfil", { dtd: state.dtd, received: state.received, result });
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

router.post("/reset", (req, res) => {
  req.session.xxeOob = null;
  res.redirect("/labs/xxe-oob-exfil");
});

module.exports = router;
