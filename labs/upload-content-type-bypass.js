'use strict';

const express = require('express');
const LabFile = require('../models/LabFile');
const { proofCookie, validProof, resetLabState } = require('./lib/lab-helpers');

const router = express.Router();
const ALLOWED_TYPES = ['image/png', 'image/jpeg'];

async function files(req) {
  return LabFile.find({ instanceId: req.lab.instance._id, labSlug: 'upload-content-type-bypass' }).sort({ createdAt: -1 }).lean();
}

router.get('/', async (req, res) => {
  proofCookie(req, res, 'zda_xss_proof', 'upload-content-type');
  const list = await files(req);
  res.render('labs/upload-content-type-bypass', { files: list, error: null });
});

router.post('/upload', express.text({ type: '*/*', limit: '80kb' }), async (req, res) => {
  const declaredType = String(req.get('X-Declared-Type') || '');
  const filename = String(req.query.filename || 'avatar.png').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 90) || 'avatar.png';

  if (!ALLOWED_TYPES.includes(declaredType)) {
    return res.status(400).render('labs/upload-content-type-bypass', {
      files: await files(req),
      error: 'Only PNG/JPEG uploads are accepted.'
    });
  }

  await LabFile.create({
    instanceId: req.lab.instance._id,
    labSlug: 'upload-content-type-bypass',
    filename,
    contentType: declaredType,
    content: String(req.body || '').slice(0, 80000)
  });

  return res.render('labs/upload-content-type-bypass', {
    files: await files(req),
    error: null
  });
});

// The browser trusts the extension when serving the file back. A file declared
// as image/png but named .html is rendered as HTML.
router.get('/view/:id', async (req, res) => {
  if (!req.params.id.match(/^[a-f0-9]{24}$/i)) return res.status(404).type('text').send('Not found');
  const file = await LabFile.findOne({
    _id: req.params.id,
    instanceId: req.lab.instance._id,
    labSlug: 'upload-content-type-bypass'
  }).lean();
  if (!file) return res.status(404).type('text').send('Not found');
  const type = file.filename.toLowerCase().endsWith('.html') ? 'text/html; charset=utf-8' : file.contentType;
  res.set('Content-Type', type);
  res.set('Content-Disposition', 'inline');
  res.send(file.content);
});

router.get('/collect', async (req, res) => {
  const supplied = String(req.query.t || req.query.p || req.query.token || '');
  if (!validProof(req, 'upload-content-type', supplied)) {
    return res.status(403).json({ ok: false });
  }
  req.lab.state.uploadContentTypeSolved = true;
  await req.lab.save();
  return res.json({ ok: true });
});

router.get('/status', (req, res) => {
  const solved = req.lab.state.uploadContentTypeSolved === true;
  res.json({ solved, flag: solved ? req.lab.flag() : null });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/upload-content-type-bypass');
});

module.exports = router;
