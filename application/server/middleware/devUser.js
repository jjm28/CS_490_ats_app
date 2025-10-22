// server/middleware/devUser.js
export function attachDevUser(req, _res, next) {
  // Prefer header for per-request user, fall back to env for defaults
  const id = req.header('x-dev-user-id') || process.env.DEV_USER_ID || 'TEMP_USER_ID';
  req.user = { id };
  next();
}
