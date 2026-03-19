const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.join(__dirname, "..", "..", ".env"),
  quiet: true
});

function normalizeApiPrefix(value) {
  if (!value) {
    return "/api";
  }

  const trimmedValue = value.trim();

  if (trimmedValue === "/") {
    return "";
  }

  const withLeadingSlash = trimmedValue.startsWith("/")
    ? trimmedValue
    : `/${trimmedValue}`;

  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

function parseOrigins(...values) {
  return [...new Set(
    values
      .flatMap((value) => (value || "").split(","))
      .map((origin) => origin.trim())
      .filter(Boolean)
  )];
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number.parseInt(process.env.PORT || "5000", 10),
  apiPrefix: normalizeApiPrefix(process.env.API_PREFIX),
  mongoUri: process.env.MONGO_URI || "",
  clientUrl: process.env.CLIENT_URL || "",
  socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN || "",
  jwtSecret: process.env.JWT_SECRET || "",
  telebirrAppId: process.env.TELEBIRR_APP_ID || "",
  telebirrAppKey: process.env.TELEBIRR_APP_KEY || "",
  isVercel:
    process.env.VERCEL === "1" ||
    process.env.VERCEL === "true" ||
    process.env.VERCEL_ENV !== undefined
};

env.allowedOrigins = parseOrigins(env.clientUrl, env.socketCorsOrigin);
env.hasMongoUri = Boolean(env.mongoUri);

module.exports = env;
