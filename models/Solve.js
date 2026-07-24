// models/Solve.js
const { mongoose } = require("../db/mongo");

const solveSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: "Challenge", required: true },
  solvedAt: { type: Date, default: Date.now }
});

solveSchema.index({ userId: 1, challengeId: 1 }, { unique: true });

module.exports = mongoose.models.Solve || mongoose.model("Solve", solveSchema);
