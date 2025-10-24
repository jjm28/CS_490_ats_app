// Dev-only middleware: require a user id on each request so profiles don't overwrite.
export function attachDevUser(req, res, next) {
  const id = req.header('x-dev-user-id'); // the client must send this
  if (!id) return res.status(401).json({ error: 'Missing x-dev-user-id header' });
  req.user = { id };
  next();
}