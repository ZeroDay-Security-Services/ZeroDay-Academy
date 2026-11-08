'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function virtualFiles(req) {
  return {
    'secret.txt': `${req.lab.flag()}\n`,
    'config.yml': 'service: profile-importer\nenvironment: production\n',
    'README.txt': 'Import working directory. External entities should be disabled.\n'
  };
}

function resolveVirtualFile(uri, files) {
  const raw = String(uri).replace(/^file:\/\//i, '').replace(/^\.\//, '');
  const name = raw.split('/').pop();
  return Object.prototype.hasOwnProperty.call(files, name) ? files[name] : `[error: file not found: ${name}]`;
}

function expandEntities(xml, files) {
  const entities = {};
  let count = 0;
  const definition = /<!ENTITY\s+([A-Za-z_][\w.-]*)\s+SYSTEM\s+["']([^"']+)["']\s*>/g;
  let match;
  while ((match = definition.exec(xml)) !== null && count < 12) {
    entities[match[1]] = resolveVirtualFile(match[2], files);
    count += 1;
  }
  let resolved = xml.slice(0, 20000);
  for (const [name, value] of Object.entries(entities)) {
    resolved = resolved.split(`&${name};`).join(String(value).slice(0, 8000));
  }
  return resolved;
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : null;
}

router.get('/', (req, res) => {
  res.render('labs/xxe-profile-import', { profileData: null, error: null });
});

router.post('/', (req, res) => {
  const xml = String(req.body.xml || '').slice(0, 20000);
  let profileData = null;
  let error = null;

  try {
    const resolved = expandEntities(xml, virtualFiles(req));
    const displayName = extractTag(resolved, 'displayName');
    const email = extractTag(resolved, 'email');
    const bio = extractTag(resolved, 'bio');
    profileData = {};
    if (displayName) profileData.displayName = displayName;
    if (email) profileData.email = email;
    if (bio) profileData.bio = bio;
    if (Object.keys(profileData).length === 0) profileData = null;
  } catch {
    error = 'Could not process your XML.';
  }

  res.render('labs/xxe-profile-import', { profileData, error });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/xxe-profile-import');
});

module.exports = router;
