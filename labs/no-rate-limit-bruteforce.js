'use strict';

const crypto = require('crypto');
const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function pin(req) {
  if (!req.lab.state.pin) {
    req.lab.state.pin = String(crypto.randomInt(1000, 10000));
  }
  return req.lab.state.pin;
}

router.get('/', async (req, res) => {
  const hadPin = Boolean(req.lab.state.pin);
  pin(req);
  if (!hadPin) await req.lab.save();
  res.render('labs/no-rate-limit-bruteforce', { result: null });
});

// No attempt counter, delay, lockout or rate limit. The PIN is per instance.
router.post('/try-pin', async (req, res) => {
  const correctPin = pin(req);
  const supplied = String(req.body.pin || '').trim();
  const correct = supplied === correctPin;
  const attempts = (req.lab.state.pinAttempts || 0) + 1;
  req.lab.state.pinAttempts = attempts;
  await req.lab.save();

  return res.render('labs/no-rate-limit-bruteforce', {
    result: {
      correct,
      attempts,
      flag: correct ? req.lab.flag() : null
    }
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/no-rate-limit-bruteforce');
});

module.exports = router;
