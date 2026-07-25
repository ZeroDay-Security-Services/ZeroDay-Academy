
const express = require("express");
const LabFile = require("../models/LabFile");
const router = express.Router();

router.get("/", async (req, res) => {
  
  res.cookie("_ga_uid", "ZDS{svg_upl04ds_ar3_x_ss_1n_d1sgu1s3}", { httpOnly: false, sameSite: "lax", encode: (v) => v });
  
  res.cookie("_cf_bm", "mN3pQ7rS1tU5vW9xY2aB4cD6", { httpOnly: false, sameSite: "lax" });
  res.cookie("_ui_pref", "grid-view", { httpOnly: false, sameSite: "lax" });
  const files = await LabFile.find({ labSlug: "svg-upload-xss" }).sort({ createdAt: -1 }).lean();
  res.render("labs/svg-upload-xss", { files, uploaded: false });
});

router.post("/upload", express.text({ type: "*/*", limit: "200kb" }), async (req, res) => {
  const filename = (req.query.filename || "upload.svg").replace(/[^a-zA-Z0-9._-]/g, "_");
  
  await LabFile.create({ labSlug: "svg-upload-xss", filename, contentType: "image/svg+xml", content: req.body || "" });
  const files = await LabFile.find({ labSlug: "svg-upload-xss" }).sort({ createdAt: -1 }).lean();
  res.render("labs/svg-upload-xss", { files, uploaded: true });
});

router.get("/raw/:id", async (req, res) => {
  const file = await LabFile.findById(req.params.id).lean();
  if (!file) return res.status(404).send("Not found");
  res.set("Content-Type", file.contentType);
  res.send(file.content);
});

router.post("/reset", (req, res) => {
  
  res.redirect("/labs/svg-upload-xss");
});

module.exports = router;
