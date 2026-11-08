'use strict';

const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('labs/disclosure-source-map');
});

router.get('/js/app.bundle.js', (req, res) => {
  res.type('application/javascript');
  res.send('(function(){"use strict";function a(e){return e+1}console.log("app loaded")})();\n//# sourceMappingURL=app.bundle.js.map\n');
});

router.get('/js/app.bundle.js.map', (req, res) => {
  const debugKey = req.lab.proof('source-map-debug');
  res.type('application/json');
  res.send(JSON.stringify({
    version: 3,
    file: 'app.bundle.js',
    sources: ['app.js'],
    sourcesContent: [
      `// app.js -- original source\nfunction increment(x){return x+1;}\n// TODO: remove before deploy -- debug endpoint, no auth required\n// GET /labs/disclosure-source-map/debug?key=${debugKey}\nconsole.log("app loaded");`
    ],
    names: [],
    mappings: ''
  }));
});

router.get('/debug', (req, res) => {
  if (String(req.query.key || '') !== req.lab.proof('source-map-debug')) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }
  return res.json({ ok: true, build: '2026.03.11-rc4', flag: req.lab.flag() });
});

router.post('/reset', (req, res) => {
  res.redirect('/labs/disclosure-source-map');
});

module.exports = router;
