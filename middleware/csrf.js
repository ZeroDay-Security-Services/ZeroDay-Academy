'use strict';

const crypto = require('crypto');

function csrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  return req.session.csrfToken;
}

function attachCsrf(req, res, next) {
  const token = csrfToken(req);
  res.locals.csrfToken = token;
  res.locals.csrfField = `<input type="hidden" name="_csrf" value="${token}">`;
  next();
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function verifyCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const supplied = req.body?._csrf || req.get('X-CSRF-Token') || '';
  if (!req.session.csrfToken || !safeEqual(supplied, req.session.csrfToken)) {
    if (req.path.startsWith('/api/') || (req.get('Accept') || '').includes('application/json')) {
      return res.status(403).json({ ok: false, message: 'Invalid or missing CSRF token. Refresh the page and try again.' });
    }
    return res.status(403).render('403', { title: 'Request rejected', message: 'Invalid or missing CSRF token. Refresh the page and try again.' });
  }
  return next();
}

module.exports = { attachCsrf, verifyCsrf, csrfToken };
