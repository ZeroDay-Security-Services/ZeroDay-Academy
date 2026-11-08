'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function profile(req) {
  if (!req.lab.state.maProfile) {
    req.lab.state.maProfile = { displayName: 'guest_user', role: 'user', email: 'guest@zeroday-corp.test' };
  }
  return req.lab.state.maProfile;
}

function render(res, req) {
  const current = profile(req);
  return res.render('labs/mass-assignment-role', {
    profile: current,
    flag: current.role === 'admin' ? req.lab.flag() : null
  });
}

router.get('/', (req, res) => {
  render(res, req);
});

// A profile update endpoint that merges every supplied key, including role.
router.post('/update', async (req, res) => {
  const current = profile(req);
  let submitted = {};
  try {
    submitted = JSON.parse(req.body.json || '{}');
  } catch {
    submitted = {};
  }
  if (submitted && typeof submitted === 'object' && !Array.isArray(submitted)) {
    Object.assign(current, submitted);
    req.lab.state.maProfile = current;
    await req.lab.save();
  }
  render(res, req);
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/mass-assignment-role');
});

module.exports = router;
