// labs/disclosure-verbose-errors.js
// VULNERABILITY: Verbose error messages (CWE-209). There's no custom error
// handler -- an unhandled exception's full message and stack, including
// internal file paths and values, gets serialized straight into the HTTP
// response.
const express = require("express");
const router = express.Router();

const INTERNAL_CONFIG = { dbHost: "internal-db.local", debugFlag: "ZDS{v3rb0s3_3rr0rs_l34k_1nt3rn4l_st4t3}" };

router.get("/", (req, res) => {
  res.render("labs/disclosure-verbose-errors", { output: null });
});

// --- VULNERABLE: any thrown error's real message reaches the client ---
router.post("/lookup", (req, res) => {
  const id = req.body.id;
  try {
    if (typeof id !== "string" || id.trim() === "") {
      throw new Error("Lookup failed for id=" + JSON.stringify(id) + " against config " + JSON.stringify(INTERNAL_CONFIG));
    }
    const parsed = JSON.parse(id); // throws a real, revealing SyntaxError on non-JSON input
    res.render("labs/disclosure-verbose-errors", { output: "Parsed: " + JSON.stringify(parsed) });
  } catch (e) {
    res.status(500).render("labs/disclosure-verbose-errors", { output: "Internal Server Error: " + e.stack });
  }
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/disclosure-verbose-errors");
});

module.exports = router;
