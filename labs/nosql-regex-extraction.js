const express = require("express");
const LabRecord = require("../models/LabRecord");
const router = express.Router();

async function ensureSeed() {
  const count = await LabRecord.countDocuments({ labSlug: "nosql-regex-extraction" });
  if (count === 0) {
    await LabRecord.create({ labSlug: "nosql-regex-extraction", kind: "access-code", data: { code: "ZDS{r3g3x_1nj3ct10n_l34ks_byt3_by_byt3}" } });
  }
}

router.get("/", (req, res) => {
  res.render("labs/nosql-regex-extraction", { matchResult: null, checkResult: null });
});

router.post("/probe", async (req, res) => {
  await ensureSeed();
  const pattern = req.body.pattern || "";
  let matched = false;
  try {
    const doc = await LabRecord.findOne({ labSlug: "nosql-regex-extraction", "data.code": { $regex: pattern } }).lean();
    matched = !!doc;
  } catch (e) {
    matched = false;
  }
  res.render("labs/nosql-regex-extraction", { matchResult: { pattern, matched }, checkResult: null });
});

router.post("/check", async (req, res) => {
  await ensureSeed();
  const answer = (req.body.answer || "").trim();
  const doc = await LabRecord.findOne({ labSlug: "nosql-regex-extraction" }).lean();
  const correct = doc && answer === doc.data.code;
  res.render("labs/nosql-regex-extraction", { matchResult: null, checkResult: { correct, flag: correct ? doc.data.code : null } });
});

router.post("/reset", (req, res) => {

  res.redirect("/labs/nosql-regex-extraction");
});

module.exports = router;
