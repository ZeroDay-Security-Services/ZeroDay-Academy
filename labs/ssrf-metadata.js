'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function metadata(req) {
  return {
    '/latest/meta-data/': 'iam/\nhostname\nsecurity-credentials/\n',
    '/latest/meta-data/hostname': 'ip-10-0-12-44.ec2.internal\n',
    '/latest/meta-data/iam/security-credentials/': 'internal-deploy-role',
    '/latest/meta-data/iam/security-credentials/internal-deploy-role': JSON.stringify({
      Code: 'Success',
      AccessKeyId: 'AKIA_LAB_DEMO',
      SecretAccessKey: req.lab.flag(),
      Token: 'IQoJb3JpZ2luX2VjEJr//////////wEaCXVzLWVhc3QtMQ=='
    }, null, 2)
  };
}

router.get('/', (req, res) => {
  res.render('labs/ssrf-metadata', { result: null, url: '', error: null });
});

// The URL fetcher resolves link-local metadata addresses internally. External
// and unrelated targets are simulated; no arbitrary network request is made.
router.post('/', (req, res) => {
  const raw = String(req.body.url || '').trim().slice(0, 500);
  let result = null;
  let error = null;

  try {
    const parsed = new URL(raw);
    if (parsed.hostname === '169.254.169.254') {
      const body = metadata(req)[parsed.pathname] || '404 not found';
      result = { status: body === '404 not found' ? 404 : 200, body };
    } else if (parsed.hostname === 'example.com' || parsed.hostname === 'www.example.com') {
      result = { status: 200, body: '<html><title>Example Domain</title><h1>Example Domain</h1></html>' };
    } else if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
      result = { status: 200, body: 'avatar-proxy: upstream request accepted' };
    } else {
      error = 'Could not fetch the URL.';
    }
  } catch {
    error = 'Could not fetch the URL.';
  }

  res.render('labs/ssrf-metadata', { result, url: raw, error });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/ssrf-metadata');
});

module.exports = router;
