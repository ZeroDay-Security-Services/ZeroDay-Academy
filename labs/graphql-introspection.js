'use strict';

const express = require('express');

const router = express.Router();

function schema() {
  return {
    queryType: 'Query',
    fields: [
      { name: 'publicAnnouncements', type: '[String]', description: 'Public announcements.' },
      { name: 'userProfile', type: 'UserProfile', description: "Current user's profile." },
      { name: 'internalDebugFlag', type: 'String', description: 'INTERNAL -- debug only, not linked from any client.' }
    ]
  };
}

router.get('/', (req, res) => {
  res.render('labs/graphql-introspection', { output: null });
});

router.post('/graphql', express.json(), (req, res) => {
  const query = String(req.body?.query || '').trim();

  if (!query) return res.json({ errors: [{ message: 'Query required.' }] });
  if (query.includes('__schema') || query.includes('__type')) {
    return res.json({ data: { __schema: schema() } });
  }
  if (/internalDebugFlag/.test(query)) {
    return res.json({ data: { internalDebugFlag: req.lab.flag() } });
  }
  if (/publicAnnouncements/.test(query)) {
    return res.json({ data: { publicAnnouncements: ['Scheduled maintenance Friday 22:00 UTC.'] } });
  }
  if (/userProfile/.test(query)) {
    return res.json({ data: { userProfile: { username: 'guest', plan: 'free' } } });
  }
  return res.json({ errors: [{ message: 'Cannot query field -- unknown query.' }] });
});

router.post('/reset', (req, res) => {
  res.redirect('/labs/graphql-introspection');
});

module.exports = router;
