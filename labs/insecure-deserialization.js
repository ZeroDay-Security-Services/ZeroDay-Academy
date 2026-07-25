const express = require("express");
const router = express.Router();

const FLAG = "ZDS{unsign3d_c00k1es_ar3_just_suggest10ns}";

function makeCookie(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
}

function readCookie(raw) {
  return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
}

router.get("/", (req, res) => {
  let sessionCookie = req.cookies._sess_prefs;
  if (!sessionCookie) {
    sessionCookie = makeCookie({ username: "guest", role: "user" });
    res.cookie("_sess_prefs", sessionCookie, { httpOnly: false, sameSite: "lax" });
  }

  res.cookie("_ga_track", "GA1.2.1847502983.1719430800", { httpOnly: false, sameSite: "lax" });
  res.cookie("cf_bm", "aJk3mNqP9sT2vX7yB4cF6gH8", { httpOnly: false, sameSite: "lax" });
  res.cookie("_ui_locale", "en-US", { httpOnly: false, sameSite: "lax" });

  let session = null, error = null, flag = null;
  try {
    session = readCookie(sessionCookie);
    if (session.role === "admin") flag = FLAG;
  } catch (e) {
    error = "Session error. Please clear your cookies and try again.";
  }

  res.render("labs/insecure-deserialization", { session, error, flag });
});

router.post("/reset", (req, res) => {
  res.clearCookie("_sess_prefs");
  res.clearCookie("_ga_track");
  res.clearCookie("cf_bm");
  res.clearCookie("_ui_locale");
  res.redirect("/labs/insecure-deserialization");
});

module.exports = router;
