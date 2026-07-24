# ZeroDay Academy
### A web vulnerability training platform by ZeroDay Security Services

**56 real, exploitable vulnerability labs** across 14 attack domains — built like PortSwigger Academy, DVWA, and OWASP Juice Shop but running on MongoDB Atlas (Mongoose) + Express + EJS, deployable to Render or Vercel in minutes.

---

## ⚠️ Security Warning

Every lab under `/labs/*` is **intentionally vulnerable**. Do not deploy this without network isolation. Never reuse patterns from the lab routers in real applications.

---

## Quick Start

```bash
# 1. Clone / unzip the project
npm install

# 2. Copy the env template and fill in your Atlas connection string
cp .env.example .env
# Edit MONGODB_URI with your Atlas string

# 3. Seed the challenge catalog into Atlas
npm run seed

# 4. Start the platform
npm start        # http://localhost:3000
```

**Node 18+ required** (uses global `fetch`, `AbortSignal.timeout`).

---

## Deploy to Render

1. Push to GitHub.
2. New Web Service → connect repo → Build: `npm install`, Start: `node server.js`.
3. Add env vars: `MONGODB_URI`, `SESSION_SECRET`, `NODE_ENV=production`.
4. Done — Render's free tier handles it.

## Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
# Set MONGODB_URI and SESSION_SECRET in the Vercel dashboard
```

---

## Lab Catalog (56 labs across 14 domains)

| # | Domain | Count | Difficulties |
|---|--------|-------|-------------|
| 1 | SQL Injection | 4 | Easy → Insane |
| 2 | Cross-Site Scripting | 5 | Easy → Hard |
| 3 | Broken Access Control | 6 | Easy → Medium |
| 4 | CSRF | 2 | Easy → Medium |
| 5 | Command Injection | 1 | Medium |
| 6 | SSRF | 3 | Hard |
| 7 | XXE | 3 | Hard → Insane |
| 8 | SSTI | 1 | Hard |
| 9 | Insecure Deserialization | 1 | Hard |
| 10 | Authentication | 6 | Easy → Insane |
| 11 | NoSQL Injection | 4 | Medium → Insane |
| 12 | Prototype Pollution | 1 | Insane |
| 13 | API Security | 4 | Easy → Medium |
| 14 | Business Logic | 4 | Easy → Insane |
| 15 | File Upload | 3 | Medium → Hard |
| 16 | Information Disclosure | 4 | Easy → Medium |
| 17 | CORS & Headers | 4 | Medium → Insane |

**Difficulty tiers:** Easy · Medium · Hard · Insane

---

## Architecture

```
server.js                  entrypoint, MongoDB session store, mounts all routers
routes/platform.js         auth, dashboard, challenges, leaderboard, profile, company
middleware/auth.js         session guard + currentUser injection
db/mongo.js               MongoDB Atlas connection (Mongoose)
db/seed.js                 challenge catalog seed (56 entries, idempotent)
db/sqlLabDb.js             dedicated embedded SQLite for SQL injection labs
models/                    Mongoose schemas: User, Challenge, Solve, LabComment,
                           LabInvoice, LabAccount, LabRecord, LabFile, LabToken,
                           LabCoupon
labs/index.js             registers all 56 lab routers
labs/<slug>.js            one isolated, deliberately vulnerable Express router per lab
views/                    EJS templates
  partials/               shared head, nav, footer
  labs/_top.ejs           shared lab topbar partial (theme-aware)
  labs/_bottom.ejs        shared lab footer with Prev/Next/Restart nav bar
  labs/<slug>.ejs         per-lab view
public/css/main.css       glassmorphism platform design system
public/css/lab.css        17-theme vulnerable-target styling
public/img/logo.png       ZeroDay Security Services logo
vercel.json               Vercel deployment config
render.yaml               Render deployment config
```

---

## Features

- **Glassmorphism UI** — dark frosted glass aesthetic with 17 distinct color themes per vulnerability domain
- **Per-lab navigation** — Prev / Next / Restart bar in every lab, opens challenges in a new tab
- **AJAX flag submission** — no page reload; points counter updates live in the nav bar
- **Session-scoped lab state** — stored-XSS bot tokens, CSRF exploit pages, race conditions etc. are per-user via MongoDB-backed sessions (no shared global state bugs)
- **5-tier difficulty** — Easy / Medium / Hard / Insane, with point values 100–500
- **Domain filter chips** on the challenges page
- **Leaderboard** with real-time scoring
- **User profile** with bio, solve history, and category progress bars
- **Fully responsive** — mobile, tablet, and desktop breakpoints

---

## Adding a Lab

1. Create `labs/<slug>.js` (add a `POST /reset` route — required for the Restart button).
2. Create `views/labs/<slug>.ejs` (use `_top` / `_bottom` partials).
3. Add the slug to the `module.exports` array in `labs/index.js`.
4. Add an entry to the `challenges` array in `db/seed.js` and re-run `npm run seed`.

---

Built for **ZeroDay Security Services** — Siliguri, West Bengal, India.
