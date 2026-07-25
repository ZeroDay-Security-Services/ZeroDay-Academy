
const express = require("express");
const db = require("../db/sqlLabDb");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("labs/sqli-union", { category: "", results: null, error: null });
});

router.post("/", (req, res) => {
  const category = req.body.category || "";
  
  const sql = `SELECT name, category, price FROM sqli_products WHERE category = '${category}' AND released = 1`;
  let results = [], error = null;
  try {
    results = db.prepare(sql).all();
  } catch (e) {
    error = "No products found for that category.";
  }
  res.render("labs/sqli-union", { category, results, error });
});

router.post("/reset", (req, res) => {
  
  res.redirect("/labs/sqli-union");
});

module.exports = router;
