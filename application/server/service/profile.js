import { getDb } from '../connection.js';

const coll = () => getDb().collection('profiles');

// Get profile by userId
export async function getProfileByUserId(userId) {
  return coll().findOne({ userId });
}

// Create or update profile
export async function upsertProfileByUserId(userId, data) {
  const now = new Date();
  const update = {
    $set: { ...data, userId, updatedAt: now },
    $setOnInsert: { createdAt: now },
  };
  const res = await coll().findOneAndUpdate(
    { userId },
    update,
    { upsert: true, returnDocument: 'after' }
  );
  return res.value;
}
