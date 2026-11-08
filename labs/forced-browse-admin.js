'use strict';

const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('labs/forced-browse-admin', { isAdminPage: false, flag: null });
});

// The only protection is the absence of a link plus a robots.txt entry.
router.get('/panel-x29a', (req, res) => {
  res.render('labs/forced-browse-admin', { isAdminPage: true, flag: req.lab.flag() });
});

router.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nDisallow: /labs/forced-browse-admin/panel-x29a\n');
});

router.post('/reset', (req, res) => {
  res.redirect('/labs/forced-browse-admin');
});

module.exports = router;
