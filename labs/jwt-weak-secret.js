'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();
const WEAK_SECRET = 'letmein123';

router.get('/', (req, res) => {
  res.render('labs/jwt-weak-secret', { issuedToken: null, verifyResult: null, error: null, flag: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'guest' && password === 'guest123') {
    const token = jwt.sign({ username: 'guest', role: 'user' }, WEAK_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    return res.render('labs/jwt-weak-secret', { issuedToken: token, verifyResult: null, error: null, flag: null });
  }
  return res.render('labs/jwt-weak-secret', { issuedToken: null, verifyResult: null, error: 'Invalid credentials.', flag: null });
});

router.post('/verify', (req, res) => {
  const token = String(req.body.token || '').trim();
  let verifyResult = null;
  let error = null;
  let flag = null;
  try {
    verifyResult = jwt.verify(token, WEAK_SECRET, { algorithms: ['HS256'] });
    if (verifyResult.role === 'admin') flag = req.lab.flag();
  } catch {
    error = 'Unauthorized.';
  }
  return res.render('labs/jwt-weak-secret', {
    issuedToken: null,
    verifyResult: verifyResult ? { username: verifyResult.username, role: verifyResult.role } : null,
    error,
    flag
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/jwt-weak-secret');
});

module.exports = router;
