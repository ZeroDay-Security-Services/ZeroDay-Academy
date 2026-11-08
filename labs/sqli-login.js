'use strict';

const express = require('express');
const { getSqlDb } = require('../db/sqlLabDb');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('labs/sqli-login', { result: null, error: null });
});

router.post('/', (req, res) => {
  const { username = '', password = '' } = req.body;
  const db = getSqlDb(req);
  const sql = `SELECT id, username, role FROM sqli_accounts WHERE username = '${username}' AND password = '${password}'`;

  let rows = [];
  let error = null;
  try {
    rows = db.prepare(sql).all();
  } catch {
    error = 'Something went wrong. Please try again.';
  }

  if (rows.length > 0) {
    const account = rows[0];
    return res.render('labs/sqli-login', {
      result: {
        success: true,
        account: { username: account.username, role: account.role },
        flag: account.username === 'admin' ? req.lab.flag() : null
      },
      error: null
    });
  }

  return res.render('labs/sqli-login', { result: { success: false }, error });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/sqli-login');
});

module.exports = router;
