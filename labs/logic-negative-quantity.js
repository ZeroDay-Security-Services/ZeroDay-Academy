'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();
const UNIT_PRICE = 89;

function state(req) {
  if (!req.lab.state.negativeQty) {
    req.lab.state.negativeQty = { balance: 0 };
  }
  return req.lab.state.negativeQty;
}

router.get('/', (req, res) => {
  const current = state(req);
  res.render('labs/logic-negative-quantity', {
    balance: current.balance,
    flag: current.balance > 500 ? req.lab.flag() : null
  });
});

// Quantity is not validated as a positive integer. A negative quantity turns
// a purchase into a credit.
router.post('/checkout', async (req, res) => {
  const current = state(req);
  const quantity = Number.parseInt(req.body.quantity, 10);
  if (Number.isFinite(quantity)) {
    const total = quantity * UNIT_PRICE;
    current.balance -= total;
    await req.lab.save();
  }
  res.redirect('/labs/logic-negative-quantity');
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/logic-negative-quantity');
});

module.exports = router;
