'use strict';

const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('labs/disclosure-env-file');
});

// Dotfiles are served because the deployment copied the project root into the
// static web root. There is no link to this path anywhere in the UI.
router.get('/.env', (req, res) => {
  res.type('text/plain');
  res.send(`NODE_ENV=production
APP_NAME=CorpDash
DATABASE_URL=postgres://corpdash:${req.lab.proof('db-password').slice(0, 18)}@db.internal:5432/corpdash
REDIS_URL=redis://cache.internal:6379
FLAG=${req.lab.flag()}
`);
});

router.get('/env', (req, res) => {
  res.redirect('/labs/disclosure-env-file/.env');
});

router.post('/reset', (req, res) => {
  res.redirect('/labs/disclosure-env-file');
});

module.exports = router;
