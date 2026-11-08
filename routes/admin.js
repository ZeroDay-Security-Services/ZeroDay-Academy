'use strict';

const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Solve = require('../models/Solve');
const FlagSubmission = require('../models/FlagSubmission');
const AuditLog = require('../models/AuditLog');
const LabInstance = require('../models/LabInstance');
const LabData = require('../models/LabData');
const LabFile = require('../models/LabFile');
const LabComment = require('../models/LabComment');
const LabToken = require('../models/LabToken');

const { requireAdmin } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');
const { audit } = require('../services/audit');
const { seedChallenges } = require('../db/seed');
const { closeSqlDb } = require('../db/sqlLabDb');
const { labs: labDefinitions } = require('../data/labs');
const labRegistry = require('../labs');

function mountedLabSlugs() {
  return labRegistry.map(item => item.mountPath.split('/').filter(Boolean).pop());
}

const router = express.Router();

router.use(requireAdmin);
router.use(verifyCsrf);

function pageNumber(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function paging(page, perPage, total) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  return {
    page: Math.min(page, pages),
    pages,
    perPage,
    total,
    start: (Math.min(page, pages) - 1) * perPage
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/', async (req, res) => {
  const since14 = new Date(Date.now() - 14 * 86400000);
  const [
    users,
    activeUsers,
    suspendedUsers,
    challenges,
    solves,
    submissions,
    correctSubmissions,
    auditCount,
    activeInstances,
    newUsers,
    admins
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'suspended' }),
    Challenge.countDocuments({ archived: false }),
    Solve.countDocuments(),
    FlagSubmission.countDocuments(),
    FlagSubmission.countDocuments({ correct: true }),
    AuditLog.countDocuments(),
    LabInstance.countDocuments({ status: 'active', expiresAt: { $gt: new Date() } }),
    User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } }),
    User.countDocuments({ role: 'admin', status: 'active' })
  ]);

  const [recentAudit, recentSubmissions, recentUsers, levelDistribution, domainStats, registrationRows] = await Promise.all([
    AuditLog.find().sort({ createdAt: -1 }).limit(12).lean(),
    FlagSubmission.find().sort({ createdAt: -1 }).limit(10)
      .populate('userId', 'username').populate('challengeId', 'title slug').lean(),
    User.find().sort({ createdAt: -1 }).limit(8)
      .select('username email role status points createdAt').lean(),
    Challenge.aggregate([
      { $match: { archived: false } },
      { $group: { _id: '$level', total: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Challenge.aggregate([
      { $match: { archived: false } },
      { $group: { _id: '$domain', total: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: since14 } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
    ])
  ]);

  const registrationDays = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
    const row = registrationRows.find(item => item._id === date);
    registrationDays.push({ date, count: row?.count || 0 });
  }

  res.render('admin/dashboard', {
    title: 'Admin overview',
    stats: {
      users,
      activeUsers,
      suspendedUsers,
      challenges,
      solves,
      submissions,
      correctSubmissions,
      incorrectSubmissions: Math.max(0, submissions - correctSubmissions),
      auditCount,
      activeInstances,
      newUsers,
      admins
    },
    recentAudit,
    recentSubmissions,
    recentUsers,
    registrationDays,
    levelDistribution,
    domainStats
  });
});

router.get('/users', async (req, res) => {
  const page = pageNumber(req.query.page);
  const perPage = 25;
  const filters = {};
  if (['admin', 'user'].includes(String(req.query.role))) filters.role = req.query.role;
  if (['active', 'suspended'].includes(String(req.query.status))) filters.status = req.query.status;
  if (req.query.q) {
    const q = new RegExp(escapeRegex(String(req.query.q).slice(0, 80)), 'i');
    filters.$or = [{ username: q }, { email: q }];
  }

  const total = await User.countDocuments(filters);
  const pages = paging(page, perPage, total);
  const [users, solveCounts] = await Promise.all([
    User.find(filters).sort({ createdAt: -1 }).skip(pages.start).limit(perPage).lean(),
    Solve.aggregate([{ $group: { _id: '$userId', count: { $sum: 1 } } }])
  ]);
  const counts = new Map(solveCounts.map(row => [row._id.toString(), row.count]));

  res.render('admin/users', {
    title: 'Users',
    users: users.map(user => ({ ...user, solveCount: counts.get(user._id.toString()) || 0 })),
    pages,
    filters: req.query,
    currentUserId: req.user._id.toString()
  });
});

router.get('/users/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).render('404', { title: 'User not found' });
  }
  const user = await User.findById(req.params.id).lean();
  if (!user) return res.status(404).render('404', { title: 'User not found' });

  const [solves, submissions, totalSubmissions, correctSubmissions, instances, auditEntries] = await Promise.all([
    Solve.find({ userId: user._id }).sort({ solvedAt: -1 })
      .populate('challengeId', 'title slug level points domain').lean(),
    FlagSubmission.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20)
      .populate('challengeId', 'title slug level').lean(),
    FlagSubmission.countDocuments({ userId: user._id }),
    FlagSubmission.countDocuments({ userId: user._id, correct: true }),
    LabInstance.find({ userId: user._id }).sort({ lastSeenAt: -1 }).limit(20)
      .populate('challengeId', 'title slug level').lean(),
    AuditLog.find({ actorId: user._id }).sort({ createdAt: -1 }).limit(20).lean()
  ]);

  res.render('admin/user-detail', {
    title: `User · ${user.username}`,
    profile: user,
    solves: solves.filter(row => row.challengeId),
    submissions,
    submissionStats: {
      total: totalSubmissions,
      correct: correctSubmissions,
      incorrect: Math.max(0, totalSubmissions - correctSubmissions)
    },
    instances: instances.filter(row => row.challengeId),
    auditEntries,
    currentUserId: req.user._id.toString()
  });
});

router.post('/users/:id/role', async (req, res) => {
  const role = String(req.body.role || '');
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).render('403', { title: 'Invalid role', message: 'Unknown role requested.' });
  }
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).render('404', { title: 'User not found' });
  if (target._id.toString() === req.user._id.toString() && role !== 'admin') {
    return res.status(400).render('403', {
      title: 'Request blocked',
      message: 'You cannot remove your own administrator role.'
    });
  }
  if (target.role === 'admin' && role !== 'admin') {
    const admins = await User.countDocuments({ role: 'admin', status: 'active' });
    if (admins <= 1) {
      return res.status(400).render('403', {
        title: 'Request blocked',
        message: 'At least one active administrator must remain.'
      });
    }
  }
  const previous = target.role;
  target.role = role;
  await target.save();
  await audit(req, 'admin.user_role', {
    targetType: 'user',
    targetId: target._id.toString(),
    severity: 'warning',
    metadata: { username: target.username, previous, role }
  });
  res.redirect('/admin/users');
});

router.post('/users/:id/status', async (req, res) => {
  const status = String(req.body.status || '');
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).render('403', { title: 'Invalid status', message: 'Unknown account status requested.' });
  }
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).render('404', { title: 'User not found' });
  if (target._id.toString() === req.user._id.toString() && status === 'suspended') {
    return res.status(400).render('403', {
      title: 'Request blocked',
      message: 'You cannot suspend your own account.'
    });
  }
  const previous = target.status;
  target.status = status;
  await target.save();
  if (status === 'suspended') {
    await LabInstance.updateMany({ userId: target._id, status: 'active' }, { $set: { status: 'stopped' } });
  }
  await audit(req, 'admin.user_status', {
    targetType: 'user',
    targetId: target._id.toString(),
    severity: status === 'suspended' ? 'warning' : 'info',
    metadata: { username: target.username, previous, status }
  });
  res.redirect('/admin/users');
});

router.get('/labs', async (req, res) => {
  const filters = {};
  if (req.query.q) {
    const q = new RegExp(escapeRegex(String(req.query.q).slice(0, 80)), 'i');
    filters.$or = [{ title: q }, { slug: q }, { domain: q }];
  }
  if (['1', '2', '3', '4', '5', '6'].includes(String(req.query.level))) filters.level = Number(req.query.level);
  if (req.query.state === 'published') filters.published = true;
  if (req.query.state === 'hidden') filters.published = false;
  if (req.query.state === 'archived') filters.archived = true;

  const [challenges, solveCounts, activeCounts, catalogSlugs] = await Promise.all([
    Challenge.find(filters).sort({ level: 1, orderIndex: 1 }).lean(),
    Solve.aggregate([{ $group: { _id: '$challengeId', count: { $sum: 1 } } }]),
    LabInstance.aggregate([
      { $match: { status: 'active', expiresAt: { $gt: new Date() } } },
      { $group: { _id: '$challengeId', count: { $sum: 1 } } }
    ]),
    Challenge.distinct('slug')
  ]);
  const solves = new Map(solveCounts.map(row => [row._id.toString(), row.count]));
  const active = new Map(activeCounts.map(row => [row._id.toString(), row.count]));
  const catalogSet = new Set(catalogSlugs);
  const unregistered = mountedLabSlugs()
    .filter(slug => !catalogSet.has(slug))
    .map(slug => ({
      slug,
      title: labDefinitions.find(lab => lab.slug === slug)?.title || 'No catalog definition'
    }));

  res.render('admin/labs', {
    title: 'Lab management',
    challenges: challenges.map(challenge => ({
      ...challenge,
      solveCount: solves.get(challenge._id.toString()) || 0,
      activeCount: active.get(challenge._id.toString()) || 0
    })),
    unregistered,
    filters: req.query
  });
});

router.post('/labs/register-missing', async (req, res) => {
  const catalog = new Set(await Challenge.distinct('slug'));
  const missing = mountedLabSlugs().filter(slug => !catalog.has(slug));
  const result = missing.length
    ? await seedChallenges({ log: false, onlyMissing: true, slugs: missing })
    : { total: 0, created: 0, updated: 0 };

  await audit(req, 'admin.lab_register_missing', {
    targetType: 'catalog',
    targetId: 'labs',
    severity: 'warning',
    metadata: { mountedWithoutCatalog: missing.length, created: result.created }
  });
  res.redirect('/admin/labs');
});

router.post('/labs/:id/update', async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) return res.status(404).render('404', { title: 'Lab not found' });
  const title = String(req.body.title || '').trim().slice(0, 140);
  const points = Number.parseInt(req.body.points, 10);
  const level = Number.parseInt(req.body.level, 10);
  const estimatedMinutes = Number.parseInt(req.body.estimatedMinutes, 10);
  if (!title || !Number.isFinite(points) || points < 0 || points > 5000 || !Number.isFinite(level) || level < 1 || level > 6) {
    return res.status(400).render('403', { title: 'Invalid lab data', message: 'Title, points and level are required and must be in range.' });
  }
  challenge.title = title;
  challenge.points = points;
  challenge.level = level;
  challenge.estimatedMinutes = Number.isFinite(estimatedMinutes) && estimatedMinutes > 0 ? estimatedMinutes : challenge.estimatedMinutes;
  await challenge.save();
  await audit(req, 'admin.lab_update', {
    targetType: 'challenge',
    targetId: challenge.slug,
    metadata: { title, points, level }
  });
  res.redirect('/admin/labs');
});

router.post('/labs/:id/visibility', async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) return res.status(404).render('404', { title: 'Lab not found' });
  challenge.published = !challenge.published;
  await challenge.save();
  await audit(req, 'admin.lab_visibility', {
    targetType: 'challenge',
    targetId: challenge.slug,
    severity: 'warning',
    metadata: { published: challenge.published }
  });
  res.redirect('/admin/labs');
});

router.post('/labs/:id/archive', async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) return res.status(404).render('404', { title: 'Lab not found' });
  challenge.archived = !challenge.archived;
  if (challenge.archived) challenge.published = false;
  await challenge.save();
  if (challenge.archived) {
    await LabInstance.updateMany({ challengeId: challenge._id, status: 'active' }, { $set: { status: 'stopped' } });
  }
  await audit(req, 'admin.lab_archive', {
    targetType: 'challenge',
    targetId: challenge.slug,
    severity: 'warning',
    metadata: { archived: challenge.archived }
  });
  res.redirect('/admin/labs');
});

router.post('/labs/:id/rotate-flag', async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) return res.status(404).render('404', { title: 'Lab not found' });
  challenge.flagVersion = Number(challenge.flagVersion || 1) + 1;
  await challenge.save();

  // Every active instance for this lab is stopped so the next visit gets a new
  // instance key. Together with the version bump this invalidates all old flags.
  const instances = await LabInstance.find({ challengeId: challenge._id, status: 'active' }).lean();
  for (const instance of instances) {
    await Promise.all([
      LabData.deleteMany({ instanceId: instance._id }),
      LabFile.deleteMany({ instanceId: instance._id }),
      LabComment.deleteMany({ instanceId: instance._id }),
      LabToken.deleteMany({ instanceId: instance._id })
    ]);
    closeSqlDb(instance.instanceKey);
  }
  await LabInstance.updateMany(
    { challengeId: challenge._id, status: 'active' },
    { $set: { status: 'stopped' } }
  );
  await audit(req, 'admin.flag_rotate', {
    targetType: 'challenge',
    targetId: challenge.slug,
    severity: 'critical',
    metadata: { flagVersion: challenge.flagVersion, stoppedInstances: instances.length }
  });
  res.redirect('/admin/labs');
});

router.post('/labs/:id/reset-data', async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) return res.status(404).render('404', { title: 'Lab not found' });

  const instances = await LabInstance.find({ challengeId: challenge._id, status: 'active' }).lean();
  for (const instance of instances) {
    await Promise.all([
      LabData.deleteMany({ instanceId: instance._id }),
      LabFile.deleteMany({ instanceId: instance._id }),
      LabComment.deleteMany({ instanceId: instance._id }),
      LabToken.deleteMany({ instanceId: instance._id })
    ]);
    closeSqlDb(instance.instanceKey);
  }
  await LabInstance.updateMany(
    { challengeId: challenge._id, status: 'active' },
    { $set: { state: {}, lastSeenAt: new Date() } }
  );

  await audit(req, 'admin.lab_data_reset', {
    targetType: 'challenge',
    targetId: challenge.slug,
    severity: 'warning',
    metadata: { resetInstances: instances.length }
  });
  res.redirect('/admin/labs');
});

router.post('/labs/reseed', async (req, res) => {
  const result = await seedChallenges({ log: false });
  await audit(req, 'admin.catalog_reseed', {
    targetType: 'catalog',
    targetId: 'labs',
    severity: 'warning',
    metadata: result
  });
  res.redirect('/admin/labs');
});

router.get('/submissions', async (req, res) => {
  const page = pageNumber(req.query.page);
  const perPage = 40;
  const filters = {};
  if (req.query.result === 'correct') filters.correct = true;
  if (req.query.result === 'incorrect') filters.correct = false;
  if (req.query.q) {
    const q = new RegExp(escapeRegex(String(req.query.q).slice(0, 80)), 'i');
    const users = await User.find({ username: q }).select('_id').lean();
    const challenges = await Challenge.find({ $or: [{ slug: q }, { title: q }] }).select('_id').lean();
    filters.$or = [
      { userId: { $in: users.map(u => u._id) } },
      { challengeId: { $in: challenges.map(c => c._id) } }
    ];
  }

  const total = await FlagSubmission.countDocuments(filters);
  const pages = paging(page, perPage, total);
  const submissions = await FlagSubmission.find(filters)
    .sort({ createdAt: -1 })
    .skip(pages.start)
    .limit(perPage)
    .populate('userId', 'username')
    .populate('challengeId', 'title slug level')
    .lean();

  // Real suspicious-behaviour indicators, computed from the submissions
  // themselves: brute-force bursts and a flag hash accepted/replayed across
  // different accounts.
  const [failureRows, sharedHashRows] = await Promise.all([
    FlagSubmission.aggregate([
      { $match: { correct: false, createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) } } },
      { $group: { _id: { userId: '$userId', challengeId: '$challengeId' }, count: { $sum: 1 } } }
    ]),
    FlagSubmission.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, submittedHash: { $nin: ['', null] } } },
      { $group: { _id: '$submittedHash', users: { $addToSet: '$userId' } } },
      { $match: { 'users.1': { $exists: true } } }
    ])
  ]);
  const failureMap = new Map(failureRows.map(row => [
    `${row._id.userId}:${row._id.challengeId}`,
    row.count
  ]));
  const sharedHashes = new Set(sharedHashRows.map(row => row._id));

  const enriched = submissions.map(item => {
    const userId = item.userId?._id?.toString() || String(item.userId || '');
    const challengeId = item.challengeId?._id?.toString() || String(item.challengeId || '');
    const reasons = [];
    const failures = failureMap.get(`${userId}:${challengeId}`) || 0;
    if (!item.correct && failures >= 5) reasons.push(`${failures} failures in 10 minutes`);
    if (item.submittedHash && sharedHashes.has(item.submittedHash)) reasons.push('Flag hash shared across accounts');
    return { ...item, suspiciousReasons: reasons };
  });

  res.render('admin/submissions', {
    title: 'Flag submissions',
    submissions: enriched,
    suspiciousCount: enriched.filter(item => item.suspiciousReasons.length > 0).length,
    pages,
    filters: req.query
  });
});

router.get('/audit', async (req, res) => {
  const page = pageNumber(req.query.page);
  const perPage = 60;
  const filters = {};
  if (['info', 'warning', 'critical'].includes(String(req.query.severity))) filters.severity = req.query.severity;
  if (req.query.action) filters.action = String(req.query.action).slice(0, 80);

  const total = await AuditLog.countDocuments(filters);
  const pages = paging(page, perPage, total);
  const entries = await AuditLog.find(filters)
    .sort({ createdAt: -1 })
    .skip(pages.start)
    .limit(perPage)
    .lean();

  res.render('admin/audit', {
    title: 'Audit log',
    entries,
    pages,
    filters: req.query
  });
});

router.get('/analytics', async (req, res) => {
  const since = new Date(Date.now() - 14 * 86400000);
  const [
    submissionSeries,
    solveSeries,
    levelSolves,
    topLabs,
    activeUsers,
    totalUsers,
    totalSolves,
    challengeCount,
    registrationSeries,
    activeAccounts,
    suspendedAccounts
  ] = await Promise.all([
    FlagSubmission.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            correct: '$correct'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.day': 1 } }
    ]),
    Solve.aggregate([
      { $match: { solvedAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$solvedAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Solve.aggregate([
      { $lookup: { from: 'challenges', localField: 'challengeId', foreignField: '_id', as: 'challenge' } },
      { $unwind: '$challenge' },
      { $group: { _id: '$challenge.level', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Solve.aggregate([
      { $group: { _id: '$challengeId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'challenges', localField: '_id', foreignField: '_id', as: 'challenge' } },
      { $unwind: '$challenge' },
      { $project: { count: 1, title: '$challenge.title', slug: '$challenge.slug', level: '$challenge.level' } }
    ]),
    User.countDocuments({ lastActiveAt: { $gte: since } }),
    User.countDocuments(),
    Solve.countDocuments(),
    Challenge.countDocuments({ archived: false }),
    User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
    ]),
    User.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'suspended' })
  ]);

  const days = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
    const correctRow = submissionSeries.find(row => row._id.day === date && row._id.correct === true);
    const incorrectRow = submissionSeries.find(row => row._id.day === date && row._id.correct === false);
    const solveRow = solveSeries.find(row => row._id === date);
    const registrationRow = registrationSeries.find(row => row._id === date);
    days.push({
      date,
      correct: correctRow?.count || 0,
      incorrect: incorrectRow?.count || 0,
      solves: solveRow?.count || 0,
      registrations: registrationRow?.count || 0
    });
  }

  const successCount = submissionSeries
    .filter(row => row._id.correct === true)
    .reduce((sum, row) => sum + row.count, 0);
  const failureCount = submissionSeries
    .filter(row => row._id.correct === false)
    .reduce((sum, row) => sum + row.count, 0);

  res.render('admin/analytics', {
    title: 'Analytics',
    days,
    levelSolves,
    topLabs,
    activeUsers,
    totalUsers,
    totalSolves,
    challengeCount,
    activeAccounts,
    suspendedAccounts,
    successCount,
    failureCount,
    completionRate: totalUsers ? Math.round((totalSolves / totalUsers) * 10) / 10 : 0
  });
});

router.get('/health', async (req, res) => {
  const [users, challenges, activeInstances, expiredInstances, submissions, auditEntries] = await Promise.all([
    User.countDocuments(),
    Challenge.countDocuments(),
    LabInstance.countDocuments({ status: 'active', expiresAt: { $gt: new Date() } }),
    LabInstance.countDocuments({ status: 'expired' }),
    FlagSubmission.countDocuments(),
    AuditLog.countDocuments()
  ]);
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.render('admin/health', {
    title: 'System health',
    health: {
      mongoState: states[mongoose.connection.readyState] || 'unknown',
      mongoName: mongoose.connection.name || '',
      users,
      challenges,
      activeInstances,
      expiredInstances,
      submissions,
      auditEntries,
      labCount: require('../labs').length,
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

module.exports = router;
