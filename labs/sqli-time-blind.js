'use strict';

const express = require('express');
const { getSqlDb } = require('../db/sqlLabDb');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('labs/sqli-time-blind', { username: '', elapsedMs: null, error: null });
});

router.post('/lookup', (req, res) => {
  const username = req.body.username || '';
  const db = getSqlDb(req);
  const sql = `SELECT id FROM sqli_accounts WHERE username = '${username}'`;
  const start = process.hrtime.bigint();
  let error = null;
  try {
    db.prepare(sql).all();
  } catch {
    error = 'Request failed.';
  }
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
  res.render('labs/sqli-time-blind', {
    username,
    elapsedMs: Math.round(elapsedMs),
    error
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/sqli-time-blind');
});

module.exports = router;
