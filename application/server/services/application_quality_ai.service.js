/**
 * UC-122 — Application Package Quality Scoring
 *
 * Responsibilities:
 * - Flatten resume + cover letter versions into clean text
 * - Perform deterministic keyword alignment analysis vs job description
 *
 * ❌ NO database writes
 * ❌ NO AI calls (yet)
 * ✅ Pure, testable logic
 */

// --------------------------------------------------
// STEP 1 — FLATTEN CONTENT
// --------------------------------------------------

export function flattenResume(resumeVersion) {
    if (!resumeVersion || !resumeVersion.content) return "";

    const data = resumeVersion.content;
    const parts = [];

    // Summary
    if (data.summary) {
        parts.push(`Summary:\n${data.summary}`);
    }

    // Skills
    if (Array.isArray(data.skills)) {
        const skillList = data.skills
            .map((s) => (typeof s === "string" ? s : s.name))
            .filter(Boolean)
            .join(", ");
        parts.push(`Skills:\n${skillList}`);
    }

    // Experience
    if (Array.isArray(data.experience)) {
        data.experience.forEach((exp) => {
            parts.push(
                `Experience: ${exp.title || ""} at ${exp.company || ""}\n` +
                (exp.bullets || []).join("\n")
            );
        });
    }

    // Education
    if (data.education) {
        parts.push(`Education:\n${JSON.stringify(data.education, null, 2)}`);
    }

    return parts.join("\n\n");
}

export function flattenCoverLetter(coverLetterVersion) {
    if (!coverLetterVersion || !coverLetterVersion.content) return "";

    const data = coverLetterVersion.content;

    return [
        ...(data.recipientLines || []),
        data.greeting,
        ...(data.paragraphs || []),
        data.closing,
        data.signature,
    ]
        .filter(Boolean)
        .join("\n\n");
}

function extractResumeBuckets(resumeVersion) {
    const content = resumeVersion?.content || {};

    return {
        summaryText: (content.summary || "").toLowerCase(),

        skillsText: (content.skills || [])
            .map(s => (typeof s === "string" ? s : s.name))
            .join(" ")
            .toLowerCase(),

        experienceText: (content.experience || [])
            .flatMap(exp => exp.bullets || [])
            .join(" ")
            .toLowerCase(),

        educationText: (content.education || [])
            .map(e => JSON.stringify(e))
            .join(" ")
            .toLowerCase()
    };
}

// --------------------------------------------------
// STEP 2 — DETERMINISTIC ANALYSIS
// --------------------------------------------------

function extractKeywords(text) {
    if (!text) {
        return {
            skills: [],
            responsibilities: [],
            education: []
        };
    }

    const lines = text
        .toLowerCase()
        .split(/\n|\./)
        .map(l => l.trim())
        .filter(Boolean);

    const skills = new Set();
    const responsibilities = new Set();
    const education = new Set();

    for (const line of lines) {
        // --- SKILLS ---
        const techMatches = line.match(
            /\b(react|javascript|typescript|node|sql|git|rest apis?|java|python|c\+\+|go)\b/g
        );
        techMatches?.forEach(k => skills.add(k));

        // --- RESPONSIBILITIES (normalized, NOT sentences) ---
        if (line.startsWith("develop")) responsibilities.add("develop web applications");
        if (line.startsWith("build")) responsibilities.add("build software systems");
        if (line.startsWith("maintain")) responsibilities.add("maintain production systems");
        if (line.startsWith("debug")) responsibilities.add("debug application issues");

        // --- EDUCATION ---
        if (line.includes("bachelor")) {
            education.add("bachelor’s degree in computer science");
        }
    }

    return {
        skills: Array.from(skills),
        responsibilities: Array.from(responsibilities),
        education: Array.from(education)
    };
}

function calculateCoverage(sourceText, keywords) {
    if (!sourceText || keywords.length === 0) return 0;

    const lower = sourceText.toLowerCase();
    const matched = keywords.filter((k) => lower.includes(k));

    return Math.round((matched.length / keywords.length) * 100);
}

/**
 * Core UC-122 Analyzer
 */
export function analyzeApplicationPackageQuality({
    resumeVersion,
    coverLetterText,
    jobDescriptionText
}) {
    const extracted = extractKeywords(jobDescriptionText);
    const resume = extractResumeBuckets(resumeVersion);

    const summaryCoverage = calculateCoverage(
        resume.summaryText,
        [...extracted.education, ...extracted.skills.slice(0, 2)]
    );

    const skillsCoverage = calculateCoverage(
        resume.skillsText,
        extracted.skills
    );

    const experienceCoverage = calculateCoverage(
        resume.experienceText,
        extracted.responsibilities
    );

    const hasExperience = resume.experienceText.length > 0;

    const weights = hasExperience
        ? { summary: 0.4, skills: 0.35, experience: 0.25 }
        : { summary: 0.55, skills: 0.45, experience: 0 };

    const resumeCoverage = Math.round(
        summaryCoverage * weights.summary +
        skillsCoverage * weights.skills +
        experienceCoverage * weights.experience
    );

    const coverLetterCoverage = calculateCoverage(
        coverLetterText,
        [
            ...extracted.skills,
            ...extracted.responsibilities
        ]
    );

    const score = Math.min(
        100,
        Math.round(resumeCoverage * 0.7 + coverLetterCoverage * 0.3)
    );

    const missingKeywords = [
        ...extracted.skills.filter(k => !resume.skillsText.includes(k)),
        ...extracted.responsibilities.filter(k => !resume.experienceText.includes(k)),
        ...extracted.education.filter(k => !resume.summaryText.includes(k))
    ];

    const suggestions = buildRankedSuggestions({
        missingKeywords,
        resumeCoverage,
        coverLetterCoverage,
        extracted
    });

    return {
        score,
        resumeCoverage,
        coverLetterCoverage,
        keywordCount:
            extracted.skills.length +
            extracted.responsibilities.length +
            extracted.education.length,
        matchedKeywords: [],
        missingKeywords,
        suggestions
    };
}

function buildRankedSuggestions({
    missingKeywords,
    resumeCoverage,
    coverLetterCoverage,
    extracted
}) {
    const suggestions = [];

    // 🔴 HIGH PRIORITY — Resume alignment (highest weight)
    if (resumeCoverage < 70) {
        suggestions.push({
            priority: "high",
            source: "resume",
            message:
                "Your resume is weakly aligned with the job description. Add relevant skills and responsibilities to your experience section.",
        });
    }

    // 🔴 HIGH PRIORITY — Missing keywords
    // 🔴 HIGH PRIORITY — Missing keywords (ordered by effort)
    const summaryMissing = extracted.education.filter(k =>
        missingKeywords.includes(k)
    );

    const skillsMissing = extracted.skills.filter(k =>
        missingKeywords.includes(k)
    );

    const experienceMissing = extracted.responsibilities.filter(k =>
        missingKeywords.includes(k)
    );

    // 1️⃣ SUMMARY (lowest effort)
    summaryMissing.slice(0, 1).forEach(() => {
        suggestions.push({
            priority: "high",
            source: "resume",
            message:
                "Add a brief summary mentioning your degree and role alignment (e.g., bachelor’s degree in computer science).",
        });
    });

    // 2️⃣ SKILLS (medium effort)
    skillsMissing.slice(0, 2).forEach((skill) => {
        suggestions.push({
            priority: "high",
            source: "resume",
            message: `Add the skill "${skill}" to your resume skills section.`,
        });
    });

    // 3️⃣ EXPERIENCE (highest effort)
    experienceMissing.slice(0, 1).forEach((resp) => {
        suggestions.push({
            priority: "high",
            source: "resume",
            message: `Add experience demonstrating how you ${resp}.`,
        });
    });

    // 🟡 MEDIUM PRIORITY — Cover letter alignment
    if (coverLetterCoverage < 60) {
        suggestions.push({
            priority: "medium",
            source: "cover_letter",
            message:
                "Your cover letter does not strongly reference the job’s required skills. Explicitly mention relevant technologies and experience.",
        });
    }

    // 🟢 LOW PRIORITY — Optimization
    if (
        resumeCoverage >= 85 &&
        coverLetterCoverage >= 70 &&
        missingKeywords.length === 0
    ) {
        suggestions.push({
            priority: "low",
            source: "resume",
            message:
                "Strong alignment detected. Consider improving clarity, formatting, or adding measurable impact.",
        });
    }

    return suggestions;
}