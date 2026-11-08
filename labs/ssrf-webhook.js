'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function internalApi(req) {
  return {
    '/internal/admin/status': JSON.stringify({ status: 'ok', service: 'billing-internal' }),
    '/internal/admin/flag': JSON.stringify({ service: 'billing-internal', flag: req.lab.flag() })
  };
}

router.get('/', (req, res) => {
  res.render('labs/ssrf-webhook', { result: null, url: '', error: null });
});

// The webhook tester follows arbitrary internal URLs. Only the simulated
// internal service is reachable; no arbitrary host is contacted.
router.post('/', (req, res) => {
  const raw = String(req.body.url || '').trim().slice(0, 500);
  let result = null;
  let error = null;
  try {
    const parsed = new URL(raw);
    if (parsed.hostname === 'internal-admin.local') {
      const body = internalApi(req)[parsed.pathname] || '404 not found';
      result = { status: body === '404 not found' ? 404 : 200, body };
    } else if (parsed.hostname === 'example.com' || parsed.hostname === 'webhook.site') {
      result = { status: 200, body: '{"received":true}' };
    } else {
      error = 'Could not reach the endpoint.';
    }
  } catch {
    error = 'Could not reach the endpoint.';
  }
  res.render('labs/ssrf-webhook', { result, url: raw, error });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/ssrf-webhook');
});

module.exports = router;
