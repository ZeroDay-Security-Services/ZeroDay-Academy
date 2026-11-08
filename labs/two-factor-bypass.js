'use strict';

const crypto = require('crypto');
const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function state(req) {
  if (!req.lab.state.mfa) {
    req.lab.state.mfa = {
      step1Done: false,
      otp: String(crypto.randomInt(100000, 999999))
    };
  }
  return req.lab.state.mfa;
}

router.get('/', (req, res) => {
  const current = state(req);
  res.render('labs/two-factor-bypass', { step1Done: current.step1Done, result: null });
});

router.post('/step1', async (req, res) => {
  const current = state(req);
  const { username, password } = req.body;
  if (username === 'admin' && password === 'adminpass') {
    current.step1Done = true;
    await req.lab.save();
  }
  res.render('labs/two-factor-bypass', {
    step1Done: current.step1Done,
    result: current.step1Done ? null : { error: 'Invalid credentials.' }
  });
});

router.post('/step2', async (req, res) => {
  const current = state(req);
  if (!current.step1Done) {
    return res.render('labs/two-factor-bypass', {
      step1Done: false,
      result: { error: 'Complete step 1 first.' }
    });
  }

  const otp = String(req.body.otp || '').trim();
  const legacyDebug = req.body.debugSkip === 'true' || req.body.debug === '1';
  const verified = legacyDebug || otp === current.otp;
  res.render('labs/two-factor-bypass', {
    step1Done: true,
    result: {
      success: verified,
      flag: verified ? req.lab.flag() : null
    }
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/two-factor-bypass');
});

module.exports = router;
