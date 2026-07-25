
const express = require("express");
const router = express.Router();

function getState(req) {
  if (!req.session.csrfLab) {
    req.session.csrfLab = {
      victimEmail: "victim@zeroday-corp.test",
      hostedExploit: `<html>
  <body>
    <form action="/labs/csrf-email-change/change-email" method="POST">
      <input type="hidden" name="email" value="attacker@evil.test" />
    </form>
    <script>document.forms[0].submit()</script>
  </body>
</html>`
    };
  }
  return req.session.csrfLab;
}

router.get("/", (req, res) => {
  const state = getState(req);
  res.render("labs/csrf-email-change", { victimEmail: state.victimEmail, changed: false, flag: null });
});

router.post("/craft", (req, res) => {
  const state = getState(req);
  state.hostedExploit = req.body.html || state.hostedExploit;
  res.render("labs/csrf-email-change", { victimEmail: state.victimEmail, changed: false, flag: null });
});

router.get("/exploit", (req, res) => {
  const state = getState(req);
  res.set("Content-Type", "text/html");
  res.send(state.hostedExploit);
});

router.post("/change-email", (req, res) => {
  const state = getState(req);
  const newEmail = (req.body.email || "").trim();
  if (newEmail) state.victimEmail = newEmail;
  res.status(200).send("Email updated.");
});

router.post("/simulate-victim-visit", async (req, res) => {
  const state = getState(req);
  try {
    const r = await fetch(
      "http://127.0.0.1:" + (process.env.PORT || 3000) + "/labs/csrf-email-change/exploit",
      { headers: { Cookie: req.headers.cookie || "" } }
    );
    const html = await r.text();

    const formMatch = html.match(/<form[^>]*action="([^"]+)"[^>]*method="([^"]+)"[^>]*>([\s\S]*?)<\/form>/i);
    let triggered = false;
    if (formMatch && /submit\s*\(\s*\)/.test(html)) {
      const [, action, method, formBody] = formMatch;
      const inputs = [...formBody.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"[^>]*>/gi)];
      const params = new URLSearchParams();
      inputs.forEach(([, name, value]) => params.append(name, value));

      if (method.toUpperCase() === "POST" && action.includes("/change-email")) {
        const newEmail = params.get("email");
        if (newEmail) {
          state.victimEmail = newEmail;
          triggered = true;
        }
      }
    }

    const flag = state.victimEmail.includes("attacker") && triggered ? "ZDS{csrf_t0k3ns_ar3nt_0pt10nal}" : null;
    res.render("labs/csrf-email-change", { victimEmail: state.victimEmail, changed: triggered, flag });
  } catch (e) {
    res.render("labs/csrf-email-change", { victimEmail: state.victimEmail, changed: false, flag: null });
  }
});

router.post("/reset", (req, res) => {
  req.session.csrfLab = null;
  res.redirect("/labs/csrf-email-change");
});

module.exports = router;
