'use strict';

const express = require('express');
const { proofCookie, validProof, resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

router.get('/', (req, res) => {
  proofCookie(req, res, 'zda_xss_proof', 'dom-xss');
  res.cookie('_ga_track', 'GA1.2.5839201746.1719430800', { httpOnly: false, sameSite: 'lax' });
  res.cookie('_cf_bm', 'qR7tY3uI9oP2aS5dF8gH1jK4', { httpOnly: false, sameSite: 'lax' });
  res.cookie('_ui_lang', 'en', { httpOnly: false, sameSite: 'lax' });
  res.render('labs/dom-xss-hash');
});

// The collector is only reachable after script execution in the victim
// context. It validates the server-issued proof token, not a flag.
router.get('/collect', async (req, res) => {
  const supplied = String(req.query.p || req.query.token || '');
  if (!validProof(req, 'dom-xss', supplied)) {
    return res.status(403).json({ ok: false });
  }
  req.lab.state.domXssSolved = true;
  await req.lab.save();
  return res.json({ ok: true });
});

router.get('/status', (req, res) => {
  const solved = req.lab.state.domXssSolved === true;
  res.json({ solved, flag: solved ? req.lab.flag() : null });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/dom-xss-hash');
});

module.exports = router;
