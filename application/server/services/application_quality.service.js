import Jobs from "../models/jobs.js";
import { getResumeVersion } from "./resume_version.service.js";
import { getCoverletterVersion } from "./coverletter_version.service.js";

import {
    flattenResume,
    flattenCoverLetter,
    analyzeApplicationPackageQuality
} from "./application_quality_ai.service.js";

export async function evaluateApplicationPackage({ userId, jobId }) {
    const job = await Jobs.findOne({ _id: jobId, userId });
    if (!job || !job.applicationPackage) {
        throw new Error("Application package not found for job");
    }

    const { resumeVersionId, coverLetterVersionId } = job.applicationPackage;

    // ✅ Guard: no materials → reset score
    if (!resumeVersionId && !coverLetterVersionId) {
        job.applicationQualityScore = 0;
        await job.save();

        return {
            jobId,
            resumeVersionId: null,
            coverLetterVersionId: null,
            score: 0,
            resumeCoverage: 0,
            coverLetterCoverage: 0,
            keywordCount: 0,
            matchedKeywords: [],
            missingKeywords: [],
            suggestions: []
        };
    }

    const resumeVersion = resumeVersionId
        ? await getResumeVersion({ userid: userId, versionid: resumeVersionId })
        : null;

    const coverLetterVersion = coverLetterVersionId
        ? await getCoverletterVersion({ userid: userId, versionid: coverLetterVersionId })
        : null;

    const analysis = analyzeApplicationPackageQuality({
        resumeVersion, // ✅ PASS THE FULL VERSION OBJECT
        coverLetterText: coverLetterVersion
            ? flattenCoverLetter(coverLetterVersion)
            : "",
        jobDescriptionText: job.description || ""
    });

    // ✅🔥 PERSIST SCORE HERE
    job.applicationQualityScore = analysis.score;
    await job.save();

    return {
        jobId,
        resumeVersionId,
        coverLetterVersionId,
        ...analysis
    };
}