'use strict';

const Challenge = require('../models/Challenge');
const Solve = require('../models/Solve');
const User = require('../models/User');
const FlagSubmission = require('../models/FlagSubmission');
const LabInstance = require('../models/LabInstance');
const { config } = require('../config');
const { verifyFlag, sha256, ipHash } = require('./flagService');
const { audit } = require('./audit');
const { getActiveInstance } = require('./instances');

/**
 * Server-side flag validation. There is deliberately no route that returns a
 * flag, a flag hash, or a challenge's expected value.
 */
async function submitFlag({ user, challenge, submitted, req }) {
  const instance = await getActiveInstance(user._id, challenge._id);
  if (!instance) {
    return { status: 409, body: { ok: false, message: 'No active lab instance. Start or restart the lab first.' } };
  }

  // The submission cap is per user and per challenge. A global per-user cap
  // would make it impossible to work through the full catalogue while adding
  // no protection beyond the per-challenge throttle.
  const windowStart = new Date(Date.now() - config.limits.submitWindowMs);
  const recent = await FlagSubmission.countDocuments({
    userId: user._id,
    challengeId: challenge._id,
    createdAt: { $gte: windowStart }
  });
  if (recent >= config.limits.submitMax) {
    await audit(req, 'flag.rate_limited', {
      targetType: 'challenge',
      targetId: challenge.slug,
      severity: 'warning',
      metadata: { submissionsInWindow: recent }
    });
    return {
      status: 429,
      body: { ok: false, message: 'Too many submissions. Wait a few minutes before trying again.' }
    };
  }

  const alreadySolved = await Solve.findOne({ userId: user._id, challengeId: challenge._id }).lean();
  if (alreadySolved) {
    return { status: 200, body: { ok: true, alreadySolved: true, message: 'Already solved.' } };
  }

  const normalized = typeof submitted === 'string' ? submitted.trim() : '';
  if (!normalized) {
    return { status: 400, body: { ok: false, message: 'Enter a flag.' } };
  }

  const correct = verifyFlag({
    userId: user._id,
    challenge,
    instanceKey: instance.instanceKey
  }, normalized);

  await FlagSubmission.create({
    userId: user._id,
    challengeId: challenge._id,
    instanceId: instance._id,
    submittedHash: sha256(normalized),
    correct,
    ipHash: ipHash(req.ip),
    userAgent: String(req.get('User-Agent') || '').slice(0, 300),
    reason: correct ? 'correct' : 'incorrect'
  });

  // Record every graded submission. Only a hash plus the verdict is stored
  // here; the submitted value itself never reaches the audit log.
  await audit(req, 'flag.submission', {
    targetType: 'challenge',
    targetId: challenge.slug,
    severity: 'info',
    metadata: {
      correct,
      instanceId: instance._id.toString(),
      submittedHash: sha256(normalized).slice(0, 16)
    }
  });

  if (!correct) {
    const failureWindow = new Date(Date.now() - 10 * 60 * 1000);
    const failures = await FlagSubmission.countDocuments({
      userId: user._id,
      challengeId: challenge._id,
      correct: false,
      createdAt: { $gte: failureWindow }
    });
    if (failures >= 10) {
      await audit(req, 'flag.bruteforce_suspected', {
        targetType: 'challenge',
        targetId: challenge.slug,
        severity: 'critical',
        metadata: { failuresInTenMinutes: failures }
      });
      return { status: 429, body: { ok: false, message: 'Too many failed submissions. Try again later.' } };
    }
    return { status: 200, body: { ok: false, message: 'Incorrect flag. Keep digging.' } };
  }

  try {
    await Solve.create({
      userId: user._id,
      challengeId: challenge._id,
      instanceId: instance._id,
      pointsAwarded: challenge.points
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return { status: 200, body: { ok: true, alreadySolved: true, message: 'Already solved.' } };
    }
    throw error;
  }

  const updated = await User.findOneAndUpdate(
    { _id: user._id },
    { $inc: { points: challenge.points, xp: challenge.points } },
    { returnDocument: 'after' }
  ).lean();

  instance.status = 'completed';
  instance.completedAt = new Date();
  await instance.save();

  await audit(req, 'flag.solved', {
    targetType: 'challenge',
    targetId: challenge.slug,
    metadata: { points: challenge.points }
  });

  return {
    status: 200,
    body: {
      ok: true,
      alreadySolved: false,
      message: 'Correct! Flag captured.',
      points: challenge.points,
      totalPoints: updated?.points ?? user.points + challenge.points
    }
  };
}

async function dashboardData(user) {
  const [solves, allChallenges, totalChallenges, activeInstances] = await Promise.all([
    Solve.find({ userId: user._id }).sort({ solvedAt: -1 }).populate('challengeId').lean(),
    Challenge.find({ published: true, archived: false }).sort({ orderIndex: 1 }).lean(),
    Challenge.countDocuments({ published: true, archived: false }),
    LabInstance.find({ userId: user._id, status: 'active', expiresAt: { $gt: new Date() } })
      .populate('challengeId').sort({ lastSeenAt: -1 }).lean()
  ]);

  const validSolves = solves.filter(s => s.challengeId);
  const solvedIds = new Set(validSolves.map(s => s.challengeId._id.toString()));
  const points = user.points || 0;
  const rank = (await User.countDocuments({ status: 'active', points: { $gt: points } })) + 1;

  const domainMap = new Map();
  const categoryMap = new Map();
  const levelMap = new Map([1, 2, 3, 4, 5, 6].map(level => [level, { level, total: 0, solved: 0, points: 0 }]));
  for (const challenge of allChallenges) {
    if (!domainMap.has(challenge.domain)) domainMap.set(challenge.domain, { domain: challenge.domain, total: 0, solved: 0 });
    if (!categoryMap.has(challenge.category)) categoryMap.set(challenge.category, { category: challenge.category, total: 0, solved: 0 });
    const domain = domainMap.get(challenge.domain);
    const category = categoryMap.get(challenge.category);
    const level = levelMap.get(challenge.level);
    domain.total += 1;
    category.total += 1;
    if (level) { level.total += 1; level.points += challenge.points; }
    if (solvedIds.has(challenge._id.toString())) {
      domain.solved += 1;
      category.solved += 1;
      if (level) level.solved += 1;
    }
  }

  const activity = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = 13; offset >= 0; offset -= 1) {
    const day = new Date(today.getTime() - offset * 86400000);
    const next = new Date(day.getTime() + 86400000);
    activity.push({
      date: day.toISOString().slice(0, 10),
      count: validSolves.filter(s => s.solvedAt >= day && s.solvedAt < next).length
    });
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const daily = validSolves.filter(s => new Date(s.solvedAt).toISOString().slice(0, 10) === todayKey).length;
  const weekly = validSolves.filter(s => s.solvedAt >= weekAgo).length;

  const solvedLevels = [...levelMap.values()];
  const currentLevel = solvedLevels.find(l => l.total > 0 && l.solved < l.total)?.level || 6;
  const recommendations = allChallenges
    .filter(c => !solvedIds.has(c._id.toString()) && !c.prerequisites?.some(p => !solvedIds.has(allChallenges.find(x => x.slug === p)?._id?.toString() || '')))
    .sort((a, b) => Math.abs(a.level - currentLevel) - Math.abs(b.level - currentLevel) || a.orderIndex - b.orderIndex)
    .slice(0, 6);

  const accomplishments = [];
  const checks = [
    { id: 'first-blood', name: 'First Blood', description: 'Capture your first flag', earned: validSolves.length >= 1 },
    { id: 'field-notes', name: 'Field Notes', description: 'Complete 5 labs', earned: validSolves.length >= 5 },
    { id: 'operator', name: 'Operator', description: 'Complete 15 labs', earned: validSolves.length >= 15 },
    { id: 'specialist', name: 'Specialist', description: 'Complete 30 labs', earned: validSolves.length >= 30 },
    { id: 'elite', name: 'Elite', description: 'Complete all 56 labs', earned: validSolves.length >= 56 },
    { id: 'polyglot', name: 'Polyglot', description: 'Solve labs in 5 different domains', earned: new Set(validSolves.map(s => s.challengeId.domain)).size >= 5 },
    { id: 'deep-dive', name: 'Deep Dive', description: 'Solve a level 5 or 6 lab', earned: validSolves.some(s => s.challengeId.level >= 5) }
  ];
  checks.forEach(c => accomplishments.push(c));

  return {
    solves: validSolves,
    totalChallenges,
    completed: validSolves.length,
    percent: totalChallenges ? Math.round((validSolves.length / totalChallenges) * 100) : 0,
    rank,
    activeInstances: activeInstances.filter(i => i.challengeId),
    domainProgress: [...domainMap.values()].sort((a, b) => b.total - a.total || a.domain.localeCompare(b.domain)),
    categoryProgress: [...categoryMap.values()].sort((a, b) => a.category.localeCompare(b.category)),
    levelProgress: solvedLevels,
    activity,
    daily,
    weekly,
    recommendations,
    accomplishments,
    currentLevel
  };
}

module.exports = { submitFlag, dashboardData };
