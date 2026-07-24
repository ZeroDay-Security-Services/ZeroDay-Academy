// models/Challenge.js
const { mongoose } = require("../db/mongo");

const challengeSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  domain: { type: String, required: true }, // broad grouping e.g. "Injection", "Client-Side", "API Security"
  owaspRef: { type: String, required: true },
  difficulty: { type: String, required: true, enum: ["Easy", "Medium", "Hard", "Insane", "Impossible"] },
  points: { type: Number, required: true },
  summary: { type: String, required: true },
  briefing: { type: String, required: true },
  flagHash: { type: String, required: true },
  labPath: { type: String, required: true },
  hint: { type: String, default: "" },
  color: { type: String, default: "blue" }, // theme accent for the lab UI
  orderIndex: { type: Number, default: 0 }
});

module.exports = mongoose.models.Challenge || mongoose.model("Challenge", challengeSchema);
