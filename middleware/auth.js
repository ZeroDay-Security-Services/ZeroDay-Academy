'use strict';

const User = require('../models/User');

function wantsJson(req) {
  return req.path.startsWith('/api/') || req.xhr || (req.get('Accept') || '').includes('application/json');
}

function requireAuth(req, res, next) {
  if (!req.user) {
    if (wantsJson(req)) return res.status(401).json({ ok: false, message: 'Authentication required.' });
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  if (req.user.status === 'suspended') {
    req.session.destroy(() => {});
    if (wantsJson(req)) return res.status(403).json({ ok: false, message: 'Account suspended.' });
    return res.status(403).render('403', { title: 'Account suspended', message: 'This account has been suspended. Contact an administrator.' });
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    if (wantsJson(req)) return res.status(401).json({ ok: false, message: 'Authentication required.' });
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  if (req.user.role !== 'admin') {
    if (wantsJson(req)) return res.status(403).json({ ok: false, message: 'Administrator access required.' });
    return res.status(403).render('403', { title: 'Forbidden', message: 'Administrator access required.' });
  }
  return next();
}

function attachUser() {
  return async (req, res, next) => {
    req.user = null;
    res.locals.currentUser = null;
    res.locals.isAdmin = false;
    if (req.session.userId) {
      try {
        const user = await User.findById(req.session.userId).lean();
        if (user && user.status === 'active') {
          req.user = user;
          res.locals.currentUser = user;
          res.locals.isAdmin = user.role === 'admin';
          if (!user.lastActiveAt || Date.now() - new Date(user.lastActiveAt).getTime() > 5 * 60 * 1000) {
            User.updateOne({ _id: user._id }, { $set: { lastActiveAt: new Date() } }).catch(() => {});
          }
        } else {
          req.session.userId = null;
        }
      } catch {
        req.user = null;
        req.session.userId = null;
      }
    }
    next();
  };
}

module.exports = { requireAuth, requireAdmin, attachUser, wantsJson };
