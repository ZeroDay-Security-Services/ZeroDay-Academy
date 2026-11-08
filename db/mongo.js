'use strict';

const mongoose = require('mongoose');
const { config } = require('../config');

let memoryServer = null;

async function obtainUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  if (config.isProduction) {
    throw new Error('MONGODB_URI is required in production.');
  }

  const { MongoMemoryServer } = require('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create({
    instance: { dbName: 'zeroday_academy' }
  });
  const uri = memoryServer.getUri('zeroday_academy');
  console.log('[db] MONGODB_URI was not set; started an in-memory MongoDB for local development.');
  return uri;
}

async function connectMongo() {
  if (mongoose.connection.readyState === 1) {
    return { uri: mongoose.connection.client?.s?.url || process.env.MONGODB_URI || '' };
  }

  const uri = await obtainUri();
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('[db] Connected to MongoDB:', mongoose.connection.name);

  mongoose.connection.on('error', (error) => {
    console.error('[db] MongoDB connection error:', error.message);
  });

  return { uri };
}

async function disconnectMongo() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

module.exports = { connectMongo, disconnectMongo, mongoose };
