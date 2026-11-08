'use strict';

const { mongoose } = require('../db/mongo');

const solveSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true, index: true },
  instanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabInstance', default: null },
  pointsAwarded: { type: Number, default: 0 },
  solvedAt: { type: Date, default: Date.now, index: true }
}, { timestamps: false });

solveSchema.index({ userId: 1, challengeId: 1 }, { unique: true });
solveSchema.index({ challengeId: 1, solvedAt: -1 });

module.exports = mongoose.models.Solve || mongoose.model('Solve', solveSchema);
