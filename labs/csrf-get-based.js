'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function state(req) {
  if (!req.lab.state.csrfGet) {
    req.lab.state.csrfGet = { balance: 500, transferredToAttacker: false };
  }
  return req.lab.state.csrfGet;
}

router.get('/', (req, res) => {
  const current = state(req);
  res.render('labs/csrf-get-based', {
    balance: current.balance,
    flag: current.transferredToAttacker ? req.lab.flag() : null
  });
});

// State changes on a GET request. Any link or image on an attacker page can
// trigger this transfer without a CSRF token.
router.get('/transfer', async (req, res) => {
  const current = state(req);
  const to = String(req.query.to || '').trim().toLowerCase();
  const amount = Number.parseInt(req.query.amount, 10) || 0;
  if (amount > 0 && amount <= current.balance) {
    current.balance -= amount;
    if (to === 'attacker') current.transferredToAttacker = true;
    await req.lab.save();
  }
  res.redirect(req.get('Referer') && req.get('Referer').includes('/attack') ? '/labs/csrf-get-based/attack-complete' : '/labs/csrf-get-based');
});

router.get('/attack-complete', (req, res) => {
  const current = state(req);
  res.render('labs/csrf-get-based', {
    balance: current.balance,
    flag: current.transferredToAttacker ? req.lab.flag() : null
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/csrf-get-based');
});

module.exports = router;
