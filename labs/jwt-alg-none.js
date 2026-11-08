'use strict';

const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

async function secret(req) {
  if (!req.lab.state.jwtAlgNoneSecret) {
    req.lab.state.jwtAlgNoneSecret = crypto.randomBytes(32).toString('hex');
    await req.lab.save();
  }
  return req.lab.state.jwtAlgNoneSecret;
}

function decodePart(part) {
  const normalized = String(part).replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
}

async function vulnerableVerify(req, token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('Malformed token');

  let header;
  try {
    header = decodePart(parts[0]);
  } catch {
    throw new Error('Malformed header');
  }

  // The vulnerable implementation trusts the algorithm declared by the client.
  if (String(header.alg).toLowerCase() === 'none') {
    return decodePart(parts[1]);
  }

  return jwt.verify(token, await secret(req), { algorithms: ['HS256'] });
}

router.get('/', (req, res) => {
  res.render('labs/jwt-alg-none', { issuedToken: null, verifyResult: null, error: null, flag: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (username === 'guest' && password === 'guest123') {
    const token = jwt.sign({ username: 'guest', role: 'user' }, await secret(req), { algorithm: 'HS256', expiresIn: '1h' });
    return res.render('labs/jwt-alg-none', { issuedToken: token, verifyResult: null, error: null, flag: null });
  }
  return res.render('labs/jwt-alg-none', { issuedToken: null, verifyResult: null, error: 'Invalid credentials.', flag: null });
});

router.post('/verify', async (req, res) => {
  const token = String(req.body.token || '').trim();
  let verifyResult = null;
  let error = null;
  let flag = null;

  try {
    verifyResult = await vulnerableVerify(req, token);
    if (verifyResult && verifyResult.role === 'admin') {
      flag = req.lab.flag();
    }
  } catch {
    error = 'Unauthorized.';
  }

  return res.render('labs/jwt-alg-none', {
    issuedToken: null,
    verifyResult: verifyResult ? { username: verifyResult.username, role: verifyResult.role } : null,
    error,
    flag
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/jwt-alg-none');
});

module.exports = router;
