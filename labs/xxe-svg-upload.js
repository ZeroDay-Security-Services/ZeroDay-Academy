'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function virtualFiles(req) {
  return {
    'flag.txt': `${req.lab.flag()}\n`,
    '.htpasswd': `admin:${req.lab.flag()}\n`,
    'README.txt': 'SVG preview sandbox.\n'
  };
}

function resolveVirtualFile(uri, files) {
  const raw = String(uri).replace(/^file:\/\//i, '').replace(/^\.\//, '');
  const name = raw.split('/').pop();
  return Object.prototype.hasOwnProperty.call(files, name) ? files[name] : `[error: file not found: ${name}]`;
}

function expandEntities(svg, files) {
  const entities = {};
  let count = 0;
  const definition = /<!ENTITY\s+([A-Za-z_][\w.-]*)\s+SYSTEM\s+["']([^"']+)["']\s*>/g;
  let match;
  while ((match = definition.exec(svg)) !== null && count < 12) {
    entities[match[1]] = resolveVirtualFile(match[2], files);
    count += 1;
  }
  let resolved = svg.slice(0, 20000);
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
  res.render('labs/xxe-svg-upload', { svgInput: '', altText: null, error: null });
});

router.post('/', (req, res) => {
  const svg = String(req.body.svg || '').slice(0, 20000);
  let altText = null;
  let error = null;
  try {
    const resolved = expandEntities(svg, virtualFiles(req));
    altText = extractTag(resolved, 'title');
    if (altText && !altText.includes('ZDS{')) {
      error = null;
    }
  } catch {
    error = 'Could not process your SVG.';
  }
  res.render('labs/xxe-svg-upload', { svgInput: svg, altText, error });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/xxe-svg-upload');
});

module.exports = router;
