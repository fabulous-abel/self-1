function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function normalizePattern(pattern) {
  const trimmed = String(pattern || "").trim();

  if (!trimmed) {
    return null;
  }

  if (!trimmed.includes("*")) {
    return trimmed;
  }

  return new RegExp(
    `^${escapeRegex(trimmed).replace(/\*/g, ".*")}$`,
    "i",
  );
}

function parseOrigins(rawOrigins) {
  if (!rawOrigins || rawOrigins === "*") {
    return true;
  }

  return rawOrigins
    .split(",")
    .map(normalizePattern)
    .filter(Boolean);
}

module.exports = parseOrigins;
