// labs/nosql-search-injection.js
// VULNERABILITY: NoSQL operator injection via query-string parsing
// (CWE-943). Express parses bracket-notation query strings into nested
// objects (e.g. ?released[$ne]=true becomes {released:{$ne:true}}), and
// this endpoint spreads req.query straight into a real MongoDB filter --
// so a "hide unreleased items" check can be flipped entirely.
const express = require("express");
const LabRecord = require("../models/LabRecord");
const router = express.Router();

async function ensureSeed() {
  const count = await LabRecord.countDocuments({ labSlug: "nosql-search-injection" });
  if (count === 0) {
    await LabRecord.insertMany([
      { labSlug: "nosql-search-injection", kind: "product", data: { name: "Titanium Lockpick Set", released: true } },
      { labSlug: "nosql-search-injection", kind: "product", data: { name: "RFID Signal Blocker Wallet", released: true } },
      { labSlug: "nosql-search-injection", kind: "product", data: { name: "Prototype Zero-Day Scanner -- ZDS{n0sql_qu3rystr1ng_0p3r4t0r_1nj3ct10n}", released: false } }
    ]);
  }
}

router.get("/", async (req, res) => {
  await ensureSeed();
  // --- VULNERABLE: any operator the client sends for `released` (or any
  // other field) is merged straight into the real query filter. ---
  const filter = { labSlug: "nosql-search-injection", released: true, ...req.query };
  delete filter.labSlug; // keep labSlug from being overridden, but everything else passes through
  const mongoFilter = { labSlug: "nosql-search-injection" };
  Object.keys(filter).forEach(k => { if (k !== "labSlug") mongoFilter["data." + k] = filter[k]; });

  let results = [];
  try {
    results = await LabRecord.find(mongoFilter).lean();
  } catch (e) {
    // invalid operator shape -- fail closed to an empty result
  }
  res.render("labs/nosql-search-injection", { results, rawQuery: JSON.stringify(req.query) });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/nosql-search-injection");
});

module.exports = router;
