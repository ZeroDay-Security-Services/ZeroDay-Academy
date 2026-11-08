'use strict';

const { mongoose } = require('../db/mongo');

const schema = new mongoose.Schema({
  instanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabInstance', required: true, index: true },
  author: { type: String, required: true, maxlength: 60 },
  body: { type: String, required: true, maxlength: 4000 },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

module.exports = mongoose.models.LabComment || mongoose.model('LabComment', schema);
