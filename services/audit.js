'use strict';

const AuditLog = require('../models/AuditLog');
const { ipHash } = require('./flagService');

async function audit(req, action, { targetType = '', targetId = '', metadata = {}, severity = 'info' } = {}) {
  try {
    await AuditLog.create({
      actorId: req.user?._id || null,
      actorUsername: req.user?.username || 'anonymous',
      action,
      targetType,
      targetId: String(targetId || ''),
      metadata,
      severity,
      ipHash: ipHash(req.ip)
    });
  } catch {
    // Auditing must never break a request path.
  }
}

module.exports = { audit };
