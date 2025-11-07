// services/jobs.js (or wherever your service functions are)
import Jobs from '../models/jobs.js';

export async function createJob({userId, payload}) {
    const job = await Jobs.create({ ...payload, userId });
    return job;
}

export async function getAllJobs({userId}) {
    return Jobs.find({ userId }).sort({ createdAt: -1 }).lean();
}

export async function getJob({userId, id}) {
    return Jobs.findOne({ _id: id, userId }).lean();
}

export async function updateJob({userId, id, payload}) {
    return Jobs.findOneAndUpdate(
        { _id: id, userId },
        { $set: payload },
        { new: true, runValidators: true }
    ).lean();
}

export async function deleteJob({userId, id}) {
    return Jobs.findOneAndDelete({ _id: id, userId });
}