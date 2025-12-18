// services/resume_ai.service.js
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { GetRelevantinfofromuser } from "./coverletter.service.js";
import { getSkillsByUser } from "../routes/skills.js";
import { logApiCall } from "../middleware/apiLogger.js"; // ← ADD THIS

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY_FOR_FOLLOWUP || process.env.GOOGLE_API_KEY_FOR_WRITINGPRACTICE ||
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
          startDate: { type: SchemaType.STRING },
          endDate: { type: SchemaType.STRING },
          location: { type: SchemaType.STRING },
        },
        required: ["sourceExperienceIndex", "company", "jobTitle", "bullets"],
      },
    },

    education: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          institution: { type: SchemaType.STRING },
          degree: { type: SchemaType.STRING },
          fieldOfStudy: { type: SchemaType.STRING },
          graduationDate: { type: SchemaType.STRING },
        },
      },
    },

    projects: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          technologies: { type: SchemaType.STRING },
          outcomes: { type: SchemaType.STRING },
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
  const startTime = Date.now(); // ← ADD THIS
  
  const { temperature = 0.6, candidateCount = 3, maxBulletsPerRole = 5 } = opts;

  const baseProfile = await GetRelevantinfofromuser(userid);

  let skills = [];
  try {
    skills = await getSkillsByUser(userid);
  } catch (err) {
    console.error("Error fetching skills for resume AI:", err);
  }

  const userProfile = { ...baseProfile, skills };
  const baseEducation = (userProfile.EducationHistory || []).map((e) => ({
    institution: e.institution || e.schoolName || "",
    degree: e.degree || "",
    fieldOfStudy: e.fieldOfStudy || "",
    graduationDate: e.graduationDate ? fmtMonthYear(e.graduationDate) : "",
  }));

  const baseProjects = (userProfile.ProjectHistory || []).map((p) => ({
    name: p.name || "",
    technologies: p.technologies || "",
    outcomes: p.outcomes || "",
    startDate: p.startDate ? fmtMonthYear(p.startDate) : "",
    endDate: p.endDate ? fmtMonthYear(p.endDate) : "",
    role: p.role || "",
  }));

  const baseExperienceMeta = (userProfile.EmploymentHistory || []).map((e) => ({
    company: e.company || "",
    jobTitle: e.jobTitle || "",
    startDate: e.startDate ? fmtMonthYear(e.startDate) : "",
    endDate: e.currentPosition
      ? "Present"
      : e.endDate
      ? fmtMonthYear(e.endDate)
      : "",
    location: e.location || "",
  }));

  const ctxUser = profileToContext(userProfile);
  const ctxJob = jobToContext(job);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
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
      "- Emphasize responsibilities, tools, and achievements that match the job's required skills and keywords.\n" +
      "- Use clear, action-oriented bullets that highlight measurable impact whenever possible (numbers, scale, time saved, revenue, performance, etc.).\n" +
      "- Prefer specific, concrete outcomes over generic soft statements.\n" +
      "\n" +
      "LEVEL OF DETAIL:\n" +
      "- For each relevant experience, generate 3 high-quality bullet points that align with the TARGET_JOB.\n" +
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
      "- skills should be 10–25 items, prioritizing skills, tools, frameworks, and domains that appear in BOTH the user's background and the TARGET_JOB.\n" +
      "- atsKeywords should include job-relevant phrases and tools (taken from the TARGET_JOB and supported by the user's history) to help with ATS matching.\n" +
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
        maxOutputTokens: 1200,
        candidateCount,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    // ← ADD THIS - Log successful call
    await logApiCall('gemini', '/generateContent', 200, Date.now() - startTime);

    const candidates = result.response?.candidates || [];
    if (!candidates.length) throw new Error("Model returned no candidates.");

    const parsedCandidates = [];
    for (const [i, c] of candidates.entries()) {
      let raw = c.content?.parts?.[0]?.text || c.text || "";
      try {
        const parsed = JSON.parse(raw);

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

        const aiEducation = Array.isArray(parsed.education)
          ? parsed.education.map((e) => ({
              institution: String(e?.institution ?? "").trim(),
              degree: String(e?.degree ?? "").trim(),
              fieldOfStudy: String(e?.fieldOfStudy ?? "").trim(),
              graduationDate: e?.graduationDate
                ? String(e.graduationDate).trim()
                : "",
            }))
          : [];

        parsed.education = baseEducation.length ? baseEducation : aiEducation;
        parsed.projects = baseProjects;

        parsed.experienceBullets = parsed.experienceBullets.map((e) => {
          const idx = Number(e?.sourceExperienceIndex ?? -1);

          const meta =
            idx >= 0 && idx < baseExperienceMeta.length
              ? baseExperienceMeta[idx]
              : {
                  company: String(e.company ?? ""),
                  jobTitle: String(e.jobTitle ?? ""),
                  startDate: "",
                  endDate: "",
                  location: "",
                };

          return {
            sourceExperienceIndex: idx,
            company: meta.company,
            jobTitle: meta.jobTitle,
            startDate: meta.startDate,
            endDate: meta.endDate,
            location: meta.location,
            bullets: Array.isArray(e.bullets)
              ? e.bullets.map((b) => String(b).trim()).filter(Boolean)
              : [],
          };
        });

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
    // ← ADD THIS - Log failed call
    await logApiCall('gemini', '/generateContent', 500, Date.now() - startTime, err.message);
    
    const msg = String(err?.message || err);
    const status = err?.status || err?.code || err?.statusCode;

    // QUOTA / RATE-LIMIT FALLBACK
    if (status === 429 || /rate|quota|exceed/i.test(msg)) {
      const skillsList = (userProfile.skills || [])
        .map((s) => s?.name)
        .filter(Boolean);

      const experienceBullets = (userProfile.EmploymentHistory || []).map(
        (e, idx) => {
          const start = fmtMonthYear(e.startDate) || "";
          const end = e.currentPosition
            ? "Present"
            : fmtMonthYear(e.endDate) || "Present";

          const baseBullets =
            Array.isArray(e.highlights) && e.highlights.length
              ? e.highlights
              : [
                  `Add a bullet here describing your impact in this role at ${
                    e.company || "the company"
                  }.`,
                ];

          return {
            sourceExperienceIndex: idx,
            company: e.company || "",
            jobTitle: e.jobTitle || "",
            bullets: baseBullets
              .slice(0, maxBulletsPerRole)
              .map((b) => String(b).trim())
              .filter(Boolean),
            startDate: start,
            endDate: end,
            location: e.location || "",
          };
        }
      );

      if (experienceBullets.length === 0) {
        experienceBullets.push({
          sourceExperienceIndex: 0,
          company: "",
          jobTitle: "",
          bullets: [
            "Add your most recent role here, including 2–3 bullets about your impact.",
          ],
          startDate: "",
          endDate: "",
          location: "",
        });
      }

      const education = (userProfile.EducationHistory || []).map((e) => ({
        institution: e.institution || e.schoolName || "",
        degree: e.degree || "",
        fieldOfStudy: e.fieldOfStudy || "",
        graduationDate: e.graduationDate
          ? fmtMonthYear(e.graduationDate)
          : "",
      }));

      const projects = (userProfile.ProjectHistory || []).map((p) => ({
        name: p.name || "",
        technologies: p.technologies || "",
        outcomes: p.outcomes || "",
        startDate: p.startDate ? fmtMonthYear(p.startDate) : "",
        endDate: p.endDate ? fmtMonthYear(p.endDate) : "",
        role: p.role || "",
      }));

      const primaryEdu = education[0] || {};
      const primaryExpTitles = experienceBullets
        .map((e) => e.jobTitle)
        .filter(Boolean);

      const jobTitle = job?.jobTitle || "this role";
      const company =
        job?.company || primaryEdu.institution || "the organization";

      const summarySuggestions = [
        `Candidate for ${jobTitle} at ${company} with experience across ${
          skillsList.slice(0, 5).join(", ") ||
          "relevant technical and professional areas"
        }.`,
        `Background includes roles such as ${
          primaryExpTitles.slice(0, 2).join(" and ") || "prior positions"
        } and education in ${
          primaryEdu.degree || "a relevant discipline"
        }. Use this summary as a starting point and edit to match your story.`,
      ];

      const fallback = {
        summarySuggestions,
        skills: skillsList,
        atsKeywords: skillsList,
        experienceBullets,
        education,
        projects,
      };

      return { data: fallback };
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