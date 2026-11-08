'use strict';

const bcrypt = require('bcryptjs');

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,30}$/;

/**
 * Create or reconcile the single founder administrator account.
 *
 * The caller is responsible for having an open database connection. The
 * password is only ever accepted as an argument from the environment; it is
 * never persisted in plaintext, logged, or written to a tracked file. Existing
 * passwords are left untouched unless resetPassword is explicitly true.
 */
async function bootstrapFounder({
  email,
  username,
  password,
  resetPassword = false,
  source = 'manual'
} = {}) {
  const founderEmail = String(email || '').trim().toLowerCase();
  const founderUsername = String(username || '').trim();
  const founderPassword = String(password || '');

  if (!EMAIL_PATTERN.test(founderEmail)) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }
  if (!USERNAME_PATTERN.test(founderUsername)) {
    throw new Error('ADMIN_USERNAME must be 3-30 characters and may contain letters, numbers, dots, dashes and underscores.');
  }
  if (!founderPassword || founderPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be set to a unique password of at least 12 characters.');
  }

  let user = await User.findOne({
    $or: [{ email: founderEmail }, { username: founderUsername }]
  });
  const created = !user;

  let action;
  if (!user) {
    user = await User.create({
      username: founderUsername,
      email: founderEmail,
      passwordHash: await bcrypt.hash(founderPassword, 12),
      role: 'admin',
      status: 'active',
      bio: 'Founder administrator · ZeroDay Security Services'
    });
    action = 'admin.bootstrap_created';
  } else {
    let changed = false;

    if (user.email !== founderEmail) {
      const conflict = await User.findOne({ email: founderEmail, _id: { $ne: user._id } }).lean();
      if (conflict) throw new Error(`Another account already uses ${founderEmail}.`);
      user.email = founderEmail;
      changed = true;
    }

    if (user.username !== founderUsername) {
      const conflict = await User.findOne({ username: founderUsername, _id: { $ne: user._id } }).lean();
      if (conflict) throw new Error(`Another account already uses the username ${founderUsername}.`);
      user.username = founderUsername;
      changed = true;
    }

    if (user.role !== 'admin') {
      user.role = 'admin';
      changed = true;
    }
    if (user.status !== 'active') {
      user.status = 'active';
      changed = true;
    }
    if (resetPassword) {
      user.passwordHash = await bcrypt.hash(founderPassword, 12);
      changed = true;
    }

    if (changed) await user.save();
    action = resetPassword ? 'admin.bootstrap_password_reset' : 'admin.bootstrap_promoted';
  }

  await AuditLog.create({
    actorId: user._id,
    actorUsername: user.username,
    action,
    targetType: 'user',
    targetId: user._id.toString(),
    severity: 'warning',
    metadata: {
      email: user.email,
      role: user.role,
      passwordReset: Boolean(resetPassword),
      source
    }
  });

  return { user, action, created };
}

module.exports = { bootstrapFounder };
