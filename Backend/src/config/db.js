const mongoose = require("mongoose");

const globalCache = global.__selfQueueDbCache || {
  promise: null,
  warnedInvalidConfig: false,
  warnedConnectionFailure: false,
  lastFailureAt: 0,
};

global.__selfQueueDbCache = globalCache;

function warnInvalidConfiguration() {
  if (globalCache.warnedInvalidConfig) {
    return;
  }

  globalCache.warnedInvalidConfig = true;
  console.warn("MongoDB not configured. Starting with in-memory development data.");
}

function warnConnectionFailure(message) {
  if (globalCache.warnedConnectionFailure) {
    return;
  }

  globalCache.warnedConnectionFailure = true;
  console.warn(
    `MongoDB connection failed (${message}). Starting with in-memory development data.`,
  );
}

async function connectDB() {
  const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
  const requireDatabase = process.env.REQUIRE_DATABASE === "true";

  if (
    !mongoUri ||
    mongoUri.includes("<db_password>") ||
    mongoUri.includes("cluster0.example")
  ) {
    if (requireDatabase) {
      throw new Error("Missing valid MONGO_URI in environment variables");
    }

    warnInvalidConfiguration();
    return false;
  }

  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (
    globalCache.lastFailureAt &&
    Date.now() - globalCache.lastFailureAt < 30_000 &&
    !requireDatabase
  ) {
    return false;
  }

  if (globalCache.promise) {
    return globalCache.promise;
  }

  mongoose.set("strictQuery", true);
  globalCache.promise = mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    })
    .then(() => {
      globalCache.warnedConnectionFailure = false;
      globalCache.lastFailureAt = 0;
      return true;
    })
    .catch((error) => {
      globalCache.promise = null;
      globalCache.lastFailureAt = Date.now();

      if (requireDatabase) {
        throw error;
      }

      warnConnectionFailure(error.message);
      return false;
    });

  return globalCache.promise;
}

module.exports = connectDB;
