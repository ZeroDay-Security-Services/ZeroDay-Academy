'use strict';

const { connectMongo, disconnectMongo, mongoose } = require('./mongo');
const { labs } = require('../data/labs');
const Challenge = require('../models/Challenge');

async function seedChallenges({ log = true, onlyMissing = false, slugs = null } = {}) {
  const wanted = Array.isArray(slugs) ? new Set(slugs) : null;
  let created = 0;
  let updated = 0;

  for (let index = 0; index < labs.length; index += 1) {
    const lab = labs[index];
    if (wanted && !wanted.has(lab.slug)) continue;
    const existing = await Challenge.findOne({ slug: lab.slug }).select('+solution').lean();
    const managed = !existing || existing.catalogManaged !== false;

    const catalogFields = {
      slug: lab.slug,
      title: lab.title,
      domain: lab.domain,
      category: lab.category,
      level: lab.level,
      difficulty: lab.difficulty,
      points: lab.points,
      summary: lab.summary,
      briefing: lab.briefing,
      scenario: lab.scenario,
      objectives: lab.objectives,
      prerequisites: lab.prerequisites,
      estimatedMinutes: lab.estimatedMinutes,
      technology: lab.technology,
      owaspRef: lab.owaspRef,
      owaspApiRef: lab.owaspApiRef || '',
      asvsRef: lab.asvsRef,
      wstgRef: lab.wstgRef,
      cwe: lab.cwe,
      cve: lab.cve || '',
      attackTechnique: lab.attackTechnique,
      labPath: lab.labPath,
      color: lab.color,
      hints: lab.hints,
      solution: lab.solution,
      orderIndex: index,
      published: lab.published,
      archived: lab.archived
    };

    if (!existing) {
      await Challenge.create({ ...catalogFields, flagVersion: 1, catalogManaged: true });
      created += 1;
    } else if (managed && !onlyMissing) {
      await Challenge.updateOne(
        { _id: existing._id },
        { $set: catalogFields, $unset: { flagHash: '', hint: '' } }
      );
      updated += 1;
    }
  }

  if (log) {
    console.log(`[seed] ${labs.length} lab definitions processed (${created} created, ${updated} updated).`);
  }
  return { total: labs.length, created, updated };
}

async function ensureSeeded(options = {}) {
  const count = await Challenge.countDocuments();
  if (count === 0) {
    return seedChallenges(options);
  }
  return { total: count, created: 0, updated: 0, skipped: true };
}

async function main() {
  await connectMongo();
  await seedChallenges();
  await mongoose.disconnect();
  await disconnectMongo();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { seedChallenges, ensureSeeded };
