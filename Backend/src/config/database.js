const mongoose = require("mongoose");
const env = require("./env");

const globalCache = global.__selfQueueMongoCache || {
  connection: null,
  promise: null
};

global.__selfQueueMongoCache = globalCache;

function getDatabaseState() {
  switch (mongoose.connection.readyState) {
    case 0:
      return "disconnected";
    case 1:
      return "connected";
    case 2:
      return "connecting";
    case 3:
      return "disconnecting";
    default:
      return "uninitialized";
  }
}

async function connectToDatabase() {
  if (!env.hasMongoUri) {
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    globalCache.connection = mongoose.connection;
    return mongoose.connection;
  }

  if (!globalCache.promise) {
    globalCache.promise = mongoose
      .connect(env.mongoUri, {
        serverSelectionTimeoutMS: 5000
      })
      .then((instance) => {
        globalCache.connection = instance.connection;
        return globalCache.connection;
      })
      .catch((error) => {
        globalCache.promise = null;
        throw error;
      });
  }

  return globalCache.promise;
}

module.exports = {
  connectToDatabase,
  getDatabaseState
};
