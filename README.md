# ZeroDay Academy

### A hands-on web application security training platform by ZeroDay Security Services

**56 intentionally vulnerable, genuinely exploitable labs** across 17 attack domains. The platform is built with Node.js, Express, EJS, MongoDB (Mongoose) and per-instance SQLite lab databases. It includes a full student workspace, server-side flag verification, progress tracking, and a founder administration panel backed by real data.

> **Security warning:** every route under `/labs/*` is deliberately vulnerable. Run this application in an isolated environment. Never copy lab code into a real product.

---

## Requirements

- **Node.js 24** recommended. The SQL injection labs use the built-in `node:sqlite` module (`DatabaseSync`), which requires Node.js 22.5 or newer.
- MongoDB Atlas or a local MongoDB server for persistent data.
- No Docker or external database is required for development: when `MONGODB_URI` is empty and `NODE_ENV` is not `production`, the application starts an in-memory MongoDB automatically.

---

## Quick start

```bash
npm install

# Optional for development. Without it, the app starts an in-memory MongoDB.
cp .env.example .env

# Create the founder administrator. The password is read from the environment.
# Never commit a real password.
ADMIN_EMAIL=founder.zeroday@gmail.com \
ADMIN_USERNAME=founder \
ADMIN_PASSWORD='a-long-unique-password' \
npm run create-admin

npm start
# http://localhost:3000
```

On Windows PowerShell, set the environment variables with `$env:ADMIN_PASSWORD='...'` before running `npm run create-admin`.

The server seeds the 56-lab catalog on startup. `npm run seed` is available for explicit catalog seeding and is safe to re-run.

### Founder administrator

The founder account is identified by `ADMIN_EMAIL` (default `founder.zeroday@gmail.com`) and `ADMIN_USERNAME` (default `founder`). It is created or promoted idempotently:

```bash
# Create or promote, preserving an existing password
ADMIN_PASSWORD='a-long-unique-password' npm run create-admin

# Explicitly replace the password
ADMIN_PASSWORD='a-different-long-password' npm run create-admin -- --reset-password
```

Passwords must be at least 12 characters and are only read from the environment. The CLI never prints or stores the plaintext password. Startup bootstrap is available for controlled deployments by setting `BOOTSTRAP_ADMIN=true`; it uses the same service and never resets an existing password.

Administrators can sign in at `/login` and use the panel at `/admin`:

- Live dashboard with user, lab, submission, solve and audit totals
- User management with server-side role changes, suspension and reactivation
- Lab catalog management: metadata, visibility, archive, per-lab data reset and flag-version rotation
- Graded submission telemetry with brute-force and shared-flag indicators
- Immutable audit log with severity and action filters
- 14-day analytics and runtime/database health

All admin mutations require a valid per-session CSRF token. RBAC is enforced server-side. The last active administrator cannot be removed, suspended or self-demoted.

---

## Security model

- Flags are **derived with HMAC-SHA256** from `FLAG_SECRET`, the user ID, the challenge document ID, the challenge slug, the flag version and the active instance key. Flags are never stored in MongoDB or in the catalog.
- Flags rotate when an instance is reset, when an administrator rotates a lab's flag version, or when an instance expires.
- Every lab instance is scoped to one user and one challenge. Lab state, files, comments, tokens and SQLite data are keyed to that instance.
- Browser-proof labs (reflected, DOM, stored, SVG and upload XSS) issue a non-HttpOnly proof cookie. The server only reveals the flag after validating the proof and the lab-specific exploit condition.
- Dangerous mechanics are isolated simulations. There is no arbitrary shell execution, no outbound arbitrary network access and prototype pollution is confined to per-instance lab state.
- Flag submission is rate-limited per user and per challenge (20 submissions per 5 minutes). Ten failures in 10 minutes are treated as suspected brute force. Every graded submission is recorded and audited with a hashed value, never the plaintext flag.
- Platform and admin routes use CSRF protection, secure session cookies, session regeneration on authentication, CSP/frame protections and server-side authorization.
- The public `/healthz` endpoint exposes only liveness and the mounted lab count.

See [docs/SECURITY.md](docs/SECURITY.md) for the full model and deployment checklist.

---

## Lab catalog

56 labs, 17 domains, six difficulty tiers:

| Domain | Labs |
| --- | ---: |
| Broken Access Control | 6 |
| Authentication | 6 |
| Cross-Site Scripting | 5 |
| SQL Injection | 4 |
| NoSQL Injection | 4 |
| API Security | 4 |
| Business Logic | 4 |
| Information Disclosure | 4 |
| CORS & Security Headers | 4 |
| SSRF | 3 |
| XXE | 3 |
| File Upload | 3 |
| CSRF | 2 |
| Command Injection | 1 |
| Server-Side Template Injection | 1 |
| Insecure Deserialization | 1 |
| Prototype Pollution | 1 |

Difficulty levels are Beginner, Easy, Intermediate, Hard, Advanced and Insane, worth 100, 150, 250, 350, 450 and 600 points respectively. The current catalog totals **12,550 points**.

The complete lab-by-lab inventory, including prerequisites, objectives, OWASP/ASVS/WSTG/CWE/MITRE mappings and solutions, is in [docs/LAB_INVENTORY.md](docs/LAB_INVENTORY.md).

---

## Architecture

```
server.js                    Express application factory, middleware order, lab mounts
config/index.js              validated runtime configuration and production guards
db/mongo.js                  MongoDB connection; in-memory server in development
db/seed.js                   idempotent 56-lab catalog seed
db/sqlLabDb.js               per-instance SQLite databases for SQL injection labs
models/                      User, Challenge, Solve, LabInstance, LabData, LabFile,
                             LabComment, LabToken, FlagSubmission, AuditLog
middleware/                  auth, CSRF, security headers, lab gate, rate limiting
services/                    flag derivation, submissions/progress, instances, audit,
                             founder bootstrap
labs/index.js                ordered registry of all 56 deliberately vulnerable routers
labs/<slug>.js               one isolated lab router per vulnerability
views/labs/<slug>.ejs        exact UI used by the corresponding lab router
routes/platform.js           landing, auth, dashboard, explorer, lab lifecycle, profile
routes/admin.js              founder administration panel and real-data APIs
scripts/create-admin.js      idempotent founder bootstrap CLI
scripts/verify-all.js        end-to-end QA: exploits all 56 labs and tests the platform
docs/                        architecture, security, lab inventory and QA reports
```

The deliberate lab targets are mounted **before** platform CSRF middleware. Each lab router passes through a single `labGate` that authenticates the user, checks account status, publication/archival state, prerequisites, and resolves the user's instance. Platform and admin routes are mounted afterwards with their own controls.

---

## Verification and QA

```bash
npm run qa
```

The QA harness starts the real application on an isolated loopback port against a temporary in-memory MongoDB. It generates unique test secrets and a founder password, then:

1. Checks health, headers, catalog metadata, CSRF, registration/login limits and session regeneration.
2. Tests founder bootstrap, RBAC, administration CSRF, self-demotion and last-administrator protection.
3. Exercises submission validation, failure thresholds, per-challenge rate limits, shared-hash detection and audit correlation.
4. Tests lab metadata edits, reseeding, visibility/archive enforcement, missing-lab registration and flag rotation.
5. Exploits **all 56 labs in prerequisite order** over real HTTP (with `jsdom` for browser-executed XSS), submits every recovered flag through the real platform endpoint, calls each lab reset route and stops each instance.
6. Verifies progress, dashboard, leaderboard, achievements, admin data resets, instance flag rotation, profile/password changes and production configuration refusal.

Run results are reported honestly; a failing check or lab exits non-zero. The most recent verified report is in [docs/QA_REPORT.md](docs/QA_REPORT.md).

---

## Deployment

### Render

1. Push the repository to GitHub.
2. Create a Web Service with build command `npm install` and start command `npm start`.
3. Set `NODE_ENV=production`, `MONGODB_URI`, `SESSION_SECRET` and `FLAG_SECRET`.
4. Provision the founder with `npm run create-admin` from a one-off shell, or set `BOOTSTRAP_ADMIN=true` and provide `ADMIN_PASSWORD` for the first deploy.
5. Remove `BOOTSTRAP_ADMIN` and `ADMIN_PASSWORD` after provisioning if your platform permits.

### Vercel

The included `vercel.json` routes requests to `server.js`. Set the same production environment variables in the Vercel dashboard. Serverless execution still requires an external MongoDB deployment and the same mandatory secrets.

Production startup refuses to begin when `MONGODB_URI`, `SESSION_SECRET` or `FLAG_SECRET` is missing. The in-memory MongoDB fallback is development-only.

---

## Adding a lab

1. Add metadata (including objectives, hints, solution and threat mappings) to `data/labs.js`.
2. Create the isolated router at `labs/<slug>.js`, including a `POST /reset` route.
3. Create the matching template at `views/labs/<slug>.ejs`.
4. Register the router in `labs/index.js`.
5. Re-run `npm run seed` (or restart the server) and `npm run qa`.

The QA catalog-hygiene check requires a view, router, objectives, hints, solution and complete threat mappings for every entry.

---

Built for **ZeroDay Security Services** — Siliguri, West Bengal, India.
