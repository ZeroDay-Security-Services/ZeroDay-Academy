// labs/graphql-introspection.js
// VULNERABILITY: GraphQL introspection left enabled in production, exposing
// undocumented fields/queries an attacker can then call directly
// (CWE-200 / OWASP API9:2019). This is a lightweight, purpose-built
// endpoint that mimics real GraphQL introspection & query dispatch
// semantics closely enough to teach the vulnerability -- it is not the
// full GraphQL specification.
const express = require("express");
const router = express.Router();

const SCHEMA = {
  queryType: "Query",
  fields: [
    { name: "publicAnnouncements", type: "[String]", description: "Public announcements." },
    { name: "userProfile", type: "UserProfile", description: "Current user's profile." },
    { name: "internalDebugFlag", type: "String", description: "INTERNAL -- debug only, not linked from any client." }
  ]
};

router.get("/", (req, res) => {
  res.render("labs/graphql-introspection", { output: null });
});

router.post("/graphql", express.json(), (req, res) => {
  const query = (req.body.query || "").trim();

  if (query.includes("__schema")) {
    return res.json({ data: { __schema: SCHEMA } });
  }
  if (/internalDebugFlag/.test(query)) {
    return res.json({ data: { internalDebugFlag: "ZDS{gr4phql_1ntr0sp3ct10n_l34ks_h1dd3n_f13lds}" } });
  }
  if (/publicAnnouncements/.test(query)) {
    return res.json({ data: { publicAnnouncements: ["Scheduled maintenance Friday 10pm UTC."] } });
  }
  res.json({ errors: [{ message: "Cannot query field -- unknown query." }] });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/graphql-introspection");
});

module.exports = router;
