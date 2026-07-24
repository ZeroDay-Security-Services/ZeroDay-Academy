// labs/stored-xss.js
// VULNERABILITY: Stored XSS (CWE-79). Comment bodies are persisted verbatim
// (in a real MongoDB collection) and rendered back with no output encoding,
// so a payload posted by one user executes in every other visitor's browser
// -- including the simulated moderator bot's.
//
// BUG FIX: the moderator bot's session token and the "has it been
// exfiltrated" state used to live in module-level variables, which are
// shared by EVERY visitor on the whole process. Once any one player solved
// it, the flag became visible to everyone else with no exploitation
// required. Both are now stored in req.session (itself persisted in
// MongoDB via connect-mongo), so each player gets their own bot instance.
const express = require("express");
const crypto = require("crypto");
const LabComment = require("../models/LabComment");

const router = express.Router();

function getBotSession(req) {
  if (!req.session.storedXssBot) {
    req.session.storedXssBot = {
      token: "bot_sess_" + crypto.randomBytes(12).toString("hex"),
      captured: false
    };
  }
  return req.session.storedXssBot;
}

router.get("/", async (req, res) => {
  const comments = await LabComment.find().sort({ createdAt: -1 }).lean();
  res.render("labs/stored-xss", { comments, posted: false });
});

router.post("/", async (req, res) => {
  const author = (req.body.author || "anonymous").slice(0, 40);
  const body = req.body.body || "";
  // --- VULNERABLE: raw body stored and later rendered without escaping ---
  await LabComment.create({ author, body });
  const comments = await LabComment.find().sort({ createdAt: -1 }).lean();
  res.render("labs/stored-xss", { comments, posted: true });
});

// "Moderator bot" -- simulates an admin viewing the comments page with a
// privileged session cookie, scoped to *your* session only.
router.get("/bot-visit", async (req, res) => {
  const bot = getBotSession(req);
  res.cookie("mod_session", bot.token, { httpOnly: false, sameSite: "lax", encode: (v) => v });
  const comments = await LabComment.find().sort({ createdAt: -1 }).lean();
  res.render("labs/stored-xss", { comments, posted: false, botView: true });
});

router.post("/exfil", (req, res) => {
  const token = req.body.token || req.query.token;
  const bot = getBotSession(req);
  if (token && token.includes(bot.token)) bot.captured = true;
  res.json({ received: true });
});
router.get("/exfil", (req, res) => {
  const token = req.query.token;
  const bot = getBotSession(req);
  if (token && token.includes(bot.token)) bot.captured = true;
  res.json({ received: true });
});

router.get("/check", (req, res) => {
  const bot = getBotSession(req);
  res.json({
    captured: bot.captured,
    flag: bot.captured ? "ZDS{st0r3d_xss_h4rv3sts_admin_s3ss10ns}" : null
  });
});


router.post("/reset", (req, res) => {
  req.session.storedXssBot = null;
  res.redirect("/labs/stored-xss");
});

module.exports = router;
