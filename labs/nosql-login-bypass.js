const express = require("express");
const LabAccount = require("../models/LabAccount");
const router = express.Router();

async function ensureSeed() {
  const count = await LabAccount.countDocuments();
  if (count === 0) {
    await LabAccount.insertMany([
      { username: "admin", password: "K9#mP2vQx!7z", role: "admin" },
      { username: "guest", password: "guest123", role: "user" }
    ]);
  }
}

router.get("/", async (req, res) => {
  await ensureSeed();
  res.render("labs/nosql-login-bypass", { result: null });
});

router.post("/login", express.json(), async (req, res) => {
  await ensureSeed();
  const { username, password } = req.body;
  const account = await LabAccount.findOne({ username, password }).lean();
  const flag = account && account.role === "admin" ? "ZDS{n0sql_0p3r4t0r_1nj3ct10n_byp4ss3s_l0g1n}" : null;
  res.render("labs/nosql-login-bypass", {
    result: account ? { username: account.username, role: account.role, flag } : { notFound: true }
  });
});

router.post("/reset", (req, res) => {

  res.redirect("/labs/nosql-login-bypass");
});

module.exports = router;
