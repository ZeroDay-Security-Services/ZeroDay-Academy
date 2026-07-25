
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
  
  await LabComment.create({ author, body });
  const comments = await LabComment.find().sort({ createdAt: -1 }).lean();
  res.render("labs/stored-xss", { comments, posted: true });
});

router.get("/bot-visit", async (req, res) => {
  const bot = getBotSession(req);
  res.cookie("_admin_csrf", bot.token, { httpOnly: false, sameSite: "lax", encode: (v) => v });
  
  res.cookie("_ga_track", "GA1.2.9382716450.1719430800", { httpOnly: false, sameSite: "lax" });
  res.cookie("_ui_pref", "dark", { httpOnly: false, sameSite: "lax" });
  const comments = await LabComment.find().sort({ createdAt: -1 }).lean();
  res.render("labs/stored-xss", { comments, posted: false });
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
