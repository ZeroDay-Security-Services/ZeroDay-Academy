'use strict';

const crypto = require('crypto');
const express = require('express');
const LabData = require('../models/LabData');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

async function accounts(req) {
  let records = await LabData.find({ instanceId: req.lab.instance._id, key: 'accounts' }).lean();
  if (records.length === 0) {
    await LabData.insertMany([
      {
        instanceId: req.lab.instance._id,
        userId: req.user._id,
        challengeId: req.lab.challenge._id,
        key: 'accounts',
        data: { username: 'admin', password: `K9#${crypto.randomBytes(10).toString('hex')}`, role: 'admin' }
      },
      {
        instanceId: req.lab.instance._id,
        userId: req.user._id,
        challengeId: req.lab.challenge._id,
        key: 'accounts',
        data: { username: 'guest', password: 'guest123', role: 'user' }
      }
    ]);
    records = await LabData.find({ instanceId: req.lab.instance._id, key: 'accounts' }).lean();
  }
  return records;
}

router.get('/', async (req, res) => {
  await accounts(req);
  res.render('labs/nosql-login-bypass', { result: null });
});

router.post('/login', express.json(), async (req, res) => {
  await accounts(req);
  const username = req.body.username;
  const password = req.body.password;

  let account = null;
  let error = null;
  try {
    account = await LabData.findOne({
      instanceId: req.lab.instance._id,
      key: 'accounts',
      'data.username': username,
      'data.password': password
    }).lean();
  } catch (caught) {
    error = caught.message.slice(0, 160);
  }

  return res.render('labs/nosql-login-bypass', {
    result: account
      ? { username: account.data.username, role: account.data.role, flag: account.data.role === 'admin' ? req.lab.flag() : null }
      : { notFound: true, error }
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/nosql-login-bypass');
});

module.exports = router;
