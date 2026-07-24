// labs/nosql-expr-injection.js
// VULNERABILITY: NoSQL injection via aggregation-expression operator
// injection (CWE-943). The "filter" a client submits is parsed as JSON and
// merged directly into a real MongoDB query, including $expr -- MongoDB's
// aggregation expression language -- letting an attacker build arbitrary
// server-side boolean conditions (e.g. per-character string comparisons)
// against fields never exposed by the API.
const express = require("express");
const LabRecord = require("../models/LabRecord");
const router = express.Router();

async function ensureSeed() {
  const count = await LabRecord.countDocuments({ labSlug: "nosql-expr-injection" });
  if (count === 0) {
    await LabRecord.create({ labSlug: "nosql-expr-injection", kind: "vault", data: { name: "vault-1", secret: "ZDS{3xpr3ss10n_1nj3ct10n_v14_expr_0p3r4t0r}" } });
  }
}

router.get("/", (req, res) => {
  res.render("labs/nosql-expr-injection", { matchResult: null, checkResult: null });
});

router.post("/probe", async (req, res) => {
  await ensureSeed();
  let filterFragment = {};
  try {
    filterFragment = JSON.parse(req.body.filter || "{}");
  } catch (e) {
    return res.render("labs/nosql-expr-injection", { matchResult: { error: "Invalid JSON." }, checkResult: null });
  }
  let matched = false, error = null;
  try {
    // --- VULNERABLE: attacker-controlled JSON merged straight into the
    // real filter, including support for $expr aggregation expressions. ---
    const doc = await LabRecord.findOne({ labSlug: "nosql-expr-injection", ...filterFragment }).lean();
    matched = !!doc;
  } catch (e) {
    error = e.message;
  }
  res.render("labs/nosql-expr-injection", { matchResult: { filter: req.body.filter, matched, error }, checkResult: null });
});

router.post("/check", async (req, res) => {
  await ensureSeed();
  const answer = (req.body.answer || "").trim();
  const doc = await LabRecord.findOne({ labSlug: "nosql-expr-injection" }).lean();
  const correct = doc && answer === doc.data.secret;
  res.render("labs/nosql-expr-injection", { matchResult: null, checkResult: { correct, flag: correct ? doc.data.secret : null } });
});


router.post("/reset", (req, res) => {
  req.session.nosqlExpr = null;
  res.redirect("/labs/nosql-expr-injection");
});

module.exports = router;
