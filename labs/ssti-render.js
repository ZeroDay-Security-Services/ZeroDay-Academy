// labs/ssti-render.js
// VULNERABILITY: Server-Side Template Injection (CWE-1336). The user's
// message becomes part of the *template source* itself, which is then
// compiled and executed as JS via `new Function`, instead of being passed
// in as inert *data*. This mirrors real-world SSTI where `render(userInput)`
// is called instead of `render(fixedTemplate, {data: userInput})`.
const express = require("express");
const router = express.Router();

const FLAG = "ZDS{ssti_turns_templat3s_1nto_c0de_ex3c}";

function vulnerableRender(userMessage) {
  const templateSource = `To: {{recipient}}\nMessage: ${userMessage}\n-- Sent via ZeroDay GreetingCards`;
  const recipient = "Friend";
  const withRecipient = templateSource.replace("{{recipient}}", recipient);
  // eslint-disable-next-line no-new-func
  // `flag` is passed in as a local binding available to the evaluated
  // template expression -- exactly the kind of in-scope helper a real
  // templating engine's render context often exposes.
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
    error = e.message;
  }
  res.render("labs/ssti-render", { output, message, error });
});


router.post("/reset", (req, res) => {
  
  res.redirect("/labs/ssti-render");
});

module.exports = router;
