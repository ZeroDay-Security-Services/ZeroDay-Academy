'use strict';

const express = require('express');

const router = express.Router();
const CATALOG_PRICE = 1200;

router.get('/', (req, res) => {
  res.render('labs/logic-price-tampering', { result: null });
});

// The server charges whatever price the client sends.
router.post('/checkout', (req, res) => {
  const parsed = Number.parseFloat(req.body.price);
  const charged = Number.isFinite(parsed) ? parsed : CATALOG_PRICE;
  res.render('labs/logic-price-tampering', {
    result: {
      charged,
      flag: charged < 10 ? req.lab.flag() : null
    }
  });
});

router.post('/reset', (req, res) => {
  res.redirect('/labs/logic-price-tampering');
});

module.exports = router;
