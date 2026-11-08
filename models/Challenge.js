'use strict';

const { mongoose } = require('../db/mongo');

const challengeSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  domain: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true },
  level: { type: Number, required: true, min: 1, max: 6, index: true },
  difficulty: {
    type: String,
    required: true,
    enum: ['Beginner', 'Easy', 'Intermediate', 'Hard', 'Advanced', 'Insane']
  },
  points: { type: Number, required: true, min: 0 },
  summary: { type: String, required: true },
  briefing: { type: String, required: true },
  scenario: { type: String, default: '' },
  objectives: { type: [String], default: [] },
  prerequisites: { type: [String], default: [] },
  estimatedMinutes: { type: Number, default: 30 },
  technology: { type: [String], default: [] },
  owaspRef: { type: String, default: '' },
  owaspApiRef: { type: String, default: '' },
  asvsRef: { type: String, default: '' },
  wstgRef: { type: String, default: '' },
  cwe: { type: String, default: '' },
  cve: { type: String, default: '' },
  attackTechnique: { type: String, default: '' },
  labPath: { type: String, required: true },
  color: { type: String, default: 'blue' },
  hints: { type: [String], default: [] },
  solution: { type: String, default: '', select: false },
  flagVersion: { type: Number, default: 1 },
  catalogManaged: { type: Boolean, default: true },
  published: { type: Boolean, default: true, index: true },
  archived: { type: Boolean, default: false },
  orderIndex: { type: Number, default: 0 }
}, { timestamps: true });

challengeSchema.index({ published: 1, level: 1, orderIndex: 1 });

challengeSchema.methods.publicJSON = function publicJSON() {
  return {
    slug: this.slug,
    title: this.title,
    domain: this.domain,
    category: this.category,
    level: this.level,
    difficulty: this.difficulty,
    points: this.points,
    summary: this.summary,
    briefing: this.briefing,
    scenario: this.scenario,
    objectives: this.objectives,
    prerequisites: this.prerequisites,
    estimatedMinutes: this.estimatedMinutes,
    technology: this.technology,
    owaspRef: this.owaspRef,
    owaspApiRef: this.owaspApiRef,
    asvsRef: this.asvsRef,
    wstgRef: this.wstgRef,
    cwe: this.cwe,
    cve: this.cve,
    attackTechnique: this.attackTechnique,
    labPath: this.labPath,
    color: this.color,
    published: this.published,
    orderIndex: this.orderIndex
  };
};

module.exports = mongoose.models.Challenge || mongoose.model('Challenge', challengeSchema);
