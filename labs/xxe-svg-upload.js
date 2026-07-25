
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const labDir = path.join(__dirname, "..", "db", "xxe-svg-fs");
if (!fs.existsSync(labDir)) fs.mkdirSync(labDir, { recursive: true });
const secretPath = path.join(labDir, ".htpasswd");
if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, "ZDS{xxe_v14_svg_upl04d_r34ds_l0c4l_f1l3s}\n");

function resolveSystemPath(uri) {
  if (uri.startsWith("file://")) return uri.replace("file://", "");
  return path.join(labDir, uri);
}

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
  res.render("labs/xxe-svg-upload", { svgInput: "", altText: null, error: null });
});

router.post("/", (req, res) => {
  const svg = req.body.svg || "";
  let altText = null, error = null;
  try {
    const resolved = vulnerableParse(svg);
    altText = extractTag(resolved, "title");
  } catch (e) {
    error = "Could not process your SVG.";
  }
  res.render("labs/xxe-svg-upload", { svgInput: svg, altText, error });
});

router.post("/reset", (req, res) => {
  
  res.redirect("/labs/xxe-svg-upload");
});

module.exports = router;
