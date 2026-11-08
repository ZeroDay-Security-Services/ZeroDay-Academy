'use strict';

const express = require('express');
const LabData = require('../models/LabData');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

async function accessCode(req) {
  let record = await LabData.findOne({ instanceId: req.lab.instance._id, key: 'access-code' });
  if (!record) {
    record = await LabData.create({
      instanceId: req.lab.instance._id,
      userId: req.user._id,
      challengeId: req.lab.challenge._id,
      key: 'access-code',
      data: { code: req.lab.flag() }
    });
  }
  return record;
}

router.get('/', async (req, res) => {
  await accessCode(req);
  res.render('labs/nosql-regex-extraction', { matchResult: null, checkResult: null });
});

router.post('/probe', async (req, res) => {
  await accessCode(req);
  const pattern = String(req.body.pattern || '').slice(0, 160);
  let matched = false;
  try {
    const record = await LabData.findOne({
      instanceId: req.lab.instance._id,
      key: 'access-code',
      'data.code': { $regex: pattern }
    }).lean();
    matched = Boolean(record);
  } catch {
    matched = false;
  }
  return res.render('labs/nosql-regex-extraction', {
    matchResult: { pattern, matched },
    checkResult: null
  });
});

router.post('/check', async (req, res) => {
  const record = await accessCode(req);
  const answer = String(req.body.answer || '').trim();
  const correct = answer === record.data.code;
  return res.render('labs/nosql-regex-extraction', {
    matchResult: null,
    checkResult: { correct, flag: correct ? record.data.code : null }
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/nosql-regex-extraction');
});

module.exports = router;
