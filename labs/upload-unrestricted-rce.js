
const express = require("express");
const LabFile = require("../models/LabFile");
const router = express.Router();

router.get("/", async (req, res) => {
  const files = await LabFile.find({ labSlug: "upload-unrestricted-rce" }).sort({ createdAt: -1 }).lean();
  res.render("labs/upload-unrestricted-rce", { files, output: null });
});

router.post("/upload", express.text({ type: "*/*", limit: "50kb" }), async (req, res) => {
  const filename = (req.query.filename || "widget.js").replace(/[^a-zA-Z0-9._-]/g, "_");
  await LabFile.create({ labSlug: "upload-unrestricted-rce", filename, contentType: "text/plain", content: req.body || "" });
  res.redirect("/labs/upload-unrestricted-rce");
});

router.post("/run/:id", async (req, res) => {
  const file = await LabFile.findById(req.params.id).lean();
  if (!file) return res.status(404).json({ error: "not found" });
  let output = null, flag = null;
  try {
    const fn = new Function("reportFlag", file.content);
    fn((value) => { flag = value === "confirm" ? "ZDS{unr3str1ct3d_upl04d_1s_r34l_c0d3_3x3c}" : null; });
    output = "Executed without error.";
  } catch (e) {
    output = "Execution error: " + e.message;
  }
  res.json({ output, flag });
});

router.post("/reset", (req, res) => {
  
  res.redirect("/labs/upload-unrestricted-rce");
});

module.exports = router;
