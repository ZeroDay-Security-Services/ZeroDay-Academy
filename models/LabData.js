'use strict';

const { mongoose } = require('../db/mongo');

// Per-lab-instance records. No flag is ever stored at the platform level;
// labs that need a retrievable secret place that instance's dynamic flag here.
const labDataSchema = new mongoose.Schema({
  instanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabInstance', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true, index: true },
  key: { type: String, required: true, index: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

labDataSchema.index({ instanceId: 1, key: 1 });

module.exports = mongoose.models.LabData || mongoose.model('LabData', labDataSchema);
