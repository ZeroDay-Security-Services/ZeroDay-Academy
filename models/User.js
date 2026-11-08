'use strict';

const { mongoose } = require('../db/mongo');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_.-]+$/
  },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
  bio: { type: String, default: '', maxlength: 280 },
  avatarSeed: { type: String, default: '' },
  points: { type: Number, default: 0, min: 0 },
  xp: { type: Number, default: 0, min: 0 },
  streak: { type: Number, default: 0, min: 0 },
  lastSolveDate: { type: String, default: '' },
  lastLoginAt: { type: Date, default: null },
  lastActiveAt: { type: Date, default: Date.now },
  preferences: {
    theme: { type: String, default: 'dark' },
    emailHints: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

userSchema.index({ points: -1, createdAt: 1 });

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    username: this.username,
    email: this.email,
    role: this.role,
    status: this.status,
    bio: this.bio,
    points: this.points,
    xp: this.xp,
    streak: this.streak,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
