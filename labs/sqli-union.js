'use strict';

const express = require('express');
const { getSqlDb } = require('../db/sqlLabDb');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('labs/sqli-union', { category: '', results: null, error: null });
});

router.post('/', (req, res) => {
  const category = req.body.category || '';
  const db = getSqlDb(req);
  const sql = `SELECT name, category, price FROM sqli_products WHERE category = '${category}' AND released = 1`;

  let results = [];
  let error = null;
  try {
    results = db.prepare(sql).all();
  } catch {
    error = 'No products found for that category.';
  }
  res.render('labs/sqli-union', { category, results, error });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/sqli-union');
});

module.exports = router;
