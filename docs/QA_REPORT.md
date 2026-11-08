# QA Report — ZeroDay Academy v2.0.0

## Run summary

| Field | Value |
| --- | --- |
| Date | 2026-11-09 |
| Command | `npm run qa` (`scripts/verify-all.js`) |
| Runtime | Node.js v24.18.0 on Windows (win32) |
| Database | Isolated in-process `mongodb-memory-server` (no Atlas connection) |
| HTTP target | Real Express application on `127.0.0.1` with an ephemeral port |
| Run ID | `f7f27c6d` |
| Duration | 166.8 seconds |
| Platform checks | **39 passed, 0 failed** |
| Lab traversal | **56 passed, 0 failed, 0 blocked** |
| Exit code | `0` |

The harness started a fresh copy of the real application, generated unique secrets and a founder password for the run, registered real users and exploited every lab over real HTTP. Every recovered flag was submitted through the production grading endpoint, followed by the lab reset route and the platform stop route.

## What was verified

### Platform and security checks (39/39)

- Health endpoint, security headers, catalog metadata and static flag hygiene across all 56 labs.
- CSRF rejection for mutating requests, session ID regeneration on registration, login and logout, duplicate-account and password-policy validation.
- Registration and login rate limits.
- Founder startup bootstrap, administrator authorization, RBAC denial for normal users, and CSRF protection on admin mutations.
- Founder self-demotion/self-suspension prevention and final-administrator protection.
- Account suspension, reactivation and administrator user-detail/search pages.
- Flag submission validation: blank flag, wrong flag, submission without an instance, ten-failure threshold, 20-per-5-minute per-challenge cap, per-challenge isolation and shared-hash replay detection.
- Administrator submission telemetry (failure bursts and shared flag hashes) and audit/submission count correlation (92 graded submissions at the final check).
- Lab metadata editing, invalid-input rejection, catalog reseed preserving `flagVersion`, visibility and archive enforcement, and instance shutdown on archive.
- Re-registration of a mounted lab module missing from the catalog.
- Administrator flag rotation: old flag rejected, new flag derived, old instance stopped.
- All eight administrator pages rendered live data; public health endpoint retained all 56 mounted labs.
- Lab authentication and prerequisite enforcement for anonymous users and normal users; administrator exemption.
- Unknown challenge, lab, start, submit and generic route handling (404).
- Hint endpoint reveals catalog hints in order, one at a time, and caps at the final hint.
- Explorer search, level, domain and status filters plus the ordered catalog API (56 entries).
- Full topological lab traversal: each lab root returned 200 and exposed no flag before exploitation; each exploit recovered a user/instance-bound flag with the expected prefix; each flag graded successfully for positive points; each lab reset and instance stop returned the expected redirect.
- Post-traversal progress: 56 unique solves, 12,550 points, dashboard `56/56`, Elite/Polyglot accomplishments, leaderboard and profile consistency.
- Administrator lab-data reset cleared instance state without stopping the instance; platform instance reset rotated the flag and rejected the old value.
- Profile bio and preference persistence, wrong-current-password rejection, password rotation, old-password rejection and new-password login.
- Bootstrap CLI idempotency (existing password preserved), missing-password refusal, explicit `--reset-password` rotation, and audit events.
- Startup bootstrap does not reset an existing password.
- Production startup refuses to load without `MONGODB_URI`, `SESSION_SECRET` and `FLAG_SECRET`.

### Lab traversal (56/56)

Every lab below was launched, exploited through its intended vulnerability, graded, reset and stopped. No labs were skipped or blocked.

**SQL Injection** (4)

- `sqli-login` — PASS
- `sqli-union` — PASS
- `sqli-blind-boolean` — PASS
- `sqli-time-blind` — PASS

**Cross-Site Scripting** (5)

- `reflected-xss` — PASS
- `dom-xss-hash` — PASS
- `xss-filter-bypass` — PASS
- `stored-xss` — PASS
- `svg-upload-xss` — PASS

**Broken Access Control** (6)

- `idor-invoices` — PASS
- `horizontal-privesc` — PASS
- `forced-browse-admin` — PASS
- `vertical-privesc` — PASS
- `mass-assignment-role` — PASS
- `file-access-idor` — PASS

**CSRF** (2)

- `csrf-email-change` — PASS
- `csrf-get-based` — PASS

**Command Injection** (1)

- `cmd-injection` — PASS

**SSRF** (3)

- `ssrf-metadata` — PASS
- `ssrf-webhook` — PASS
- `ssrf-pdf-generator` — PASS

**XXE** (3)

- `xxe-profile-import` — PASS
- `xxe-svg-upload` — PASS
- `xxe-oob-exfil` — PASS

**Server-Side Template Injection** (1)

- `ssti-render` — PASS

**Insecure Deserialization** (1)

- `insecure-deserialization` — PASS

**Authentication** (6)

- `jwt-alg-none` — PASS
- `jwt-weak-secret` — PASS
- `broken-password-reset` — PASS
- `account-enum-timing` — PASS
- `no-rate-limit-bruteforce` — PASS
- `two-factor-bypass` — PASS

**NoSQL Injection** (4)

- `nosql-login-bypass` — PASS
- `nosql-search-injection` — PASS
- `nosql-regex-extraction` — PASS
- `nosql-expr-injection` — PASS

**Prototype Pollution** (1)

- `prototype-pollution` — PASS

**API Security** (4)

- `api-excessive-data` — PASS
- `api-bola` — PASS
- `api-mass-assignment` — PASS
- `graphql-introspection` — PASS

**Business Logic** (4)

- `logic-negative-quantity` — PASS
- `logic-price-tampering` — PASS
- `logic-workflow-skip` — PASS
- `logic-coupon-race` — PASS

**File Upload** (3)

- `upload-content-type-bypass` — PASS
- `upload-path-traversal` — PASS
- `upload-unrestricted-rce` — PASS

**Information Disclosure** (4)

- `disclosure-verbose-errors` — PASS
- `disclosure-env-file` — PASS
- `disclosure-backup-file` — PASS
- `disclosure-source-map` — PASS

**CORS & Security Headers** (4)

- `cors-wildcard-credentials` — PASS
- `clickjacking-missing-xfo` — PASS
- `crlf-header-injection` — PASS
- `host-header-poisoning` — PASS

## Test environment notes

- The run used `NODE_ENV=test`, an empty `MONGODB_URI` and a generated `SESSION_SECRET`, `FLAG_SECRET` and founder password. No real secrets or production database were used.
- The database was an isolated in-process MongoDB instance that was destroyed when the run exited.
- Browser-executed XSS proofs (reflected, DOM, filter bypass, stored and upload XSS) ran in `jsdom` with a fetch bridge restricted to the QA origin. The stored-XSS moderator bot also runs in an isolated `jsdom`.
- SSRF, command injection, SSTI and deserialization labs are intentionally isolated simulations: they exercise the vulnerable application logic without granting arbitrary outbound network access or operating-system command execution.
- The run does not test a live Render/Vercel deployment, external MongoDB Atlas connectivity, TLS termination, or load/performance characteristics.

## Honest result

All 56 labs and all 39 platform checks passed in this run. There are **no verified failures and no blocked labs**. The QA harness exits non-zero on any failure; this run exited `0`.

