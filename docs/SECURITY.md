# Security Model

ZeroDay Academy contains intentionally vulnerable code and must be deployed only in a controlled training environment. This document separates the **deliberate lab weaknesses** from the **controls that protect the platform itself**.

## Threat model

| Asset | Protection goal |
| --- | --- |
| User accounts and sessions | Confidentiality and integrity; no cross-user access |
| Flags | Bound to user, challenge, flag version and instance; never stored or disclosed before exploitation |
| Lab state, files, comments and tokens | Isolated per user and per lab instance |
| Administrative functions | Founder-only RBAC, CSRF protection, immutable auditing |
| Founder bootstrap | Idempotent, environment-driven, no default or committed password |
| Audit trail | Append-only application events with actor, action, target and hashed IP |
| SQL injection lab data | One SQLite database per instance; closed and rebuilt on reset/rotation |

The platform assumes that users are untrusted and that every lab request is hostile. Lab bugs are contained so they cannot cross into another user's instance or the platform's administrative data.

## Platform controls

### Authentication and sessions

- Passwords are hashed with bcrypt (cost 12).
- Login and registration use dedicated rate limiters.
- Successful login and registration regenerate the session ID.
- Logout destroys the session and clears the cookie.
- Suspended accounts cannot authenticate or browse platform pages.
- Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Sessions are stored in MongoDB with an eight-hour lifetime.

### CSRF

- `attachCsrf` creates a random per-session token and exposes it to views.
- `verifyCsrf` protects every mutating platform and admin route.
- A missing or invalid token returns `403`, never a silent success.
- Lab routes are intentionally excluded because their exploit contracts require cross-site and token-free requests. Labs are isolated from platform state.

### Authorization

- `requireAuth` protects student routes.
- `requireAdmin` checks the database-backed role on every admin request.
- The final active administrator cannot be demoted, suspended or self-demoted.
- An administrator cannot change their own role or suspend themselves through the admin endpoints.
- Users cannot access hidden or archived labs; administrators can review them.
- Prerequisites are enforced in `labGate` as well as in the platform start route, so direct lab URLs cannot bypass progression.

### Flag protection

- Flags are derived with HMAC-SHA256 and are never stored in MongoDB or the catalog.
- Flag material includes the user ID, challenge document ID, slug, `flagVersion`, instance key and variant.
- Expected flags and flag hashes are never returned by any route.
- Blank submissions return `400`; submissions without an active instance return `409`; already-solved challenges do not leak the expected value.
- The submission path is rate-limited to 20 attempts per user per challenge in 5 minutes.
- Ten failures in 10 minutes trigger a `flag.bruteforce_suspected` audit event and a `429` response.
- Every graded attempt stores only a SHA-256 hash, verdict, instance, IP hash and user agent.
- Flag rotation increments `flagVersion`, stops active instances, deletes their relational data and closes their SQLite databases.

### Browser-proof labs

Reflected, DOM, stored and upload XSS labs issue a non-HttpOnly proof cookie. A successful exploit must send that token to the lab's collector. The collector validates:

```
HMAC(FLAG_SECRET, "zda-proof-v1" | userId | challengeId | instanceKey | purpose)
```

Only then is the lab-specific server-side solved state set. The status endpoint returns the flag after that state is true. Submitting the proof token as a flag does not work.

### Isolation

- Lab state lives in `LabInstance.state`, keyed by the instance document.
- Files, comments, tokens, structured data and SQLite databases are keyed by `instanceId` or `instanceKey`.
- The SQL labs use separate SQLite databases, seeded with the instance's derived flag. They never share tables across users.
- SSRF and command execution labs are simulations. They do not make arbitrary outbound requests or execute arbitrary operating-system commands.
- Prototype pollution is confined to the per-instance state object; it cannot modify the platform's prototypes.
- Uploaded files are stored in MongoDB per instance; no executable lab file is written into the application tree.
- The stored-XSS moderator bot runs in an isolated `jsdom` with a fetch bridge restricted to the lab origin.

### Audit trail

`AuditLog` records authentication events, lab starts/resets/stops, hint reveals, flag submissions, solves, brute-force detection, profile changes, bootstrap actions, administrative user changes, lab metadata changes, reseeds, visibility/archive changes, data resets and flag rotations.

Audit metadata never contains a plaintext flag or password. IP addresses are stored as HMAC-derived hashes. The admin audit page reports the exact filtered count, and QA verifies that each graded submission produces one immutable event.

### Founder bootstrap

`services/bootstrapAdmin.js` is shared by the CLI and the optional startup hook.

- Email and username are validated.
- The password must be at least 12 characters and is read only from the environment.
- The plaintext password is never logged, written to a tracked file or stored anywhere except as a bcrypt hash.
- Re-running the bootstrap promotes or repairs the account and leaves the existing password intact.
- A password is replaced only when `--reset-password` is supplied.
- The operation appends `admin.bootstrap_created`, `admin.bootstrap_promoted` or `admin.bootstrap_password_reset` to the audit log.

`BOOTSTRAP_ADMIN=true` is intended for controlled provisioning or CI. Remove `ADMIN_PASSWORD` (and preferably the bootstrap flag) after provisioning when the platform permits.

### Production guards

`config/index.js` refuses to load in production without:

- `MONGODB_URI`
- `SESSION_SECRET` (at least 16 characters)
- `FLAG_SECRET` (at least 16 characters)

The in-memory MongoDB fallback is disabled in production. The health endpoint exposes only liveness and the mounted lab count; the detailed admin health page is administrator-only.

### Security headers

Platform pages receive:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 0`
- `Permissions-Policy`
- A strict `Content-Security-Policy` with `frame-ancestors 'none'`
- HSTS in production

Lab pages intentionally omit frame and CSP restrictions so clickjacking, XSS and related labs work. This exemption is scoped to `/labs/*` and is documented as intentional.

## Deliberate lab weaknesses

The following weaknesses are intentional and confined to lab routers:

- String-built SQL, blind boolean and time-based SQL injection.
- Reflected, DOM-based, stored, filter-bypass and SVG/upload XSS.
- IDOR, horizontal and vertical privilege escalation, mass assignment.
- CSRF in state-changing and GET-based forms.
- Command injection simulation.
- SSRF against simulated metadata, internal webhooks and PDF renderers.
- XXE in profile import, SVG upload and out-of-band exfiltration.
- SSTI evaluation in a constrained template renderer.
- Insecure deserialization of a lab-only preference cookie.
- JWT `alg=none` and weak-secret acceptance.
- Broken password reset and account enumeration through timing.
- No-rate-limit PIN brute force against a per-instance PIN.
- NoSQL operator injection, search injection, regex extraction and login bypass.
- Prototype pollution inside per-instance state.
- Excessive data exposure, BOLA and API mass assignment.
- Business-logic coupon races, negative quantities, price tampering and workflow skipping.
- Unrestricted upload, content-type bypass, path traversal and widget execution.
- Verbose errors, exposed `.env`, backup files and source maps.
- Wildcard credentialed CORS, missing frame protection, CRLF header injection and host-header poisoning.

These weaknesses must never be copied into platform middleware, authentication, session handling, admin routes or infrastructure.

## Deployment checklist

1. Deploy behind TLS.
2. Set `NODE_ENV=production`.
3. Set a dedicated MongoDB deployment and a least-privilege database user.
4. Generate independent random `SESSION_SECRET` and `FLAG_SECRET` values; never reuse them.
5. Provision the founder with `ADMIN_PASSWORD` and `npm run create-admin`, or use `BOOTSTRAP_ADMIN=true` once.
6. Remove the bootstrap password and flag after provisioning when possible.
7. Restrict network access to the training audience. Do not expose the lab host to the public internet.
8. Back up MongoDB and monitor the audit log.
9. Run `npm run qa` against a disposable database before each release.
10. Keep `ViperRange/`, `.env`, `.dev-secrets.json`, SQLite files and generated artifacts out of source control.

## Verification

`npm run qa` verifies the controls above with real requests. It checks CSRF rejection, authentication, session regeneration, login/registration limits, RBAC, self-demotion and final-admin protection, submission limits, failure thresholds, shared-hash detection, audit correlation, visibility/archive enforcement, flag rotation, admin data resets, production configuration refusal and all 56 lab exploits. See [QA_REPORT.md](QA_REPORT.md) for the latest run.
