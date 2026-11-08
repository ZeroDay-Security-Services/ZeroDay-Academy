'use strict';

const crypto = require('crypto');
const LabData = require('../../models/LabData');
const LabFile = require('../../models/LabFile');
const LabComment = require('../../models/LabComment');
const LabToken = require('../../models/LabToken');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function instanceId(req) {
  return req.lab.instance._id;
}

async function seedLabData(req, key, records) {
  const existing = await LabData.countDocuments({ instanceId: instanceId(req), key });
  if (existing === 0 && records.length) {
    await LabData.insertMany(records.map(record => ({
      instanceId: instanceId(req),
      userId: req.user._id,
      challengeId: req.lab.challenge._id,
      key,
      data: record
    })));
  }
  return LabData.find({ instanceId: instanceId(req), key }).lean();
}

async function resetLabState(req) {
  const id = instanceId(req);
  await Promise.all([
    LabData.deleteMany({ instanceId: id }),
    LabFile.deleteMany({ instanceId: id }),
    LabComment.deleteMany({ instanceId: id }),
    LabToken.deleteMany({ instanceId: id })
  ]);
  await req.lab.resetState();
}

function proofCookie(req, res, name, purpose) {
  const token = req.lab.proof(purpose);
  res.cookie(name, token, {
    httpOnly: false,
    sameSite: 'lax',
    path: `/labs/${req.lab.challenge.slug}`,
    maxAge: 1000 * 60 * 60 * 2
  });
  return token;
}

function validProof(req, purpose, supplied) {
  let token = String(supplied || req.cookies?.[proofCookieName(req, purpose)] || '');
  // Payloads often send the whole document.cookie string. Extract the proof
  // value if a cookie pair is present.
  const cookieMatch = token.match(/(?:^|;\s*)zda_[a-z0-9_-]+_proof=([^;]+)/i);
  if (cookieMatch) token = cookieMatch[1];
  try {
    token = decodeURIComponent(token);
  } catch {
    // Keep the raw value if it is not URL-encoded.
  }
  return Boolean(token) && token === req.lab.proof(purpose);
}

function proofCookieName(req, purpose) {
  return `zda_${purpose}_proof`;
}

function randomId(bytes = 8) {
  return crypto.randomBytes(bytes).toString('hex');
}

function virtualFiles(req) {
  req.lab.state.files = req.lab.state.files || {};
  return req.lab.state.files;
}

function safeInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractFlag(text) {
  const match = String(text || '').match(/ZDS\{[^}\r\n]{1,180}\}/);
  return match ? match[0] : null;
}

module.exports = {
  seedLabData,
  resetLabState,
  proofCookie,
  validProof,
  proofCookieName,
  randomId,
  virtualFiles,
  safeInt,
  escapeHtml,
  extractFlag,
  instanceId
};
