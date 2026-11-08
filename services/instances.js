'use strict';

const LabInstance = require('../models/LabInstance');
const { config } = require('../config');

function expiryFromNow() {
  return new Date(Date.now() + config.lab.ttlMinutes * 60 * 1000);
}

async function expireStale(userId) {
  await LabInstance.updateMany(
    { userId, status: 'active', expiresAt: { $lte: new Date() } },
    { $set: { status: 'expired' } }
  );
}

async function getActiveInstance(userId, challengeId) {
  return LabInstance.findOne({
    userId,
    challengeId,
    status: 'active',
    expiresAt: { $gt: new Date() }
  });
}

async function ensureInstance(userId, challenge) {
  await expireStale(userId);
  let instance = await getActiveInstance(userId, challenge._id);
  if (instance) {
    instance.lastSeenAt = new Date();
    await instance.save();
    return instance;
  }

  const activeCount = await LabInstance.countDocuments({ userId, status: 'active', expiresAt: { $gt: new Date() } });
  if (activeCount >= config.lab.maxActivePerUser) {
    const oldest = await LabInstance.findOne({ userId, status: 'active' }).sort({ lastSeenAt: 1 });
    if (oldest) {
      oldest.status = 'stopped';
      await oldest.save();
    }
  }

  instance = await LabInstance.create({
    userId,
    challengeId: challenge._id,
    expiresAt: expiryFromNow()
  });
  return instance;
}

async function resetInstance(userId, challenge) {
  await LabInstance.updateMany(
    { userId, challengeId: challenge._id, status: 'active' },
    { $set: { status: 'stopped' } }
  );
  const previous = await LabInstance.findOne({ userId, challengeId: challenge._id }).sort({ resetCount: -1 });
  const instance = await LabInstance.create({
    userId,
    challengeId: challenge._id,
    expiresAt: expiryFromNow(),
    resetCount: (previous?.resetCount || 0) + 1
  });
  return instance;
}

async function stopInstance(userId, challengeId) {
  return LabInstance.updateMany(
    { userId, challengeId, status: 'active' },
    { $set: { status: 'stopped' } }
  );
}

module.exports = { ensureInstance, resetInstance, stopInstance, getActiveInstance, expireStale };
