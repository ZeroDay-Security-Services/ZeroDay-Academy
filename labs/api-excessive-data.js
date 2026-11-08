'use strict';

const express = require('express');
const { seedLabData, resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

async function profiles(req) {
  return seedLabData(req, 'profiles', [
    {
      id: 'u_2291',
      name: 'Jordan Lee',
      title: 'Support Engineer',
      department: 'Customer Success',
      email: 'j.lee@internal.zeroday-corp.test',
      phone: '+1-555-0142',
      internalNotes: `Flagged for review after a suspicious login pattern. Flag: ${req.lab.flag()}`,
      internalRiskScore: 87,
      payrollBand: 'B4'
    },
    {
      id: 'u_3310',
      name: 'Priya Nair',
      title: 'Platform Engineer',
      department: 'Engineering',
      email: 'p.nair@internal.zeroday-corp.test',
      phone: '+1-555-0199',
      internalNotes: 'Standard review cycle.',
      internalRiskScore: 12,
      payrollBand: 'B5'
    }
  ]);
}

router.get('/', (req, res) => {
  res.render('labs/api-excessive-data');
});

// The endpoint was written for a mobile client that needed every field. It
// still returns internal-only fields to any caller.
router.get('/api/profile/:id', async (req, res) => {
  const records = await profiles(req);
  const profile = records.find(record => record.data.id === req.params.id);
  if (!profile) return res.status(404).json({ error: 'not found' });
  return res.json(profile.data);
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/api-excessive-data');
});

module.exports = router;
