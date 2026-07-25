
const express = require("express");
const router = express.Router();

const PRODUCTS = [
  { name: "Titanium Lockpick Set", price: "$89.00", category: "Tools" },
  { name: "RFID Signal Blocker Wallet", price: "$24.00", category: "Accessories" },
  { name: "Faraday Laptop Sleeve", price: "$59.00", category: "Accessories" },
  { name: "USB Data Blocker (2-pack)", price: "$12.00", category: "Adapters" },
  { name: "Hardware Security Key", price: "$45.00", category: "Auth" },
  { name: "Encrypted Flash Drive 64GB", price: "$38.00", category: "Storage" },
  { name: "Privacy Screen Protector 15\"", price: "$32.00", category: "Accessories" },
  { name: "Anti-Surveillance RF Detector", price: "$149.00", category: "Tools" }
];

router.get("/", (req, res) => {
  const q = req.query.q || "";
  const matches = q
    ? PRODUCTS.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))
    : PRODUCTS;

  res.cookie("_ga_sid", "ZDS{r3fl3ct3d_xss_1s_st1ll_ev3rywh3r3}", {
    httpOnly: false,
    sameSite: "lax",
    encode: (v) => v
  });

  res.cookie("_cf_bm", "xK9pL2mN7qR3sT5vW8yA1bC4dF6", { httpOnly: false, sameSite: "lax" });
  res.cookie("_ui_pref", "theme=dark&lang=en", { httpOnly: false, sameSite: "lax" });
  res.cookie("cart_count", "0", { httpOnly: false, sameSite: "lax" });

  res.render("labs/reflected-xss", { q, matches });
});

router.post("/reset", (req, res) => {
  
  res.redirect("/labs/reflected-xss");
});

module.exports = router;
