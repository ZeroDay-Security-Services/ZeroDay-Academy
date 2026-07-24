// labs/disclosure-source-map.js
// VULNERABILITY: Exposed JS source map (CWE-540). The production bundle
// ships with its `.map` file still publicly reachable, so anyone can
// reconstruct the original, unminified source -- including comments never
// meant to leave the dev environment, like a TODO referencing a debug
// endpoint.
const express = require("express");
const path = require("path");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/disclosure-source-map");
});

// --- VULNERABLE: the debug endpoint really exists, exactly as the
// leaked source-map comment describes -- "security through obscurity"
// that the source map completely defeats. ---
router.get("/debug", (req, res) => {
  const key = req.query.key || "";
  if (key === "ZDS{s0urc3_m4ps_l34k_0r1g1n4l_s0urc3}") {
    return res.json({ ok: true, flag: key });
  }
  res.status(403).json({ ok: false });
});

router.use(express.static(path.join(__dirname, "static", "disclosure")));


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/disclosure-source-map");
});

module.exports = router;
