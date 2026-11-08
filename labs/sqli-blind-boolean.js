'use strict';

const express = require('express');
const { getSqlDb } = require('../db/sqlLabDb');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('labs/sqli-blind-boolean', { id: '', found: null, error: null });
});

router.post('/lookup', (req, res) => {
  const id = req.body.id || '';
  const db = getSqlDb(req);
  const sql = `SELECT id FROM sqli_orders WHERE id = ${id} AND customer = 'guest'`;

  let found = false;
  let error = null;
  try {
    found = db.prepare(sql).all().length > 0;
  } catch {
    error = 'Lookup failed. Please check your input.';
  }
  res.render('labs/sqli-blind-boolean', { id, found, error });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/sqli-blind-boolean');
});

module.exports = router;
