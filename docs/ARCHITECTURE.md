# Architecture

This document describes how ZeroDay Academy v2.0.0 is put together, how a request reaches an intentionally vulnerable lab, and how isolation, flags, reset behaviour and the administration panel work.

## Runtime stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 24 (minimum 22.5 for `node:sqlite`) |
| HTTP | Express 4 |
| Views | EJS |
| Primary database | MongoDB via Mongoose 9 |
| Sessions | `express-session` with `connect-mongo` |
| SQL injection labs | One SQLite database per lab instance using `node:sqlite` |
| Development database | `mongodb-memory-server` when `MONGODB_URI` is empty and `NODE_ENV` is not `production` |
| Browser verification | `jsdom` in QA and in the stored-XSS moderator bot |

## Application startup

1. `config/index.js` loads `.env`, resolves secrets and validates production requirements.
2. `db/mongo.js` connects to MongoDB. Development starts an in-memory server if no URI is configured. Production throws when a URI is missing.
3. `db/seed.js` reconciles the canonical catalog in `data/labs.js` with the `challenges` collection. Seeding is idempotent and preserves each challenge's `flagVersion`.
4. If `BOOTSTRAP_ADMIN=true`, `services/bootstrapAdmin.js` creates or promotes the founder account using environment values. An existing password is preserved.
5. `server.js` builds the Express application and mounts middleware, labs, platform routes and admin routes in a deliberate order.

## Request lifecycle

```
trust proxy
security headers
static files
urlencoded + JSON body parsers
cookie parser
MongoDB-backed session
attachUser            -> loads the current user from the session
attachCsrf            -> creates and exposes a per-session CSRF token

/labs/<slug>          -> labGate -> deliberately vulnerable lab router
/                     -> platform routes (CSRF protected)
/admin                -> administrator routes (requireAdmin + CSRF protected)
/healthz              -> liveness and mounted-lab count
404 handler
error handler
```

### Why labs are mounted first

Lab targets must accept the exact requests their vulnerabilities require, including requests without platform CSRF tokens. Each lab router is therefore mounted before the platform router. It is still protected by `middleware/labGate.js`, which performs:

- Authentication and active-account checks.
- Publication and archival checks.
- Prerequisite enforcement for non-administrators.
- Resolution of the current user's active instance, creating one when necessary.
- Flag and proof helpers scoped to that exact instance.
- `Cache-Control: no-store` and `X-Robots-Tag: noindex`.

The slug is recovered from `req.baseUrl`, because Express removes the mount path from `req.path` inside a mounted router.

### Why platform CSRF does not apply to labs

Platform and admin routes call `verifyCsrf`. It rejects any mutating request without the per-session token, using either the `_csrf` form field or the `X-CSRF-Token` header. Lab routes intentionally have their own exploit semantics and are isolated from platform session state; changing that would break labs such as CSRF and clickjacking.

## Data model

| Model | Purpose |
| --- | --- |
| `User` | Account, password hash, role, status, points, XP, streak, profile preferences |
| `Challenge` | Catalog metadata, objectives, hints, mappings, publication state, `flagVersion` |
| `Solve` | One unique solve per user and challenge, with awarded points and solve time |
| `LabInstance` | Per-user, per-challenge instance key, state, status, expiry and reset count |
| `LabData` | Structured per-instance records used by API, IDOR and logic labs |
| `LabFile` | Per-instance uploaded file bytes and metadata |
| `LabComment` | Per-instance stored comments |
| `LabToken` | Per-instance one-time tokens such as password-reset links |
| `FlagSubmission` | Hash of every graded submission, verdict, instance, IP hash and user agent |
| `AuditLog` | Immutable administrative and security events |

The SQL injection labs add a separate SQLite database per `LabInstance`. `db/sqlLabDb.js` opens the database by `instanceKey`, seeds it with schema and data, and closes it when an instance is reset, stopped, archived or rotated. It is never shared between users.

## Instance lifecycle

```
ensureInstance(userId, challenge)
  -> reuse an active, unexpired instance
  -> or stop the oldest instance when the per-user limit is reached
  -> or create a new instance with a random 18-byte instanceKey

resetInstance(userId, challenge)
  -> stop all active instances for that user/challenge
  -> create a new instance with a new instanceKey and incremented resetCount

stopInstance(userId, challengeId)
  -> mark active instances stopped
```

`LabInstance.status` is one of `active`, `stopped`, `expired` or `completed`. Solving a challenge marks the instance `completed`; the next visit creates a fresh instance. Expired instances are marked `expired` by `ensureInstance`. Administrators can reset lab data without stopping instances, or rotate a lab's flag version, which stops every active instance for that challenge.

## Flag and proof model

Flags are **never persisted**. `services/flagService.js` derives them with HMAC-SHA256:

```
material = "zda-flag-v1" | userId | challengeId | slug | flagVersion | instanceKey | variant
flag     = "ZDS{" + normalised_slug + "_" + variant + "_" + hmac(material, 24) + "}"
```

This binds every flag to:

- the platform user;
- the exact challenge document (including its flag version);
- the active instance key;
- an optional variant for labs that expose multiple secrets.

Rotating an instance key, incrementing `flagVersion` or completing an instance invalidates the old value. No route exposes an expected flag or flag hash.

Browser-executed labs use a separate **proof token**, not the flag. The proof token is an HMAC over the user, challenge, instance key and purpose. It is intentionally exposed in a non-HttpOnly cookie so an XSS payload can send it to the lab collector. The collector validates the proof and then sets a server-side solved state. Only the status endpoint returns the actual flag, and only after that state is true.

## Submission pipeline

`services/progress.js` is the only platform path that grades flags:

1. Require an active instance or return `409`.
2. Enforce the per-user, per-challenge limit of 20 submissions in 5 minutes or return `429`.
3. Return `{ alreadySolved: true }` when a `Solve` already exists.
4. Reject a blank value with `400`.
5. Derive the expected flag for the active instance and compare it in constant time.
6. Store a `FlagSubmission` containing only a SHA-256 hash, verdict, instance, IP hash and user agent.
7. Append a `flag.submission` audit event.
8. On incorrect submissions, count failures in the last 10 minutes; ten or more return `429` and append `flag.bruteforce_suspected`.
9. On success, create the unique `Solve`, increment user points/XP, mark the instance `completed`, and append `flag.solved`.

## Administration panel

`routes/admin.js` requires an authenticated administrator and CSRF on every mutation.

| Page | Real data sources |
| --- | --- |
| `/admin` | User, Challenge, Solve, FlagSubmission, AuditLog, LabInstance aggregates |
| `/admin/users` | Live search, role/status filters and pagination |
| `/admin/users/:id` | Profile, solves, submissions, instances and account audit events |
| `/admin/labs` | Catalog, solve/active counts and mounted modules missing from the catalog |
| `/admin/submissions` | Paginated graded attempts with failure-burst and shared-hash indicators |
| `/admin/audit` | Paginated immutable events with severity and action filters |
| `/admin/analytics` | 14-day submission, solve and registration series |
| `/admin/health` | MongoDB state, collection counts, mounted labs, runtime and memory |

Safety rules enforced server-side:

- An administrator cannot change their own role through the role endpoint.
- An administrator cannot suspend their own account.
- The final active administrator cannot be demoted or suspended.
- Every administrative change is audited.
- Lab metadata edits never expose flags or solutions.
- Catalog reseeding restores canonical metadata while preserving `flagVersion`.
- Flag rotation increments `flagVersion`, deletes per-instance data, closes SQLite databases and stops active instances.

## QA architecture

`scripts/verify-all.js` runs the real application in one process:

- Configuration and secrets are generated before any application module loads.
- `MONGODB_URI` is empty, so `mongodb-memory-server` provides an isolated database.
- The app listens on `127.0.0.1` with an ephemeral port.
- A cookie-jar client respects paths, expiration, HttpOnly flags and `Set-Cookie` arrays.
- XSS payloads run in `jsdom` with a fetch bridge back to the real HTTP server.
- Blind SQL and NoSQL extraction use binary search; the time-based SQL lab measures real server-side `sleep()`.
- The 56 exploit functions are keyed by the exact catalog slugs and run in stable prerequisite order.
- Each flag is submitted through the real platform endpoint, followed by the lab reset route and platform stop.
- Failures are reported individually and make the process exit non-zero.
