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
  const filter = { labSlug: "nosql-search-injection", released: true, ...req.query };
  delete filter.labSlug;
  const mongoFilter = { labSlug: "nosql-search-injection" };
  Object.keys(filter).forEach(k => { if (k !== "labSlug") mongoFilter["data." + k] = filter[k]; });

  let results = [];
  try {
    results = await LabRecord.find(mongoFilter).lean();
  } catch (e) {
  }
  res.render("labs/nosql-search-injection", { results });
});

router.post("/reset", (req, res) => {

  res.redirect("/labs/nosql-search-injection");
});

module.exports = router;
