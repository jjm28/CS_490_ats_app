import { getDb } from '../db/connection.js';
import { ObjectId, ReturnDocument, Timestamp } from "mongodb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';
import { SchemaType } from '@google/generative-ai';


export async function createReferee({ user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, tags, last_used_at, usage_count,availability_status,availability_other_note,preferred_opportunity_types,preferred_number_of_uses}) {
  const db = getDb();
  const references = db.collection('Referees');

  const doc =  { user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, tags, last_used_at, usage_count,availability_status,availability_other_note,preferred_opportunity_types,preferred_number_of_uses}

  const res = await references.insertOne(doc);
  return { _id: res.insertedId };
}

export async function updateReferee({ user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, tags, last_used_at, usage_count,referenceid,availability_status,availability_other_note,preferred_opportunity_types,preferred_number_of_uses}) {
  const db = getDb();

  const doc =  { user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, tags, last_used_at, usage_count,availability_status,availability_other_note,preferred_opportunity_types,preferred_number_of_uses}

      const result = await db
      .collection("Referees")
      .updateOne(
        { _id: new ObjectId(referenceid) }, 
        { $set: doc }
      );

    if (result.matchedCount === 0) {
      return { message: "Referee not found" };
    }

  return { _id: referenceid};
}

export async function getReferee({ userid=undefined,referee_id}) {
  const db = getDb();
  let result;
   result = await db
    .collection("Referees")
    .findOne(     { _id: new ObjectId(referee_id), user_id: userid }  )
 

  return result ;
}


export async function getALLReferee({ userid}) {
  const db = getDb();
  let result;
   result = await db
    .collection("Referees")
    .find(     { user_id: userid }  ).toArray();
    
 if (!result) {console.log("Could not find refereees")}

  return result ;
}

export async function deleteReferees({ referee_ids}) {
    const idsToDelete = [];
  for (const key in referee_ids) {
    idsToDelete.push(new ObjectId(referee_ids[key]))
  }

  const db = getDb();
  let result;
   result = await db
    .collection("Referees")
    .deleteMany(  { _id: { $in: idsToDelete } }  )
 

  return result ;
}

export async function updateJobandReferee({referenceIds, job_id}) {
  const db = getDb();
  const referencestoad = [];
  for (const key in referenceIds) {
      const doc =  { 
      reference_id: referenceIds[key],     // ObjectId of the referee
      status: "planned",
      requested_at: "",
      responded_at: "",
      notes: "",
  }
    referencestoad.push(doc)

      const Refereeresult = await db
      .collection("Referees")
      .updateOne(
        { _id: new ObjectId(referenceIds[key]) }, 
        { $set: {last_used_at: new Date().toISOString()} ,  $inc: { usage_count: 1 } }
      );
  }


  const Jobresult = await db
    .collection("jobs")
    .findOneAndUpdate(
      { _id: new ObjectId(job_id) }, 
      { $set: {references: referencestoad} },
      {returnDocument: "after"}
    );

  if (Jobresult.matchedCount === 0) {
    return { message: "Referee not found" };
  }

  return Jobresult
}


export async function removeJobandReferee({referenceId, job_id}) {
  const db = getDb();
  console.log(referenceId)
    const Refereeresult = await db
    .collection("Referees")
    .updateOne(
      { _id: new ObjectId(referenceId) }, 
      {  $inc: { usage_count: -1 } }
    );
  

  const Jobresult = await db
    .collection("jobs")
    .updateOne(
      { _id: new ObjectId(job_id) }, 
      {  $pull: { references: { reference_id: referenceId } } },
      {returnDocument: "after"}
    );

  if (Jobresult.matchedCount === 0 && Refereeresult.matchedCount == 0) {
    return { message: "Referee not found" };
  }

  return Jobresult
}
export async function updateJobReferencestat({referenceId, job_id,status}) {
  const db = getDb();


const Jobresult = await db
  .collection("jobs")
  .findOneAndUpdate(
    { 
      _id: new ObjectId(job_id), 
      "references.reference_id": referenceId 
    },
    { 
      $set: { 
        "references.$.status": status 
      } 
    },
    { returnDocument: "after" }
  );

    if (Jobresult === null) {
    return { message: "Referee not found" };
  }

  return Jobresult
}


export async function updatefeedback({ job_id, referenceId, feedback, user_id }) {
  const db = getDb();

  const setUpdate = {};

  if (feedback.feedback_rating !== undefined) {
    setUpdate["references.$.feedback_rating"] = feedback.feedback_rating;
  }
  if (feedback.feedback_summary !== undefined) {
    setUpdate["references.$.feedback_summary"] = feedback.feedback_summary;
  }
  if (feedback.feedback_notes !== undefined) {
    setUpdate["references.$.feedback_notes"] = feedback.feedback_notes;
  }
  if (feedback.feedback_source !== undefined) {
    setUpdate["references.$.feedback_source"] = feedback.feedback_source;
  }

  // If caller passes a specific timestamp, use it; otherwise set "now"
  if (feedback.feedback_collected_at !== undefined) {
    setUpdate["references.$.feedback_collected_at"] = feedback.feedback_collected_at
      ? new Date(feedback.feedback_collected_at)
      : null;
  } else {
    setUpdate["references.$.feedback_collected_at"] = new Date();
  }

  // 1) Update the job.references entry
  const result = await db.collection("jobs").findOneAndUpdate(
    {
      _id: new ObjectId(job_id),
      "references.reference_id": referenceId,
    },
    {
      $set: setUpdate,
    },
    {
      returnDocument: "after", 
    }
  );

  const updatedJob = result.value;

  if (!updatedJob) {
    return { message: "Referee not found" };
  }

  // 2) Recompute aggregated feedback stats on the reference doc
  await recomputeRefFeedbackStats({ user_id, referenceId });

  return updatedJob;
}



async function recomputeRefFeedbackStats({ user_id, referenceId }) {
  const db = getDb();

  // 1) Find all jobs for this user where this reference appears
  const jobs = await db
    .collection("jobs")
    .find({
      userId: user_id,                 // adjust if your field is different
      "references.reference_id": referenceId,
    })
    .toArray();

  const counts = {
    total_with_feedback: 0,
    strong_positive: 0,
    positive: 0,
    neutral: 0,
    mixed: 0,
    negative: 0,
  };

  let lastRating = "";
  let lastAt = null;

  for (const job of jobs) {
    for (const usage of job.references || []) {
      if (usage.reference_id !== referenceId) continue;

      const rating = usage.feedback_rating;
      if (!rating) continue;

      counts.total_with_feedback++;

      if (counts[rating] != null) {
        counts[rating] += 1;
      }

      // pick the latest timestamp we can find
      const ts =
        usage.feedback_collected_at ||
        usage.requested_at ||
        job.updatedAt ||
        job.createdAt;

      if (ts && (!lastAt || ts > lastAt)) {
        lastAt = ts;
        lastRating = rating;
      }
    }
  }

  // 2) Update the reference doc with these aggregate stats
  await db.collection("referees").updateOne(
    {
      _id: new ObjectId(referenceId),
      user_id, // adjust if your field is named differently (e.g. "userId")
    },
    {
      $set: {
        "feedback_stats.total_with_feedback": counts.total_with_feedback,
        "feedback_stats.strong_positive": counts.strong_positive,
        "feedback_stats.positive": counts.positive,
        "feedback_stats.neutral": counts.neutral,
        "feedback_stats.mixed": counts.mixed,
        "feedback_stats.negative": counts.negative,
        "feedback_stats.last_feedback_rating": lastRating || "",
        "feedback_stats.last_feedback_at": lastAt || null,
      },
    }
  );
}
export async function generateReferenceRequest({ job, referee, candidate }) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY_FOR_COVERLETTER);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const description = (job.description || "").slice(0, 2500);

  const company = job.company || "the company";
  const jobTitle = job.jobTitle || "the role";
  const jobLocation = job.location || "";
  const jobType = job.type || "";

  const refName = referee.full_name || "your reference";
  const relationship = referee.relationship || "";
  const refTitle = referee.title || "";
  const refOrg = referee.organization || "";

  const candidateName = candidate?.name || "the candidate";
  const candidateRole = candidate?.currentRole || "";
  const candidateSchool = candidate?.school || "";
  const candidateGradYear = candidate?.gradYear || "";
  const candidateSkills = Array.isArray(candidate?.topSkills)
    ? candidate.topSkills.join(", ")
    : "";
  const candidateProjectsText = Array.isArray(candidate?.projects)
    ? candidate.projects
        .map(p => `- ${p.name}: ${p.impact}`)
        .join("\n")
    : "";

  const prompt = `
You are a career assistant helping a candidate request a professional reference.

Return ONLY valid JSON (no markdown, no backticks) with exactly this shape:

{
  "emailTemplate": "string",
  "prepNotes": "string"
}

Context:

Candidate:
- Name: ${candidateName}
- Current roles/levels: ${candidateRole}
- School / program: ${candidateSchool}
- Graduation year: ${candidateGradYear}
- Top skills: ${candidateSkills || "(none provided)"}
- Key projects or experiences:
${candidateProjectsText || "- (none provided)"}

Role:
- Company: ${company}
- Job title: ${jobTitle}
- Location: ${jobLocation}
- Opportunity type: ${jobType}

Job description (may be truncated):
${description || "(no description provided)"}

Reference:
- Name: ${refName}
- Relationship to candidate: ${relationship}
- Reference title: ${refTitle}
- Reference organization: ${refOrg}

STRICT formatting rules:
- Do NOT use any placeholder text like [Skill 1], [Skill 2], [Project 1], [Your Name], or [Previous Company].
- Every skill or project you mention must come from the context above or be a reasonable combination of it.
- Always sign the email using the candidate's real name: ${candidateName}.

Requirements for "emailTemplate":
- Salutation to ${refName}.
- 2–4 short paragraphs.
- Start with a natural greeting (e.g., "I hope you’re doing well") but avoid generic filler like "I hope this email finds you well" if possible.
- Remind them who ${candidateName} is and how you know each other (use the relationship, title, and organization if provided).
- Briefly describe the ${jobTitle} role and why ${candidateName} is a good fit, using at least 2 concrete skills from the candidate's top skills.
- If helpful, mention 1–2 specific projects from the candidate projects list.
- Ask if they’d be comfortable serving as a reference for this specific role at ${company}.
- Offer to send resume + job description.
- Close politely and sign as "${candidateName}", not [Your Name].

Requirements for "prepNotes":
- Write clear, plain text that the candidate can share with ${refName} as talking points.
- Use numbered points (e.g., "1. ...", "2. ...") instead of bullet characters.
- Include:
  1) 3–5 key skills or experiences to emphasize, using the candidate's skills and projects above and tying them to this ${jobTitle} role.
  2) 1–3 specific projects or achievements from the project list (with the project name and what it demonstrates).
  3) Any culture/values angle that fits ${company}, based on the role description.
- Each point must be concrete and specific. Do NOT write generic placeholders or text inside brackets.
- Keep each talking point to 1–2 sentences for easy scanning.
`;
console.log(prompt)
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800,
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          emailTemplate: { type: SchemaType.STRING },
          prepNotes: { type: SchemaType.STRING },
        },
        required: ["emailTemplate", "prepNotes"],
      },
    },
  });

  const text = result.response.text().trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse JSON from Gemini for reference request:", text);
    throw new Error("AI returned invalid JSON for reference request.");
  }

  return {
    emailTemplate: parsed.emailTemplate || "",
    prepNotes: parsed.prepNotes || "",
  };
}



export async function addRelationtoReferee({referenceId,action,message_content}) {
  const db = getDb();


 const updatedRef = await  db
    .collection("Referees")
    .findOneAndUpdate(
          { 
      _id: new ObjectId(referenceId), 
    },
      {
        $push: {
          relationship_history: {
            action,
            message_content,
            created_at: new Date(),
          },
        },
      },
      { new: true } // return the updated document
    );

    if (!updatedRef) {
      return { message: "Referee not found" };
    }


    return updatedRef
}


export async function getAlljobs({userId,projections}) {
  const db = getDb();


const Jobresult = await db
    .collection("jobs")
    .find(
      { userId: userId },
      { projection: projections }
    )
    .toArray();

    if (Jobresult === null) {
    return { message: "Referee not found" };
  }

  return Jobresult
}


export function buildCandidateSnapshot(user) {
  const name =
    user?.ProfileHistory?.fullName ||
    user?.name ||
    "the candidate";

  // ---- current role ----
  const employment = Array.isArray(user?.EmploymentHistory)
    ? user.EmploymentHistory
    : [];

  const currentEmp =
    employment.find(e => e.currentPosition) ||
    employment[0];

  const currentRole = currentEmp
    ? `${currentEmp.jobTitle || "Professional"} at ${
        currentEmp.company || "current company"
      }`
    : "Early-career candidate";

  // ---- school / program ----
  const education = Array.isArray(user?.EducationHistory)
    ? user.EducationHistory
    : [];

  const primaryEdu = education[0];

  const school = primaryEdu
    ? `${primaryEdu.degree || ""} in ${
        primaryEdu.fieldOfStudy || ""
      } at ${primaryEdu.institution || ""}`.trim()
    : "";

  const gradYear = primaryEdu?.graduationDate
    ? new Date(primaryEdu.graduationDate).getFullYear().toString()
    : "";

  // ---- skills (just names) ----
  const topSkills = Array.isArray(user?.skills)
    ? user.skills
        .map(s => s?.name)
        .filter(Boolean)
        .slice(0, 6) // keep it tight
    : [];

  // ---- projects -> name + impact line ----
  const projects = Array.isArray(user?.ProjectHistory)
    ? user.ProjectHistory.slice(0, 3).map(p => {
        // build a short impact string from the fields you have
        const parts = [];

        if (p.description) parts.push(p.description);
        if (p.outcomes) parts.push(p.outcomes);
        if (p.technologies) {
          parts.push(`Tech: ${p.technologies}`);
        }
        if (typeof p.teamSize === "number" && p.teamSize > 1) {
          parts.push(`Team size: ${p.teamSize}`);
        }

        const impact = parts.join(" ").slice(0, 240); // keep it short

        return {
          name: p.name || "Project",
          impact: impact || "Key project demonstrating relevant skills.",
        };
      })
    : [];

  return {
    name,
    currentRole,
    school,
    gradYear,
    topSkills,
    projects,
  };
}



export function buildCandidateSummary(candidate) {
  const name = candidate.name || "the candidate";

  const current = Array.isArray(candidate.currentRole) && candidate.currentRole[0]
    ? candidate.currentRole[0]
    : null;

  const currentText = current
    ? `${current.jobTitle} at ${current.company} (${current.location || "location not specified"})`
    : "current role not specified";

  const school = Array.isArray(candidate.school) && candidate.school[0]
    ? candidate.school[0]
    : null;

  const eduText = school
    ? `${school.degree} in ${school.fieldOfStudy} from ${school.institution}`
    : "education not specified";

  const topSkillNames = (candidate.topSkills || [])
    .slice(0, 6)
    .map((s) => s.name)
    .join(", ");

  const topProjects = (candidate.projects || [])
    .slice(0, 2)
    .map((p) => `${p.name}: ${p.description}`)
    .join("\n- ");

  return `
Candidate: ${name}
Current role: ${currentText}
Education: ${eduText}
Top skills: ${topSkillNames || "not specified"}
Key projects:
- ${topProjects || "no major projects listed"}
  `.trim();
}



export async function generateReferencePrep({
  job,
  referee,
  candidateSummary,
}) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY_FOR_COVERLETTER);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const description = (job.description || "").slice(0, 2500);

  const company = job.company || "the company";
  const jobTitle = job.jobTitle || "the role";
  const jobLocation = job.location || "";
  const jobType = job.type || "";

  const refName = referee.full_name || "your reference";
  const relationship = referee.relationship || "";
  const refTitle = referee.title || "";
  const refOrg = referee.organization || "";

  const prompt = `
You are a career coach helping a candidate PREPARE a reference to speak about them for a specific job.

Return ONLY valid JSON (no markdown, no backticks) with this exact shape:

{
  "overview": "string",
  "keyStrengths": ["string"],
  "projectsToHighlight": [{
    "name": "string",
    "whyItMatters": "string"
  }],
  "riskAreas": [{
    "topic": "string",
    "howToFrame": "string"
  }],
  "dontSayList": ["string"],
  "callScript90s": "string"
}

Context:

Role:
- Company: ${company}
- Job title: ${jobTitle}
- Location: ${jobLocation}
- Opportunity type: ${jobType}

Job description (may be truncated):
${description || "(no description provided)"}

Reference:
- Name: ${refName}
- Relationship to candidate: ${relationship}
- Reference title: ${refTitle}
- Reference organization: ${refOrg}

Candidate summary:
${candidateSummary}

Guidance:
- "overview": 2–3 sentence summary of how this reference can best position the candidate for THIS role.
- "keyStrengths": 3–6 bullet-level phrases (short) the reference should emphasize, grounded in the job description.
- "projectsToHighlight": 1–3 projects or achievements with a clear "whyItMatters" in the context of this role.
- "riskAreas": up to 2 topics (e.g. limited experience, job change, GPA) with a suggested positive framing in "howToFrame".
- "dontSayList": 2–5 things the reference should avoid saying (e.g. sounding unsure, backhanded compliments).
- "callScript90s": short script (2–4 paragraphs) of what the reference might say if a recruiter called and asked, "How would you describe this candidate for this role?"
`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 900,
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          overview: { type: SchemaType.STRING },
          keyStrengths: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          projectsToHighlight: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                whyItMatters: { type: SchemaType.STRING },
              },
              required: ["name", "whyItMatters"],
            },
          },
          riskAreas: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                topic: { type: SchemaType.STRING },
                howToFrame: { type: SchemaType.STRING },
              },
              required: ["topic", "howToFrame"],
            },
          },
          dontSayList: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          callScript90s: { type: SchemaType.STRING },
        },
        required: [
          "overview",
          "keyStrengths",
          "projectsToHighlight",
          "riskAreas",
          "dontSayList",
          "callScript90s",
        ],
      },
    },
  });

  const text = result.response.text().trim();

  let parsed
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse JSON from Gemini for reference prep:", text);
    throw new Error("AI returned invalid JSON for reference prep.");
  }

  return {
    overview: parsed.overview || "",
    keyStrengths: parsed.keyStrengths || [],
    projectsToHighlight: parsed.projectsToHighlight || [],
    riskAreas: parsed.riskAreas || [],
    dontSayList: parsed.dontSayList || [],
    callScript90s: parsed.callScript90s || "",
  };
}




export async function generateReferencePortfolioWithAI(opts) {
  const { goal, candidates, limit = 5, temperature = 0.4 } = opts || {};

  if (!goal || !Array.isArray(candidates) || candidates.length === 0) return [];
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY_FOR_COVERLETTER);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are an expert career coach and reference-strategy advisor. " +
      "Your job is to select the best references for a candidate's specific career goal. " +
      "You MUST output strictly valid JSON matching the provided schema. " +
      "Do not include markdown, bullets, or commentary outside JSON. " +
      "Focus on practical, realistic reasoning based ONLY on provided data. " +
      "Penalize references who are 'unavailable' or clearly over-used. " +
      "Favor references with higher success rates, more relevant tags/industries/titles, " +
      "and appropriate availability.",
  });

  const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
      references: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            reference_id: { type: SchemaType.STRING },
            score: { type: SchemaType.NUMBER },
            summary: { type: SchemaType.STRING },
            rationale: { type: SchemaType.STRING },
          },
          required: ["reference_id", "score", "summary"],
        },
      },
    },
    required: ["references"],
  };

  const prompt =
    `You are designing a reference portfolio for a candidate.\n\n` +
    `Candidate's target career goal (verbatim): "${goal}".\n\n` +
    `You are given a list of references in JSON.\n` +
    `Each reference includes:\n` +
    `- reference_id: string (stable ID, MUST be used when referring to that reference)\n` +
    `- full_name, title, organization, relationship, email\n` +
    `- tags: keywords describing skills/industries/roles\n` +
    `- usage: { applications, offers, success_rate, example_titles, industries }\n` +
    `- availability_status: e.g. 'available', 'limited', 'unavailable'\n` +
    `- preferred_number_of_uses and current usage_count\n\n` +
    `Your task:\n` +
    `1) Select up to ${limit} references that best support this career goal.\n` +
    `2) For each chosen reference, assign a numeric score from 0–100 (higher = better fit).\n` +
    `   Consider: relevance of tags/titles/industries to the goal, success_rate, and availability.\n` +
    `3) Write a concise 1–2 sentence summary explaining WHY this reference is a good fit.\n` +
    `4) Optionally include a 'rationale' field with more internal explanation.\n\n` +
    `Hard constraints:\n` +
    `- ONLY use data in the JSON below. Do NOT invent roles, companies, or success metrics.\n` +
    `- If a reference is 'unavailable', either exclude them or give them a very low score.\n` +
    `- If usage_count >= preferred_number_of_uses, slightly reduce that reference's score.\n` +
    `- Prefer diversity in industries/roles if multiple references are roughly equally good.\n` +
    `- Output strictly valid JSON matching the schema: { "references": [ ... ] }.\n\n` +
    `=== REFERENCES JSON ===\n` +
    JSON.stringify(candidates, null, 2) +
    `\n\nReturn ONLY JSON.`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: 1200,
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const raw =
    result.response &&
    result.response.candidates &&
    result.response.candidates[0] &&
    result.response.candidates[0].content &&
    result.response.candidates[0].content.parts &&
    result.response.candidates[0].content.parts[0] &&
    (result.response.candidates[0].content.parts[0].text ||
      result.response.candidates[0].content.parts[0].inlineData?.data);

  if (!raw) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("❌ Failed to parse AI portfolio JSON:", err);
    return [];
  }

  if (!parsed || !Array.isArray(parsed.references)) return [];

  return parsed.references
    .filter((r) => r && typeof r.reference_id === "string")
    .map((r) => ({
      reference_id: r.reference_id,
      score: typeof r.score === "number" ? r.score : 0,
      summary: r.summary || "",
      rationale: r.rationale || "",
    }));
}
