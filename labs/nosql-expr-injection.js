'use strict';

const express = require('express');
const LabData = require('../models/LabData');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

async function vault(req) {
  let record = await LabData.findOne({ instanceId: req.lab.instance._id, key: 'vault' });
  if (!record) {
    record = await LabData.create({
      instanceId: req.lab.instance._id,
      userId: req.user._id,
      challengeId: req.lab.challenge._id,
      key: 'vault',
      data: { name: 'vault-1', secret: req.lab.flag() }
    });
  }
  return record;
}

router.get('/', async (req, res) => {
  await vault(req);
  res.render('labs/nosql-expr-injection', { matchResult: null, checkResult: null });
});

router.post('/probe', async (req, res) => {
  await vault(req);
  let filterFragment;
  try {
    filterFragment = JSON.parse(req.body.filter || '{}');
  } catch {
    return res.render('labs/nosql-expr-injection', {
      matchResult: { error: 'Invalid JSON.' },
      checkResult: null
    });
  }
  if (!filterFragment || typeof filterFragment !== 'object' || Array.isArray(filterFragment)) {
    return res.render('labs/nosql-expr-injection', {
      matchResult: { error: 'Filter must be a JSON object.' },
      checkResult: null
    });
  }
  if (Object.prototype.hasOwnProperty.call(filterFragment, '$where')) {
    return res.render('labs/nosql-expr-injection', {
      matchResult: { error: 'This deployment does not permit $where.' },
      checkResult: null
    });
  }

  let matched = false;
  let error = null;
  try {
    const docs = await LabData.find({
      ...filterFragment,
      instanceId: req.lab.instance._id,
      key: 'vault'
    }).limit(5).lean();
    matched = docs.length > 0;
  } catch (caught) {
    error = caught.message.slice(0, 200);
  }

  return res.render('labs/nosql-expr-injection', {
    matchResult: { filter: req.body.filter, matched, error },
    checkResult: null
  });
});

router.post('/check', async (req, res) => {
  const record = await vault(req);
  const answer = String(req.body.answer || '').trim();
  const correct = answer === record.data.secret;
  return res.render('labs/nosql-expr-injection', {
    matchResult: null,
    checkResult: { correct, flag: correct ? record.data.secret : null }
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/nosql-expr-injection');
});

module.exports = router;
