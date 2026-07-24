// labs/xxe-svg-upload.js
// VULNERABILITY: XXE via SVG upload (CWE-611). SVG is XML. The "avatar
// processor" extracts a <title> for the alt-text using the same
// unsafe entity-resolving approach as the profile importer -- so an
// uploaded SVG with a SYSTEM entity reads local files, and the resolved
// title is reflected straight back.
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const labDir = path.join(__dirname, "..", "db", "xxe-svg-fs");
if (!fs.existsSync(labDir)) fs.mkdirSync(labDir, { recursive: true });
const secretPath = path.join(labDir, "flag.txt");
if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, "ZDS{xxe_v14_svg_upl04d_r34ds_l0c4l_f1l3s}\n");

function resolveSystemPath(uri) {
  if (uri.startsWith("file://")) return uri.replace("file://", "");
  return path.join(labDir, uri);
}

// --- VULNERABLE: same unsafe entity resolution as the profile importer,
// now reachable through an "SVG avatar" upload flow. ---
function vulnerableParse(xml) {
  const entityDefs = {};
  const entityRegex = /<!ENTITY\s+(\w+)\s+SYSTEM\s+"([^"]+)"\s*>/g;
  let m;
  while ((m = entityRegex.exec(xml)) !== null) {
    const [, name, uri] = m;
    try {
      entityDefs[name] = fs.readFileSync(resolveSystemPath(uri), "utf8");
    } catch (e) {
      entityDefs[name] = "[error: " + e.message + "]";
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

router.get("/", (req, res) => {
  res.render("labs/xxe-svg-upload", { svgInput: defaultSvg(), altText: null, error: null });
});

router.post("/", (req, res) => {
  const svg = req.body.svg || "";
  let altText = null, error = null;
  try {
    const resolved = vulnerableParse(svg);
    altText = extractTag(resolved, "title");
  } catch (e) {
    error = e.message;
  }
  res.render("labs/xxe-svg-upload", { svgInput: svg, altText, error });
});

function defaultSvg() {
  return `<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg">\n  <title>My Avatar</title>\n</svg>`;
}


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/xxe-svg-upload");
});

module.exports = router;
