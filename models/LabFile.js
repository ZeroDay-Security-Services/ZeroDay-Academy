'use strict';

const { mongoose } = require('../db/mongo');

const schema = new mongoose.Schema({
  instanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabInstance', required: true, index: true },
  labSlug: { type: String, required: true, index: true },
  filename: { type: String, required: true },
  contentType: { type: String, required: true },
  content: { type: String, required: true },
  ownerNote: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

module.exports = mongoose.models.LabFile || mongoose.model('LabFile', schema);
