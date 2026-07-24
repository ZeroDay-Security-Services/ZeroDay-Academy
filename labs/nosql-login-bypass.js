// labs/nosql-login-bypass.js
// VULNERABILITY: NoSQL Injection -- authentication bypass (CWE-943). The
// login query is built directly from the parsed request body. Because the
// body is JSON, an attacker can send `password` as an OBJECT instead of a
// string -- e.g. {"$ne": null} -- turning a string-equality check into a
// MongoDB query operator the real database engine will honor.
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
  res.render("labs/nosql-login-bypass", { result: null, bodyUsed: null });
});

router.post("/login", express.json(), async (req, res) => {
  await ensureSeed();
  const { username, password } = req.body;
  // --- VULNERABLE: whatever the client sent for `password` (string OR
  // operator object) is dropped straight into the query filter. ---
  const account = await LabAccount.findOne({ username, password }).lean();
  const flag = account && account.role === "admin" ? "ZDS{n0sql_0p3r4t0r_1nj3ct10n_byp4ss3s_l0g1n}" : null;
  res.render("labs/nosql-login-bypass", {
    result: account ? { username: account.username, role: account.role, flag } : { notFound: true },
    bodyUsed: JSON.stringify(req.body)
  });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/nosql-login-bypass");
});

module.exports = router;
