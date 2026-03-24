const DEFAULT_JWT_SECRET = "selfqueue-dev-secret";

function getJwtSecret() {
  return process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
}

module.exports = {
  getJwtSecret,
};
