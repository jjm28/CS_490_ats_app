// application/server/middleware/devUser.js
import os from 'os';
import { randomUUID } from 'crypto';

export function attachDevUser(req, res, next) {
  // In production, you probably run real auth; skip dev logic
  if (process.env.NODE_ENV === 'production') return next();

  // Prefer explicit header if provided
  let devId = req.header('x-dev-user-id');

  // If not provided, try cookie (so browser keeps the same id)
  if (!devId) devId = req.cookies?.dev_user_id;

  // Build a namespace to avoid collisions
  const ns =
    process.env.DEV_USER_NAMESPACE ||
    process.env.USER ||
    os.hostname() ||
    'dev';

  // If still no id, mint one and hand it to the client via cookie
  if (!devId) {
    devId = `${ns}-${randomUUID().slice(0, 8)}`;
    // cookie is optional; httpOnly false so the frontend can read it if desired
    res.cookie('dev_user_id', devId, { httpOnly: false, sameSite: 'lax' });
  }

  // Attach to request for downstream routes
  req.user = { id: devId, role: 'dev' };
  return next();
}
