
const express = require("express");
const router = express.Router();

const FLAG = "ZDS{__proto__pollut10n_p01s0ns_ev3ry_0bj3ct}";

function getSandboxProto(req) {
  if (!req.session.ppSandboxProto) {
    req.session.ppSandboxProto = {};
  }
  return req.session.ppSandboxProto;
}

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
  res.render("labs/prototype-pollution", { saved: false, isAdminNow: freshObject.isAdmin === true, error: null, flag: null });
});

router.post("/merge", (req, res) => {
  const sandboxProto = getSandboxProto(req);
  let error = null;
  try {
    const payload = JSON.parse(req.body.json || "{}");
    const preferences = Object.assign(Object.create(sandboxProto), { theme: "dark", locale: "en-US" });
    unsafeMerge(preferences, payload);
  } catch (e) {
    error = "Could not save preferences. Check your input.";
  }

  const freshObject = Object.create(sandboxProto);
  const isAdminNow = freshObject.isAdmin === true;
  const flag = isAdminNow ? FLAG : null;

  res.render("labs/prototype-pollution", { saved: !error, isAdminNow, error, flag });
});

router.post("/reset", (req, res) => {
  req.session.ppSandboxProto = {};
  res.redirect("/labs/prototype-pollution");
});

module.exports = router;
