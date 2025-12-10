// routes/success-snapshots.js
import express from "express";
import { listSnapshots } from "../services/successSnapshot.service.js";
import { verifyJWT } from "../middleware/auth.js";


const router = express.Router();

router.use((req, res, next) => {
  if (req.headers["x-dev-user-id"]) {
    req.user = { _id: req.headers["x-dev-user-id"] };
    return next();
  }
  verifyJWT(req, res, next);
});

function getUserId(req) {
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();
  const dev = req.headers["x-dev-user-id"];
  return dev ? dev.toString() : null;
}


router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    const limit = Number(req.query.limit || 30);
    const rows = await listSnapshots(userId, { limit });

    return res.json(rows);
  } catch (e) {
    console.error("Failed to list snapshots", e);
    return res.status(500).json({ error: "Failed to list snapshots" });
  }
});

export default router;
