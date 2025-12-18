import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getJobById } from "../../api/jobs";
import { getUserEducationForMatch } from "../../api/market";
import {
  getUserSkillsWithLevels,
  getSkillsForJob,
  getEducationForJob,
} from "../../api/market";
import { jobMatchDetailCache } from "../../utils/jobMatchCache";

/* ================================
   TYPES
================================ */
type UserSkill = {
    name: string;
    proficiency: "Beginner" | "Intermediate" | "Advanced" | "Expert";
};

type UserEducation = {
    _id: string;
    fieldOfStudy: string;
    educationLevel:
    | "High School"
    | "Associate"
    | "Bachelor's"
    | "Master's"
    | "PhD";
};

type JobEducationRequirement = {
    level: string | null;
    fields: string[];
};

/* ================================
   RANKING MAPS
================================ */
const SKILL_RANK: Record<string, number> = {
    expert: 4,
    advanced: 3,
    intermediate: 2,
    beginner: 1,
};

const EDUCATION_RANK: Record<string, number> = {
    "high school": 1,
    associate: 2,
    bachelor: 3,
    master: 4,
    phd: 5,
};

function normalizeEducationLevel(level: string) {
    return level
        .toLowerCase()
        .replace(/’|'/g, "")
        .replace(/s$/, "")
        .trim();
}

export default function JobMatchDetail() {
    const { jobId } = useParams();
    const navigate = useNavigate();

    const [job, setJob] = useState<any>(null);
    const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
    const [userEducation, setUserEducation] = useState<UserEducation[]>([]);
    const [jobEducation, setJobEducation] =
        useState<JobEducationRequirement | null>(null);

    const [loading, setLoading] = useState(true);

    /* ================================
       LOAD DATA
    ================================ */
    useEffect(() => {
        async function load() {
            if (!jobId) return;

            setLoading(true);

            const jobData = await getJobById(jobId);
            const userSkillsData = await getUserSkillsWithLevels();
            const userEducationData = await getUserEducationForMatch();

            // ⚡ FAST PATH — cache exists
            if (jobMatchDetailCache.has(jobId)) {
                const cached = jobMatchDetailCache.get(jobId)!;

                setJob({
                    ...jobData,
                    extractedSkills: cached.extractedSkills,
                });

                setJobEducation(cached.jobEducation);
                setUserSkills(userSkillsData || []);
                setUserEducation(userEducationData || []);

                setLoading(false);
                return;
            }

            // ⏳ SLOW PATH — first-ever visit
            const [jobSkillStats, jobEducationData] = await Promise.all([
                getSkillsForJob(jobId),
                getEducationForJob(jobId),
            ]);

            const extractedSkills = Array.isArray(jobSkillStats)
                ? jobSkillStats.map((s: any) => s.skill.toLowerCase())
                : [];

            jobMatchDetailCache.set(jobId, {
                extractedSkills,
                jobEducation: jobEducationData,
            });

            setJob({
                ...jobData,
                extractedSkills,
            });

            setJobEducation(jobEducationData);
            setUserSkills(userSkillsData || []);
            setUserEducation(userEducationData || []);

            setLoading(false);
        }

        load();
    }, [jobId]);

    if (loading) return <div className="p-8 text-center">Loading job match…</div>;
    if (!job) return <div className="p-8 text-center">Job not found.</div>;

    /* ================================
       SKILLS MATCHING
    ================================ */
    const jobSkills: string[] = job.extractedSkills || [];

    const matchedSkillObjects = userSkills.filter((us) =>
        jobSkills.includes(us.name.toLowerCase())
    );

    const matchedSkills = matchedSkillObjects.map((s) => s.name.toLowerCase());

    const missingSkills = jobSkills.filter(
        (skill) => !matchedSkills.includes(skill)
    );

    const skillMatchScore =
        jobSkills.length === 0
            ? 0
            : Math.round((matchedSkills.length / jobSkills.length) * 100);

    const strongestSkills = [...matchedSkillObjects]
        .sort((a, b) => {
            const rankA = SKILL_RANK[a.proficiency.toLowerCase()] ?? 0;
            const rankB = SKILL_RANK[b.proficiency.toLowerCase()] ?? 0;
            return rankB - rankA;
        })
        .slice(0, 5);

    /* ================================
       EDUCATION MATCHING
    ================================ */
    let matchedEducation: UserEducation[] = [];

    if (jobEducation?.level && jobEducation.fields?.length > 0) {
        const jobLevelRank =
            EDUCATION_RANK[normalizeEducationLevel(jobEducation.level)] ?? 0;

        matchedEducation = userEducation.filter((edu) => {
            const userLevelRank =
                EDUCATION_RANK[normalizeEducationLevel(edu.educationLevel)] ?? 0;

            const levelMatch = userLevelRank >= jobLevelRank;

            const fieldMatch = jobEducation.fields.some((field) => {
                const userField = edu.fieldOfStudy.toLowerCase();
                return userField.includes(field) || field.includes(userField);
            });

            return levelMatch && fieldMatch;
        });
    }

    /* ================================
       APPLICATION RECOMMENDATIONS
    ================================ */
    const emphasizeSkills = strongestSkills.slice(0, 3);

    const gapRecommendations =
        missingSkills.length === 0
            ? [
                "You meet all listed skill requirements. Focus on impact, measurable results, and ownership in your application.",
            ]
            : missingSkills.length <= 3
                ? [
                    `Consider strengthening skills such as ${missingSkills
                        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                        .join(", ")} through targeted projects or coursework.`,
                ]
                : [
                    `Prioritize learning the most critical skills (e.g., ${missingSkills
                        .slice(0, 3)
                        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                        .join(", ")}), focusing on one at a time.`,
                    "Emphasize transferable experience and related tools to offset remaining gaps.",
                ];

    /* ================================
       UI
    ================================ */
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            {/* BACK BUTTON */}
            <button
  onClick={() => navigate(-1)}
  className="text-sm text-gray-500 hover:text-gray-800"
>
  ← Back
</button>
            {/* HEADER */}
            <div>
                <h1 className="text-3xl font-bold">{job.title}</h1>
                <p className="text-gray-600">
                    {job.company} • {job.industry}
                </p>
            </div>

            {/* SKILLS MATCH SCORE */}
            <div className="bg-white p-6 rounded-xl shadow border">
                <h2 className="text-xl font-bold mb-2">Skills Match</h2>
                <div className="text-4xl font-extrabold text-blue-600">
                    {skillMatchScore}%
                </div>
                <p className="text-gray-600 mt-1">
                    Based on your skills vs job requirements
                </p>
            </div>

            {/* MATCHING SKILLS */}
            <div className="bg-white p-6 rounded-xl shadow border">
                <h3 className="text-lg font-bold mb-3">Matching Skills</h3>
                <div className="flex flex-wrap gap-2">
                    {matchedSkills.map((s) => (
                        <span
                            key={s}
                            className="px-3 py-1 bg-green-100 text-green-800 rounded-full capitalize"
                        >
                            {s}
                        </span>
                    ))}
                </div>
            </div>

            {/* MISSING SKILLS */}
            <div className="bg-white p-6 rounded-xl shadow border">
                <h3 className="text-lg font-bold mb-3">Missing Skills</h3>
                <div className="flex flex-wrap gap-2">
                    {missingSkills.map((s) => (
                        <span
                            key={s}
                            className="px-3 py-1 bg-red-100 text-red-800 rounded-full capitalize"
                        >
                            {s}
                        </span>
                    ))}
                </div>
            </div>

            {/* STRONGEST SKILLS */}
            <div className="bg-white p-6 rounded-xl shadow border">
                <h3 className="text-lg font-bold mb-3">
                    Strongest Skill Qualifications for the Role
                </h3>

                <div className="flex flex-wrap gap-2 mb-4">
                    {strongestSkills.map((s) => (
                        <span
                            key={s.name}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full capitalize"
                        >
                            {s.name} • {s.proficiency}
                        </span>
                    ))}
                </div>
            </div>

            {/* STRONGEST EDUCATION */}
            <div className="bg-white p-6 rounded-xl shadow border">
                <h3 className="text-lg font-bold mb-3">
                    Strongest Educational Qualifications for the Role
                </h3>

                {matchedEducation.length === 0 ? (
                    <p className="text-gray-500">
                        No matching education found. Add education to your profile to improve
                        your match.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {matchedEducation.map((e) => (
                            <span
                                key={e._id}
                                className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full"
                            >
                                {e.educationLevel} in {e.fieldOfStudy}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* APPLICATION RECOMMENDATIONS */}
            <div className="bg-white p-6 rounded-xl shadow border">
                <h3 className="text-lg font-bold mb-4">
                    Application Recommendations
                </h3>

                <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {gapRecommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}