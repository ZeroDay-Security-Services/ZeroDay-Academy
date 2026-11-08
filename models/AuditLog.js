'use strict';

const { mongoose } = require('../db/mongo');

const auditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  actorUsername: { type: String, default: 'anonymous' },
  action: { type: String, required: true, index: true },
  targetType: { type: String, default: '' },
  targetId: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info', index: true },
  ipHash: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: false });

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
