'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const cookieParser = require('cookie-parser');

const { config } = require('./config');
const { connectMongo, disconnectMongo } = require('./db/mongo');
const { seedChallenges } = require('./db/seed');
const { attachUser } = require('./middleware/auth');
const { securityHeaders } = require('./middleware/security');
const { attachCsrf } = require('./middleware/csrf');
const { labGate } = require('./middleware/labGate');
const platformRoutes = require('./routes/platform');
const adminRoutes = require('./routes/admin');

function wantsJson(req) {
  return req.path.startsWith('/api/') || (req.get('Accept') || '').includes('application/json');
}

async function createApp({ seed = true, log = true } = {}) {
  const { uri } = await connectMongo();
  if (seed) await seedChallenges({ log });

  // Optional, explicitly gated founder bootstrap for deployment pipelines and
  // isolated QA runs. ADMIN_PASSWORD is required and is never logged. With the
  // flag unset, operators use `npm run create-admin` instead.
  if (String(process.env.BOOTSTRAP_ADMIN || '').toLowerCase() === 'true') {
    const { bootstrapFounder } = require('./services/bootstrapAdmin');
    const result = await bootstrapFounder({
      email: config.admin.email,
      username: config.admin.username,
      password: config.admin.password,
      source: 'server.startup'
    });
    if (log) {
      console.log(`[server] Founder bootstrap ${result.action}: ${result.user.username} <${result.user.email}>`);
    }
  }

  const app = express();
  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.set('trust proxy', 1);
  // Extended parsing preserves nested/object query parameters. Several labs
  // deliberately accept operator-shaped input such as ?released[$ne]=0.
  app.set('query parser', 'extended');

  app.use(securityHeaders);
  app.use(express.static(path.join(__dirname, 'public'), {
    index: false,
    dotfiles: 'deny',
    maxAge: config.isProduction ? '7d' : 0
  }));

  app.use(express.urlencoded({ extended: true, limit: '120kb' }));
  app.use(express.json({ limit: '120kb' }));
  app.use(cookieParser());

  app.use(session({
    name: config.session.name,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: uri,
      collectionName: 'sessions',
      ttl: Math.floor(config.session.maxAgeMs / 1000)
    }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProduction,
      maxAge: config.session.maxAgeMs
    }
  }));

  app.use(attachUser());
  app.use(attachCsrf);

  // Intentionally vulnerable lab targets are mounted before platform CSRF
  // protection. They are isolated from the platform's auth/session state and
  // validate flags server-side only.
  const labRegistry = require('./labs');
  for (const { mountPath, router } of labRegistry) {
    app.use(mountPath, labGate, router);
  }

  // Platform and admin routes use CSRF protection on every state-changing
  // request. The lab routers above deliberately do not.
  app.use('/', platformRoutes);
  app.use('/admin', adminRoutes);

  app.get('/healthz', (req, res) => {
    res.json({ ok: true, service: 'zeroday-academy', labs: labRegistry.length });
  });

  app.use((req, res) => {
    if (wantsJson(req)) return res.status(404).json({ ok: false, message: 'Not found.' });
    return res.status(404).render('404', { title: 'Not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    console.error('[server]', error.stack || error.message);
    if (res.headersSent) return undefined;
    if (wantsJson(req)) return res.status(500).json({ ok: false, message: 'Internal server error.' });
    return res.status(500).render('500', { title: 'Internal error' });
  });

  app.locals.labCount = labRegistry.length;
  app.locals.appName = 'ZeroDay Academy';
  return app;
}

async function start() {
  const app = await createApp();
  const server = app.listen(config.port, () => {
    console.log(`[server] ZeroDay Academy listening on http://localhost:${config.port}`);
    console.log(`[server] ${app.locals.labCount} isolated lab targets mounted.`);
    if (!config.isProduction && !config.admin.password) {
      console.log('[server] No ADMIN_PASSWORD set. Run `npm run create-admin` to create an administrator.');
    }
  });

  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received, shutting down.`);
    server.close(async () => {
      await disconnectMongo();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    console.error('[server] Failed to start:', error);
    process.exitCode = 1;
  });
}

module.exports = { createApp, start };
