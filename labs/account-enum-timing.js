const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

const ACCOUNTS = { admin: bcrypt.hashSync("correct-horse-battery-staple", 12) };

router.get("/", (req, res) => {
  res.render("labs/account-enum-timing", { result: null });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const start = Date.now();
  if (ACCOUNTS[username]) {
    bcrypt.compareSync(password || "", ACCOUNTS[username]);
  }
  const elapsedMs = Date.now() - start;
  res.render("labs/account-enum-timing", { result: { message: "Invalid username or password.", elapsedMs } });
});

router.post("/check-username", (req, res) => {
  const username = (req.body.guess || "").trim();
  const valid = Object.prototype.hasOwnProperty.call(ACCOUNTS, username);
  res.render("labs/account-enum-timing", {
    result: { checkOnly: true, valid, flag: valid ? "ZDS{t1m1ng_s1d3_ch4nn3ls_l34k_us3rn4m3s}" : null }
  });
});

router.post("/reset", (req, res) => {

  res.redirect("/labs/account-enum-timing");
});

module.exports = router;
