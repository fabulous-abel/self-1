const express = require("express");
const env = require("../config/env");
const { connectToDatabase, getDatabaseState } = require("../config/database");

const router = express.Router();

router.get("/health", async (req, res) => {
  const shouldCheckDatabase = req.query.checkDb === "1";

  if (shouldCheckDatabase && env.hasMongoUri) {
    try {
      await connectToDatabase();
    } catch (error) {
      return res.status(503).json({
        status: "degraded",
        runtime: env.isVercel ? "vercel" : "node",
        apiPrefix: env.apiPrefix || "/",
        database: {
          configured: true,
          state: "error",
          message: error.message
        },
        realtime: {
          websocketServerSupported: !env.isVercel
        }
      });
    }
  }

  res.json({
    status: "ok",
    runtime: env.isVercel ? "vercel" : "node",
    apiPrefix: env.apiPrefix || "/",
    database: {
      configured: env.hasMongoUri,
      state: env.hasMongoUri ? getDatabaseState() : "not-configured"
    },
    realtime: {
      websocketServerSupported: !env.isVercel
    }
  });
});

module.exports = router;
