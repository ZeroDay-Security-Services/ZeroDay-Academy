// labs/xxe-profile-import.js
// VULNERABILITY: XML External Entity injection (CWE-611). The profile
// importer parses uploaded XML and resolves <!ENTITY ... SYSTEM "..."> to
// local file contents before substituting them into the document -- the
// same behavior a real vulnerable XML parser exhibits when DTD processing
// and external entities are left enabled.
//
// Implementation note: rather than pulling in a native libxml2 binding, this
// lab hand-rolls the minimal, intentionally-unsafe subset of entity
// resolution needed to teach the vulnerability -- it recognizes
// <!ENTITY name SYSTEM "file:///path"> declarations and substitutes &name;
// references with the referenced file's contents, with no restriction on
// path or scheme. That IS the vulnerability; it is not a general-purpose
// parser and should never be reused outside this lab.
const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const labDir = path.join(__dirname, "..", "db", "xxe-fs");
if (!fs.existsSync(labDir)) fs.mkdirSync(labDir, { recursive: true });
const secretPath = path.join(labDir, "secret.txt");
if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, "ZDS{xxe_ext3rnal_ent1t13s_r3ad_l0cal_f1l3s}\n");

function resolveSystemPath(uri) {
  if (uri.startsWith("file://")) {
    return uri.replace("file://", "");
  }
  return path.join(labDir, uri);
}

// --- VULNERABLE: parses <!ENTITY x SYSTEM "..."> and inlines file contents ---
function vulnerableParse(xml) {
  const entityDefs = {};
  const entityRegex = /<!ENTITY\s+(\w+)\s+SYSTEM\s+"([^"]+)"\s*>/g;
  let m;
  while ((m = entityRegex.exec(xml)) !== null) {
    const [, name, uri] = m;
    try {
      const filePath = resolveSystemPath(uri);
      entityDefs[name] = fs.readFileSync(filePath, "utf8");
    } catch (e) {
      entityDefs[name] = "[error resolving entity '" + name + "': " + e.message + "]";
    }
  }

  let resolved = xml;
  Object.entries(entityDefs).forEach(([name, value]) => {
    resolved = resolved.split("&" + name + ";").join(value);
  });
  return resolved;
}

function extractTag(xml, tag) {
  const m = xml.match(new RegExp("<" + tag + ">([\\s\\S]*?)</" + tag + ">"));
  return m ? m[1] : null;
}

function defaultSample() {
  return "<?xml version=\"1.0\"?>\n<profile>\n  <displayName>Alex</displayName>\n</profile>";
}

router.get("/", (req, res) => {
  res.render("labs/xxe-profile-import", { result: null, xmlInput: defaultSample(), error: null });
});

router.post("/", (req, res) => {
  const xml = req.body.xml || "";
  let error = null;
  let displayName = null, resolvedXml = null;

  try {
    resolvedXml = vulnerableParse(xml);
    displayName = extractTag(resolvedXml, "displayName");
  } catch (e) {
    error = e.message;
  }

  res.render("labs/xxe-profile-import", {
    result: { displayName, resolvedXml },
    xmlInput: xml,
    error
  });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/xxe-profile-import");
});

module.exports = router;
