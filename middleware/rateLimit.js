'use strict';

const buckets = new Map();

function consume(key, windowMs, max) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  const allowed = bucket.count <= max;
  return {
    allowed,
    remaining: Math.max(0, max - bucket.count),
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  };
}

function rateLimit({ windowMs, max, key, message = 'Too many attempts. Try again later.' }) {
  return (req, res, next) => {
    const identity = typeof key === 'function' ? key(req) : (req.ip || 'unknown');
    const result = consume(identity, windowMs, max);
    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(result.remaining));
    if (!result.allowed) {
      res.set('Retry-After', String(result.retryAfter));
      if (req.accepts(['html', 'json']) === 'json' || req.path.startsWith('/api/')) {
        return res.status(429).json({ ok: false, message });
      }
      return res.status(429).render('429', { title: 'Rate limited', message });
    }
    return next();
  };
}

const timer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60 * 1000);
if (timer.unref) timer.unref();

module.exports = { rateLimit };
