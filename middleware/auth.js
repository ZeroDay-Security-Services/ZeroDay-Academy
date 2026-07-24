// middleware/auth.js
const User = require("../models/User");

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login?next=" + encodeURIComponent(req.originalUrl));
  }
  next();
}

function attachUser() {
  return async (req, res, next) => {
    if (req.session.userId) {
      try {
        const user = await User.findById(req.session.userId).lean();
        req.user = user || null;
        if (!user) req.session.userId = null;
      } catch (e) {
        req.user = null;
      }
    } else {
      req.user = null;
    }
    res.locals.currentUser = req.user;
    next();
  };
}

module.exports = { requireAuth, attachUser };
