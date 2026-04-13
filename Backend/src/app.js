require("dotenv").config({ quiet: true });

const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB = require("./config/db");
const apiRouter = require("./routes");
const parseOrigins = require("./utils/parseOrigins");

const app = express();
const apiPrefix = process.env.API_PREFIX || "/api";
const isVercel =
  process.env.VERCEL === "1" ||
  process.env.VERCEL === "true" ||
  process.env.VERCEL_ENV !== undefined;
const defaultOrigins = [
  "http://localhost:5173",
  "https://fabulous-abel-self-1.vercel.app",
  "https://self-1-*.vercel.app",
].join(",");
const corsOrigins = parseOrigins(
  process.env.CLIENT_URL || process.env.SOCKET_CORS_ORIGIN || defaultOrigins,
);

app.disable("x-powered-by");
app.set("io", null);
app.set("runtime", isVercel ? "vercel" : "node");

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(async (req, res, next) => {
  try {
    await connectDB();
    return next();
  } catch (error) {
    return next(error);
  }
});

app.get("/", (req, res) => {
  res.json({
    name: "Self(queue) Backend",
    status: "ok",
    runtime: req.app.get("runtime"),
    apiPrefix,
    realtime: {
      websocketServerSupported: !isVercel,
    },
  });
});

app.use(apiPrefix, apiRouter);

if (apiPrefix !== "/") {
  // Support clients that were configured with only the backend origin.
  app.use(apiRouter);
}

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    message: err.message || "Internal server error",
  });
});

module.exports = app;
