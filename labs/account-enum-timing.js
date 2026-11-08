'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

// A real hash is used for the comparison path so the timing difference is
// genuine rather than a fabricated delay. The password is never disclosed.
const dummyHash = bcrypt.hashSync(crypto.randomBytes(18).toString('hex'), 12);

async function adminHash(req) {
  if (!req.lab.state.adminHash) {
    req.lab.state.adminHash = bcrypt.hashSync(crypto.randomBytes(18).toString('hex'), 12);
    await req.lab.save();
  }
  return req.lab.state.adminHash;
}

router.get('/', (req, res) => {
  res.render('labs/account-enum-timing', { result: null });
});

router.post('/login', async (req, res) => {
  const username = String(req.body.username || '').trim().slice(0, 80);
  const password = String(req.body.password || '').slice(0, 200);
  const start = process.hrtime.bigint();

  let exists = false;
  if (username === 'admin') {
    exists = true;
    await bcrypt.compare(password, await adminHash(req));
  } else {
    await bcrypt.compare(password, dummyHash);
  }

  const elapsedMs = Math.round(Number(process.hrtime.bigint() - start) / 1e6);

  // Timing is the only signal. The response body is identical for every
  // username. A measurable admin comparison is recorded as evidence.
  if (exists && elapsedMs >= 120) {
    req.lab.state.timingEvidence = true;
    await req.lab.save();
  }

  return res.render('labs/account-enum-timing', {
    result: { message: 'Invalid username or password.', elapsedMs }
  });
});

router.post('/check-username', async (req, res) => {
  const guess = String(req.body.guess || '').trim();
  const evidence = req.lab.state.timingEvidence === true;
  const valid = guess === 'admin' && evidence;

  if (guess === 'admin' && !evidence) {
    return res.render('labs/account-enum-timing', {
      result: {
        checkOnly: true,
        valid: false,
        message: 'No timing evidence has been collected for this lab instance yet.'
      }
    });
  }

  return res.render('labs/account-enum-timing', {
    result: {
      checkOnly: true,
      valid,
      flag: valid ? req.lab.flag() : null
    }
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/account-enum-timing');
});

module.exports = router;
