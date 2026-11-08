'use strict';

const { mongoose } = require('../db/mongo');

const flagSubmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true, index: true },
  instanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabInstance', default: null, index: true },
  submittedHash: { type: String, required: true },
  correct: { type: Boolean, required: true, index: true },
  ipHash: { type: String, default: '' },
  userAgent: { type: String, default: '', maxlength: 300 },
  reason: { type: String, default: '', maxlength: 80 },
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: false });

flagSubmissionSchema.index({ userId: 1, createdAt: -1 });
flagSubmissionSchema.index({ correct: 1, createdAt: -1 });

module.exports = mongoose.models.FlagSubmission || mongoose.model('FlagSubmission', flagSubmissionSchema);
