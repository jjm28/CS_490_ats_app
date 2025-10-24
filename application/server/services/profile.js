import { getDb } from '../db/connection.js';

export async function getProfileByUserId(userId) {
  const db = getDb();
  return db.collection('profiles').findOne({ userId });
}

export async function upsertProfileByUserId(userId, data) {
  const db = getDb();
  const coll = db.collection('profiles');
  const now = new Date();

  const update = {
    $set: { ...data, userId, updatedAt: now },
    $setOnInsert: { createdAt: now },
  };

  // 🔑 filter by { userId } → one doc per user; no cross-user overwrite
  await coll.updateOne({ userId }, update, { upsert: true });
  return coll.findOne({ userId });
}