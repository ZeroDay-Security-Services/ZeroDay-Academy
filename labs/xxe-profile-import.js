
const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const labDir = path.join(__dirname, "..", "db", "xxe-fs");
if (!fs.existsSync(labDir)) fs.mkdirSync(labDir, { recursive: true });
const secretPath = path.join(labDir, "config.yml");
if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, "ZDS{xxe_ext3rnal_ent1t13s_r3ad_l0cal_f1l3s}\n");

function resolveSystemPath(uri) {
  if (uri.startsWith("file://")) {
    return uri.replace("file://", "");
  }
  return path.join(labDir, uri);
}

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
  res.render("labs/xxe-profile-import", { profileData: null, error: null });
});

router.post("/", (req, res) => {
  const xml = req.body.xml || "";
  let error = null;
  let profileData = null;

  try {
    const resolvedXml = vulnerableParse(xml);
    const displayName = extractTag(resolvedXml, "displayName");
    const email = extractTag(resolvedXml, "email");
    const bio = extractTag(resolvedXml, "bio");
    profileData = {};
    if (displayName) profileData.displayName = displayName;
    if (email) profileData.email = email;
    if (bio) profileData.bio = bio;
    if (Object.keys(profileData).length === 0) profileData = null;
  } catch (e) {
    error = "Could not process your XML.";
  }

  res.render("labs/xxe-profile-import", { profileData, error });
});

router.post("/reset", (req, res) => {
  
  res.redirect("/labs/xxe-profile-import");
});

module.exports = router;
