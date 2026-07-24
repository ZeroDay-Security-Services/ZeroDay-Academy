// routes/platform.js
const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const Challenge = require("../models/Challenge");
const Solve = require("../models/Solve");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function flagHash(flag) {
  return crypto.createHash("sha256").update(flag.trim()).digest("hex");
}

// ---------- Home ----------
router.get("/", async (req, res) => {
  const [challengeCount, userCount, solveCount] = await Promise.all([
    Challenge.countDocuments(),
    User.countDocuments(),
    Solve.countDocuments()
  ]);
  const domains = await Challenge.distinct("domain");
  res.render("home", { title: "ZeroDay Academy", stats: { challengeCount, userCount, solveCount, domainCount: domains.length } });
});

// ---------- Auth ----------
router.get("/register", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.render("register", { title: "Create Account", error: null });
});

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password || password.length < 8) {
    return res.status(400).render("register", { title: "Create Account", error: "All fields are required and password must be at least 8 characters." });
  }
  try {
    const existing = await User.findOne({ $or: [{ username: username.trim() }, { email: email.trim().toLowerCase() }] });
    if (existing) {
      return res.status(400).render("register", { title: "Create Account", error: "That username or email is already taken." });
    }
    const passwordHash = bcrypt.hashSync(password, 12);
    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      avatarSeed: crypto.randomBytes(4).toString("hex")
    });
    req.session.userId = user._id.toString();
    res.redirect("/dashboard");
  } catch (e) {
    res.status(400).render("register", { title: "Create Account", error: "That username or email is already taken." });
  }
});

router.get("/login", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.render("login", { title: "Sign In", error: null, next: req.query.next || "" });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ $or: [{ username }, { email: (username || "").toLowerCase() }] });
  if (!user || !bcrypt.compareSync(password || "", user.passwordHash)) {
    return res.status(401).render("login", { title: "Sign In", error: "Invalid credentials.", next: req.body.next || "" });
  }
  req.session.userId = user._id.toString();
  res.redirect(req.body.next && req.body.next.startsWith("/") ? req.body.next : "/dashboard");
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

// ---------- Dashboard ----------
router.get("/dashboard", requireAuth, async (req, res) => {
  const solveDocs = await Solve.find({ userId: req.user._id }).sort({ solvedAt: -1 }).populate("challengeId").lean();
  const solves = solveDocs.filter(s => s.challengeId).map(s => ({
    title: s.challengeId.title,
    points: s.challengeId.points,
    category: s.challengeId.category,
    solvedAt: s.solvedAt
  }));

  const totalChallenges = await Challenge.countDocuments();
  const higherRanked = await User.countDocuments({ points: { $gt: req.user.points } });
  const rank = higherRanked + 1;

  const allChallenges = await Challenge.find().lean();
  const solvedIds = new Set(solveDocs.filter(s => s.challengeId).map(s => s.challengeId._id.toString()));
  const catMap = {};
  allChallenges.forEach(c => {
    if (!catMap[c.category]) catMap[c.category] = { category: c.category, total: 0, solved: 0 };
    catMap[c.category].total++;
    if (solvedIds.has(c._id.toString())) catMap[c.category].solved++;
  });
  const categoryProgress = Object.values(catMap).sort((a, b) => a.category.localeCompare(b.category));

  res.render("dashboard", { title: "Dashboard", solves, totalChallenges, rank, categoryProgress });
});

// ---------- Challenges ----------
router.get("/challenges", requireAuth, async (req, res) => {
  const allChallenges = await Challenge.find().sort({ orderIndex: 1 }).lean();
  const mySolves = await Solve.find({ userId: req.user._id }).lean();
  const solvedIds = new Set(mySolves.map(s => s.challengeId.toString()));
  const challenges = allChallenges.map(c => ({ ...c, solved: solvedIds.has(c._id.toString()) }));

  const domains = [...new Set(allChallenges.map(c => c.domain))].sort();

  res.render("challenges", { title: "Challenges", challenges, domains });
});

router.get("/challenges/:slug", requireAuth, async (req, res) => {
  const challenge = await Challenge.findOne({ slug: req.params.slug }).lean();
  if (!challenge) return res.status(404).render("404", { title: "Not Found" });
  const solved = await Solve.findOne({ userId: req.user._id, challengeId: challenge._id }).lean();
  res.render("challenge-detail", { title: challenge.title, challenge, solved: !!solved, submitError: null, submitSuccess: false });
});

router.post("/challenges/:slug/submit", requireAuth, async (req, res) => {
  const challenge = await Challenge.findOne({ slug: req.params.slug }).lean();
  if (!challenge) return res.status(404).render("404", { title: "Not Found" });

  const submitted = (req.body.flag || "").trim();
  const alreadySolved = await Solve.findOne({ userId: req.user._id, challengeId: challenge._id }).lean();

  if (alreadySolved) {
    return res.json({ ok: true, alreadySolved: true, message: "Already solved." });
  }

  if (!submitted || flagHash(submitted) !== challenge.flagHash) {
    return res.json({ ok: false, message: "Incorrect flag. Keep digging." });
  }

  try {
    await Solve.create({ userId: req.user._id, challengeId: challenge._id });
    await User.updateOne({ _id: req.user._id }, { $inc: { points: challenge.points } });
  } catch (e) {
    // Unique index race -- treat as already solved.
    return res.json({ ok: true, alreadySolved: true, message: "Already solved." });
  }

  res.json({ ok: true, alreadySolved: false, message: "Correct! Flag captured.", points: challenge.points });
});

// ---------- Leaderboard ----------
router.get("/leaderboard", requireAuth, async (req, res) => {
  const users = await User.find().sort({ points: -1, createdAt: 1 }).limit(50).lean();
  const leaders = await Promise.all(users.map(async (u) => {
    const solveCount = await Solve.countDocuments({ userId: u._id });
    return { username: u.username, points: u.points, solveCount };
  }));
  res.render("leaderboard", { title: "Leaderboard", leaders });
});

// ---------- Profile ----------
router.get("/profile", requireAuth, async (req, res) => {
  const solveDocs = await Solve.find({ userId: req.user._id }).sort({ solvedAt: -1 }).populate("challengeId").lean();
  const solves = solveDocs.filter(s => s.challengeId).map(s => ({
    title: s.challengeId.title, points: s.challengeId.points,
    category: s.challengeId.category, difficulty: s.challengeId.difficulty, solvedAt: s.solvedAt
  }));
  res.render("profile", { title: "My Profile", solves, error: null, success: null });
});

router.post("/profile", requireAuth, async (req, res) => {
  const bio = (req.body.bio || "").slice(0, 280);
  await User.updateOne({ _id: req.user._id }, { $set: { bio } });
  req.user.bio = bio;
  const solveDocs = await Solve.find({ userId: req.user._id }).sort({ solvedAt: -1 }).populate("challengeId").lean();
  const solves = solveDocs.filter(s => s.challengeId).map(s => ({
    title: s.challengeId.title, points: s.challengeId.points,
    category: s.challengeId.category, difficulty: s.challengeId.difficulty, solvedAt: s.solvedAt
  }));
  res.render("profile", { title: "My Profile", solves, error: null, success: "Profile updated." });
});

// ---------- Public API: ordered challenge list (for in-lab prev/next nav) ----------
router.get("/api/challenge-order", async (req, res) => {
  const challenges = await Challenge.find().sort({ orderIndex: 1 }).select("slug title labPath -_id").lean();
  res.json(challenges);
});

// ---------- Company ----------
router.get("/company", (req, res) => {
  res.render("company", { title: "About ZeroDay Security Services" });
});

module.exports = router;
