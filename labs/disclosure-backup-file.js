'use strict';

const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('labs/disclosure-backup-file');
});

// An old deployment artefact left inside the web root. Directory brute force
// or source-map archaeology can discover it.
router.get('/billing.js.bak', (req, res) => {
  res.type('application/javascript');
  res.send(`// billing.js.bak -- old version, superseded, left on disk by mistake
const STRIPE_TEST_KEY = "sk_test_not_real";
const INTERNAL_ADMIN_OVERRIDE_CODE = "${req.lab.flag()}";
module.exports = { STRIPE_TEST_KEY, INTERNAL_ADMIN_OVERRIDE_CODE };
`);
});

router.get('/backup/billing.js.bak', (req, res) => {
  res.redirect('/labs/disclosure-backup-file/billing.js.bak');
});

router.post('/reset', (req, res) => {
  res.redirect('/labs/disclosure-backup-file');
});

module.exports = router;
