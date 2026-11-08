'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

router.get('/', (req, res) => {
  const exploited = req.lab.state.crlfExploited === true;
  res.render('labs/crlf-header-injection', {
    exploited,
    flag: exploited ? req.lab.flag() : null
  });
});

// The redirect destination is concatenated into a raw HTTP response. A CRLF
// sequence lets the caller add arbitrary response headers or a second body.
router.get('/go', async (req, res) => {
  const dest = String(req.query.dest || '/').slice(0, 800);
  if (/[\r\n]/.test(dest)) {
    req.lab.state.crlfExploited = true;
    await req.lab.save();
  }

  try {
    res.socket.write(
      `HTTP/1.1 302 Found\r\nLocation: ${dest}\r\nX-Powered-By: crlf-lab\r\nContent-Length: 0\r\n\r\n`
    );
    res.socket.end();
  } catch (error) {
    res.status(500).type('text').send('Redirect failed.');
  }
});

router.get('/status', (req, res) => {
  const exploited = req.lab.state.crlfExploited === true;
  res.json({ ok: true, exploited, flag: exploited ? req.lab.flag() : null });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/crlf-header-injection');
});

module.exports = router;
