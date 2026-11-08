'use strict';

const express = require('express');
const { seedLabData, resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

async function notes(req) {
  return seedLabData(req, 'notes', [
    { username: 'alice', note: 'Remember to renew the domain before the end of the month.' },
    { username: 'bob', note: 'Q3 numbers look strong. Do not discuss publicly yet.' },
    { username: 'admin', note: `Master flag: ${req.lab.flag()}` }
  ]);
}

router.get('/', async (req, res) => {
  const records = await notes(req);
  const mine = records.find(record => record.data.username === 'alice');
  res.render('labs/horizontal-privesc', {
    myNote: mine?.data.note || '',
    note: null,
    error: null,
    username: ''
  });
});

// Horizontal privilege escalation: the session belongs to alice, but the
// username in the path selects whose note is returned.
router.get('/note/:username', async (req, res) => {
  const records = await notes(req);
  const mine = records.find(record => record.data.username === 'alice');
  const record = records.find(item => item.data.username === req.params.username);
  if (!record) {
    return res.status(404).render('labs/horizontal-privesc', {
      myNote: mine?.data.note || '',
      note: null,
      error: 'No such user.',
      username: req.params.username
    });
  }
  return res.render('labs/horizontal-privesc', {
    myNote: mine?.data.note || '',
    note: record.data,
    error: null,
    username: req.params.username
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/horizontal-privesc');
});

module.exports = router;
