// labs/api-excessive-data.js
// VULNERABILITY: Excessive Data Exposure (OWASP API3:2019 / CWE-213). The
// API returns the entire backing document to the client and relies on the
// frontend to only display the "safe" fields -- so any client that reads
// the raw JSON directly sees everything, including internal notes.
const express = require("express");
const LabRecord = require("../models/LabRecord");
const router = express.Router();

async function ensureSeed() {
  const count = await LabRecord.countDocuments({ labSlug: "api-excessive-data" });
  if (count === 0) {
    await LabRecord.create({
      labSlug: "api-excessive-data", kind: "user-profile",
      data: {
        id: "u_2291", name: "Jordan Lee", title: "Support Engineer",
        internalNotes: "Flagged for review after suspicious login pattern. Flag: ZDS{3xc3ss1v3_d4t4_3xp0sur3_tru5ts_th3_fr0nt3nd}",
        internalRiskScore: 87
      }
    });
  }
}

router.get("/", async (req, res) => {
  await ensureSeed();
  res.render("labs/api-excessive-data");
});

// --- VULNERABLE: returns the full document; the "profile card" UI just
// happens to only render name/title, but the API response has everything. ---
router.get("/api/profile/:id", async (req, res) => {
  await ensureSeed();
  const rec = await LabRecord.findOne({ labSlug: "api-excessive-data", "data.id": req.params.id }).lean();
  if (!rec) return res.status(404).json({ error: "not found" });
  res.json(rec.data);
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/api-excessive-data");
});

module.exports = router;
