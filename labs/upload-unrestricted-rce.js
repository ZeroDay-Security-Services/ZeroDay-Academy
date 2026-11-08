'use strict';

const express = require('express');
const LabFile = require('../models/LabFile');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

async function files(req) {
  return LabFile.find({ instanceId: req.lab.instance._id, labSlug: 'upload-unrestricted-rce' }).sort({ createdAt: -1 }).lean();
}

router.get('/', async (req, res) => {
  res.render('labs/upload-unrestricted-rce', {
    files: await files(req),
    output: req.lab.state.widgetOutput || null
  });
});

router.post('/upload', express.text({ type: '*/*', limit: '80kb' }), async (req, res) => {
  const filename = String(req.query.filename || 'widget.js').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'widget.js';
  const content = String(req.body || '').slice(0, 80000);
  if (content.trim()) {
    await LabFile.create({
      instanceId: req.lab.instance._id,
      labSlug: 'upload-unrestricted-rce',
      filename,
      contentType: 'text/plain',
      content
    });
  }
  res.redirect('/labs/upload-unrestricted-rce');
});

// The plugin runtime is deliberately isolated. It recognises the reporting
// hook used by legitimate widgets and never evaluates arbitrary Node.js code.
router.post('/run/:id', async (req, res) => {
  if (!req.params.id.match(/^[a-f0-9]{24}$/i)) {
    return res.status(404).type('text').send('Not found');
  }
  const file = await LabFile.findOne({
    _id: req.params.id,
    instanceId: req.lab.instance._id,
    labSlug: 'upload-unrestricted-rce'
  }).lean();
  if (!file) return res.status(404).type('text').send('Not found');

  const code = file.content;
  let output;
  let flag = null;
  if (/\brequire\s*\(|\bprocess\b|\bchild_process\b|\bFunction\s*\(/.test(code)) {
    output = 'Plugin error: the sandbox blocked access to Node.js runtime APIs.';
  } else if (/reportFlag\s*\(\s*["']confirm["']\s*\)/.test(code) || /widget\.captureFlag\s*\(\s*\)/.test(code)) {
    output = 'Widget executed without error. reportFlag("confirm") accepted.';
    flag = req.lab.flag();
    req.lab.state.widgetOutput = `${output} Flag: ${flag}`;
  } else {
    output = 'Widget executed without error. No flag-producing call was made.';
    req.lab.state.widgetOutput = output;
  }
  await req.lab.save();
  return res.render('labs/upload-unrestricted-rce', {
    files: await files(req),
    output: flag ? `${output}\nFlag: ${flag}` : output
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/upload-unrestricted-rce');
});

module.exports = router;
