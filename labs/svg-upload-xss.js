'use strict';

const express = require('express');
const LabFile = require('../models/LabFile');
const { proofCookie, validProof, resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

async function files(req) {
  return LabFile.find({ instanceId: req.lab.instance._id, labSlug: 'svg-upload-xss' }).sort({ createdAt: -1 }).lean();
}

router.get('/', async (req, res) => {
  proofCookie(req, res, 'zda_svg_proof', 'svg-xss');
  const list = await files(req);
  res.render('labs/svg-upload-xss', { files: list, uploaded: false, solved: req.lab.state.svgXssSolved === true });
});

router.post('/', express.urlencoded({ extended: false, limit: '220kb' }), async (req, res) => {
  const filename = String(req.body.filename || 'avatar.svg').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'avatar.svg';
  const content = String(req.body.svg || '').slice(0, 200000);
  if (content.trim()) {
    await LabFile.create({
      instanceId: req.lab.instance._id,
      labSlug: 'svg-upload-xss',
      filename,
      contentType: 'image/svg+xml',
      content
    });
  }
  const list = await files(req);
  res.render('labs/svg-upload-xss', { files: list, uploaded: true, solved: req.lab.state.svgXssSolved === true });
});

router.get('/raw/:id', async (req, res) => {
  if (!req.params.id.match(/^[a-f0-9]{24}$/i)) return res.status(404).type('text').send('Not found');
  const file = await LabFile.findOne({
    _id: req.params.id,
    instanceId: req.lab.instance._id,
    labSlug: 'svg-upload-xss'
  }).lean();
  if (!file) return res.status(404).type('text').send('Not found');
  res.set('Content-Type', 'image/svg+xml');
  res.set('Content-Disposition', 'inline');
  res.send(file.content);
});

router.get('/collect', async (req, res) => {
  const supplied = String(req.query.t || req.query.p || req.query.token || '');
  if (!validProof(req, 'svg-xss', supplied)) {
    return res.status(403).json({ ok: false });
  }
  req.lab.state.svgXssSolved = true;
  await req.lab.save();
  return res.json({ ok: true });
});

router.get('/status', (req, res) => {
  const solved = req.lab.state.svgXssSolved === true;
  res.json({ solved, flag: solved ? req.lab.flag() : null });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/svg-upload-xss');
});

module.exports = router;
