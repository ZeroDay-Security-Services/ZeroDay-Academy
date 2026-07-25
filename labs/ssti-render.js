
const express = require("express");
const router = express.Router();

const FLAG = "ZDS{ssti_turns_templat3s_1nto_c0de_ex3c}";

function vulnerableRender(userMessage) {
  const templateSource = `To: {{recipient}}\nMessage: ${userMessage}\n-- Sent via ZeroDay GreetingCards`;
  const recipient = "Friend";
  const withRecipient = templateSource.replace("{{recipient}}", recipient);
  
  const fn = new Function("flag", "return `" + withRecipient.replace(/`/g, "\\`") + "`;");
  return fn(() => FLAG);
}

router.get("/", (req, res) => {
  res.render("labs/ssti-render", { output: null, message: "", error: null });
});

router.post("/", (req, res) => {
  const message = req.body.message || "";
  let output = null, error = null;
  try {
    output = vulnerableRender(message);
  } catch (e) {
    error = "Could not render your greeting card.";
  }
  res.render("labs/ssti-render", { output, message, error });
});

router.post("/reset", (req, res) => {
  
  res.redirect("/labs/ssti-render");
});

module.exports = router;
