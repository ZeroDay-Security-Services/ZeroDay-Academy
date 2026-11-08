'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function account(req) {
  if (!req.lab.state.account) {
    req.lab.state.account = { id: 'acct_884', displayName: 'guest_user', accountTier: 'free' };
  }
  return req.lab.state.account;
}

router.get('/', (req, res) => {
  const current = account(req);
  res.render('labs/api-mass-assignment', {
    account: current,
    flag: current.accountTier === 'enterprise' ? req.lab.flag() : null
  });
});

// The request body is merged into the account object without an allow-list.
// `accountTier` should never be client-controlled.
router.patch('/api/account', express.json(), async (req, res) => {
  const current = account(req);
  Object.assign(current, req.body || {});
  req.lab.state.account = current;
  await req.lab.save();
  res.json(current);
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/api-mass-assignment');
});

module.exports = router;
