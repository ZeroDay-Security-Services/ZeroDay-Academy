const express = require("express");
const router = express.Router();

const INTERNAL_CONFIG = { dbHost: "internal-db.local", debugFlag: "ZDS{v3rb0s3_3rr0rs_l34k_1nt3rn4l_st4t3}" };

router.get("/", (req, res) => {
  res.render("labs/disclosure-verbose-errors", { output: null });
});

router.post("/lookup", (req, res) => {
  const id = req.body.id;
  try {
    if (typeof id !== "string" || id.trim() === "") {
      throw new Error("Lookup failed for id=" + JSON.stringify(id) + " against config " + JSON.stringify(INTERNAL_CONFIG));
    }
    const parsed = JSON.parse(id);
    res.render("labs/disclosure-verbose-errors", { output: "Parsed: " + JSON.stringify(parsed) });
  } catch (e) {
    res.status(500).render("labs/disclosure-verbose-errors", { output: "Internal Server Error: " + e.stack });
  }
});

router.post("/reset", (req, res) => {

  res.redirect("/labs/disclosure-verbose-errors");
});

module.exports = router;
