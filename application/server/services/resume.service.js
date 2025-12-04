import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";
import { findUserByEmail } from "./user.service.js";
import Resume from "../models/resume.js";
import { sendDocumentAccessEmail } from "./emailService.js";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const cache = new Map();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY_FOR_COVERLETTER);
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

export async function updateresumeSharedsettings({ resumeid,userid,visibility,allowComments,reviewDeadline}) {
 
    const update = {};
    if (visibility) update.visibility = visibility;
    if (typeof allowComments === "boolean") update.allowComments = allowComments;
    if (reviewDeadline) update.reviewDeadline = reviewDeadline
    const updated = await Resume.findOneAndUpdate(
      { _id: new ObjectId(resumeid), owner: userid },      // ensure user owns this cover letter
      { $set: update },        // update ONLY the provided fields
      { new: true }
    );
    if (!updated) {
     console.log( "Resume not found" );
    }


}

export async function inviteReviewer({ownerUserId,
  email,
  url, role, reviewDeadline
}) {
  const db = getDb()
    const users = await db.collection("profiles").findOne({ userId:ownerUserId  },    { projection: {fullName:1} })

  // Fire-and-forget email sending (don't block the main response on failure)
  try {
    await sendDocumentAccessEmail({toEmail: email,sharedurl: url,grantedBy: users.fullName,  role: role, reviewDeadline: reviewDeadline,documentName: "Resume"})
  } catch (e) {
    console.error("Error sending supporter invite email:", e);
    // You might want to log this to monitoring, but we still return supporter
  }

  return true;
}
export async function addreviewerResumeSharedsettings({ resumeId,userId,toemail,role ,canComment,canResolve}) {
 


   const baseFilter = {
  _id: new ObjectId(resumeId),
  owner: userId,
};

const reviewerFields = {
  role,
  canComment,
  canResolve,
  status: "invited",
  lastActivityAt: new Date(),
};

let updated = await Resume.findOneAndUpdate(
  {
    ...baseFilter,
    "reviewers.email": toemail, // only match if email exists
  },
  {
    $set: {
      "reviewers.$.role": reviewerFields.role,
      "reviewers.$.canComment": reviewerFields.canComment,
      "reviewers.$.canResolve": reviewerFields.canResolve,
      "reviewers.$.status": reviewerFields.status,
      "reviewers.$.lastActivityAt": reviewerFields.lastActivityAt,
    },
  },
  { new: true }
);

// If no existing reviewer with that email -> push a new one
if (!updated) {
  updated = await Resume.findOneAndUpdate(
    baseFilter,
    {
      $push: {
        reviewers: {
          email: toemail,
          ...reviewerFields,
        },
      },
    },
    { new: true }
  );
}



}


// Share fetch
export async function fetchSharedResume({ sharedid,currentUseremail,viewerid = null}) {
    const db = getDb();
    const sharedresume = await db
    .collection("sharedresumes")
    .findOne(  { _id: new ObjectId(sharedid) } )

    const accesscontrollsettings = await Resume.findOne(
      { _id: new ObjectId(sharedresume.resumeid), owner: sharedresume.owner }, 
    ).select("allowComments visibility restricteduserid reviewers reviewDeadline");
    const users = await db.collection("profiles").findOne({ userId: sharedresume.owner  },    { projection: {fullName:1, email:1} })

    if (!accesscontrollsettings) {
     console.log( "Resume not found" );
    }
  const sharing= {
      ownerName: users.fullName || null,   // optional, you can populate later
      ownerEmail: users.ownerEmail || null, // optional
      visibility: accesscontrollsettings._doc.visibility || "unlisted",
      allowComments:accesscontrollsettings.allowComments,
      canComment: null,
      
    }

    const comments =  sharedresume.comments || []

const updated = await Resume.findOneAndUpdate(
  {_id: new ObjectId(sharedresume.resumeid), owner: sharedresume.owner,     "reviewers.email": currentUseremail},
  {
    $set: {
       
      "reviewers.$.status": "viewed",
      "reviewers.$.lastActivityAt": new Date(),
    },
  },
  { new: true }
);

if (!updated) {
  // no document matched this _id + email
  console.warn("No matching reviewer found for");
  // return 404 or similar
}

    return { ...sharedresume, ...accesscontrollsettings._doc , sharing, comments} 

}

export async function addSharedResumeComment({
  sharedid,
  viewerid,
  message,
  currentUseremail
}) {
  const db = getDb();
  const coll = db.collection("sharedresumes");

  const doc = await coll.findOne({ _id: new ObjectId(sharedid) });
  if (!doc) return null;

  const isOwner = String(doc.owner) === String(viewerid);

    const users = await db.collection("profiles").findOne({ userId: viewerid  },    { projection: {fullName:1, email:1} })

  const nowIso = new Date().toISOString();

  const comment = {
    _id: new ObjectId(),        // comment id
    authorId: viewerid,
    authorName: users.fullName,           // you can fill from users collection if you want
    authorEmail: users.email,
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

  const updatedstatus = await Resume.findOneAndUpdate(
  {_id: new ObjectId(doc.resumeid), owner: doc.owner,  "reviewers.email": currentUseremail},
  {
    $set: {
       
      "reviewers.$.status": "commented",
      "reviewers.$.lastActivityAt": new Date(),
    },
  },
  { new: true }
);

if (!updatedstatus) {
  // no document matched this _id + email
  console.warn("No matching reviewer found for");
  // return 404 or similar
}

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

export async function removereviewerResumeSharedsettings({ resumeid,userId,email}) {
 


    const updated = await Resume.updateMany(
      { _id: new ObjectId(resumeid), owner: userId },      // ensure user owns this cover letter
      { $pull: {reviewers: { email: email }}},        // update ONLY the provided fields
      { new: true }
    );

    if (!updated) {
     console.log( "Resume not found" );
    }


}


export async function getResumeFeedbackSummary({ userid, resumeid }) {
  const db = getDb();

  // 1) Load cover letter with reviewers
  const resume = await Resume.findOne(
    { _id: new ObjectId(resumeid), owner: userid },
    { reviewers: 1, workflowStatus: 1 }
  ).lean();

  if (!resume) {
    const error = new Error("Cover letter not found");
    error.statusCode = 404;
    throw error;
  }

  const reviewers = Array.isArray(resume.reviewers)
    ? resume.reviewers
    : [];

  // 2) Reviewer stats
  const totalReviewers = reviewers.length;

  const statusCounts = reviewers.reduce((acc, r) => {
    const status = r.status || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // role-level stats we’ll enrich with comment counts later
  const byRoleMap = {};
  for (const r of reviewers) {
    const role = r.role || "other";
    if (!byRoleMap[role]) {
      byRoleMap[role] = {
        role,
        reviewers: 0,
        comments: 0,
        resolvedComments: 0,
      };
    }
    byRoleMap[role].reviewers += 1;
  }

  // 3) Load comments from sharedresumes (if they exist)
  const sharedDoc = await db
    .collection("sharedresumes")
    .findOne(
      { resumeid, owner: userid },
      { projection: { comments: 1 } }
    );

  const comments = Array.isArray(sharedDoc?.comments)
    ? sharedDoc.comments
    : [];

  const totalComments = comments.length;
  const resolvedComments = comments.filter((c) => c.resolved).length;
  const openComments = totalComments - resolvedComments;

  // Map comment counts by author email to connect to reviewer roles
  const commentsByEmail = comments.reduce((acc, c) => {
    const email = (c.authorEmail || "").toLowerCase();
    if (!email) return acc;
    acc[email] = (acc[email] || 0) + 1;
    return acc;
  }, {});

  const resolvedByEmail = comments.reduce((acc, c) => {
    if (!c.resolved) return acc;
    const email = (c.authorEmail || "").toLowerCase();
    if (!email) return acc;
    acc[email] = (acc[email] || 0) + 1;
    return acc;
  }, {});

  for (const r of reviewers) {
    const role = r.role || "other";
    const email = (r.email || "").toLowerCase();
    const roleStats = byRoleMap[role];
    if (!roleStats) continue;

    if (email) {
      roleStats.comments += commentsByEmail[email] || 0;
      roleStats.resolvedComments += resolvedByEmail[email] || 0;
    }
  }

  const byRole = Object.values(byRoleMap);

  // 4) Build a small context string for AI
  const documentContext = [
    `Total reviewers: ${totalReviewers}`,
    `Total comments: ${totalComments}`,
    resume.workflowStatus
      ? `Workflow status: ${resume.workflowStatus}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  // 5) Ask Gemini for themes/strengths/improvements (optional)
  const aiSummary = await generateFeedbackSummaryAI({
    comments,
    documentContext,
  });

  // 6) Final payload
  return {
    resumeid: resumeid,
    totalReviewers,
    statusCounts, // e.g. { invited: 2, viewed: 1, commented: 1, ... }
    totalComments,
    openComments,
    resolvedComments,
    byRole, // [{ role, reviewers, comments, resolvedComments }]
    aiSummary, // null if AI fails or no comments
  };
}

async function generateFeedbackSummaryAI({ comments, documentContext = "" }) {
  try {
    if (!comments || comments.length === 0) {
      return null;
    }

    // Limit to first 50 comments to keep prompt small
    const limitedComments = comments.slice(0, 50);

    const commentsBlock = limitedComments
      .map((c) => {
        const who = c.authorEmail || "reviewer";
        const msg = (c.message || "").replace(/\s+/g, " ").trim();
        const when = c.createdAt || "";
        return `- ${who}${when ? ` [${when}]` : ""}: ${msg}`;
      })
      .join("\n");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction:
        "You are an assistant that analyzes review feedback on a job application document (e.g., resume or cover letter). " +
        "You ONLY use the comments provided. Do NOT invent issues or strengths that are not present. " +
        "Group similar comments into themes, identify strengths, and suggest improvements. " +
        "Output MUST be valid JSON matching the provided schema. " +
        "Do not include markdown, emojis, or any text outside of the JSON.",
    });

    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        themes: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              label: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              frequency: { type: SchemaType.NUMBER },
              exampleComments: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
            },
            required: ["label", "description"],
          },
        },
        strengths: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        improvementSuggestions: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
      },
      required: ["themes", "strengths", "improvementSuggestions"],
    };

    const prompt =
      `You are analyzing review feedback for a job application document (Resume).\n\n` +
      `=== DOCUMENT CONTEXT ===\n${documentContext || "Not provided."}\n\n` +
      `=== REVIEW COMMENTS ===\n` +
      `${commentsBlock}\n\n` +
      `Hard constraints:\n` +
      `- Use ONLY the information in the comments.\n` +
      `- Group related comments into 3–7 themes.\n` +
      `- For each theme, explain briefly what reviewers are saying.\n` +
      `- Identify 2–6 strengths reviewers highlighted.\n` +
      `- Identify 3–7 improvement suggestions.\n` +
      `- Output VALID JSON matching the schema.\n` +
      `- No markdown, no emojis, no extra commentary.\n`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        topP: 0.9,
        maxOutputTokens: 768,
        candidateCount: 1,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const candidates = result.response?.candidates || [];
    if (!candidates.length) {
      return null;
    }

    const rawText =
      candidates[0].content?.parts?.[0]?.text || candidates[0].text || "";
    if (!rawText) {
      return null;
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      console.error("❌ Failed to parse Gemini feedback summary JSON:", err);
      return null;
    }

    if (!Array.isArray(parsed.themes)) parsed.themes = [];
    if (!Array.isArray(parsed.strengths)) parsed.strengths = [];
    if (!Array.isArray(parsed.improvementSuggestions))
      parsed.improvementSuggestions = [];

    parsed.themes = parsed.themes.map((t) => ({
      label: t.label || "General",
      description: t.description || "",
      frequency:
        typeof t.frequency === "number" && Number.isFinite(t.frequency)
          ? t.frequency
          : 0,
      exampleComments: Array.isArray(t.exampleComments)
        ? t.exampleComments
        : [],
    }));

    return {
      themes: parsed.themes,
      strengths: parsed.strengths,
      improvementSuggestions: parsed.improvementSuggestions,
    };
  } catch (err) {
    console.error("❌ Gemini feedback summary failed:", err?.message || err);
    return null; // important: never break the feature, just drop AI
  }
}