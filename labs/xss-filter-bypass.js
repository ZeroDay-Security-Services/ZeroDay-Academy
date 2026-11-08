'use strict';

const express = require('express');
const { proofCookie, validProof, resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function naiveFilter(input) {
  // Blocklist only, case-sensitive and limited to literal script tags.
  return String(input).replace(/<script>/gi, '').replace(/<\/script>/gi, '');
}

router.get('/', (req, res) => {
  proofCookie(req, res, 'zda_xss_proof', 'xss-filter');
  const name = String(req.query.name || '').slice(0, 500);
  res.cookie('cf_uid', '5f7c2b7e-1d4a-4b7e-9c8e-3a1b2c4d5e6f', { httpOnly: false, sameSite: 'lax' });
  res.render('labs/xss-filter-bypass', { name, filtered: naiveFilter(name) });
});

router.get('/collect', async (req, res) => {
  const supplied = String(req.query.p || req.query.token || '');
  if (!validProof(req, 'xss-filter', supplied)) {
    return res.status(403).json({ ok: false });
  }
  req.lab.state.xssFilterSolved = true;
  await req.lab.save();
  return res.json({ ok: true });
});

router.get('/status', (req, res) => {
  const solved = req.lab.state.xssFilterSolved === true;
  res.json({ solved, flag: solved ? req.lab.flag() : null });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/xss-filter-bypass');
});

module.exports = router;
