'use strict';

const Challenge = require('../models/Challenge');
const Solve = require('../models/Solve');
const { ensureInstance } = require('../services/instances');
const { flagFor, proofToken } = require('../services/flagService');

function slugFromPath(pathname) {
  const parts = String(pathname || '').split('/').filter(Boolean);
  const labIndex = parts.indexOf('labs');
  if (labIndex !== -1 && parts[labIndex + 1]) return parts[labIndex + 1];
  return parts[0] || '';
}

async function labGate(req, res, next) {
  if (!req.user) {
    if (req.method !== 'GET') {
      return res.status(401).type('text').send('Authentication required. Open the lab from your ZeroDay Academy workspace.');
    }
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  if (req.user.status !== 'active') {
    return res.status(403).type('text').send('Account suspended.');
  }

  // The lab router is mounted under /labs/<slug>, so Express removes the
  // mount path from req.path. Recover the slug from baseUrl instead.
  const slug = slugFromPath(req.baseUrl) || slugFromPath(req.originalUrl.replace(/^\/labs\//, ''));
  if (!slug) return next();

  const challenge = await Challenge.findOne({ slug }).lean();
  if (!challenge || challenge.archived || (!challenge.published && req.user.role !== 'admin')) {
    return res.status(404).render('404', { title: 'Lab not found' });
  }

  // A lab may only be opened once every prerequisite has been solved. This
  // lives in the gate rather than the platform start route so a direct lab
  // URL cannot bypass the progression rules. Administrators are exempt for
  // review and maintenance work.
  if (req.user.role !== 'admin' && Array.isArray(challenge.prerequisites) && challenge.prerequisites.length > 0) {
    const required = await Challenge.find({ slug: { $in: challenge.prerequisites } })
      .select('_id slug title')
      .lean();
    const solvedIds = await Solve.distinct('challengeId', {
      userId: req.user._id,
      challengeId: { $in: required.map(item => item._id) }
    });
    const solvedSet = new Set(solvedIds.map(id => id.toString()));
    const missing = challenge.prerequisites
      .filter(prereqSlug => {
        const doc = required.find(item => item.slug === prereqSlug);
        return !doc || !solvedSet.has(doc._id.toString());
      })
      .map(prereqSlug => required.find(item => item.slug === prereqSlug)?.title || prereqSlug);

    if (missing.length > 0) {
      return res.status(403).render('403', {
        title: 'Lab locked',
        message: `This lab is locked. Complete ${missing.join(', ')} first.`
      });
    }
  }

  const instance = await ensureInstance(req.user._id, challenge);
  const solved = await Solve.exists({ userId: req.user._id, challengeId: challenge._id });

  req.lab = {
    challenge,
    instance,
    completed: Boolean(solved),
    flag(variant = 'default') {
      return flagFor({ userId: req.user._id, challenge, instanceKey: instance.instanceKey, variant });
    },
    proof(purpose = 'xss') {
      return proofToken({ instance, purpose });
    },
    state: instance.state && typeof instance.state === 'object' ? instance.state : {},
    async save() {
      instance.markModified('state');
      instance.lastSeenAt = new Date();
      await instance.save();
    },
    async resetState() {
      instance.state = {};
      instance.lastSeenAt = new Date();
      instance.markModified('state');
      await instance.save();
    }
  };

  res.locals.labMeta = {
    slug: challenge.slug,
    title: challenge.title,
    level: challenge.level,
    difficulty: challenge.difficulty,
    instanceId: instance._id.toString(),
    expiresAt: instance.expiresAt
  };

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  return next();
}

module.exports = { labGate };
