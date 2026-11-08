'use strict';

const crypto = require('crypto');
const { mongoose } = require('../db/mongo');

const labInstanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true, index: true },
  instanceKey: { type: String, required: true, default: () => crypto.randomBytes(18).toString('hex') },
  status: {
    type: String,
    enum: ['active', 'stopped', 'expired', 'completed'],
    default: 'active',
    index: true
  },
  state: { type: mongoose.Schema.Types.Mixed, default: {} },
  startedAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  resetCount: { type: Number, default: 0 },
  completedAt: { type: Date, default: null }
}, { timestamps: false, minimize: false });

labInstanceSchema.index({ userId: 1, challengeId: 1, status: 1 });
labInstanceSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.models.LabInstance || mongoose.model('LabInstance', labInstanceSchema);
