'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('labs/vertical-privesc', {
    role: 'user',
    flag: req.lab.state.verticalAction === true ? req.lab.flag() : null,
    actionTaken: req.lab.state.verticalAction === true
  });
});

// Admin-only by intent, but the handler never checks the caller's role.
router.post('/admin/grant-flag', async (req, res) => {
  req.lab.state.verticalAction = true;
  await req.lab.save();
  res.render('labs/vertical-privesc', {
    role: 'user',
    flag: req.lab.flag(),
    actionTaken: true
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/vertical-privesc');
});

module.exports = router;
