'use strict';

const express = require('express');
const { seedLabData, resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

async function invoices(req) {
  return seedLabData(req, 'invoices', [
    { id: 1001, owner: 'guest', amount: '42.00', status: 'paid', issued: '2026-01-08' },
    { id: 1002, owner: 'guest', amount: '19.99', status: 'paid', issued: '2026-02-11' },
    {
      id: 1003,
      owner: 'j.harrington',
      amount: '18204.50',
      status: 'overdue',
      issued: '2026-02-28',
      notes: `Executive account. Flag: ${req.lab.flag()}`
    },
    { id: 1004, owner: 's.chen', amount: '350.00', status: 'paid', issued: '2026-03-02' }
  ]);
}

router.get('/', async (req, res) => {
  const records = await invoices(req);
  res.render('labs/idor-invoices', {
    myInvoices: records.filter(record => record.data.owner === 'guest'),
    selectedInvoice: null,
    error: null
  });
});

router.get('/:id', async (req, res) => {
  const records = await invoices(req);
  const record = records.find(item => String(item.data.id) === String(req.params.id));
  const mine = records.filter(item => item.data.owner === 'guest');
  if (!record) {
    return res.status(404).render('labs/idor-invoices', {
      myInvoices: mine,
      selectedInvoice: null,
      error: 'Invoice not found.'
    });
  }
  return res.render('labs/idor-invoices', {
    myInvoices: mine,
    selectedInvoice: record.data,
    error: null
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/idor-invoices');
});

module.exports = router;
