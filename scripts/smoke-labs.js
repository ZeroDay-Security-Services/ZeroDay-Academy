'use strict';

/**
 * Lightweight authenticated render smoke test for every lab page.
 * Run against a live server: node scripts/smoke-labs.js [baseUrl]
 */

const fs = require('fs');
const path = require('path');

const base = process.argv[2] || 'http://localhost:3000';
const cookies = new Map();

function cookieHeader() {
  return [...cookies.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
}

function storeCookies(response) {
  const values = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [];
  for (const value of values) {
    const pair = value.split(';')[0];
    const index = pair.indexOf('=');
    if (index > 0) cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
}

async function request(pathname, options = {}) {
  const response = await fetch(base + pathname, {
    ...options,
    headers: { Cookie: cookieHeader(), ...(options.headers || {}) },
    redirect: 'manual'
  });
  storeCookies(response);
  return response;
}

function csrf(html) {
  const match = html.match(/name="_csrf" value="([^"]+)"/);
  return match ? match[1] : '';
}

async function main() {
  const username = `smoke_${Date.now().toString(36)}`;
  const password = 'SmokePassword123!';

  let response = await request('/register');
  let html = await response.text();
  response = await request('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      _csrf: csrf(html),
      username,
      email: `${username}@example.test`,
      password,
      confirmPassword: password
    }).toString()
  });
  console.log(`register: ${response.status} -> ${response.headers.get('location')}`);
  if (![302, 303].includes(response.status)) process.exitCode = 1;

  const labDir = path.join(__dirname, '..', 'labs');
  const slugs = fs.readdirSync(labDir)
    .filter(file => file.endsWith('.js') && file !== 'index.js')
    .map(file => file.replace(/\.js$/, ''))
    .sort();

  let failures = 0;
  for (const slug of slugs) {
    const labResponse = await request(`/labs/${slug}`);
    const body = await labResponse.text();
    const rendersError = /Internal Server Error|ReferenceError|Cannot read properties|is not defined|SyntaxError/.test(body);
    const ok = labResponse.status === 200 && !rendersError;
    if (!ok) {
      failures += 1;
      console.log(`FAIL ${labResponse.status} /labs/${slug}`);
      console.log(body.replace(/\s+/g, ' ').slice(0, 220));
    }
  }

  console.log(`\n${slugs.length - failures}/${slugs.length} labs rendered successfully.`);
  if (failures) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
