'use strict';

const crypto = require('crypto');
const express = require('express');
const LabData = require('../models/LabData');
const LabToken = require('../models/LabToken');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

async function coupon(req) {
  let record = await LabData.findOne({
    instanceId: req.lab.instance._id,
    key: 'coupon'
  });
  if (!record) {
    record = await LabData.create({
      instanceId: req.lab.instance._id,
      userId: req.user._id,
      challengeId: req.lab.challenge._id,
      key: 'coupon',
      data: { code: 'WELCOME10', discountPercent: 10, usesRemaining: 1 }
    });
  }
  return record;
}

async function redemptions(req) {
  return LabToken.countDocuments({
    instanceId: req.lab.instance._id,
    labSlug: 'logic-coupon-race',
    purpose: 'coupon-redemption'
  });
}

router.get('/', async (req, res) => {
  const record = await coupon(req);
  const count = await redemptions(req);
  res.render('labs/logic-coupon-race', {
    usesRemaining: record.data.usesRemaining,
    successfulRedemptions: count,
    flag: count > 1 ? req.lab.flag() : null
  });
});

// Read-check-write without a transaction or atomic guard. Two concurrent
// redemptions can both observe usesRemaining = 1.
router.post('/redeem', async (req, res) => {
  const record = await coupon(req);
  const before = record.data.usesRemaining;
  await new Promise(resolve => setTimeout(resolve, 150));
  let success = false;
  if (before > 0) {
    record.data.usesRemaining = Math.max(0, before - 1);
    await record.save();
    await LabToken.create({
      instanceId: req.lab.instance._id,
      labSlug: 'logic-coupon-race',
      purpose: 'coupon-redemption',
      ownerUsername: req.user.username,
      token: crypto.randomBytes(10).toString('hex'),
      used: false
    });
    success = true;
  }
  const count = await redemptions(req);
  res.json({
    redeemed: success,
    successfulRedemptions: count,
    flag: count > 1 ? req.lab.flag() : null
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  await coupon(req);
  res.redirect('/labs/logic-coupon-race');
});

module.exports = router;
