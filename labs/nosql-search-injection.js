'use strict';

const express = require('express');
const LabData = require('../models/LabData');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

async function products(req) {
  let records = await LabData.find({ instanceId: req.lab.instance._id, key: 'products' }).lean();
  if (records.length === 0) {
    await LabData.insertMany([
      {
        instanceId: req.lab.instance._id,
        userId: req.user._id,
        challengeId: req.lab.challenge._id,
        key: 'products',
        data: { name: 'Titanium Lockpick Set', released: true, price: '$89.00' }
      },
      {
        instanceId: req.lab.instance._id,
        userId: req.user._id,
        challengeId: req.lab.challenge._id,
        key: 'products',
        data: { name: 'RFID Signal Blocker Wallet', released: true, price: '$24.00' }
      },
      {
        instanceId: req.lab.instance._id,
        userId: req.user._id,
        challengeId: req.lab.challenge._id,
        key: 'products',
        data: { name: `Prototype Zero-Day Scanner -- ${req.lab.flag()}`, released: false, price: '$1,200.00' }
      }
    ]);
    records = await LabData.find({ instanceId: req.lab.instance._id, key: 'products' }).lean();
  }
  return records;
}

router.get('/', async (req, res) => {
  await products(req);
  const released = Object.prototype.hasOwnProperty.call(req.query, 'released') ? req.query.released : true;
  const filter = {
    instanceId: req.lab.instance._id,
    key: 'products',
    'data.released': released
  };
  if (typeof req.query.name === 'string' && req.query.name) {
    filter['data.name'] = { $regex: String(req.query.name).slice(0, 80), $options: 'i' };
  }

  let results = [];
  try {
    results = await LabData.find(filter).lean();
  } catch {
    results = [];
  }
  res.render('labs/nosql-search-injection', { results, query: req.query });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/nosql-search-injection');
});

module.exports = router;
