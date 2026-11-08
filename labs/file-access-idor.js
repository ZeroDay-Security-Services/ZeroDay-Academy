'use strict';

const express = require('express');
const { seedLabData, resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

async function files(req) {
  return seedLabData(req, 'files', [
    { id: 1, owner: 'guest', filename: 'guest-report-1.txt', contentType: 'text/plain', content: 'Q1 usage summary for the guest account. Nothing sensitive here.' },
    { id: 2, owner: 'j.harrington', filename: 'board-minutes-2.txt', contentType: 'text/plain', content: 'Board meeting notes -- confidential. Do not distribute.' },
    {
      id: 3,
      owner: 'admin',
      filename: 'infra-credentials-3.txt',
      contentType: 'text/plain',
      content: `Infrastructure credential rotation log.\nFlag: ${req.lab.flag()}\n`
    }
  ]);
}

router.get('/', async (req, res) => {
  const records = await files(req);
  res.render('labs/file-access-idor', {
    myFiles: records.filter(record => record.data.owner === 'guest'),
    file: null,
    error: null
  });
});

// Sequential identifiers with no ownership check.
router.get('/download/:id', async (req, res) => {
  const records = await files(req);
  const record = records.find(item => String(item.data.id) === String(req.params.id));
  if (!record) {
    return res.status(404).render('labs/file-access-idor', {
      myFiles: records.filter(item => item.data.owner === 'guest'),
      file: null,
      error: 'No such file.'
    });
  }
  return res.render('labs/file-access-idor', {
    myFiles: records.filter(item => item.data.owner === 'guest'),
    file: record.data,
    error: null
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/file-access-idor');
});

module.exports = router;
