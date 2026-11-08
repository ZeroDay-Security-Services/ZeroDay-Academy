'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function unsafeMerge(target, source, depth = 0) {
  if (depth > 8 || !source || typeof source !== 'object') return target;
  for (const key in source) {
    if (key === 'constructor' || key === 'prototype') continue;
    const value = source[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (typeof target[key] !== 'object' || target[key] === null) target[key] = {};
      unsafeMerge(target[key], value, depth + 1);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function sandbox(req) {
  if (!req.lab.state.polluted || typeof req.lab.state.polluted !== 'object') {
    req.lab.state.polluted = {};
  }
  return req.lab.state.polluted;
}

router.get('/', (req, res) => {
  const proto = sandbox(req);
  const freshObject = Object.create(proto);
  res.render('labs/prototype-pollution', {
    saved: false,
    isAdminNow: freshObject.isAdmin === true,
    error: null,
    flag: freshObject.isAdmin === true ? req.lab.flag() : null
  });
});

router.post('/merge', async (req, res) => {
  const proto = sandbox(req);
  let error = null;
  let saved = false;
  try {
    const payload = JSON.parse(req.body.json || '{}');
    const preferences = Object.create(proto);
    preferences.theme = 'dark';
    preferences.locale = 'en-US';
    unsafeMerge(preferences, payload);
    saved = true;
    await req.lab.save();
  } catch {
    error = 'Could not save preferences. Check your input.';
  }

  const freshObject = Object.create(proto);
  const isAdminNow = freshObject.isAdmin === true;
  res.render('labs/prototype-pollution', {
    saved,
    isAdminNow,
    error,
    flag: isAdminNow ? req.lab.flag() : null
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/prototype-pollution');
});

module.exports = router;
