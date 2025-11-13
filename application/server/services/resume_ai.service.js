// services/resume_ai.service.js
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { GetRelevantinfofromuser } from "./coverletter.service.js"; // <-- reuse your existing function

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY_FOR_RESUME || process.env.GOOGLE_API_KEY_FOR_COVERLETTER
);

// Shape of the AI output we want (variations supported)
const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summarySuggestions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    skills: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    atsKeywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    experienceBullets: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          sourceExperienceIndex: { type: SchemaType.NUMBER },
          company: { type: SchemaType.STRING },
          jobTitle: { type: SchemaType.STRING },
          bullets: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["sourceExperienceIndex", "company", "jobTitle", "bullets"],
      },
    },

    // NEW: education suggestions (normalized to your resume shape)
    education: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          institution: { type: SchemaType.STRING },
          degree: { type: SchemaType.STRING },
          fieldOfStudy: { type: SchemaType.STRING },
          graduationDate: { type: SchemaType.STRING }, // ISO or "YYYY-MM" is fine
        },
      },
    },

    // NEW: project suggestions
    projects: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          technologies: { type: SchemaType.STRING }, // e.g. "React, TypeScript"
          outcomes: { type: SchemaType.STRING },     // key results / impact
          startDate: { type: SchemaType.STRING },
          endDate: { type: SchemaType.STRING },
          role: { type: SchemaType.STRING },
        },
      },
    },
  },
  required: ["skills", "atsKeywords", "experienceBullets"],
};

function fmtMonthYear(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function profileToContext(u) {
  const skillsList = (u.skills || []).map((s) => s?.name).filter(Boolean);

  const edu = (u.EducationHistory || []).map((e) => {
    const g = fmtMonthYear(e.graduationDate);
    return `${e.degree || ""}${
      e.fieldOfStudy ? ", " + e.fieldOfStudy : ""
    } — ${e.institution || ""}${g ? " (" + g + ")" : ""}`.trim();
  });

  const exp = (u.EmploymentHistory || []).map((e, i) => {
    const start = fmtMonthYear(e.startDate);
    const end = e.currentPosition ? "Present" : fmtMonthYear(e.endDate) || "Present";
    return (
      `[${i}] ${e.jobTitle || ""} @ ${e.company || ""} (${start || "—"}–${end})` +
      `${e.location ? " — " + e.location : ""}\n` +
      (e.highlights || [])
        .map((h) => "- " + h)
        .join("\n")
    );
  });

  const projects = (u.ProjectHistory || []).map((p) => {
    const dates = [fmtMonthYear(p.startDate), fmtMonthYear(p.endDate)]
      .filter(Boolean)
      .join("–");
    return `${p.name || ""}${
      p.technologies ? " [" + p.technologies + "]" : ""
    }${dates ? " (" + dates + ")" : ""}${p.role ? " — " + p.role : ""}${
      p.outcomes ? " — " + p.outcomes : ""
    }`.trim();
  });

  return [
    `Name: ${u.ProfileHistory?.fullName || "—"}`,
    `Contact: ${[u.ProfileHistory?.email, u.ProfileHistory?.phone].filter(Boolean).join(" | ")}`,
    `Headline: ${u.ProfileHistory?.headline || u.ProfileHistory?.bio || "—"}`,
    `Skills: ${skillsList.join(", ") || "—"}`,
    "",
    "=== Employment (indexed) ===",
    exp.length ? exp.join("\n\n") : "—",
    "",
    "=== Education ===",
    edu.length ? edu.join("\n") : "—",
    "",
    "=== Projects ===",
    projects.length ? projects.join("\n") : "—",
  ].join("\n");
}

function jobToContext(job) {
  return [
    `Job Title: ${job.jobTitle || "—"}`,
    job.company ? `Company: ${job.company}` : null,
    job.location ? `Location: ${job.location}` : null,
    job.industry ? `Industry: ${job.industry}` : null,
    job.type ? `Employment Type: ${job.type}` : null,
    job.status ? `Status: ${job.status}` : null,
    job.jobPostingUrl ? `Posting: ${job.jobPostingUrl}` : null,
    "",
    "=== Job Description ===",
    job.description || "—",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function GenerateResumeBasedOn(userid, job, opts = {}) {
  const { temperature = 0.6, candidateCount = 3, maxBulletsPerRole = 5 } = opts;

  // Fetch the user's saved info (same as cover letter flow)
  const userProfile = await GetRelevantinfofromuser(userid);

  const ctxUser = profileToContext(userProfile);
  const ctxJob = jobToContext(job);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are an expert resume-tailoring assistant.\n" +
      "OUTPUT FORMAT:\n" +
      "- Output STRICT JSON only (no markdown, no commentary).\n" +
      "- The top-level object MUST match the expected schema (parsedCandidates or data).\n" +
      "\n" +
      "CONTENT CONSTRAINTS:\n" +
      "- You MUST use ONLY the facts provided in USER_PROFILE, EXPERIENCE, EDUCATION, and PROJECTS.\n" +
      "- Do NOT invent new employers, dates, titles, locations, degrees, or achievements.\n" +
      "- You MAY rephrase, reorder, and combine existing information to make it clearer and more impactful.\n" +
      "\n" +
      "TAILORING GOALS:\n" +
      "- Strongly tailor the resume to the TARGET_JOB description.\n" +
      "- Emphasize responsibilities, tools, and achievements that match the job’s required skills and keywords.\n" +
      "- Use clear, action-oriented bullets that highlight measurable impact whenever possible (numbers, scale, time saved, revenue, performance, etc.).\n" +
      "- Prefer specific, concrete outcomes over generic soft statements.\n" +
      "\n" +
      "LEVEL OF DETAIL:\n" +
      "- For each relevant experience, generate 3–6 high-quality bullet points that align with the TARGET_JOB.\n" +
      "- Focus on the most recent and most relevant roles; older or unrelated roles should be summarized more briefly.\n" +
      "- Use full, descriptive sentences in bullets, not fragments.\n" +
      "\n" +
      "EDUCATION & PROJECTS:\n" +
      "- Use EDUCATION entries to populate an `education` array of objects with institution, degree, fieldOfStudy, graduationDate when available.\n" +
      "- Use PROJECT entries to populate a `projects` array of objects with name, technologies, outcomes, and dates/role when provided.\n" +
      "- You MAY refine titles, technologies, and outcomes for clarity, but do not invent new projects or degrees.\n" +
      "\n" +
      "SUMMARY & SKILLS:\n" +
      "- summarySuggestions should be 1–3 variations, each 2–4 sentences, explicitly targeting the TARGET_JOB.\n" +
      "- Each summary should mention years of experience (if derivable), key domains, core tools/technologies, and impact themes.\n" +
      "- skills should be 10–25 items, prioritizing skills, tools, frameworks, and domains that appear in BOTH the user’s background and the TARGET_JOB.\n" +
      "- atsKeywords should include job-relevant phrases and tools (taken from the TARGET_JOB and supported by the user’s history) to help with ATS matching.\n" +
      "\n" +
      "MAPPING TO SOURCE EXPERIENCE:\n" +
      "- experienceBullets MUST always reference a valid sourceExperienceIndex from the EXPERIENCE array.\n" +
      "- Each bullet group should include company, jobTitle, and bullets for that index.\n" +
      "- Do NOT create bullets for an index that does not exist.\n" +
      "\n" +
      "STYLE:\n" +
      "- Tone: professional, confident, and concise; no slang.\n" +
      "- Avoid generic fluff (e.g., 'hard worker', 'team player') unless supported by specific examples.\n" +
      "- Use US English.\n" +
      "\n" +
      "OUTPUT FIELDS:\n" +
      "- skills, atsKeywords, summarySuggestions, experienceBullets, education, projects.\n" +
      "\n" +
      "Again: respond with STRICT JSON ONLY, following the schema, using only facts from USER_PROFILE, EXPERIENCE, EDUCATION, PROJECTS, and tailoring everything to TARGET_JOB.",
  });

  const hardRules =
    `Rules:\n` +
    `- For each source experience, generate up to ${maxBulletsPerRole} bullets total, only if relevant to the job.\n` +
    `- Bullets: past-tense for prior roles; present-tense for current role.\n` +
    `- Skills: suggest only skills present in the user profile OR obviously derivable from listed projects/experience.\n` +
    `- ATS Keywords: extract important terms from job description; include only those the user can back up with profile evidence.\n` +
    `- If a user experience is irrelevant, you may produce 0 bullets for that index.\n`;

  const prompt =
    `=== USER PROFILE ===\n${ctxUser}\n\n` +
    `=== TARGET JOB ===\n${ctxJob}\n\n` +
    hardRules;

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
    if (!candidates.length) throw new Error("Model returned no candidates.");

    const parsedCandidates = [];
    for (const [i, c] of candidates.entries()) {
      let raw = c.content?.parts?.[0]?.text || c.text || "";
      try {
        const parsed = JSON.parse(raw);

        // sanitize shapes
        parsed.summarySuggestions = Array.isArray(parsed.summarySuggestions)
          ? parsed.summarySuggestions
          : [];
        parsed.skills = Array.isArray(parsed.skills) ? parsed.skills : [];
        parsed.atsKeywords = Array.isArray(parsed.atsKeywords)
          ? parsed.atsKeywords
          : [];
        parsed.experienceBullets = Array.isArray(parsed.experienceBullets)
          ? parsed.experienceBullets
          : [];

        // NEW: normalize education and projects to arrays of simple objects
        parsed.education = Array.isArray(parsed.education)
          ? parsed.education.map((e) => ({
              institution: String(e?.institution ?? "").trim(),
              degree: String(e?.degree ?? "").trim(),
              fieldOfStudy: String(e?.fieldOfStudy ?? "").trim(),
              graduationDate: e?.graduationDate
                ? String(e.graduationDate).trim()
                : "",
            }))
          : [];

        parsed.projects = Array.isArray(parsed.projects)
          ? parsed.projects.map((p) => ({
              name: String(p?.name ?? "").trim(),
              technologies: p?.technologies
                ? String(p.technologies).trim()
                : "",
              outcomes: p?.outcomes ? String(p.outcomes).trim() : "",
              startDate: p?.startDate ? String(p.startDate).trim() : "",
              endDate: p?.endDate ? String(p.endDate).trim() : "",
              role: p?.role ? String(p.role).trim() : "",
            }))
          : [];

        // coerce bullets to strings + trim
        parsed.experienceBullets = parsed.experienceBullets.map((e) => ({
          sourceExperienceIndex: Number(e.sourceExperienceIndex ?? -1),
          company: String(e.company ?? ""),
          jobTitle: String(e.jobTitle ?? ""),
          bullets: Array.isArray(e.bullets)
            ? e.bullets.map((b) => String(b).trim()).filter(Boolean)
            : [],
        }));

        parsedCandidates.push(parsed);
      } catch (err) {
        console.error(
          "Resume AI parse error (candidate " + (i + 1) + "):",
          err,
          raw
        );
      }
    }

    if (!parsedCandidates.length) throw new Error("Failed to parse any AI candidate.");

    if (parsedCandidates.length === 1) return { data: parsedCandidates[0] };
    return { parsedCandidates };
  } catch (err) {
    const msg = String(err?.message || err);
    const status = err?.status || err?.code || err?.statusCode;
    if (status === 429 || /rate|quota|exceed/i.test(msg)) {
      return { error: "rate_limit", message: msg };
    }
    if (
      status === 401 ||
      status === 403 ||
      /api key|unauthorized|invalid key|forbidden/i.test(msg)
    ) {
      return { error: "auth", message: msg };
    }
    return { error: "generation_failed", message: msg };
  }
}
