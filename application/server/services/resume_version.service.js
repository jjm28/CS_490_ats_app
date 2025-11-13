import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";
import { getResume } from "./resume.service.js";

/* ------------ CRUD helpers ------------ */

export async function listResumeVersions({ userid, resumeid }) {
  const db = getDb();
  const items = await db.collection("resume_versions")
    .find({ owner: userid, resumeId: new ObjectId(resumeid) }, { projection: { content: 0 } })
    .sort({ createdAt: -1 }).toArray();

  const resume = await db.collection("resumes")
    .findOne({ _id: new ObjectId(resumeid), owner: userid }, { projection: { defaultVersionId: 1 } });

  return { items, defaultVersionId: resume?.defaultVersionId || null };
}

export async function getResumeVersion({ userid, versionid }) {
  const db = getDb();
  return db.collection("resume_versions")
    .findOne({ _id: new ObjectId(versionid), owner: userid });
}

export async function createResumeVersion({ userid, resumeid, sourceVersionId, name, description }) {
  const db = getDb();

  // decide source (existing version OR base resume)
  let sourceContent = null;
  if (sourceVersionId) {
    const src = await getResumeVersion({ userid, versionid: sourceVersionId });
    if (!src || String(src.resumeId) !== String(resumeid)) throw new Error("Source version not found");
    sourceContent = src.content;
  } else {
    const base = await getResume({ userid, resumeid });
    if (!base) throw new Error("Base resume not found");
    sourceContent = base.resumedata;
  }

  const doc = {
    owner: userid,
    resumeId: new ObjectId(resumeid),
    name: name || "New Version",
    description: description || "",
    content: sourceContent,
    createdAt: new Date().toISOString(),
    status: "active",
    linkedJobIds: [],
    sourceVersionId: sourceVersionId ? new ObjectId(sourceVersionId) : null,
  };
  const ins = await db.collection("resume_versions").insertOne(doc);
  return { _id: ins.insertedId, resumeId: resumeid, name: doc.name, createdAt: doc.createdAt, status: doc.status };
}

export async function updateResumeVersion({ userid, versionid, name, description, status, linkJobIds, unlinkJobIds }) {
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

  const res = await db.collection("resume_versions")
    .updateOne({ _id: new ObjectId(versionid), owner: userid }, update);

  return res.matchedCount ? { ok: true } : null;
}

export async function deleteResumeVersion({ userid, versionid }) {
  const db = getDb();
  // prevent deleting the default version
  const v = await getResumeVersion({ userid, versionid });
  if (!v) return false;

  const resume = await db.collection("resumes")
    .findOne({ _id: v.resumeId, owner: userid }, { projection: { defaultVersionId: 1 } });

  if (resume?.defaultVersionId && String(resume.defaultVersionId) === String(v._id)) {
    return false; // block delete if default; you can return an error instead
  }

  const res = await db.collection("resume_versions").deleteOne({ _id: v._id, owner: userid });
  return res.deletedCount === 1;
}

export async function setDefaultVersion({ userid, versionid }) {
  const db = getDb();
  const v = await getResumeVersion({ userid, versionid });
  if (!v) return { error: "NotFound" };
  await db.collection("resumes")
    .updateOne({ _id: v.resumeId, owner: userid }, { $set: { defaultVersionId: v._id } });
  return { ok: true, defaultVersionId: v._id };
}

/* ------------ Compare & Merge ------------ */

// very small diff for your ResumeData shape (sections & arrays)
function diffArrays(a = [], b = []) {
  const aSet = new Set(a.map(String));
  const bSet = new Set(b.map(String));
  return {
    added: [...bSet].filter(x => !aSet.has(x)),
    removed: [...aSet].filter(x => !bSet.has(x)),
  };
}

export async function compareVersions({ userid, leftVersionId, rightVersionId }) {
  const left = await getResumeVersion({ userid, versionid: leftVersionId });
  const right = await getResumeVersion({ userid, versionid: rightVersionId });
  if (!left || !right) throw new Error("Version not found");

  const L = left.content || {}; const R = right.content || {};
  const out = { meta: { left: { _id: left._id, name: left.name }, right: { _id: right._id, name: right.name } }, fields: {} };

  // example fields: summary (string)
  if ((L.summary||"") !== (R.summary||"")) out.fields.summary = { left: L.summary||"", right: R.summary||"" };

  // skills (array of {name})
  const ls = (L.skills||[]).map(s=> typeof s==="string" ? s : s.name).filter(Boolean);
  const rs = (R.skills||[]).map(s=> typeof s==="string" ? s : s.name).filter(Boolean);
  const sd = diffArrays(ls, rs);
  if (sd.added.length || sd.removed.length) out.fields.skills = sd;

  // experience[].highlights (just show counts & bullet-level diff per index)
  const lexp = L.experience||[]; const rexp = R.experience||[];
  const max = Math.max(lexp.length, rexp.length);
  const exp = [];
  for (let i=0;i<max;i++){
    const lb=(lexp[i]?.highlights)||[], rb=(rexp[i]?.highlights)||[];
    const d = diffArrays(lb, rb);
    if (d.added.length || d.removed.length) exp.push({ index: i, bullets: d });
  }
  if (exp.length) out.fields.experience = exp;

  return out;
}

// merge by resolution map: e.g. { "summary":"right", "skills":"union", "experience[0].bullets":"right" }
export async function mergeVersions({ userid, baseId, incomingId, resolution, name, description }) {
  const base = await getResumeVersion({ userid, versionid: baseId });
  const inc  = await getResumeVersion({ userid, versionid: incomingId });
  if (!base || !inc) throw new Error("Version not found");

  const merged = JSON.parse(JSON.stringify(base.content || {})); // deep clone

  // summary
  if (resolution?.summary === "right") merged.summary = inc.content?.summary || "";
  if (typeof resolution?.summary === "string" && resolution.summary.startsWith("custom:")) {
    merged.summary = resolution.summary.slice(7);
  }

  // skills
  if (resolution?.skills === "right") merged.skills = inc.content?.skills || [];
  if (resolution?.skills === "union") {
    const ls = (merged.skills||[]).map(s=> typeof s==="string" ? s : s.name);
    const rs = (inc.content?.skills||[]).map(s=> typeof s==="string" ? s : s.name);
    const set = new Set([...ls, ...rs]);
    merged.skills = [...set].map(name=>({name}));
  }

  // experience bullets per index
  const lexp = merged.experience || [];
  const rexp = inc.content?.experience || [];
  const max = Math.max(lexp.length, rexp.length);
  for (let i=0;i<max;i++){
    const key = `experience[${i}].bullets`;
    const choice = resolution?.[key];
    if (!choice) continue;
    if (choice === "right") {
      if (!lexp[i]) lexp[i] = rexp[i] || {};
      lexp[i].highlights = (rexp[i]?.highlights)||[];
    } else if (typeof choice === "string" && choice.startsWith("custom:")) {
      const raw = choice.slice(7);
      lexp[i] = lexp[i] || {};
      lexp[i].highlights = raw.split("\n").map(s=>s.trim()).filter(Boolean);
    }
  }
  merged.experience = lexp;

  // create new version under same resume
  return await createResumeVersion({
    userid,
    resumeid: String(base.resumeId),
    sourceVersionId: baseId,      // provenance
    name,
    description: description || "Merged",
  }).then(async (meta) => {
    // overwrite its content to the merged result
    const db = getDb();
    await db.collection("resume_versions").updateOne(
      { _id: new ObjectId(meta._id), owner: userid },
      { $set: { content: merged } }
    );
    return meta;
  });
}


export async function updateResumeVersionContent({ userid, versionid, content, name }) {
  const db = getDb();

  // Simple structural guard to keep junk out (optional; keep it lightweight)
  if (typeof content !== "object" || Array.isArray(content)) {
    throw new Error("content must be an object");
  }

  const update = {
    $set: { content, updatedAt: new Date().toISOString() }
  };
  if (typeof name === "string") {
    update.$set.name = name.trim() || "Untitled Version";
  }

  const res = await db.collection("resume_versions")
    .updateOne({ _id: new ObjectId(versionid), owner: userid }, update);

  return res.matchedCount ? { ok: true } : null;
}