import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";
import { getCoverletter } from "./coverletter.service.js";

const COLLECTION = "coverletter_versions";

export async function listCoverletterVersions({ userid, coverletterid }) {
  const db = getDb();
  const items = await db.collection(COLLECTION)
    .find({ owner: userid, coverletterId: new ObjectId(coverletterid) }, { projection: { content: 0 } })
    .sort({ createdAt: -1 }).toArray();

  const coverletter = await db.collection("coverletters")
    .findOne({ _id: new ObjectId(coverletterid), owner: userid }, { projection: { defaultVersionId: 1 } });

  return { items, defaultVersionId: coverletter?.defaultVersionId || null };
}

export async function getCoverletterVersion({ userid, versionid }) {
  const db = getDb();
  return db.collection(COLLECTION)
    .findOne({ _id: new ObjectId(versionid), owner: userid });
}

export async function createCoverletterVersion({ userid, coverletterid, sourceVersionId, name, description }) {
  const db = getDb();

  let sourceContent = null;
  if (sourceVersionId) {
    const src = await getCoverletterVersion({ userid, versionid: sourceVersionId });
    if (!src || String(src.coverletterId) !== String(coverletterid)) {
      throw new Error("Source version not found");
    }
    sourceContent = src.content;
  } else {
    const base = await getCoverletter({ userid, coverletterid });
    if (!base) throw new Error("Base cover letter not found");
    sourceContent = base.coverletterdata || base.coverletterData;
  }

  const doc = {
    owner: userid,
    coverletterId: new ObjectId(coverletterid),
    name: name || "New Version",
    description: description || "",
    content: sourceContent,
    createdAt: new Date().toISOString(),
    status: "active",
    linkedJobIds: [],
    sourceVersionId: sourceVersionId ? new ObjectId(sourceVersionId) : null,
  };
  
  const ins = await db.collection(COLLECTION).insertOne(doc);
  return { 
    _id: ins.insertedId, 
    coverletterId: coverletterid, 
    name: doc.name, 
    createdAt: doc.createdAt, 
    status: doc.status 
  };
}

export async function updateCoverletterVersion({ userid, versionid, name, description, status, linkJobIds, unlinkJobIds }) {
  const db = getDb();
  const $set = {};
  const $addToSet = {};
  const $pull = {};

  if (name !== undefined) $set.name = name;
  if (description !== undefined) $set.description = description;
  if (status !== undefined) $set.status = status;

  if (Array.isArray(linkJobIds) && linkJobIds.length) {
    $addToSet.linkedJobIds = { $each: linkJobIds.map((id) => new ObjectId(id)) };
  }
  if (Array.isArray(unlinkJobIds) && unlinkJobIds.length) {
    $pull.linkedJobIds = { $in: unlinkJobIds.map((id) => new ObjectId(id)) };
  }

  const update = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($addToSet).length) update.$addToSet = $addToSet;
  if (Object.keys($pull).length) update.$pull = $pull;

  if (!Object.keys(update).length) return { ok: true };

  const res = await db.collection(COLLECTION)
    .updateOne({ _id: new ObjectId(versionid), owner: userid }, update);

  return res.matchedCount ? { ok: true } : null;
}

export async function deleteCoverletterVersion({ userid, versionid }) {
  const db = getDb();
  const v = await getCoverletterVersion({ userid, versionid });
  if (!v) return false;

  const coverletter = await db.collection("coverletters")
    .findOne({ _id: v.coverletterId, owner: userid }, { projection: { defaultVersionId: 1 } });

  if (coverletter?.defaultVersionId && String(coverletter.defaultVersionId) === String(v._id)) {
    return false; // block delete if default
  }

  const res = await db.collection(COLLECTION).deleteOne({ _id: v._id, owner: userid });
  return res.deletedCount === 1;
}

export async function setDefaultCoverletterVersion({ userid, versionid }) {
  const db = getDb();
  const v = await getCoverletterVersion({ userid, versionid });
  if (!v) return { error: "NotFound" };
  
  await db.collection("coverletters")
    .updateOne({ _id: v.coverletterId, owner: userid }, { $set: { defaultVersionId: v._id } });
  
  return { ok: true, defaultVersionId: v._id };
}

export async function updateCoverletterVersionContent({ userid, versionid, content, name }) {
  const db = getDb();

  if (typeof content !== "object" || Array.isArray(content)) {
    throw new Error("content must be an object");
  }

  const update = {
    $set: { content, updatedAt: new Date().toISOString() }
  };
  if (typeof name === "string") {
    update.$set.name = name.trim() || "Untitled Version";
  }

  const res = await db.collection(COLLECTION)
    .updateOne({ _id: new ObjectId(versionid), owner: userid }, update);

  return res.matchedCount ? { ok: true } : null;
}

export async function listCoverletterVersionsLinkedToJob({ userid, jobId }) {
  const db = getDb();

  const jobIdFilter = ObjectId.isValid(jobId) ? new ObjectId(jobId) : jobId;

  const docs = await db.collection(COLLECTION)
    .find({
      owner: userid,
      linkedJobIds: { $in: [jobIdFilter] },
    })
    .sort({ createdAt: -1 })
    .toArray();

  console.log("linked coverletter versions for job", jobId, docs);

  return {
    items: docs.map((d) => ({
      _id: d._id,
      name: d.name,
      coverletterId: d.coverletterId,
      createdAt: d.createdAt,
      isDefault: d.isDefault || false,
      coverletterFilename: d.coverletterFilename,
    })),
  };
}