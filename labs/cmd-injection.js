'use strict';

const express = require('express');
const { resetLabState, virtualFiles } = require('./lib/lab-helpers');

const router = express.Router();

async function files(req) {
  const store = virtualFiles(req);
  if (!store['.htpasswd']) {
    store['.htpasswd'] = `deploy:${req.lab.flag()}\n`;
    store['README.txt'] = 'Internal diagnostics host. Do not expose this directory.\n';
    await req.lab.save();
  }
  return store;
}

function executeSegment(segment, store) {
  const command = segment.trim();
  if (!command) return '';
  if (command.startsWith('ping ')) {
    const target = command.slice(5).trim() || '127.0.0.1';
    return `PING ${target} (${target}) 56(84) bytes of data.\n64 bytes from ${target}: icmp_seq=1 ttl=64 time=0.041 ms\n\n--- ${target} ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss, time 0ms\n`;
  }
  if (/^cat\s+(\.\/)?\.htpasswd$/.test(command) || /^cat\s+\/app\/\.htpasswd$/.test(command)) {
    return store['.htpasswd'];
  }
  if (/^cat\s+(\.\/)?README\.txt$/.test(command)) return store['README.txt'];
  if (command === 'whoami') return 'www-data\n';
  if (command === 'id') return 'uid=33(www-data) gid=33(www-data) groups=33(www-data)\n';
  if (command === 'ls' || command === 'ls -la' || command === 'ls -l') {
    return `total 8\ndrwxr-xr-x 2 www-data www-data 4096 Mar 12 09:14 .\ndrwxr-xr-x 3 root     root     4096 Mar 12 09:10 ..\n-rw-r--r-- 1 www-data www-data   42 Mar 12 09:14 .htpasswd\n-rw-r--r-- 1 root     root      63 Mar 12 09:10 README.txt\n`;
  }
  if (command.startsWith('echo ')) return command.slice(5).replace(/^["']|["']$/g, '') + '\n';
  if (command === 'uname -a') return 'Linux diagnostics 6.8.0-31-generic #31-Ubuntu SMP x86_64 GNU/Linux\n';
  return `sh: 1: ${command.split(/\s+/)[0]}: not found\n`;
}

router.get('/', (req, res) => {
  res.render('labs/cmd-injection', { output: null, host: '', error: null });
});

router.post('/', async (req, res) => {
  const host = String(req.body.host || '').slice(0, 300);
  const store = await files(req);
  const injected = /[;&|]/.test(host);
  const segments = injected ? host.split(/(?:&&|\|\||[;|])/g) : [host];
  const command = `ping -c 1 ${host}`;
  const output = [
    `$ ${command}`,
    ...segments.map(segment => executeSegment(segment, store))
  ].join('\n');

  return res.render('labs/cmd-injection', {
    output,
    host,
    error: null
  });
});

router.post('/reset', async (req, res) => {
  await resetLabState(req);
  res.redirect('/labs/cmd-injection');
});

module.exports = router;
