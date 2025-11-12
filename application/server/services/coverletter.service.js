import { getDb } from '../db/connection.js';
import { ObjectId } from "mongodb";
import axios from 'axios';
import { listEmployment } from "../services/employment.service.js";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import profile from '../models/profile.js';
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY_FOR_COVERLETTER);

export async function createCoverletter({ userid, filename, lastSaved,templateKey},coverletterdata) {
  const db = getDb();
  const coverletters = db.collection('coverletters');

  const doc = {
    owner: userid,
    filename: filename,
    templateKey: templateKey,
    coverletterdata: coverletterdata,
    lastSaved: lastSaved
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

export async function fetchSharedCoverletter({ sharedid}) {
    const db = getDb();
    const sharedcoverletter = await db
    .collection("sharedcoverletters")
    .findOne(  { _id: new ObjectId(sharedid) } )
    return sharedcoverletter

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