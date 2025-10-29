import jwt from "jsonwebtoken";

export function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Malformed token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      _id: decoded.id,
      email: decoded.email,
      isAdmin: decoded.isAdmin || false, // optional, add to JWT if supporting admin
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
