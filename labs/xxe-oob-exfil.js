'use strict';

const express = require('express');
const { resetLabState } = require('./lib/lab-helpers');

const router = express.Router();

function state(req) {
  if (!req.lab.state.xxeOob) {
    req.lab.state.xxeOob = {
      dtd: '',
      received: null,
      files: { 'db_credentials.conf': `${req.lab.flag()}\n` }
    };
  }
  return req.lab.state.xxeOob;
}

function render(res, req, result = null) {
  const current = state(req);
  return res.render('labs/xxe-oob-exfil', {
    dtd: current.dtd,
    received: current.received,
    result
  });
}

router.get('/', (req, res) => {
  state(req);
  render(res, req);
});

router.post('/craft-dtd', async (req, res) => {
  const current = state(req);
  current.dtd = String(req.body.dtd || '').slice(0, 8000);
  await req.lab.save();
  render(res, req);
});

router.get('/evil.dtd', (req, res) => {
  res.set('Content-Type', 'application/xml-dtd');
  res.send(state(req).dtd);
});

// The importer follows the external DTD and then follows the exfiltration URL
// declared inside it. Network access is simulated inside the instance.
router.post('/import', async (req, res) => {
  const xml = String(req.body.xml || '').slice(0, 12000);
  const current = state(req);
  let result = null;

  const remote = xml.match(/SYSTEM\s+["']([^"']*evil\.dtd)["']/i);
  if (!remote) {
    return render(res, req, { error: 'The external DTD was not referenced by the submitted XML.' });
  }

  const dtd = current.dtd;
  const fileEntity = dtd.match(/<!ENTITY\s+%\s+\w+\s+SYSTEM\s+["']file:\/\/([^"']+)["']/i);
  const exfilEntity = dtd.match(/<!ENTITY\s+%\s+\w+\s+SYSTEM\s+["']([^"']*\/collector\?data=[^"']*)["']/i);

  if (!fileEntity || !exfilEntity) {
    return render(res, req, { error: 'The DTD must define a file entity and a collector entity.' });
  }

  const fileName = fileEntity[1].split('/').pop();
  if (!Object.prototype.hasOwnProperty.call(current.files, fileName)) {
    return render(res, req, { error: `The target file was not found: ${fileName}` });
  }

  const content = current.files[fileName].trim();
  current.received = content;
  await req.lab.save();
  return render(res, req, {
    message: `External DTD processed. Collector received ${content.length} bytes from ${fileName}.`
  });
});

router.get('/collector', async (req, res) => {
  const current = state(req);
  current.received = String(req.query.data || '').slice(0, 5000);
  await req.lab.save();
  res.json({ ok: true });
});

router.get('/check', (req, res) => {
  const current = state(req);
  const flag = current.received && /ZDS\{[^}]+\}/.test(current.received)
    ? current.received.match(/ZDS\{[^}]+\}/)[0]
    : null;
  res.json({ received: current.received, flag });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/xxe-oob-exfil');
});

module.exports = router;
