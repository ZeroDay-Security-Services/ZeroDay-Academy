const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/crlf-header-injection");
});

router.get("/go", (req, res) => {
  const dest = req.query.dest || "/";
  if (/[\r\n]/.test(dest)) {
    req.session.crlfLab = { exploited: true };
  }
  res.statusCode = 302;
  res.setHeader("X-Redirect-Reason", "user-requested");
  try {
    res.socket.write(
      "HTTP/1.1 302 Found\r\nLocation: " + dest + "\r\nX-Powered-By: crlf-lab\r\n\r\n"
    );
    res.socket.end();
  } catch (e) {
    res.status(500).send("error: " + e.message);
  }
});

router.get("/flag", (req, res) => {
  const exploited = req.session.crlfLab && req.session.crlfLab.exploited;
  res.json({ flag: exploited ? "ZDS{crlf_1nj3ct10n_smuggl3s_h34d3rs}" : null, exploited: !!exploited });
});

router.post("/reset", (req, res) => {
  req.session.crlfLab = null;
  res.redirect("/labs/crlf-header-injection");
});

module.exports = router;
