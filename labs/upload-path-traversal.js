'use strict';

const path = require('path');
const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function virtualFiles(req) {
  const existing = req.lab.state.fileManager;
  if (!existing || typeof existing !== 'object') {
    req.lab.state.fileManager = {
      uploads: {},
      protected: {
        'README.txt': 'This directory is not reachable from the uploads feature.\n',
        'flag.txt': `${req.lab.flag()}\n`
      },
      traversed: false
    };
  }
  const manager = req.lab.state.fileManager;
  if (!manager.uploads || typeof manager.uploads !== 'object') manager.uploads = {};
  if (!manager.protected || typeof manager.protected !== 'object') {
    manager.protected = {
      'README.txt': 'This directory is not reachable from the uploads feature.\n',
      'flag.txt': `${req.lab.flag()}\n`
    };
  }
  return manager;
}

router.get('/', async (req, res) => {
  const fs = virtualFiles(req);
  await req.lab.save();
  res.render('labs/upload-path-traversal', {
    uploaded: Object.keys(fs.uploads).sort(),
    protectedFiles: fs.traversed ? Object.keys(fs.protected).sort() : [],
    flag: fs.traversed ? req.lab.flag() : null
  });
});

// path.join resolves `../` before the write. The resulting path is not
// constrained to the uploads directory.
router.post('/upload', express.text({ type: '*/*', limit: '20kb' }), async (req, res) => {
  const fs = virtualFiles(req);
  const rawName = String(req.query.filename || 'file.txt');
  const normalized = path.posix.normalize(rawName.replace(/\\/g, '/'));
  const escaped = normalized.startsWith('../') || normalized.startsWith('/');

  if (escaped) {
    const name = path.posix.basename(normalized);
    fs.protected[name] = String(req.body || '').slice(0, 20000);
    fs.traversed = true;
  } else {
    const name = path.posix.basename(normalized);
    fs.uploads[name] = String(req.body || '').slice(0, 20000);
  }

  await req.lab.save();
  res.redirect('/labs/upload-path-traversal');
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/upload-path-traversal');
});

module.exports = router;
