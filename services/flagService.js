'use strict';

const crypto = require('crypto');
const { config } = require('../config');

function hmac(value, length = 32) {
  return crypto.createHmac('sha256', config.flagSecret).update(value).digest('hex').slice(0, length);
}

function timingSafeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function flagWord(challenge) {
  return String(challenge.slug || 'lab').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase();
}

/**
 * Flags are derived, never stored. A flag is bound to:
 *  - the platform user
 *  - the exact challenge document (including its flag version)
 *  - the active lab instance key
 *  - an optional variant for labs that teach several secrets
 *
 * Restarting an instance rotates the instance key, invalidating every
 * previously observed flag for that instance.
 */
function flagFor({ userId, challenge, instanceKey, variant = 'default' }) {
  if (!userId || !challenge || !instanceKey) throw new Error('flagFor requires user, challenge and instance');
  const material = [
    'zda-flag-v1',
    String(userId),
    String(challenge._id),
    flagWord(challenge),
    String(challenge.flagVersion || 1),
    String(instanceKey),
    String(variant)
  ].join('|');
  return `ZDS{${flagWord(challenge)}_${variant}_${hmac(material, 24)}}`;
}

function verifyFlag({ userId, challenge, instanceKey, variant = 'default' }, submitted) {
  if (typeof submitted !== 'string' || submitted.length > 200) return false;
  const expected = flagFor({ userId, challenge, instanceKey, variant });
  return timingSafeEqual(expected, submitted.trim());
}

/**
 * A proof token is intentionally NOT a flag. Client-side labs may expose it
 * (for example in a cookie) so a successful exploit can present it back to the
 * server. The server only returns the flag after validating the proof and the
 * lab-specific exploit condition.
 */
function proofToken({ instance, purpose }) {
  return hmac([
    'zda-proof-v1',
    String(instance.userId),
    String(instance.challengeId),
    String(instance.instanceKey),
    String(purpose)
  ].join('|'), 40);
}

function verifyProof(instance, purpose, token) {
  if (!token || typeof token !== 'string') return false;
  return timingSafeEqual(proofToken({ instance, purpose }), token);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function ipHash(ip) {
  return sha256(`${config.flagSecret}|${ip || ''}`);
}

module.exports = { flagFor, verifyFlag, proofToken, verifyProof, sha256, ipHash, timingSafeEqual };
