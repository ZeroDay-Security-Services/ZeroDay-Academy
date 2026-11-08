'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function state(req) {
  if (!req.lab.state.workflow) {
    req.lab.state.workflow = { paymentCompleted: false, orderConfirmed: false };
  }
  return req.lab.state.workflow;
}

router.get('/', (req, res) => {
  const current = state(req);
  res.render('labs/logic-workflow-skip', {
    state: current,
    flag: current.orderConfirmed && !current.paymentCompleted ? req.lab.flag() : null
  });
});

router.post('/pay', async (req, res) => {
  const current = state(req);
  current.paymentCompleted = true;
  await req.lab.save();
  res.redirect('/labs/logic-workflow-skip');
});

// The confirmation step does not verify that payment completed first.
router.post('/confirm', async (req, res) => {
  const current = state(req);
  current.orderConfirmed = true;
  await req.lab.save();
  res.redirect('/labs/logic-workflow-skip');
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/logic-workflow-skip');
});

module.exports = router;
