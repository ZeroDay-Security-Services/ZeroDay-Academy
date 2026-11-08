'use strict';

const express = require('express');
const { JSDOM, CookieJar } = require('jsdom');
const LabComment = require('../models/LabComment');
const LabInstance = require('../models/LabInstance');
const { proofCookie, resetLabState } = require('./lib/lab-helpers');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const botLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  key: req => `stored-xss-bot:${req.user?._id || req.ip}`,
  message: 'The moderator bot is busy. Try again shortly.'
});

async function comments(req) {
  return LabComment.find({ instanceId: req.lab.instance._id }).sort({ createdAt: -1 }).lean();
}

function view(req, res, extra = {}) {
  return comments(req).then(list => res.render('labs/stored-xss', {
    posted: false,
    comments: list.map(comment => ({
      author: comment.author,
      body: comment.body,
      created_at: new Date(comment.createdAt).toLocaleString()
    })),
    botResult: null,
    flag: null,
    ...extra
  }));
}

router.get('/', async (req, res) => {
  proofCookie(req, res, 'zda_bot_proof', 'stored-xss');
  await view(req, res);
});

router.post('/', async (req, res) => {
  const author = String(req.body.author || 'guest').trim().slice(0, 60) || 'guest';
  const body = String(req.body.body || '').slice(0, 4000);
  if (body.trim()) {
    await LabComment.create({ instanceId: req.lab.instance._id, author, body });
  }
  await view(req, res, { posted: true });
});

router.get('/collect', async (req, res) => {
  const supplied = String(req.query.t || req.query.p || req.query.token || '');
  const { validProof } = require('./lib/lab-helpers');
  if (!validProof(req, 'stored-xss', supplied)) {
    return res.status(403).json({ ok: false });
  }
  req.lab.state.storedXssSolved = true;
  await req.lab.save();
  return res.json({ ok: true });
});

router.get('/status', (req, res) => {
  const solved = req.lab.state.storedXssSolved === true;
  res.json({ solved, flag: solved ? req.lab.flag() : null });
});

// A server-side moderator reviews the comment queue in an isolated DOM. The
// browser can reach only this lab origin, and it holds the proof cookie.
router.post('/bot', botLimiter, async (req, res) => {
  const port = req.socket.localPort;
  const base = `http://127.0.0.1:${port}`;
  const url = `${base}/labs/stored-xss`;
  const proof = req.lab.proof('stored-xss');
  const proofCookieHeader = `zda_bot_proof=${proof}`;
  // The bot must keep the platform session so the lab gate can resolve the
  // same per-instance lab, while adding the non-HttpOnly proof cookie.
  const cookieHeader = [req.headers.cookie || '', proofCookieHeader]
    .filter(Boolean)
    .join('; ');
  let botError = null;

  try {
    const page = await fetch(url, { headers: { Cookie: cookieHeader } });
    const html = await page.text();
    const jar = new CookieJar();
    jar.setCookieSync(`${proofCookieHeader}; Path=/labs/stored-xss`, url);

    const dom = new JSDOM(html, {
      url,
      runScripts: 'dangerously',
      cookieJar: jar,
      beforeParse(window) {
        window.fetch = (input, init = {}) => {
          let target;
          try {
            target = new URL(String(input), url);
          } catch {
            return Promise.reject(new Error('Invalid URL'));
          }
          if (target.origin !== base) {
            return Promise.reject(new Error('Blocked external request'));
          }
          const headers = { Cookie: cookieHeader };
          if (init.headers && typeof init.headers === 'object') {
            Object.assign(headers, init.headers);
          }
          return fetch(target, {
            method: init.method || 'GET',
            headers,
            body: init.body,
            redirect: 'manual'
          }).then(response => ({
            ok: response.ok,
            status: response.status,
            text: () => response.text(),
            json: () => response.json()
          }));
        };
      }
    });

    await new Promise(resolve => setTimeout(resolve, 450));
    dom.window.close();
  } catch (error) {
    botError = error.message;
  }

  const fresh = await LabInstance.findById(req.lab.instance._id).lean();
  const captured = fresh?.state?.storedXssSolved === true;
  return res.render('labs/stored-xss', {
    posted: false,
    comments: (await comments(req)).map(comment => ({
      author: comment.author,
      body: comment.body,
      created_at: new Date(comment.createdAt).toLocaleString()
    })),
    botResult: { captured, error: botError },
    flag: captured ? req.lab.flag() : null
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/stored-xss');
});

module.exports = router;
