// services/analytics/applicationMaterials.service.js
import Jobs from "../models/jobs.js";

/**
 * Determine job outcome flags using canonical definitions
 */
function analyzeJob(job) {
    const history = job.statusHistory || [];

    const hasResponse = history.some(h =>
        ["phone_screen", "interview", "offer", "rejected"].includes(h.status)
    );

    const hasInterview =
        history.some(h => ["interview", "offer"].includes(h.status)) ||
        (job.interviews && job.interviews.length > 0);

    const hasOffer = history.some(h => h.status === "offer");

    // Time to first response
    let timeToResponseMs = null;
    const applied = history.find(h => h.status === "applied");
    const firstResponse = history
        .filter(h =>
            ["phone_screen", "interview", "offer", "rejected"].includes(h.status)
        )
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];

    if (applied && firstResponse) {
        timeToResponseMs =
            new Date(firstResponse.timestamp) - new Date(applied.timestamp);
    }

    return {
        hasResponse,
        hasInterview,
        hasOffer,
        timeToResponseMs,
    };
}

/**
 * Generic aggregation helper (resume OR cover letter)
 */
function aggregateByVersion(jobs, versionKey, labelKey) {
    const stats = {};

    for (const job of jobs) {
        const pkg = job.applicationPackage;
        if (!pkg) continue;

        const versionId = pkg[versionKey];
        const versionLabel = pkg[labelKey];

        if (!versionId) continue;

        if (!stats[versionId]) {
            stats[versionId] = {
                versionId,
                versionLabel: versionLabel || "Unnamed Version",
                applications: 0,
                responses: 0,
                interviews: 0,
                offers: 0,
                responseTimes: [],
            };
        }

        const analysis = analyzeJob(job);
        const bucket = stats[versionId];

        bucket.applications++;
        if (analysis.hasResponse) bucket.responses++;
        if (analysis.hasInterview) bucket.interviews++;
        if (analysis.hasOffer) bucket.offers++;

        if (analysis.timeToResponseMs !== null) {
            bucket.responseTimes.push(analysis.timeToResponseMs);
        }
    }

    return Object.values(stats).map(v => ({
        versionId: v.versionId,
        versionLabel: v.versionLabel,
        applications: v.applications,
        responseRate: v.applications
            ? Math.round((v.responses / v.applications) * 100)
            : 0,
        interviewRate: v.applications
            ? Math.round((v.interviews / v.applications) * 100)
            : 0,
        offerRate: v.applications
            ? Math.round((v.offers / v.applications) * 100)
            : 0,
        avgResponseTimeMs:
            v.responseTimes.length > 0
                ? v.responseTimes.reduce((a, b) => a + b, 0) / v.responseTimes.length
                : null,
        sufficientSample: v.applications >= 10,
    }));
}

export function aggregateByBaseMaterial(jobs, baseKey, versionKey, labelKey) {
    const grouped = {};

    for (const job of jobs) {
        const pkg = job.applicationPackage;
        if (!pkg) continue;

        const baseId = pkg[baseKey];
        const versionId = pkg[versionKey];
        const versionLabel = pkg[labelKey];

        if (!baseId || !versionId) continue;

        if (!grouped[baseId]) {
            grouped[baseId] = {
                baseId,
                versions: {}
            };
        }

        if (!grouped[baseId].versions[versionId]) {
            grouped[baseId].versions[versionId] = {
                versionId,
                versionLabel,
                applications: 0,
                responses: 0,
                interviews: 0,
                offers: 0
            };
        }

        const analysis = analyzeJob(job);
        const v = grouped[baseId].versions[versionId];

        v.applications++;
        if (analysis.hasResponse) v.responses++;
        if (analysis.hasInterview) v.interviews++;
        if (analysis.hasOffer) v.offers++;
    }

    return Object.values(grouped).map(base => ({
        baseId: base.baseId,
        versions: Object.values(base.versions).map(v => ({
            versionId: v.versionId,
            versionLabel: v.versionLabel,
            applications: v.applications,
            responseRate: v.applications ? Math.round((v.responses / v.applications) * 100) : 0,
            interviewRate: v.applications ? Math.round((v.interviews / v.applications) * 100) : 0,
            offerRate: v.applications ? Math.round((v.offers / v.applications) * 100) : 0
        }))
    }));
}

/**
 * MAIN ENTRY POINT
 */
export async function getApplicationMaterialPerformance(userId) {
    const jobs = await Jobs.find({
        userId,
        applicationPackage: { $ne: null },
        statusHistory: { $elemMatch: { status: "applied" } }
    }).lean();

    return {
        resumes: aggregateByVersion(
            jobs,
            "resumeVersionId",
            "resumeVersionLabel"
        ),
        coverLetters: aggregateByVersion(
            jobs,
            "coverLetterVersionId",
            "coverLetterVersionLabel"
        ),

        // ✅ NEW
        resumeGroups: aggregateByBaseMaterial(
            jobs,
            "resumeId",
            "resumeVersionId",
            "resumeVersionLabel"
        ),
        coverLetterGroups: aggregateByBaseMaterial(
            jobs,
            "coverLetterId",
            "coverLetterVersionId",
            "coverLetterVersionLabel"
        )
    };
}

export async function getJobsByMaterialVersion(userId, type, versionId) {
    const field =
        type === "resume"
            ? "applicationPackage.resumeVersionId"
            : "applicationPackage.coverLetterVersionId";

    return Jobs.find({
        userId,
        [field]: versionId,
        statusHistory: { $elemMatch: { status: "applied" } }
    })
        .select(
            "company jobTitle status applicationPackage.generatedAt"
        )
        .sort({ "applicationPackage.generatedAt": -1 })
        .lean();
}