'use strict';

const { config } = require('../config');

function securityHeaders(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-XSS-Protection', '0');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (config.isProduction) {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Labs intentionally have weaker browser protections (frame embedding,
  // reflected input, permissive CORS) but must never receive platform CSP/XFO.
  if (!req.path.startsWith('/labs')) {
    res.set('X-Frame-Options', 'DENY');
    res.set('Content-Security-Policy', [
      "default-src 'self'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '));
  }
  next();
}

module.exports = { securityHeaders };
