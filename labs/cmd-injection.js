// labs/cmd-injection.js
// VULNERABILITY: OS Command Injection (CWE-78). User input is concatenated
// directly into a shell command string passed to child_process.exec, which
// invokes a shell and allows metacharacters (; | && `` $()) to chain
// arbitrary commands.
const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const labDir = path.join(__dirname, "..", "db", "cmd-injection-fs");
if (!fs.existsSync(labDir)) fs.mkdirSync(labDir, { recursive: true });
const flagPath = path.join(labDir, "flag.txt");
if (!fs.existsSync(flagPath)) fs.writeFileSync(flagPath, "ZDS{n3v3r_sh3ll_0ut_w1th_us3r_1nput}\n");

router.get("/", (req, res) => {
  res.render("labs/cmd-injection", { output: null, host: "", error: null });
});

router.post("/", (req, res) => {
  const host = req.body.host || "";

  // --- VULNERABLE: unsanitized input concatenated into a shell command ---
  const cmd = `ping -c 1 ${host}`;

  exec(cmd, { cwd: labDir, timeout: 5000 }, (err, stdout, stderr) => {
    res.render("labs/cmd-injection", {
      output: (stdout || "") + (stderr || ""),
      host,
      error: err && !stdout ? err.message : null
    });
  });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/cmd-injection");
});

module.exports = router;
