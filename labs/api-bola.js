'use strict';

const express = require('express');
const { seedLabData, resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

async function orders(req) {
  return seedLabData(req, 'orders', [
    { id: 'ord_1001', owner: 'guest', amount: '42.00', status: 'shipped', notes: 'Standard delivery' },
    {
      id: 'ord_1002',
      owner: 'j.harrington',
      amount: '18204.50',
      status: 'processing',
      notes: `Executive account review. Flag: ${req.lab.flag()}`
    },
    { id: 'ord_1003', owner: 's.chen', amount: '350.00', status: 'delivered', notes: 'Signed by resident' },
    { id: 'ord_1004', owner: 'm.kowalski', amount: '1200.00', status: 'pending', notes: 'Awaiting stock' }
  ]);
}

router.get('/', async (req, res) => {
  const records = await orders(req);
  res.render('labs/api-bola', {
    myOrders: records.filter(record => record.data.owner === 'guest'),
    selectedOrder: null,
    error: null
  });
});

// Intentionally missing an ownership check: any authenticated lab user can
// request any order identifier and receive the full object.
router.get('/api/order/:id', async (req, res) => {
  const records = await orders(req);
  const order = records.find(record => record.data.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  return res.json(order.data);
});

router.get('/api/orders/:id', async (req, res) => {
  const records = await orders(req);
  const order = records.find(record => record.data.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  return res.json(order.data);
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/api-bola');
});

module.exports = router;
