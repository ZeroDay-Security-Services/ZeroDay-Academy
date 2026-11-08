'use strict';

const crypto = require('crypto');
const express = require('express');
const LabToken = require('../models/LabToken');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

async function ensureState(req) {
  if (!req.lab.state.resetBase || req.lab.state.resetNext == null) {
    const base = 1000 + crypto.randomInt(0, 800);
    req.lab.state.resetBase = base;
    req.lab.state.resetNext = base + 2;
    await req.lab.save();
    await LabToken.create({
      instanceId: req.lab.instance._id,
      labSlug: 'broken-password-reset',
      purpose: 'password-reset',
      ownerUsername: 'admin',
      token: `RST-${base + 1}`,
      used: false
    });
  }
  return req.lab.state;
}

router.get('/', (req, res) => {
  res.render('labs/broken-password-reset', { issuedToken: null, result: null, error: null });
});

router.post('/request-reset', async (req, res) => {
  const state = await ensureState(req);
  const username = String(req.body.username || '').trim().toLowerCase();

  let issuedToken = null;
  if (username === 'guest') {
    const token = `RST-${state.resetNext}`;
    state.resetNext += 1;
    await req.lab.save();
    await LabToken.create({
      instanceId: req.lab.instance._id,
      labSlug: 'broken-password-reset',
      purpose: 'password-reset',
      ownerUsername: 'guest',
      token,
      used: false
    });
    issuedToken = token;
  }

  return res.render('labs/broken-password-reset', {
    issuedToken,
    result: { message: issuedToken ? 'Reset email sent.' : 'If the account exists, a reset email was sent.' },
    error: null
  });
});

router.post('/complete-reset', async (req, res) => {
  const token = String(req.body.token || '').trim().slice(0, 80);
  const newPassword = String(req.body.newPassword || '');
  const record = await LabToken.findOne({
    instanceId: req.lab.instance._id,
    purpose: 'password-reset',
    token,
    used: false
  });

  if (!record) {
    return res.render('labs/broken-password-reset', {
      issuedToken: null,
      result: null,
      error: 'Invalid or already-used token.'
    });
  }
  if (newPassword.length < 8) {
    return res.render('labs/broken-password-reset', {
      issuedToken: null,
      result: null,
      error: 'The new password must be at least 8 characters.'
    });
  }

  record.used = true;
  await record.save();

  return res.render('labs/broken-password-reset', {
    issuedToken: null,
    result: {
      owner: record.ownerUsername,
      flag: record.ownerUsername === 'admin' ? req.lab.flag() : null
    },
    error: null
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/broken-password-reset');
});

module.exports = router;
