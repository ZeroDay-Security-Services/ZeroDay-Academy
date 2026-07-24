// labs/prototype-pollution.js
// VULNERABILITY: Prototype Pollution (CWE-1321). The "merge preferences"
// endpoint recursively assigns every key from user JSON -- including
// `__proto__` -- into a plain object with no key filtering. Because plain
// objects inherit from their prototype by default, polluting that
// prototype affects every object that inherits from it.
//
// BUG FIX: this used to pollute the REAL, process-wide Object.prototype.
// On a shared multi-user server that meant (a) one player solving it
// instantly "solved" it for every other visitor with zero exploitation on
// their part, and (b) it could destabilize the whole Node process for
// everyone. The exploit mechanics are now identical (a real recursive
// merge that really does reach `__proto__` and really does mutate the
// prototype chain) but it targets a per-session sandbox "prototype"
// object instead of Node's actual global one -- so it's real prototype
// pollution, fully contained to your own session.
const express = require("express");
const router = express.Router();

const FLAG = "ZDS{__proto__pollut10n_p01s0ns_ev3ry_0bj3ct}";

function getSandboxProto(req) {
  if (!req.session.ppSandboxProto) {
    req.session.ppSandboxProto = {};
  }
  return req.session.ppSandboxProto;
}

// --- VULNERABLE: naive recursive merge with no denylist for
// __proto__ / constructor / prototype keys. When `key` is literally
// "__proto__", `target[key]` on a plain object resolves to (and mutates)
// whatever object is currently in that object's prototype chain. ---
function unsafeMerge(target, source) {
  for (const key in source) {
    if (typeof source[key] === "object" && source[key] !== null && !Array.isArray(source[key])) {
      if (typeof target[key] !== "object" || target[key] === null) target[key] = {};
      unsafeMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

router.get("/", (req, res) => {
  const sandboxProto = getSandboxProto(req);
  const freshObject = Object.create(sandboxProto);
  res.render("labs/prototype-pollution", { mergeResult: null, isAdminNow: freshObject.isAdmin === true, error: null, flag: null });
});

router.post("/merge", (req, res) => {
  const sandboxProto = getSandboxProto(req);
  let mergeResult = null, error = null;
  try {
    const payload = JSON.parse(req.body.json || "{}");
    // The object we merge INTO inherits from our per-session sandbox
    // "prototype" -- exactly mirroring how a plain {} inherits from
    // Object.prototype in real Node.
    const preferences = Object.assign(Object.create(sandboxProto), { theme: "dark", locale: "en-US" });
    mergeResult = unsafeMerge(preferences, payload);
  } catch (e) {
    error = "Invalid JSON: " + e.message;
  }

  const freshObject = Object.create(sandboxProto);
  const isAdminNow = freshObject.isAdmin === true;
  const flag = isAdminNow ? FLAG : null;

  res.render("labs/prototype-pollution", { mergeResult, isAdminNow, error, flag });
});

router.post("/reset", (req, res) => {
  req.session.ppSandboxProto = {};
  res.redirect("/labs/prototype-pollution");
});

module.exports = router;
