'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function evaluateExpression(expression, req) {
  const expr = String(expression).trim();
  if (/^(flag\(\)|flag|this\.flag\(\)|config\.flag|global\.flag)$/.test(expr)) {
    return req.lab.flag();
  }
  if (/^\d+\s*[+\-*/]\s*\d+$/.test(expr)) {
    const match = expr.match(/^(\d+)\s*([+\-*/])\s*(\d+)$/);
    const left = Number(match[1]);
    const right = Number(match[3]);
    if (match[2] === '+') return String(left + right);
    if (match[2] === '-') return String(left - right);
    if (match[2] === '*') return String(left * right);
    return String(Math.floor(left / right));
  }
  if (/^["'][^"']*["']$/.test(expr)) return expr.slice(1, -1);
  return '[unsupported expression]';
}

// A deliberately limited template evaluator. It models the behaviour of a
// server-side template engine without evaluating arbitrary JavaScript.
function renderTemplate(message, req) {
  const source = `To: {{recipient}}\nMessage: ${message}\n-- Sent via ZeroDay GreetingCards`;
  let output = source.replace('{{recipient}}', 'Friend');

  output = output.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, expr) => evaluateExpression(expr, req));
  output = output.replace(/\$\{\s*([^{}]+?)\s*\}/g, (_, expr) => evaluateExpression(expr, req));
  return output;
}

router.get('/', (req, res) => {
  res.render('labs/ssti-render', { output: null, message: '', error: null });
});

router.post('/', (req, res) => {
  const message = String(req.body.message || '').slice(0, 2000);
  let output = null;
  let error = null;
  try {
    output = renderTemplate(message, req);
  } catch {
    error = 'Could not render your greeting card.';
  }
  res.render('labs/ssti-render', { output, message, error });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/ssti-render');
});

module.exports = router;
