import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";

// Create
export async function createResume({ userid, filename, templateKey, lastSaved }, resumedata) {
  const db = getDb();
  const doc = {
    owner: userid,
    filename,
    templateKey,
    resumedata,
    lastSaved: lastSaved || new Date().toISOString(),
    tags: "",
  };
  const res = await db.collection("resumes").insertOne(doc);
  return { _id: res.insertedId, owner: doc.owner };
}

// Update
export async function updateResume({ resumeid, userid, filename, lastSaved, templateKey, tags }, resumedata) {
  const db = getDb();
  const set = {};
  if (filename !== undefined) set.filename = filename;
  if (resumedata !== undefined) set.resumedata = resumedata;
  if (lastSaved !== undefined) set.lastSaved = lastSaved;
  if (templateKey !== undefined) set.templateKey = templateKey;
  if (tags !== undefined) set.tags = String(tags);

  const result = await db
    .collection("resumes")
    .updateOne({ _id: new ObjectId(resumeid), owner: userid }, { $set: set });

  if (result.matchedCount === 0) return { message: "Resume not found" };
  return { _id: resumeid };
}

// Read list or one
export async function getResume({ userid, resumeid }) {
  const db = getDb();
  if (!resumeid) {
    return db
      .collection("resumes")
      .find({ owner: userid }, { projection: { _id: 1, filename: 1, templateKey: 1, lastSaved: 1, tags: 1 } })
      .sort({ lastSaved: -1 })
      .toArray();
  }
  return db.collection("resumes").findOne({ _id: new ObjectId(resumeid), owner: userid });
}

// Delete
export async function deleteResume({ resumeid, userid }) {
  const db = getDb();
  const result = await db.collection("resumes").deleteOne({ _id: new ObjectId(resumeid), owner: userid });
  return result.deletedCount === 1;
}

// Share create/update
export async function createSharedResume({ userid, resumeid, resumedata }) {
  const db = getDb();
  const coll = db.collection("sharedresumes");

  const result = await coll.updateOne(
    { resumeid, owner: userid },
    { $set: { expiresAt: new Date(), resumedata } }
  );

  if (result.matchedCount === 1) {
    const doc = await coll.findOne({ resumeid, owner: userid });
    return {
      sharedid: doc._id,
      url: `${process.env.FRONTEND_ORIGIN}/resumes/share?sharedid=${doc._id}`,
      owner: doc.owner,
    };
  }

  const full = await getResume({ userid, resumeid });
  if (!full) return null;
  const payload = {
    owner: userid,
    resumeid,
    filename: full.filename,
    templateKey: full.templateKey,
    resumedata,
    lastSaved: new Date().toISOString(),
    expiresAt: new Date(),
  };

  const ins = await coll.insertOne(payload);
  return {
    sharedid: ins.insertedId,
    url: `${process.env.FRONTEND_ORIGIN}/resumes/share?sharedid=${ins.insertedId}`,
    owner: userid,
  };
}

// Share fetch
export async function fetchSharedResume({ sharedid }) {
  const db = getDb();
  return db.collection("sharedresumes").findOne({ _id: new ObjectId(sharedid) });
}
