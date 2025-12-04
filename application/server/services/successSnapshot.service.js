// services/successSnapshot.service.js
import SuccessSnapshot from "../models/successSnapshot.js";


function dayKeyOf(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function saveDailySnapshot(userId, payload) {
  if (!userId || !payload) {
    console.warn("saveDailySnapshot called with missing params", { userId });
    return null;
  }

  const dayKey = dayKeyOf(new Date());

  try {
    const snapshot = await SuccessSnapshot.findOneAndUpdate(
      { userId, dayKey },
      { $set: { userId, dayKey, payload } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return snapshot; // return it for easier debug / testing
  } catch (err) {
    console.error("❌ Failed to save daily snapshot:", err);
    throw err;
  }
}

export async function listSnapshots(userId, { limit = 30 } = {}) {
  if (!userId) throw new Error("Missing userId in listSnapshots");

  const snapshots = await SuccessSnapshot.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return snapshots;
}
