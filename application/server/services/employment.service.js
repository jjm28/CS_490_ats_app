// application/server/services/employment.service.js
import Employment from '../models/employment.js';

export async function listEmployment(arg) {
  //START: support multiple userIds 
  if (typeof arg === 'object' && arg?.orUserIds) {
    return Employment.find({ userId: { $in: arg.orUserIds } })
      .sort({ startDate: -1, createdAt: -1 })
      .lean();
  }
  const userId = typeof arg === 'string' ? arg : arg?.userId;
  

  return Employment.find({ userId })
    .sort({ startDate: -1, createdAt: -1 })
    .lean();
}

export async function createEmployment(userId, payload) {
  return Employment.create({ ...payload, userId });
}

export async function getEmployment(userId, id) {
  return Employment.findOne({ _id: id, userId }).lean();
}

export async function updateEmployment(userId, id, payload) {
  return Employment.findOneAndUpdate(
    { _id: id, userId },
    { $set: payload },
    { new: true, runValidators: true, omitUndefined: true }
  );
}

export async function removeEmployment(userId, id) {
  return Employment.findOneAndDelete({ _id: id, userId });
}
