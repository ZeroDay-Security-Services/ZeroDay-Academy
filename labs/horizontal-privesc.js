// labs/horizontal-privesc.js
// VULNERABILITY: Horizontal privilege escalation (CWE-639). You're logged
// in as "alice"; the notes endpoint trusts the :username in the URL with
// no check that it matches your own session identity.
const express = require("express");
const LabRecord = require("../models/LabRecord");
const router = express.Router();

async function ensureSeed() {
  const count = await LabRecord.countDocuments({ labSlug: "horizontal-privesc" });
  if (count === 0) {
    await LabRecord.insertMany([
      { labSlug: "horizontal-privesc", kind: "note", data: { username: "alice", note: "Remember to renew the domain." } },
      { labSlug: "horizontal-privesc", kind: "note", data: { username: "bob", note: "Q3 numbers look strong. Don't discuss publicly yet." } },
      { labSlug: "horizontal-privesc", kind: "note", data: { username: "admin", note: "Master flag: ZDS{h0r1z0nt4l_pr1v3sc_1gn0r3s_0wn3rsh1p}" } }
    ]);
  }
}

router.get("/", async (req, res) => {
  await ensureSeed();
  const mine = await LabRecord.findOne({ labSlug: "horizontal-privesc", "data.username": "alice" }).lean();
  res.render("labs/horizontal-privesc", { myNote: mine.data.note, note: null, error: null, username: "" });
});

router.get("/note/:username", async (req, res) => {
  await ensureSeed();
  // --- VULNERABLE: no check that :username matches the logged-in user (alice) ---
  const rec = await LabRecord.findOne({ labSlug: "horizontal-privesc", "data.username": req.params.username }).lean();
  const mine = await LabRecord.findOne({ labSlug: "horizontal-privesc", "data.username": "alice" }).lean();
  if (!rec) return res.status(404).render("labs/horizontal-privesc", { myNote: mine.data.note, note: null, error: "No such user.", username: req.params.username });
  res.render("labs/horizontal-privesc", { myNote: mine.data.note, note: rec.data, error: null, username: req.params.username });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/horizontal-privesc");
});

module.exports = router;
