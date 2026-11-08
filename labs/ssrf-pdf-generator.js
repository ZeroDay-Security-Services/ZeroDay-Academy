'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function defaultHtml() {
  return '<h1>Invoice #4471</h1>\n<img src="https://example.com/logo.png">';
}

function internalConfig(req) {
  return `db_host=pdf-db.internal
db_password=REDACTED
flag=${req.lab.flag()}
`;
}

router.get('/', (req, res) => {
  res.render('labs/ssrf-pdf-generator', { html: defaultHtml(), fetched: null, error: null });
});

// The PDF renderer fetches every <img src>. Internal hosts are simulated so
// the training deployment never touches the host network.
router.post('/', (req, res) => {
  const html = String(req.body.html || '').slice(0, 8000);
  const source = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  let fetched = null;
  let error = null;

  if (source) {
    const url = source[1];
    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'pdf-internal.local' && parsed.pathname === '/config') {
        fetched = { url, body: internalConfig(req) };
      } else if (parsed.hostname === 'example.com' || parsed.hostname === 'www.example.com') {
        fetched = { url, body: '[binary image data: 1.2 KB]' };
      } else {
        error = 'Could not fetch the resource.';
      }
    } catch {
      error = 'Could not fetch the resource.';
    }
  }

  res.render('labs/ssrf-pdf-generator', { html, fetched, error });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/ssrf-pdf-generator');
});

module.exports = router;
