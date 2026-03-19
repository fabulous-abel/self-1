const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const { connectToDatabase, getDatabaseState } = require("./config/database");
const healthRouter = require("./routes/health");

function createCorsOriginValidator(allowedOrigins, nodeEnv) {
  return function validateOrigin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.length === 0) {
      if (nodeEnv !== "production") {
        return callback(null, true);
      }

      return callback(new Error("CORS origin is not configured for production"));
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS origin not allowed"));
  };
}

const app = express();

app.disable("x-powered-by");
app.locals.connectToDatabase = connectToDatabase;
app.locals.env = env;

const corsOptions = {
  origin: createCorsOriginValidator(env.allowedOrigins, env.nodeEnv),
  credentials: true,
  methods: ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"]
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    name: "backend",
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

app.use(env.apiPrefix || "/", healthRouter);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode =
    error.message === "CORS origin not allowed" ||
    error.message === "CORS origin is not configured for production"
      ? 403
      : 500;

  res.status(statusCode).json({
    message: statusCode === 500 ? "Internal server error" : error.message
  });
});

module.exports = app;
