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

export async function getReferee({ userid,referee_id}) {
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



export async function generateReferenceRequest({ job, referee }) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY_FOR_COVERLETTER);
  
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // safety: don’t send insanely long descriptions
  const description =
    (job.description || "").slice(0, 2500); // trim if needed

  const company = job.company || "the company";
  const jobTitle = job.jobTitle || "the role";
  const jobLocation = job.location || "";
  const jobType = job.type || ""; // internship, full-time, etc.

  const refName = referee.full_name || "your reference";
  const relationship = referee.relationship || "";
  const refTitle = referee.title || "";
  const refOrg = referee.organization || "";

  const prompt = `
You are a career assistant helping a candidate request a professional reference.

Return ONLY valid JSON (no markdown, no backticks) with exactly this shape:

{
  "emailTemplate": "string",
  "prepNotes": "string"
}

Context:

Candidate is applying to a role:
- Company: ${company}
- Job title: ${jobTitle}
- Location: ${jobLocation}
- Opportunity type: ${jobType}

Job description (may be truncated):
${description || "(no description provided)"}

Reference details:
- Name: ${refName}
- Relationship: ${relationship}
- Reference title: ${refTitle}
- Reference organization: ${refOrg}

Requirements for "emailTemplate":
- Salutation to ${refName}
- 2–4 short paragraphs
- Remind them who the candidate is and how you know each other
- Briefly describe the role and why you think you’re a good fit
- Ask if they’d be comfortable serving as a reference for this specific role
- Offer to send resume + job description
- Close politely

Requirements for "prepNotes":
- Bullet-style text (but as plain text, no markdown bullets) the candidate can send
- Include:
  - 3–5 key skills or experiences to emphasize (based on the role)
  - 1–3 specific projects or achievements they could mention
  - Any culture/values angle if obvious from the context
  - Suggested tone: professional, supportive, specific
`;

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
      }
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

