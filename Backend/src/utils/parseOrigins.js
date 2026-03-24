function parseOrigins(rawOrigins) {
  if (!rawOrigins || rawOrigins === "*") {
    return true;
  }

  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

module.exports = parseOrigins;
