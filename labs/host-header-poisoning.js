'use strict';

const crypto = require('crypto');
const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('labs/host-header-poisoning', { link: null, flag: null });
});

router.post('/request-reset', (req, res) => {
  const email = String(req.body.email || '').slice(0, 160);
  const host = String(req.get('X-Forwarded-Host') || req.get('Host') || '').slice(0, 200);
  const token = crypto.randomBytes(12).toString('hex');
  const link = `http://${host}/reset?token=${token}`;
  const poisoned = /(^|\.)evil-attacker\.test(?::\d+)?$/i.test(host);

  res.render('labs/host-header-poisoning', {
    link,
    email,
    flag: poisoned ? req.lab.flag() : null
  });
});

router.post('/reset', (req, res) => {
  res.redirect('/labs/host-header-poisoning');
});

module.exports = router;
