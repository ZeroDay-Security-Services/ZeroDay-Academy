'use strict';

const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('labs/disclosure-verbose-errors', { output: null });
});

router.post('/lookup', (req, res) => {
  const id = req.body.id;
  const config = {
    dbHost: 'internal-db.local',
    redisHost: 'cache.internal',
    debugFlag: req.lab.flag()
  };

  try {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new Error(`Lookup failed for id=${JSON.stringify(id)} against config ${JSON.stringify(config)}`);
    }
    const parsed = JSON.parse(id);
    return res.render('labs/disclosure-verbose-errors', {
      output: `Record parsed successfully: ${JSON.stringify(parsed)}`
    });
  } catch (error) {
    return res.status(500).render('labs/disclosure-verbose-errors', {
      output: `Internal Server Error\n${error.stack}\n\nRuntime configuration: ${JSON.stringify(config, null, 2)}`
    });
  }
});

router.post('/reset', (req, res) => {
  res.redirect('/labs/disclosure-verbose-errors');
});

module.exports = router;
