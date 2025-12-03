import jwt from "jsonwebtoken";

export function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  //console.log("AUTH HEADER:", req.headers.authorization);
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


export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    next();
  };
}
export function attachUserFromHeaders(req, res, next) {
  const id = req.header("x-user-id");
  const role = req.header("x-user-role");
  const organizationId = req.header("x-org-id");

  if (id) {
    req.user = {
      id,
      role: role || "job_seeker", // default
      organizationId: organizationId || null,
    };
  }

  next();
}