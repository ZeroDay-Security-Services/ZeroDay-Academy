'use strict';

const { mongoose } = require('../db/mongo');

const schema = new mongoose.Schema({
  instanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabInstance', required: true, index: true },
  labSlug: { type: String, required: true, index: true },
  purpose: { type: String, required: true },
  ownerUsername: { type: String, required: true },
  token: { type: String, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

schema.index({ instanceId: 1, token: 1 });

module.exports = mongoose.models.LabToken || mongoose.model('LabToken', schema);
