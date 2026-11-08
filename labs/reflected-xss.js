'use strict';

const express = require('express');
const { proofCookie, validProof, resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

const PRODUCTS = [
  { name: 'Titanium Lockpick Set', price: '$89.00', category: 'Tools' },
  { name: 'RFID Signal Blocker Wallet', price: '$24.00', category: 'Accessories' },
  { name: 'Faraday Laptop Sleeve', price: '$59.00', category: 'Accessories' },
  { name: 'USB Data Blocker (2-pack)', price: '$12.00', category: 'Adapters' },
  { name: 'Hardware Security Key', price: '$45.00', category: 'Auth' },
  { name: 'Encrypted Flash Drive 64GB', price: '$38.00', category: 'Storage' },
  { name: 'Privacy Screen Protector 15"', price: '$32.00', category: 'Accessories' },
  { name: 'Anti-Surveillance RF Detector', price: '$149.00', category: 'Tools' }
];

router.get('/', (req, res) => {
  proofCookie(req, res, 'zda_xss_proof', 'reflected-xss');
  const q = String(req.query.q || '').slice(0, 600);
  const matches = q
    ? PRODUCTS.filter(product => product.name.toLowerCase().includes(q.toLowerCase()))
    : PRODUCTS;

  res.cookie('_ga_sid', 'GA1.2.9182736450.1719430800', { httpOnly: false, sameSite: 'lax' });
  res.cookie('_cf_bm', 'xK9pL2mN7qR3sT5vW8yA1bC4dF6', { httpOnly: false, sameSite: 'lax' });
  res.render('labs/reflected-xss', { q, matches });
});

router.get('/collect', async (req, res) => {
  const supplied = String(req.query.p || req.query.token || '');
  if (!validProof(req, 'reflected-xss', supplied)) {
    return res.status(403).json({ ok: false });
  }
  req.lab.state.reflectedXssSolved = true;
  await req.lab.save();
  return res.json({ ok: true });
});

router.get('/status', (req, res) => {
  const solved = req.lab.state.reflectedXssSolved === true;
  res.json({ solved, flag: solved ? req.lab.flag() : null });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/reflected-xss');
});

module.exports = router;
