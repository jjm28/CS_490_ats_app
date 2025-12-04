import { getDb } from '../db/connection.js';
import { ObjectId } from "mongodb";
import axios from 'axios';
import { listEmployment } from "../services/employment.service.js";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import Coverletter from '../models/coverletters.js';
import profile from '../models/profile.js';
import { sendDocumentAccessEmail, sendSupporterInviteEmail } from './emailService.js';
const cache = new Map();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY_FOR_COVERLETTER);

export async function createCoverletter({ userid, filename, lastSaved,templateKey},coverletterdata) {
  const db = getDb();
  const coverletters = db.collection('coverletters');

  const doc = {
    owner: userid,
    filename,
    templateKey,
    coverletterdata,
    lastSaved,
    workflowStatus: "draft",
    approvedBy: null,
    approvedByName: null,
    approvedAt: null,
  };


  const res = await coverletters.insertOne(doc);
  return { _id: res.insertedId, owner: doc.id };
}

export async function updateCoverletter({ coverletterid,userid, filename, lastSaved},coverletterdata) {
  const db = getDb();

  const doc = {
    filename: filename,
    coverletterdata: coverletterdata,
    lastSaved: lastSaved
  };
      const result = await db
      .collection("coverletters")
      .updateOne(
        { _id: new ObjectId(coverletterid), owner: userid }, 
        { $set: doc }
      );

    if (result.matchedCount === 0) {
      return { message: "CoverLetter not found" };
    }

  return { _id: coverletterid};
}

export async function updateCoverletterSharedsettings({ coverletterid,userid,visibility,allowComments,reviewDeadline}) {
 
    const update = {};
    if (visibility) update.visibility = visibility;
    if (typeof allowComments === "boolean") update.allowComments = allowComments;
    if (reviewDeadline) update.reviewDeadline = reviewDeadline
    const updated = await Coverletter.findOneAndUpdate(
      { _id: new ObjectId(coverletterid), owner: userid },      // ensure user owns this cover letter
      { $set: update },        // update ONLY the provided fields
      { new: true }
    );

    if (!updated) {
     console.log( "Cover letter not found" );
    }


}

export async function updateCoverletterSharedreviewer({ coverletterid,userid,visibility,allowComments,reviewDeadline}) {
 
    const update = {};
    if (visibility) update.visibility = visibility;
    if (typeof allowComments === "boolean") update.allowComments = allowComments;
    if (reviewDeadline) update.reviewDeadline = reviewDeadline
    const updated = await Coverletter.findOneAndUpdate(
      { _id: new ObjectId(coverletterid), owner: userid },      // ensure user owns this cover letter
      { $set: update },        // update ONLY the provided fields
      { new: true }
    );

    if (!updated) {
     console.log( "Cover letter not found" );
    }


}

export async function addreviewerCoverletterSharedsettings({ coverletterid,userId,toemail,role ,canComment,canResolve}) {
 


   const baseFilter = {
  _id: new ObjectId(coverletterid),
  owner: userId,
};

const reviewerFields = {
  role,
  canComment,
  canResolve,
  status: "invited",
  lastActivityAt: new Date(),
};

let updated = await Coverletter.findOneAndUpdate(
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
  updated = await Coverletter.findOneAndUpdate(
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



export async function removereviewerCoverletterSharedsettings({ coverletterid,userId,email}) {
 


    const updated = await Coverletter.updateMany(
      { _id: new ObjectId(coverletterid), owner: userId },      // ensure user owns this cover letter
      { $pull: {reviewers: { email: email }}},        // update ONLY the provided fields
      { new: true }
    );

    if (!updated) {
     console.log( "Cover letter not found" );
    }


}
/**
 * Invite a supporter for this user.
 */
export async function inviteReviewer({ownerUserId,
  email,
  url, role, reviewDeadline
}) {
  const db = getDb()
    const users = await db.collection("profiles").findOne({ userId:ownerUserId  },    { projection: {fullName:1} })

  // Fire-and-forget email sending (don't block the main response on failure)
  try {
    console.log(reviewDeadline)
    await sendDocumentAccessEmail({toEmail: email,sharedurl: url,grantedBy: users.fullName,  role: role, reviewDeadline: reviewDeadline})
  } catch (e) {
    console.error("Error sending supporter invite email:", e);
    // You might want to log this to monitoring, but we still return supporter
  }

  return true;
}
export async function getCoverletter({ userid,coverletterid}) {
  const db = getDb();
  let result;
  if (coverletterid == undefined){
   result = await db
    .collection("coverletters")
    .find(
      { owner: userid },
      { projection: { _id: 1, filename: 1, templateKey: 1, lastSaved: 1 } }
    )
    .toArray();
  }
  else {
       result = await db
    .collection("coverletters")
    .findOne(  { _id: new ObjectId(coverletterid), owner: userid}    )
  }

  return result ;
}



export async function createSharedLink({ userid,coverletterid,coverletterdata}) {
  const db = getDb();
  const sharedcoverletters = db.collection('sharedcoverletters');
  
  const result = await db.collection("sharedcoverletters").updateOne(
  { coverletterid: coverletterid, owner: userid },  // filter
  { $set: { expiresAt: new Date() , coverletterdata: coverletterdata} }    );
  if (result.matchedCount == 1){
    const sharedcoverletter = await db
    .collection("sharedcoverletters")
    .findOne(  { coverletterid: coverletterid, owner: userid }    )
  return { sharedid: sharedcoverletter._id, url: `${process.env.FRONTEND_ORIGIN}/coverletter/share?sharedid=${sharedcoverletter._id}`, owner: sharedcoverletter._id };
  }
  const coverletter = await getCoverletter({userid,coverletterid})
  delete coverletter._id;
  coverletter.expiresAt = new Date()
  coverletter.coverletterid = coverletterid

  const res = await sharedcoverletters.insertOne(coverletter);
  return { sharedid: res.insertedId, url: `${process.env.FRONTEND_ORIGIN}/coverletter/share?sharedid=${res.insertedId}`, owner: coverletter.owner };
}

export async function fetchSharedCoverletter({ sharedid,currentUseremail}) {
    const db = getDb();
    const sharedcoverletter = await db
    .collection("sharedcoverletters")
    .findOne(  { _id: new ObjectId(sharedid) } )

    const accesscontrollsettings = await Coverletter.findOne(
      { _id: new ObjectId(sharedcoverletter.coverletterid), owner: sharedcoverletter.owner }, 
    ).select("allowComments visibility restricteduserid reviewers reviewDeadline");
    const users = await db.collection("profiles").findOne({ userId: sharedcoverletter.owner  },    { projection: {fullName:1, email:1} })

    if (!accesscontrollsettings) {
     console.log( "Cover letter not found" );
    }

  const sharing= {
      ownerName: users.fullName || null,   // optional, you can populate later
      ownerEmail: users.ownerEmail || null, // optional
      visibility: accesscontrollsettings._doc.visibility || "unlisted",
      allowComments:accesscontrollsettings._doc.allowComments,
      canComment: null,
      
    }

    const comments =  sharedcoverletter.comments || []

const updated = await Coverletter.findOneAndUpdate(
  {_id: new ObjectId(sharedcoverletter.coverletterid), owner: sharedcoverletter.owner,     "reviewers.email": currentUseremail},
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

    return { ...sharedcoverletter, ...accesscontrollsettings._doc , sharing, comments} 

}
export async function addSharedCoverletterComment({
  sharedid,
  viewerid,
  message,
  currentUseremail
}) {
  const db = getDb();
  const coll = db.collection("sharedcoverletters");

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
console.log(currentUseremail)

  const updatedstatus = await Coverletter.findOneAndUpdate(
  {_id: new ObjectId(doc.coverletterid), owner: doc.owner,  "reviewers.email": currentUseremail},
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

export async function updateSharedCoverletterComment({
  sharedid,
  commentId,
  viewerid,
  resolved,
}) {
  const db = getDb();
  const coll = db.collection("sharedcoverletters");

  const doc = await coll.findOne({ _id: new ObjectId(sharedid) });
  if (!doc) return null;

  const isOwner = String(doc.owner) === String(viewerid);
 

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
export async function findmostpopular() {
    const db = getDb();

  try {
    const result = await db
      .collection("coverletters")
      .aggregate([
        { $match: { templateKey: { $exists: true, $ne: null } } },
        { $group: { _id: "$templateKey", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } }, // sort by count desc, then alphabetically
        { $limit: 1 },
      ])
      .toArray();

    if (result.length > 0) {
      return {templateKey: result[0]._id}; // the most frequent templateKey
    } else {
      return null;
    }
  } catch (err) {
    console.error("Error while aggregating:", err);
    return null;
  }

}

export async function GetRelevantinfofromuser(UserID) {

    const db = getDb();
    const EmploymentHistory = await db      
      .collection("employments")
      .find({ userId: UserID },{ projection: { userId: 0, _id: 0, createdAt: 0, updatedAt: 0 } })
      .toArray();

    const EducationHistory = await db
      .collection("education")
      .find({ userId: UserID },{ projection: { userId: 0, _id: 0} })
      .toArray();
      
    const ProfileHistory = await db
    .collection("profiles")
    .findOne({ userId: UserID },{ projection: { userId: 0, _id: 0, createdAt: 0, updatedAt: 0 } });
    const ProjectHistory = await db
    .collection("projects")
    .find({ userId: UserID },{ projection: { userId: 0, _id: 0}})
    .toArray();
    const skills = await db
    .collection("skills")
    .find({ userId: UserID },{ projection: { userId: 0, _id: 0} })
    .toArray();
    const CertificationHistory = await db
    .collection("certifications")
    .find({ userId: UserID },{ projection: { userId: 0, _id: 0} })
    .toArray();
  return {EducationHistory,EmploymentHistory,ProfileHistory,ProjectHistory,skills,CertificationHistory}
}


export async function GenerateCoverletterBasedON(userProfile, company, job, opts = {}) {
  const { temperature = 0.8, maxWords = 450, candidateCount = 3 } = opts;

    console.log("🔵 GenerateCoverletterBasedON → opts.experienceMode:", opts.experienceMode);
    console.log("📌 EmploymentHistory length:", userProfile.EmploymentHistory?.length);

   const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are a professional cover-letter writing assistant. " +
      "Output must be valid JSON matching the provided schema. " +
      "Prioritize alignment with the provided JOB DESCRIPTION and its keywords. " +
      "Tone, style, and paragraph structure are hard constraints, not suggestions. " +
      "If asked for bullet points, output bullet-style sentences (each starting with '-') instead of paragraphs. " +
      "If asked for brief, limit to one paragraph. " +
      "If asked for detailed, output 3–4 full paragraphs. " +
      "Never ignore these style parameters. " +
      "Never fabricate facts. " +
      "Never include markdown, emojis, or formatting outside plain text."
       /*"Requirements: " +
      "(1) Opening paragraph must personalize to the company and the specific role (title/team/location) and briefly state fit. " +
      "(2) Create 1–3 body paragraphs mapping the candidate's most relevant experience/skills/projects to the JOB requirements/responsibilities; " +
      "use specific achievements with quantifiable results (%, $, time, scale, latency, users). " +
      "(3) Naturally weave in important JOB keywords (no keyword stuffing). " +
      "(4) Incorporate company culture/values and recent news if provided. " +
      "(5) Professional tone matched to company culture; no bullet lists inside paragraphs; no markdown/emojis. " +
      "(6) Do NOT fabricate facts. Omit anything not present in the inputs.", */
  });

  // --- Response schema stays identical ---
  const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
      recipientLines: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      greeting: { type: SchemaType.STRING },
      paragraphs: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      closing: { type: SchemaType.STRING },
      signatureNote: { type: SchemaType.STRING },
          relevantExperiences: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          company: { type: SchemaType.STRING },
          relevanceScore: { type: SchemaType.NUMBER },
          reason: { type: SchemaType.STRING },
        },
        required: ["title", "company", "relevanceScore", "reason"],
      }
    }
    },
    required: ["recipientLines", "greeting", "paragraphs", "closing", "signatureNote"],
  };

  // === Prompt Assembly (same logic as your current version) ===
  const fmtMonthYear = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const skillsList = (userProfile.skills || []).map(s => s?.name).filter(Boolean);
  const nameLine = userProfile.ProfileHistory?.fullName || "—";
  const contactLine = [
    userProfile.ProfileHistory?.email,
    userProfile.ProfileHistory?.phone,
    [userProfile.ProfileHistory?.location?.city, userProfile.ProfileHistory?.location?.state].filter(Boolean).join(", ")
  ].filter(Boolean).join(" | ");

  const ctxUser = [
    `Name: ${nameLine}`,
    contactLine ? `Contact: ${contactLine}` : null,
    `Skills: ${skillsList.length ? skillsList.join(", ") : "—"}`
  ].filter(Boolean).join("\n");

  const ctxCompany = [
    `Company: ${company.name}`,
    `Mission: ${company.mission || "—"}`,
    `Values: ${company.values?.join?.(", ") || "—"}`,
    `Culture: ${company.cultureTraits?.join(", ") || "—"}`,
    `Industry: ${company.industry || "—"}`,
    `Recent News: ${(company.recentNews || []).slice(0, 3).map(n => n.title).join("; ") || "—"}`
  ].join("\n");

  const ctxJob = [
    `Job Title: ${job.jobTitle || "—"}`,
    `Description: ${job.description || "—"}`,
    `Location: ${job.location || "—"}`
  ].join("\n");

  const hardConstraints = `
Hard constraints:
- Use ≤ ${maxWords} words total
- 2–4 paragraphs (opening, 1–2 body, closing)
- Include mission/values if present
- Output valid JSON matching schema
`;

opts = opts || {};

const tone = opts.toneSettings?.tone || "formal";
const style = opts.toneSettings?.style || "narrative";
const culture = opts.toneSettings?.culture || "corporate";
const lengthPref = opts.toneSettings?.length || "standard";
const customTone = opts.toneSettings?.custom?.trim();

let toneGuidance = `
Desired tone: ${tone}.
Writing style: ${style}.
Company culture: ${culture}.
Preferred length: ${lengthPref}.
`;

if (customTone) {
  toneGuidance += `Custom tone instruction: ${customTone}\n`;
}

// Add tone guidance into model instruction 
const dynamicInstruction = `
STRICT STYLE ENFORCEMENT (do not ignore):
Tone: ${tone} — choose vocabulary and sentence structure that reflect this tone.
Writing Style: ${style} — ${
  style === "bullet"
    ? "Write in bullet point format using '-' at the start of each item. Keep 3–6 concise bullets."
    : style === "direct"
    ? "Use short, direct sentences with minimal fluff."
    : "Use narrative flow with natural transitions."
}
Company Culture: ${culture} — ${
  culture === "startup"
    ? "Casual, ambitious, creative tone. Show adaptability and enthusiasm."
    : "Formal, professional tone emphasizing expertise and reliability."
}
Length: ${lengthPref} — ${
  lengthPref === "brief"
    ? "Produce only ONE short paragraph (<=150 words)."
    : lengthPref === "detailed"
    ? "Produce 3–4 detailed paragraphs (up to 450 words total)."
    : "Produce 2–3 balanced paragraphs (250–350 words)."
}

${customTone ? `Additional tone notes: ${customTone}` : ""}
⚠️ Violating these will cause your output to be rejected.
- Maintain tone consistency across all text.
- No markdown, emojis, or HTML tags.
`;

// 🔍 New Experience Analysis Instruction
const experienceInstruction = `
Experience Highlighting Mode:
- Compare the user's EmploymentHistory, ProjectHistory, and Certifications with the job description.
- Select the 2–4 most relevant experiences.
- For each, write a short explanation of its relevance to the job.
- Quantify achievements (%, $, time, users) where possible.
- Assign a relevanceScore (1–100).
- Integrate the most relevant experiences naturally into the body paragraphs.
- Output a structured JSON array "relevantExperiences" listing:
  [ { "title": string, "company": string, "relevanceScore": number, "reason": string } ].
If the user did not enable Experience Highlighting, skip this section.
`;
  // --- Build structured employment experience block ---
const experienceBlock = (userProfile.EmploymentHistory || [])
  .map(exp => {
    return `
Experience:
- Title: ${exp.jobTitle}
- Company: ${exp.company}
- Dates: ${fmtMonthYear(exp.startDate)} to ${exp.currentPosition ? "Present" : fmtMonthYear(exp.endDate)}
- Description: ${exp.description || "No description provided"}
- Location: ${exp.location || "Not specified"}
`;
  })
  .join("\n");

  //const prompt = `=== USER ===\n${ctxUser}\n\n=== COMPANY ===\n${ctxCompany}\n\n=== JOB ===\n${ctxJob}\n\n${hardConstraints}`;
  const prompt =
  `Use ONLY the following data. If a fact is missing, omit it.\n\n` +
  `=== USER PROFILE ===\n${ctxUser}\n\n` +
  `=== EXPERIENCE HISTORY ===\n${experienceBlock}\n\n` +
  `=== COMPANY ===\n${ctxCompany}\n\n` +
  `=== JOB ===\n${ctxJob}\n\n` +
  dynamicInstruction + 
  (opts?.experienceMode ? experienceInstruction : "") +
  hardConstraints;

  /*const cacheKey = `${company.name?.toLowerCase()}_${job.jobTitle?.toLowerCase()}_${nameLine}`;
  if (cache.has(cacheKey)) {
    console.log("🗃️ Using cached cover letter for", cacheKey);
    return cache.get(cacheKey);
  }*/
  // 🧠 Make cache aware of tone & style so each combo generates fresh output
const toneKey = [
  opts?.toneSettings?.tone,
  opts?.toneSettings?.style,
  opts?.toneSettings?.culture,
  opts?.toneSettings?.length,
  opts?.toneSettings?.custom,
  opts?.experienceMode ? "expMode" : ""
].filter(Boolean).join("_").toLowerCase();

const cacheKey = `${company.name?.toLowerCase() || "unknown"}_${job.jobTitle?.toLowerCase() || "unknown"}_${nameLine}_${toneKey}`;

if (cache.has(cacheKey)) {
  console.log("🗃️ Using cached cover letter for", cacheKey);
  return cache.get(cacheKey);
}

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        topP: 0.9,
        maxOutputTokens: 1600,
        candidateCount,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const candidates = result.response?.candidates || [];
    if (candidates.length === 0) throw new Error("Model returned no candidates.");
    const parsedCandidates = [];

    for (const [i, c] of candidates.entries()) {
      try {
        const text = c.content.parts?.[0]?.text || c.text || "";
        const parsed = JSON.parse(text);
        console.log("🟣 Model relevantExperiences:", parsed.relevantExperiences);
        // --- Normalize fields ---
        if (typeof parsed.paragraphs === "string") parsed.paragraphs = [parsed.paragraphs];
        if (!Array.isArray(parsed.paragraphs)) parsed.paragraphs = [];
        if (!Array.isArray(parsed.relevantExperiences)) parsed.relevantExperiences = [];
        console.log("🟣 Model relevantExperiences:", parsed.relevantExperiences);

        // --- Apply style and length fixes ---
        const style = opts?.toneSettings?.style ?? "narrative";
        const lengthPref = opts?.toneSettings?.length ?? "standard";
        const tone = opts?.toneSettings?.tone ?? "formal";
        const culture = opts?.toneSettings?.culture ?? "corporate";
        // AUTO-INJECT EXPERIENCE HIGHLIGHTS INTO PARAGRAPHS
        console.log("⭐ experienceMode?", opts.experienceMode);
console.log("⭐ parsed.relevantExperiences:", parsed.relevantExperiences);
console.log("⭐ paragraphs before injection:", parsed.paragraphs);
        if (opts?.experienceMode && parsed.relevantExperiences.length > 0) {
          const expLines = parsed.relevantExperiences
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 2) // take top 2–3 most relevant
          .map(exp => 
          `In my role at ${exp.company}, I gained relevant experience as a ${exp.title}. ${exp.reason}`
        );

          // Push into paragraph #2 (body)
        if (parsed.paragraphs.length >= 2) {
          parsed.paragraphs.splice(1, 0, ...expLines);
          } else {
          parsed.paragraphs.push(...expLines);
          }
        }

        console.log("⭐ paragraphs after injection:", parsed.paragraphs);

        // 💬 Tone/culture modifiers
        const tonePrefix =
          tone === "enthusiastic"
            ? "I’m truly excited to share that "
            : tone === "analytical"
            ? "After carefully evaluating this opportunity, "
            : tone === "casual"
            ? "I’m reaching out because "
            : ""; // formal = no prefix

        const cultureSuffix =
          culture === "startup"
            ? " I value creativity, agility, and hands-on impact that startups thrive on."
            : " I value professionalism, structured collaboration, and strategic growth.";

        // 🧩 Style = bullet → 3–5 concise points
        
        if (style === "bullet") {
  // Convert text to bullet points
  let bullets = parsed.paragraphs
    .flatMap(p => p.split(/[\.\n]/).map(x => x.trim()).filter(Boolean))
    .map(p => (p.startsWith("-") ? p : `- ${p}`));

  // Adjust bullet count according to length preference
  if (lengthPref === "brief") {
    bullets = bullets.slice(0, 3); // short list
  } else if (lengthPref === "standard") {
    bullets = bullets.slice(0, 4); // medium list
  } else if (lengthPref === "detailed") {
    // expand to simulate multi-paragraph coverage
    while (bullets.length < 8) {
      bullets.push(`- Additional point highlighting achievements or fit (${bullets.length + 1})`);
    }
  }

  parsed.paragraphs = bullets;
} else {
  // paragraph styles
  if (lengthPref === "brief") {
    // Keep ONLY the first paragraph
    if (parsed.paragraphs.length > 1) {
      parsed.paragraphs = [parsed.paragraphs[0]];
    }
  }

  else if (lengthPref === "standard") {
    // Ensure 2–3 paragraphs
    if (parsed.paragraphs.length < 2) {
      // Not enough → add a second paragraph
      parsed.paragraphs.push(
        "I am confident that my skills and background align well with the needs of this role."
      );
    }

    if (parsed.paragraphs.length < 3) {
      // Optionally add a third paragraph to hit 3 if needed
      parsed.paragraphs.push(
        "I welcome the opportunity to further discuss how I can contribute to your team."
      );
    }

    // If more than 3, trim down to 3
    if (parsed.paragraphs.length > 3) {
      parsed.paragraphs = parsed.paragraphs.slice(0, 3);
    }
  }

  else if (lengthPref === "detailed") {
    if (parsed.paragraphs.length < 3) {
      parsed.paragraphs = [
        ...parsed.paragraphs,
        "I am confident that my skills and experience make me a strong fit for this position.",
        "I would welcome the opportunity to discuss how I can contribute to your team.",
      ];
    }
  }
}


        // ✨ Tone & culture text injection
        if (parsed.paragraphs.length > 0) {
          parsed.paragraphs[0] = `${tonePrefix}${parsed.paragraphs[0]}${cultureSuffix}`;
        }

        // --- Standardize other fields ---
        parsed.recipientLines ??= ["Hiring Manager", company.name, new Date().toLocaleDateString()];
        parsed.greeting ??= "Dear Hiring Manager,";
        parsed.closing ??= "Sincerely,";
        parsed.signatureNote ??= userProfile.ProfileHistory?.fullName || "Your Name";
        parsed.name = userProfile.ProfileHistory?.fullName || "Your Name";
        parsed.phonenumber = userProfile.ProfileHistory?.phone || "Phone";
        parsed.email = userProfile.ProfileHistory?.email || "Email";
        parsed.address = [userProfile.ProfileHistory?.location?.city, userProfile.ProfileHistory?.location?.state]
          .filter(Boolean)
          .join(", ");
        parsed.date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

        parsedCandidates.push(parsed);

      } catch (err) {
        console.error(`Candidate ${i + 1} parse error:`, err.message);
      }
    }

    const finalResult = { parsedCandidates };
    if (cache.size > 50) {
      console.log("🧹 Clearing cache after reaching 50 entries");
      cache.clear();
    }
    cache.set(cacheKey, finalResult);
    
    return finalResult;

  } catch (err) {
    console.error("❌ Gemini generation failed:", err.message);

    // --- fallback for 429 Too Many Requests ---
    if (err.status === 429 || /Too Many Requests/i.test(err.message)) {
      const fallbackLetter = {
        recipientLines: ["Hiring Manager", company.name, new Date().toDateString()],
        greeting: "Dear Hiring Manager,",
        paragraphs: [
          `I am excited to apply for the ${job.jobTitle} role at ${company.name}. Your mission "${company.mission || "Not specified"}" aligns strongly with my values.`,
          `With skills in ${(skillsList.slice(0, 3).join(", ") || "relevant experience")}, I am confident in contributing to ${company.name}'s continued success.`,
          `I would welcome the chance to join your team and contribute to ${company.name}'s growth.`
        ],
        closing: "Sincerely,",
        signatureNote: userProfile.ProfileHistory?.fullName || "Your Name",
        name: userProfile.ProfileHistory?.fullName || "Your Name",
        phonenumber: userProfile.ProfileHistory?.phone || "",
        email: userProfile.ProfileHistory?.email || "",
        address: [userProfile.ProfileHistory?.location?.city, userProfile.ProfileHistory?.location?.state].filter(Boolean).join(", "),
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      };

      console.warn("⚠️ Gemini quota hit — returning fallback letter.");
      return { parsedCandidates: [fallbackLetter] };
    }

    // Re-throw other errors
    throw err;
  }
}
// -------------------------------------------------------
// ✨ AI — Paragraph Rewrite
// -------------------------------------------------------
export async function rewriteParagraph(text, mode = "clearer") {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
Rewrite the following COVER LETTER paragraph.
Maintain the same meaning, do NOT fabricate new facts.
Rewrite it in a "${mode}" style.

TEXT:
"${text}"
  `;

  try {
    const result = await model.generateContent(prompt);
    return result?.response?.text()?.trim() || text;
  } catch (err) {
    console.error("rewriteParagraph error:", err.message);
    return text; // fallback
  }
}



// -------------------------------------------------------
// ✨ AI — Full Writing Suggestions (Structure, Flow, Clarity)
// -------------------------------------------------------
export async function analyzeWriting(paragraphs) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
Provide **5 bullet-point suggestions** to improve the writing quality
of this cover letter. Focus ONLY on:

- clarity
- readability
- sentence structure
- flow / transitions
- tone consistency

DO NOT rewrite the letter — only provide suggestions.

TEXT:
${paragraphs.join("\n\n")}
  `;

  try {
    const result = await model.generateContent(prompt);
    const raw = result?.response?.text() || "";
    return raw.replace(/\*/g, "").split("\n").filter(Boolean);
  } catch (err) {
    console.error("analyzeWriting error:", err.message);
    return ["Unable to generate suggestions at this time."];
  }
}



// -------------------------------------------------------
// ✨ AI — Gemini Synonyms (Word Variety)
// -------------------------------------------------------
export async function geminiSynonyms(word) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
Provide 5 synonyms for the word "${word}" that would fit naturally in a
PROFESSIONAL COVER LETTER. Return ONLY a comma-separated list.

Example:
efficient → productive, streamlined, effective, optimized, high-performing
  `;

  try {
    const result = await model.generateContent(prompt);
    const raw = result?.response?.text() || "";
    return raw.split(",").map(w => w.trim()).filter(Boolean);
  } catch (err) {
    console.error("geminiSynonyms error:", err.message);
    return [];
  }
}
export async function getCoverletterFeedbackSummary({ userid, coverletterid }) {
  const db = getDb();

  // 1) Load cover letter with reviewers
  const coverletter = await Coverletter.findOne(
    { _id: new ObjectId(coverletterid), owner: userid },
    { reviewers: 1, workflowStatus: 1 }
  ).lean();

  if (!coverletter) {
    const error = new Error("Cover letter not found");
    error.statusCode = 404;
    throw error;
  }

  const reviewers = Array.isArray(coverletter.reviewers)
    ? coverletter.reviewers
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

  // 3) Load comments from sharedcoverletters (if they exist)
  const sharedDoc = await db
    .collection("sharedcoverletters")
    .findOne(
      { coverletterid, owner: userid },
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
    coverletter.workflowStatus
      ? `Workflow status: ${coverletter.workflowStatus}`
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
    coverletterId: coverletterid,
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
      `You are analyzing review feedback for a job application document (cover letter).\n\n` +
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

// 🔹 Track review impact on application success rates

/**
 * Record a snapshot of the coverletter's review state at the time of an application event.
 *
 * @param {Object} params
 * @param {string} params.userid         - Owner user id
 * @param {string} params.coverletterid  - Coverletter id
 * @param {string} params.jobId          - Job/application id (string from your jobs system)
 * @param {string} [params.jobTitle]     - Optional job title
 * @param {string} [params.companyName]  - Optional company name
 * @param {string} [params.outcome]      - Optional outcome tag: "applied", "interview", "offer", "rejected", etc.
 */
export async function recordCoverletterApplicationSnapshot({
  userid,
  coverletterid,
  jobId,
  jobTitle,
  companyName,
  outcome = "applied",
}) {
  if (!userid || !coverletterid || !jobId) {
    const err = new Error("Missing userid, coverletterid, or jobId");
    err.statusCode = 400;
    throw err;
  }

  const db = getDb();

  // 1) Load coverletter reviewers + workflow
  const coverletter = await Coverletter.findOne(
    { _id: new ObjectId(coverletterid), owner: userid },
    { reviewers: 1, workflowStatus: 1 }
  ).lean();

  if (!coverletter) {
    const err = new Error("Cover letter not found");
    err.statusCode = 404;
    throw err;
  }

  const reviewers = Array.isArray(coverletter.reviewers)
    ? coverletter.reviewers
    : [];
  const totalReviewers = reviewers.length;

  const statusCounts = reviewers.reduce((acc, r) => {
    const status = r.status || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // 2) Load comments from sharedcoverletters
  const sharedDoc = await db.collection("sharedcoverletters").findOne(
    {
      coverletterid,
      owner: userid,
    },
    { projection: { comments: 1 } }
  );

  const comments = Array.isArray(sharedDoc?.comments)
    ? sharedDoc.comments
    : [];

  const totalComments = comments.length;
  const resolvedComments = comments.filter((c) => c.resolved).length;
  const openComments = totalComments - resolvedComments;

  // Role-level stats
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
    if (!roleStats || !email) continue;
    roleStats.comments += commentsByEmail[email] || 0;
    roleStats.resolvedComments += resolvedByEmail[email] || 0;
  }

  const byRole = Object.values(byRoleMap);

  // Compute a simple "reviewed" flag: has reviewers OR comments OR non-draft status
  const workflowStatus = coverletter.workflowStatus || "draft";
  const isReviewed =
    totalReviewers > 0 ||
    totalComments > 0 ||
    workflowStatus !== "draft";

  const reviewCompletedCount =
    statusCounts.completed || statusCounts["completed"] || 0;
  const percentReviewersCompleted =
    totalReviewers > 0
      ? Math.round((reviewCompletedCount / totalReviewers) * 100)
      : 0;

  const snapshots = db.collection("coverletter_review_impact");

  const doc = {
    owner: userid,
    coverletterId: coverletterid,
    jobId,
    jobTitle: jobTitle || null,
    companyName: companyName || null,
    outcome, // "applied" | "interview" | "offer" | "rejected" | ...
    snapshotAt: new Date(),

    reviewStats: {
      workflowStatus,
      isReviewed,
      totalReviewers,
      statusCounts,
      totalComments,
      openComments,
      resolvedComments,
      byRole,
      percentReviewersCompleted,
    },
  };

  const result = await snapshots.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

/**
 * Aggregate metrics for how reviewed vs non-reviewed cover letters
 * correlate with application outcomes for a given user.
 *
 * Groups by "reviewed" flag and by workflowStatus.
 */
export async function getCoverletterReviewImpactMetrics({ userid }) {
  if (!userid) {
    const err = new Error("Missing userid");
    err.statusCode = 400;
    throw err;
  }

  const db = getDb();
  const snapshots = await db
    .collection("coverletter_review_impact")
    .find({ owner: userid })
    .sort({ snapshotAt: 1 })
    .toArray();

  const totalApplications = snapshots.length;

  // helper: categorize we consider "interview" vs "offer"
  const isInterview = (outcome) =>
    ["interview", "onsite", "final"].includes(
      String(outcome || "").toLowerCase()
    );
  const isOffer = (outcome) =>
    ["offer", "accepted_offer"].includes(
      String(outcome || "").toLowerCase()
    );

  const initBucket = () => ({
    applications: 0,
    interviews: 0,
    offers: 0,
  });

  const withReviewed = initBucket();
  const withoutReviewed = initBucket();

  const byWorkflowStatus = {};

  for (const snap of snapshots) {
    const { reviewStats, outcome } = snap;
    const reviewed = reviewStats?.isReviewed ? true : false;
    const wf = reviewStats?.workflowStatus || "unknown";

    if (!byWorkflowStatus[wf]) {
      byWorkflowStatus[wf] = initBucket();
    }

    const targetBucket = reviewed ? withReviewed : withoutReviewed;
    const wfBucket = byWorkflowStatus[wf];

    targetBucket.applications += 1;
    wfBucket.applications += 1;

    if (isInterview(outcome)) {
      targetBucket.interviews += 1;
      wfBucket.interviews += 1;
    }
    if (isOffer(outcome)) {
      targetBucket.offers += 1;
      wfBucket.offers += 1;
    }
  }

  const computeRates = (bucket) => {
    if (bucket.applications === 0) {
      return { ...bucket, interviewRate: 0, offerRate: 0 };
    }
    return {
      ...bucket,
      interviewRate: bucket.interviews / bucket.applications,
      offerRate: bucket.offers / bucket.applications,
    };
  };

  const withReviewedStats = computeRates(withReviewed);
  const withoutReviewedStats = computeRates(withoutReviewed);

  const breakdownByWorkflowStatus = Object.entries(byWorkflowStatus).map(
    ([workflowStatus, bucket]) => ({
      workflowStatus,
      ...computeRates(bucket),
    })
  );

  return {
    totalApplications,
    withReviewed: withReviewedStats,
    withoutReviewed: withoutReviewedStats,
    breakdownByWorkflowStatus,
  };
}


/*export async function GenerateCoverletterBasedON(userProfile, company, job, opts = {}) {
  const { temperature = 0.8, maxWords = 450 ,candidateCount= 3 } = opts;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are a professional cover-letter writing assistant. " +
      "Output must be valid JSON matching the provided schema. " +
      "Prioritize alignment with the provided JOB DESCRIPTION and its keywords. " +
      "Requirements: " +
      "(1) Opening paragraph must personalize to the company and the specific role (title/team/location) and briefly state fit. " +
      "(2) Create 1–3 body paragraphs mapping the candidate's most relevant experience/skills/projects to the JOB requirements/responsibilities; " +
      "use specific achievements with quantifiable results (%, $, time, scale, latency, users). " +
      "(3) Naturally weave in important JOB keywords (no keyword stuffing). " +
      "(4) Incorporate company culture/values and recent news if provided. " +
      "(5) Professional tone matched to company culture; no bullet lists inside paragraphs; no markdown/emojis. " +
      "(6) Do NOT fabricate facts. Omit anything not present in the inputs.",
  });

  // Enforce the CoverLetterData shape (compatible subset of schema)
  const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
      recipientLines: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      greeting: { type: SchemaType.STRING },
      paragraphs: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, // we’ll normalize to allow string later
      closing: { type: SchemaType.STRING },
      signatureNote: { type: SchemaType.STRING },
    },
    required: ["recipientLines", "greeting", "paragraphs", "closing", "signatureNote"],
  };

const fmtMonthYear = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return iso; // keep raw if parsing fails
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const skillsList =
  (userProfile.skills || [])
    .map(s => s?.name)
    .filter(Boolean);

const educationLine = (() => {
  const ed = (userProfile.EducationHistory || [])[0];
  if (!ed) return "—";
  const grad = fmtMonthYear(ed.graduationDate);
  const bits = [
    [ed.degree, ed.fieldOfStudy].filter(Boolean).join(", "),
    ed.institution,
    grad ? `(${grad})` : null,
    ed.gpa ? `GPA ${ed.gpa}${ed.isPrivateGpa ? " (private)" : ""}` : null,
    ed.achievements || null
  ].filter(Boolean);
  return bits.join(" — ");
})();

const employmentLine =
  (userProfile.EmploymentHistory || [])
    .map(e => {
      const start = fmtMonthYear(e.startDate);
      const end = e.currentPosition ? "Present" : fmtMonthYear(e.endDate) || "Present";
      const span = (start || end) ? ` (${start || "—"}–${end})` : "";
      const desc = e.description ? ` | ${e.description}` : "";
      return `${e.jobTitle} @ ${e.company}${span}${e.location ? ` — ${e.location}` : ""}${desc}`;
    })
    .join(" || ") || "—";

const projectsLine =
  (userProfile.ProjectHistory || [])
    .map(p => {
      const start = fmtMonthYear(p.startDate);
      const end = fmtMonthYear(p.endDate);
      const tech = p.technologies ? `[${p.technologies}]` : "";
      const dates = (start || end) ? ` (${start || "—"}–${end || "—"})` : "";
      const extras = [p.outcomes, p.url].filter(Boolean).join(" — ");
      return `${p.name} ${tech}${dates}${p.role ? ` — ${p.role}` : ""}${extras ? ` — ${extras}` : ""}`;
    })
    .join(" || ") || "—";

const certsLine =
  (userProfile.CertificationHistory || [])
    .map(c => {
      const earned = fmtMonthYear(c.dateEarned);
      const exp = c.doesNotExpire ? "No Expiry" : (fmtMonthYear(c.expirationDate) || null);
      const tail = [earned, exp].filter(Boolean).join(", ");
      return `${c.name}${c.organization ? ` (${c.organization})` : ""}${tail ? ` — ${tail}` : ""}`;
    })
    .join(" || ") || "—";

const nameLine = userProfile.ProfileHistory?.fullName || "—";
const contactLine = [
  userProfile.ProfileHistory?.email,
  userProfile.ProfileHistory?.phone,
  [userProfile.ProfileHistory?.location?.city, userProfile.ProfileHistory?.location?.state].filter(Boolean).join(", ")
].filter(Boolean).join(" | ");

const headlineLine = userProfile.ProfileHistory?.headline || userProfile.ProfileHistory?.bio || "";

// Final compact text block for the prompt
const ctxUser = [
  `Name: ${nameLine}`,
  contactLine ? `Contact: ${contactLine}` : null,
  headlineLine ? `Headline: ${headlineLine}` : null,
  `Skills: ${skillsList.length ? skillsList.join(", ") : "—"}`,
  `Employment: ${employmentLine}`,
  `Education: ${educationLine}`,
  `Projects: ${projectsLine}`,
  `Certifications: ${certsLine}`
].filter(Boolean).join("\n");


const ctxJob = [
  `Job Title: ${job.jobTitle || "—"}`,
  job.company ? `Company: ${job.company}` : null,
  job.location ? `Location: ${job.location}` : null,
  job.industry ? `Industry: ${job.industry}` : null,
  job.type ? `Employment Type: ${job.type}` : null,
  job.status ? `Application Status: ${job.status}` : null,
  job.jobPostingUrl ? `Job Posting: ${job.jobPostingUrl}` : null,
  job.description ? `Description: ${job.description}` : null,
  job.statusHistory?.length
    ? `Status History: ${job.statusHistory.join(" → ")}`
    : null
].filter(Boolean).join("\n");


  const ctxCompany = [
    `Company: ${company.name}`,
    `Role Title: ${company.roleTitle}`,
    `Culture Traits: ${company.cultureTraits?.join(", ") || "—"}`,
    `Values: ${company.values?.join(", ") || "—"}`,
    `Products/Focus: ${company.productLines?.join(", ") || "—"}`,
    `Tone Hint: ${company.toneHint || "professional"}`,
  ].join("\n");


  const ctxNews = (company.recentNews?.length
    ? "Recent News:\n" + company.recentNews
        .slice(0, 3)
        .map((n, i) => `- [${i+1}] ${n.title}${n.date ? ` (${n.date})` : ""}${n.url ? ` — ${n.url}` : ""}\n  ${n.summary}`)
        .join("\n")
    : "Recent News: —");

const hardConstraints =
    `Hard constraints:\n` +
    `- Total words across all paragraphs ≤ ~${maxWords}.\n` +
    `- recipientLines: use role/company/location/date if available.\n` +
    `- greeting: 'Dear <Hiring Manager/Team>,' style.\n` +
    `- paragraphs: 2–4 total (opening + 1–2 body + short pre-signoff closing paragraph content).\n` +
    `- closing: short sign-off such as 'Sincerely,'.\n` +
    `- signatureNote: applicant name (and optional contact/title).\n` +
    `- Map experience explicitly to the most critical JOB requirements/responsibilities and include 3–6 natural JOB keywords.\n`;

  const prompt =
    `Use ONLY the following data. If a fact is missing, omit it.\n\n` +
    `=== USER PROFILE ===\n${ctxUser}\n\n` +
    `=== COMPANY ===\n${ctxCompany}\n\n` +
     `=== JOB ===\n${ctxJob}\n\n` +
    `=== COMPANY NEWS (optional) ===\n${ctxNews}\n\n` +
    
    hardConstraints;
try {
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      topP: 0.9,
      maxOutputTokens: 1600,
      candidateCount: candidateCount, 
      responseMimeType: "application/json",
      responseSchema, // <- strict CoverLetterData shape

    },
  });

  // Parse & normalize
  // Extract and parse all candidates (not just the first)
  const candidates = result.response?.candidates || [];

  if (candidates.length === 0) {
    throw new Error("Model returned no candidates.");
  }

  // Parse each candidate’s JSON text safely
  const parsedCandidates = [];
  for (const [i, c] of candidates.entries()) {
    let text = "";
    try {
      text = c.content.parts?.[0]?.text || c.text || "";
      const parsed = JSON.parse(text);

      // --- Normalize paragraphs and fields ---
      if (typeof parsed.paragraphs === "string") parsed.paragraphs = [parsed.paragraphs];
      if (!Array.isArray(parsed.paragraphs)) parsed.paragraphs = [];

      parsed.recipientLines ??= [];
      if (parsed.recipientLines.length === 0) {
        const today = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });
        parsed.recipientLines = ["Hiring Manager", `${company.name}`, today];
      }

      parsed.greeting = (parsed.greeting || "").trim();
      parsed.closing = (parsed.closing || "Sincerely,").trim();
      parsed.signatureNote = (parsed.signatureNote || userProfile.ProfileHistory?.fullName || "").trim();

      parsed.name = userProfile.ProfileHistory?.fullName ?? "Enter Name";
      parsed.phonenumber = userProfile.ProfileHistory?.phone ?? "Enter Phone Number";
      parsed.email = userProfile.ProfileHistory?.email ?? "Enter Email";
      parsed.address =
        [userProfile.ProfileHistory?.location?.city, userProfile.ProfileHistory?.location?.state]
          .filter(Boolean)
          .join(", ") || "Enter Address";

      const currentDate = new Date();
      parsed.date = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      }).format(currentDate);

      parsedCandidates.push(parsed);
    } catch (err) {
      console.error(`Candidate ${i + 1} failed to parse:`, err, text);
    }
  }

  if (parsedCandidates.length > 1) {

    return {parsedCandidates}; // array of CoverLetterData variations
  }

  const data = parsedCandidates[0];

  return {data};
}
catch (err){
      const msg = String((err && err.message) || err);
    const status = err && (err.status || err.code || err.statusCode);

    if (status === 429 || /rate|quota|exceed/i.test(msg)) {
      return { error: "rate_limit", message: msg };
    }
    if (status === 401 || status === 403 || /api key|unauthorized|invalid key|forbidden/i.test(msg)) {
      return { error: "auth", message: msg };
    }
    return { error: "generation_failed", message: msg };
}
}
=======
}*/

