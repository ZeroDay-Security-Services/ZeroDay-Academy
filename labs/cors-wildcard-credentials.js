'use strict';

const crypto = require('crypto');
const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function corsState(req) {
  if (!req.lab.state.cors) {
    req.lab.state.cors = { apiKey: `sk_live_${crypto.randomBytes(16).toString('hex')}` };
  }
  return req.lab.state.cors;
}

function sameOrigin(req, origin) {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === req.get('host');
  } catch {
    return false;
  }
}

router.get('/', (req, res) => {
  const state = corsState(req);
  res.render('labs/cors-wildcard-credentials', {
    apiKeyPreview: `${state.apiKey.slice(0, 11)}...`,
    simulated: null
  });
});

// Deliberately reflects any Origin and allows credentials. The secret response
// includes the flag only when the request is genuinely cross-origin.
router.get('/api/secret', (req, res) => {
  const origin = req.get('Origin') || '';
  const crossOrigin = Boolean(origin) && !sameOrigin(req, origin);
  const state = corsState(req);

  res.vary('Origin');
  if (origin) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
  }

  res.json({
    apiKey: state.apiKey,
    account: 'victim@zeroday-corp.test',
    flag: crossOrigin ? req.lab.flag() : null
  });
});

// A browser cannot normally be pointed at a second host in this single-origin
// training deployment. This endpoint performs the same credentialed request
// with an attacker Origin and returns what a malicious site would read.
router.post('/simulate-attack', async (req, res) => {
  const port = req.socket.localPort;
  let simulated = null;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/labs/cors-wildcard-credentials/api/secret`, {
      headers: {
        Origin: 'https://evil-attacker.test',
        Cookie: req.headers.cookie || ''
      }
    });
    const body = await response.json();
    simulated = {
      status: response.status,
      allowOrigin: response.headers.get('access-control-allow-origin'),
      allowCredentials: response.headers.get('access-control-allow-credentials'),
      body
    };
  } catch (error) {
    simulated = { error: error.message };
  }

  const state = corsState(req);
  return res.render('labs/cors-wildcard-credentials', {
    apiKeyPreview: `${state.apiKey.slice(0, 11)}...`,
    simulated
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/cors-wildcard-credentials');
});

module.exports = router;
