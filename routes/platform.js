'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Solve = require('../models/Solve');
const LabInstance = require('../models/LabInstance');
const LabData = require('../models/LabData');
const LabFile = require('../models/LabFile');
const LabComment = require('../models/LabComment');
const LabToken = require('../models/LabToken');

const { requireAuth } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');
const { rateLimit } = require('../middleware/rateLimit');
const { submitFlag, dashboardData } = require('../services/progress');
const { ensureInstance, resetInstance, stopInstance, getActiveInstance } = require('../services/instances');
const { audit } = require('../services/audit');
const { config } = require('../config');
const { closeSqlDb } = require('../db/sqlLabDb');

const router = express.Router();

router.use(verifyCsrf);

const loginLimiter = rateLimit({
  windowMs: config.limits.loginWindowMs,
  max: config.limits.loginMax,
  key: req => `login:${req.ip}:${String(req.body?.username || '').toLowerCase()}`,
  message: 'Too many login attempts. Wait a few minutes before trying again.'
});

const registerLimiter = rateLimit({
  windowMs: config.limits.registerWindowMs,
  max: config.limits.registerMax,
  key: req => `register:${req.ip}`,
  message: 'Too many accounts created from this address. Try again later.'
});

const hintLimiter = rateLimit({
  windowMs: config.limits.hintWindowMs,
  max: config.limits.hintMax,
  key: req => `hint:${req.user?._id || req.ip}`,
  message: 'Too many hint requests. Try again later.'
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeNext(value) {
  const next = String(value || '');
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/dashboard';
  return next;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validPassword(value) {
  return typeof value === 'string' && value.length >= 10 && value.length <= 200;
}

async function cleanupInstance(instance) {
  if (!instance) return;
  await Promise.all([
    LabData.deleteMany({ instanceId: instance._id }),
    LabFile.deleteMany({ instanceId: instance._id }),
    LabComment.deleteMany({ instanceId: instance._id }),
    LabToken.deleteMany({ instanceId: instance._id })
  ]);
  closeSqlDb(instance.instanceKey);
}

async function registerSession(req, user) {
  await new Promise((resolve, reject) => {
    req.session.regenerate(error => (error ? reject(error) : resolve()));
  });
  req.session.userId = user._id.toString();
  req.session.authenticatedAt = new Date().toISOString();
}

async function challengeBySlug(slug, { includeSolution = false } = {}) {
  const query = Challenge.findOne({ slug, archived: false }).select(includeSolution ? '+solution' : '');
  return query.lean();
}

async function solvedSlugSet(userId) {
  const solves = await Solve.find({ userId }).populate('challengeId', 'slug').lean();
  return new Set(solves.filter(s => s.challengeId).map(s => s.challengeId.slug));
}

function isLocked(challenge, solvedSlugs) {
  return (challenge.prerequisites || []).some(slug => !solvedSlugs.has(slug));
}

router.get('/', async (req, res) => {
  const [challengeCount, userCount, solveCount, domainCount] = await Promise.all([
    Challenge.countDocuments({ published: true, archived: false }),
    User.countDocuments({ status: 'active' }),
    Solve.countDocuments(),
    Challenge.distinct('domain', { published: true, archived: false })
  ]);

  const levels = await Challenge.aggregate([
    { $match: { published: true, archived: false } },
    { $group: { _id: '$level', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  res.render('home', {
    title: 'ZeroDay Academy',
    stats: { challengeCount, userCount, solveCount, domainCount: domainCount.length },
    levelCounts: levels
  });
});

router.get('/register', (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('register', { title: 'Create account', error: null });
});

router.post('/register', registerLimiter, async (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  const username = String(req.body.username || '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const confirm = String(req.body.confirmPassword || '');

  const fail = (message, status = 400) => res.status(status).render('register', {
    title: 'Create account',
    error: message
  });

  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
    return fail('Username must be 3-30 characters and may contain letters, numbers, dots, dashes and underscores.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return fail('Enter a valid email address.');
  }
  if (!validPassword(password)) return fail('Password must be at least 10 characters.');
  if (password !== confirm) return fail('Passwords do not match.');

  try {
    const existing = await User.findOne({ $or: [{ username }, { email }] }).lean();
    if (existing) return fail('That username or email is already registered.');
    const user = await User.create({
      username,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      avatarSeed: crypto.randomBytes(5).toString('hex')
    });
    await registerSession(req, user);
    req.user = user.toObject();
    await audit(req, 'auth.register', {
      targetType: 'user',
      targetId: user._id.toString(),
      metadata: { username: user.username }
    });
    return res.redirect('/dashboard');
  } catch (error) {
    if (error && error.code === 11000) return fail('That username or email is already registered.');
    throw error;
  }
});

router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('login', { title: 'Sign in', error: null, next: safeNext(req.query.next) });
});

router.post('/login', loginLimiter, async (req, res) => {
  const username = String(req.body.username || '').trim().slice(0, 80);
  const password = String(req.body.password || '');
  const user = await User.findOne({
    $or: [{ username }, { email: username.toLowerCase() }]
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    req.user = null;
    await audit(req, 'auth.login_failed', {
      targetType: 'user',
      targetId: username,
      severity: 'warning',
      metadata: { reason: 'invalid_credentials' }
    });
    return res.status(401).render('login', {
      title: 'Sign in',
      error: 'Invalid username or password.',
      next: safeNext(req.body.next)
    });
  }

  if (user.status !== 'active') {
    await audit(req, 'auth.login_blocked', {
      targetType: 'user',
      targetId: user._id.toString(),
      severity: 'warning',
      metadata: { reason: 'suspended' }
    });
    return res.status(403).render('login', {
      title: 'Sign in',
      error: 'This account is suspended. Contact an administrator.',
      next: safeNext(req.body.next)
    });
  }

  await registerSession(req, user);
  user.lastLoginAt = new Date();
  user.lastActiveAt = new Date();
  await user.save();
  req.user = user.toObject();
  await audit(req, 'auth.login', {
    targetType: 'user',
    targetId: user._id.toString(),
    metadata: { username: user.username }
  });
  return res.redirect(safeNext(req.body.next));
});

router.post('/logout', requireAuth, async (req, res) => {
  await audit(req, 'auth.logout', { targetType: 'user', targetId: req.user._id.toString() });
  req.session.destroy(() => {
    res.clearCookie(config.session.name);
    res.redirect('/');
  });
});

router.get('/dashboard', requireAuth, async (req, res) => {
  const data = await dashboardData(req.user);
  res.render('dashboard', { title: 'Dashboard', ...data });
});

router.get('/challenges', requireAuth, async (req, res) => {
  const filters = {
    published: true,
    archived: false
  };
  if (req.query.domain) filters.domain = String(req.query.domain).slice(0, 80);
  if (req.query.category) filters.category = String(req.query.category).slice(0, 80);
  if (['1', '2', '3', '4', '5', '6'].includes(String(req.query.level))) filters.level = Number(req.query.level);
  if (req.query.q) {
    const q = new RegExp(escapeRegex(String(req.query.q).slice(0, 80)), 'i');
    filters.$or = [{ title: q }, { summary: q }, { technology: q }, { owaspRef: q }, { cwe: q }];
  }

  const [allChallenges, solvedSlugs, solves] = await Promise.all([
    Challenge.find(filters).sort({ level: 1, orderIndex: 1 }).lean(),
    solvedSlugSet(req.user._id),
    Solve.find({ userId: req.user._id }).lean()
  ]);

  const solvedIds = new Set(solves.map(s => s.challengeId.toString()));
  let challenges = allChallenges.map(challenge => ({
    ...challenge,
    solved: solvedIds.has(challenge._id.toString()),
    locked: isLocked(challenge, solvedSlugs)
  }));

  if (req.query.status === 'solved') challenges = challenges.filter(c => c.solved);
  if (req.query.status === 'unsolved') challenges = challenges.filter(c => !c.solved);
  if (req.query.status === 'locked') challenges = challenges.filter(c => c.locked);

  const [domains, categories] = await Promise.all([
    Challenge.distinct('domain', { published: true, archived: false }),
    Challenge.distinct('category', { published: true, archived: false })
  ]);

  res.render('challenges', {
    title: 'Lab explorer',
    challenges,
    domains: domains.sort(),
    categories: categories.sort(),
    query: req.query
  });
});

router.get('/challenges/:slug', requireAuth, async (req, res) => {
  const challenge = await challengeBySlug(req.params.slug, { includeSolution: true });
  if (!challenge) return res.status(404).render('404', { title: 'Lab not found' });
  if (!challenge.published && req.user.role !== 'admin') {
    return res.status(404).render('404', { title: 'Lab not found' });
  }

  const [solvedDoc, solvedSlugs, activeInstance] = await Promise.all([
    Solve.findOne({ userId: req.user._id, challengeId: challenge._id }).lean(),
    solvedSlugSet(req.user._id),
    getActiveInstance(req.user._id, challenge._id)
  ]);

  const solved = Boolean(solvedDoc);
  const solution = solved ? challenge.solution : null;
  delete challenge.solution;
  const revealedHints = Math.min(
    Number(req.session.hints?.[challenge.slug] || 0),
    (challenge.hints || []).length
  );

  res.render('challenge-detail', {
    title: challenge.title,
    challenge,
    solved,
    solution,
    locked: isLocked(challenge, solvedSlugs),
    missingPrerequisites: (challenge.prerequisites || []).filter(slug => !solvedSlugs.has(slug)),
    revealedHints,
    activeInstance,
    notice: req.query.notice || null
  });
});

router.post('/challenges/:slug/start', requireAuth, async (req, res) => {
  const challenge = await challengeBySlug(req.params.slug);
  if (!challenge || !challenge.published) return res.status(404).render('404', { title: 'Lab not found' });
  const solvedSlugs = await solvedSlugSet(req.user._id);
  if (isLocked(challenge, solvedSlugs)) {
    return res.status(403).render('403', {
      title: 'Lab locked',
      message: 'Complete the prerequisite labs before launching this target.'
    });
  }
  await ensureInstance(req.user._id, challenge);
  await audit(req, 'lab.start', { targetType: 'challenge', targetId: challenge.slug });
  return res.redirect(challenge.labPath);
});

router.post('/challenges/:slug/reset', requireAuth, async (req, res) => {
  const challenge = await challengeBySlug(req.params.slug);
  if (!challenge) return res.status(404).render('404', { title: 'Lab not found' });
  const active = await getActiveInstance(req.user._id, challenge._id);
  if (active) await cleanupInstance(active);
  await resetInstance(req.user._id, challenge);
  await audit(req, 'lab.reset', {
    targetType: 'challenge',
    targetId: challenge.slug,
    metadata: { previousInstance: active ? active._id.toString() : null }
  });
  return res.redirect(`${challenge.labPath}?reset=1`);
});

router.post('/challenges/:slug/stop', requireAuth, async (req, res) => {
  const challenge = await challengeBySlug(req.params.slug);
  if (!challenge) return res.status(404).render('404', { title: 'Lab not found' });
  const active = await getActiveInstance(req.user._id, challenge._id);
  if (active) await cleanupInstance(active);
  await stopInstance(req.user._id, challenge._id);
  await audit(req, 'lab.stop', { targetType: 'challenge', targetId: challenge.slug });
  return res.redirect(`/challenges/${challenge.slug}?notice=stopped`);
});

router.post('/challenges/:slug/submit', requireAuth, async (req, res) => {
  const challenge = await challengeBySlug(req.params.slug);
  if (!challenge) return res.status(404).json({ ok: false, message: 'Lab not found.' });
  const result = await submitFlag({
    user: req.user,
    challenge,
    submitted: req.body.flag,
    req
  });
  return res.status(result.status).json(result.body);
});

router.post('/challenges/:slug/hint', requireAuth, hintLimiter, async (req, res) => {
  const challenge = await challengeBySlug(req.params.slug);
  if (!challenge) return res.status(404).json({ ok: false, message: 'Lab not found.' });
  req.session.hints = req.session.hints || {};
  const current = Number(req.session.hints[challenge.slug] || 0);
  const total = (challenge.hints || []).length;
  if (current >= total) {
    return res.json({ ok: true, hint: challenge.hints[total - 1] || null, revealed: current, total });
  }
  req.session.hints[challenge.slug] = current + 1;
  await audit(req, 'lab.hint', {
    targetType: 'challenge',
    targetId: challenge.slug,
    metadata: { hintNumber: current + 1, total }
  });
  return res.json({
    ok: true,
    hint: challenge.hints[current],
    revealed: current + 1,
    total
  });
});

router.get('/leaderboard', requireAuth, async (req, res) => {
  const [users, solveCounts] = await Promise.all([
    User.find({ status: 'active' }).sort({ points: -1, createdAt: 1 }).limit(50).lean(),
    Solve.aggregate([{ $group: { _id: '$userId', count: { $sum: 1 } } }])
  ]);
  const counts = new Map(solveCounts.map(row => [row._id.toString(), row.count]));
  const higherRanked = await User.countDocuments({ status: 'active', points: { $gt: req.user.points } });
  const leaders = users.map((user, index) => ({
    rank: index + 1,
    username: user.username,
    points: user.points,
    solveCount: counts.get(user._id.toString()) || 0,
    you: user._id.toString() === req.user._id.toString()
  }));
  res.render('leaderboard', {
    title: 'Leaderboard',
    leaders,
    currentRank: higherRanked + 1
  });
});

router.get('/profile', requireAuth, async (req, res) => {
  const data = await dashboardData(req.user);
  res.render('profile', {
    title: 'My profile',
    ...data,
    error: null,
    success: req.query.saved ? 'Profile updated.' : null,
    passwordError: null,
    passwordSuccess: req.query.password ? 'Password changed.' : null
  });
});

router.post('/profile', requireAuth, async (req, res) => {
  const bio = String(req.body.bio || '').slice(0, 280);
  const emailHints = req.body.emailHints === 'on';
  await User.updateOne(
    { _id: req.user._id },
    { $set: { bio, 'preferences.emailHints': emailHints } }
  );
  await audit(req, 'profile.update', { targetType: 'user', targetId: req.user._id.toString() });
  res.redirect('/profile?saved=1');
});

router.post('/profile/password', requireAuth, async (req, res) => {
  const data = await dashboardData(req.user);
  const current = String(req.body.currentPassword || '');
  const next = String(req.body.newPassword || '');
  const confirm = String(req.body.confirmPassword || '');
  const renderError = (message, status = 400) => res.status(status).render('profile', {
    title: 'My profile',
    ...data,
    error: null,
    success: null,
    passwordError: message,
    passwordSuccess: null
  });

  const user = await User.findById(req.user._id);
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    return renderError('Current password is incorrect.');
  }
  if (!validPassword(next)) return renderError('New password must be at least 10 characters.');
  if (next !== confirm) return renderError('New passwords do not match.');
  user.passwordHash = await bcrypt.hash(next, 12);
  await user.save();
  await audit(req, 'profile.password_change', { targetType: 'user', targetId: user._id.toString() });
  return res.redirect('/profile?password=1');
});

router.get('/api/challenge-order', requireAuth, async (req, res) => {
  const challenges = await Challenge.find({ published: true, archived: false })
    .sort({ level: 1, orderIndex: 1 })
    .select('slug title level difficulty labPath -_id')
    .lean();
  res.json(challenges);
});

router.get('/company', (req, res) => {
  res.render('company', { title: 'About ZeroDay Security Services' });
});

module.exports = router;
