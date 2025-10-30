// application/server/services/employment.service.js
import Employment from '../models/employment.js';

// List from most recent to oldest
export async function listEmployment(userId) {
  return Employment.find({ userId })
    .sort({ currentPosition: -1, endDate: -1, startDate: -1 }) 
    .lean();
}

export async function createEmployment(userId, payload) {
  return Employment.create({ ...payload, userId });
}

export async function getEmployment(userId, id) {
  return Employment.findOne({ _id: id, userId }).lean();
}

// 
export async function updateEmployment(userId, id, payload) {
  return Employment.findOneAndUpdate(
    { _id: id, userId },
    { $set: payload },
    { new: true, runValidators: true, omitUndefined: true })
  .lean();
}

export async function removeEmployment(userId, id) {
  return Employment.findOneAndDelete({ _id: id, userId });
}
