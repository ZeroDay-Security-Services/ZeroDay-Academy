// db/mongo.js -- MongoDB Atlas connection via Mongoose.
// Works identically with a local MongoDB, Atlas, or any Mongo-compatible
// instance -- point MONGODB_URI at whichever one you're using.
const mongoose = require("mongoose");

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Create a .env file (see .env.example) with your MongoDB Atlas connection string.");
    process.exit(1);
  }

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000
    });
    console.log("Connected to MongoDB:", mongoose.connection.name);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err.message);
  });
}

module.exports = { connectMongo, mongoose };
