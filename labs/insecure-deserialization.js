'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64');
}

function decode(raw) {
  return JSON.parse(Buffer.from(String(raw), 'base64').toString('utf8'));
}

router.get('/', (req, res) => {
  let raw = req.cookies._sess_prefs;
  if (!raw) {
    raw = encode({ username: 'guest', role: 'user' });
    res.cookie('_sess_prefs', raw, { httpOnly: false, sameSite: 'lax', path: '/labs/insecure-deserialization' });
  }

  res.cookie('_ga_track', 'GA1.2.1847502983.1719430800', { httpOnly: false, sameSite: 'lax' });
  res.cookie('cf_bm', 'aJk3mNqP9sT2vX7yB4cF6gH8', { httpOnly: false, sameSite: 'lax' });
  res.cookie('_ui_locale', 'en-US', { httpOnly: false, sameSite: 'lax' });

  let session = null;
  let error = null;
  let flag = null;
  try {
    session = decode(raw);
    if (session && session.role === 'admin') {
      flag = req.lab.flag();
    }
  } catch {
    error = 'Session error. Please clear your cookies and try again.';
  }

  res.render('labs/insecure-deserialization', { session, error, flag });
});

router.post('/reset', async (req, res) => {
  res.clearCookie('_sess_prefs', { path: '/labs/insecure-deserialization' });
  res.clearCookie('_ga_track');
  res.clearCookie('cf_bm');
  res.clearCookie('_ui_locale');
  await resetLabState(req);
  res.redirect('/labs/insecure-deserialization');
});

module.exports = router;
