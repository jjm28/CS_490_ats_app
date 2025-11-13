import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";
import { findUserByEmail } from "./user.service.js";

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
export async function createSharedResume({ userid, resumeid, resumedata, visibility = "unlisted", 
  allowComments = true, }) {
  const db = getDb();
  const coll = db.collection("sharedresumes");

  const result = await coll.updateOne(
    { resumeid, owner: userid },
    { $set: { expiresAt: new Date(), resumedata, visibility,  allowComments: !!allowComments, } }
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
    visibility,
    allowComments: !!allowComments,
  };

  const ins = await coll.insertOne(payload);
  return {
    sharedid: ins.insertedId,
    url: `${process.env.FRONTEND_ORIGIN}/resumes/share?sharedid=${ins.insertedId}`,
    owner: userid,   
    visibility: doc.visibility,
    allowComments: doc.allowComments,
  };
}

// Share fetch
export async function fetchSharedResume({ sharedid, viewerid = null }) {
  const db = getDb();
  const coll = db.collection("sharedresumes");

  const doc = await coll.findOne({ _id: new ObjectId(sharedid) });
  if (!doc) return null;

  const isOwner = viewerid && String(viewerid) === String(doc.owner);

  // Simple visibility rules:
  // - "public" / "unlisted": anyone with link can view
  // - "restricted": only owner or explicitly allowed viewers (if you add that later)
  if (doc.visibility === "restricted" && !isOwner) {
    // if you later add allowedViewers, check it here
    // for now, just block non-owners
    return null;
  }

  const allowComments = doc.allowComments !== false;
  const canComment =
    allowComments &&
    // must be logged in
    (doc.visibility === "public" ||
      doc.visibility === "unlisted" ||
      isOwner);
      console.log(allowComments)
  return {
    filename: doc.filename,
    templateKey: doc.templateKey,
    resumedata: doc.resumedata,
    lastSaved: doc.lastSaved,
    sharing: {
      ownerName: doc.ownerName || null,   // optional, you can populate later
      ownerEmail: doc.ownerEmail || null, // optional
      visibility: doc.visibility || "unlisted",
      allowComments,
      canComment,
      isOwner,
    },
    comments: doc.comments || [],
  };
}


export async function addSharedResumeComment({
  sharedid,
  viewerid,
  message,
}) {
  const db = getDb();
  const coll = db.collection("sharedresumes");

  const doc = await coll.findOne({ _id: new ObjectId(sharedid) });
  if (!doc) return null;

  const isOwner = String(doc.owner) === String(viewerid);

  if (doc.visibility === "restricted" && !isOwner) {
    // if you later add `allowedViewers`, check it here
    return { error: "forbidden" };
  }

  if (doc.allowComments === false) {
    return { error: "comments_disabled" };
  }

  const nowIso = new Date().toISOString();

  const comment = {
    _id: new ObjectId(),        // comment id
    authorId: viewerid,
    authorName: null,           // you can fill from users collection if you want
    authorEmail: null,
    message,
    createdAt: nowIso,
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    resolvedByName: null,
  };

  await coll.updateOne(
    { _id: doc._id },
    { $push: { comments: comment } }
  );

  const updated = await coll.findOne(
    { _id: doc._id },
    { projection: { comments: 1 } }
  );

  return { comments: updated?.comments || [] };
}

/**
 * Resolve / reopen a comment.
 * - Only the owner of the resume can change `resolved`
 */
export async function updateSharedResumeComment({
  sharedid,
  commentId,
  viewerid,
  resolved,
}) {
  const db = getDb();
  const coll = db.collection("sharedresumes");

  const doc = await coll.findOne({ _id: new ObjectId(sharedid) });
  if (!doc) return null;

  const isOwner = String(doc.owner) === String(viewerid);
  if (!isOwner) {
    return { error: "forbidden" };
  }

  const nowIso = new Date().toISOString();
  const commentObjectId = new ObjectId(commentId);

  await coll.updateOne(
    { _id: doc._id, "comments._id": commentObjectId },
    {
      $set: {
        "comments.$.resolved": resolved,
        "comments.$.resolvedAt": resolved ? nowIso : null,
        "comments.$.resolvedBy": viewerid,
      },
    }
  );

  const updated = await coll.findOne(
    { _id: doc._id },
    { projection: { comments: 1 } }
  );

  return { comments: updated?.comments || [] };
}