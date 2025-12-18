import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllJobs } from "../../api/jobs";
import { getUserSkillsWithLevels } from "../../api/market";
import { getUserEducationForMatch } from "../../api/market";
import { getSkillsForJob, getEducationForJob } from "../../api/market";
import {
    jobMatchStatsCache,
    isJobMatchListLoaded,
    setJobMatchListLoaded,
} from "../../utils/jobMatchCache";

export default function JobMatchList() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        async function load() {
            // ⚡ FAST PATH — cache already built
            if (isJobMatchListLoaded()) {
                const cachedJobs = await getAllJobs();

                setJobs(
                    cachedJobs.map((job: any) => ({
                        ...job,
                        ...jobMatchStatsCache.get(job._id),
                    }))
                );

                setLoading(false);
                return;
            }

            // ⏳ FIRST LOAD — build cache
            setLoading(true);

            const jobsData = await getAllJobs();
            const userSkills = await getUserSkillsWithLevels();
            const userEducation = await getUserEducationForMatch();

            if (!Array.isArray(jobsData)) {
                setJobs([]);
                setLoading(false);
                return;
            }

            const rankedJobs = await Promise.all(
                jobsData.map(async (job) => {
                    const jobSkillStats = await getSkillsForJob(job._id);
                    const jobSkills = Array.isArray(jobSkillStats)
                        ? jobSkillStats.map((s: any) => s.skill.toLowerCase())
                        : [];

                    const matchedSkills = userSkills.filter((us: any) =>
                        jobSkills.includes(us.name.toLowerCase())
                    );

                    const skillMatchScore =
                        jobSkills.length === 0
                            ? 0
                            : Math.round((matchedSkills.length / jobSkills.length) * 100);

                    const jobEducation = await getEducationForJob(job._id);

                    const educationMatch =
                        jobEducation?.level &&
                        userEducation.some((edu: any) =>
                            edu.educationLevel
                                .toLowerCase()
                                .includes(jobEducation.level.toLowerCase())
                        );

                    const educationScore = educationMatch ? 100 : 0;

                    const overallMatchScore = Math.round(
                        skillMatchScore * 0.5 + educationScore * 0.5
                    );

                    // ✅ CACHE
                    jobMatchStatsCache.set(job._id, {
                        skillMatchScore,
                        educationScore,
                        overallMatchScore,
                    });

                    return {
                        ...job,
                        skillMatchScore,
                        educationScore,
                        overallMatchScore,
                    };
                })
            );

            rankedJobs.sort((a, b) => b.overallMatchScore - a.overallMatchScore);

            setJobs(rankedJobs);
            setLoading(false);

            // ✅ MARK CACHE READY
            setJobMatchListLoaded(true);
        }

        load();
    }, []);

    if (loading) {
        return <div className="p-8 text-center">Loading jobs…</div>;
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <button
                onClick={() => navigate(-1)}
                className="text-sm text-gray-500 hover:text-gray-800 mb-4"
            >
                ← Back
            </button>
            <h1 className="text-3xl font-bold mb-6">Job Match Analysis</h1>

            {jobs.length === 0 ? (
                <p className="text-gray-500">
                    Add jobs with descriptions to see match analysis.
                </p>
            ) : (
                <div className="space-y-3">
                    {jobs.map((job, index) => (
                        <div
                            key={job._id}
                            onClick={() => navigate(`/analytics/job-match/${job._id}`)}
                            className="p-5 bg-white rounded-lg shadow border cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="text-3xl font-extrabold text-gray-400 w-10 text-center">
                                    #{index + 1}
                                </div>

                                <div>
                                    <div className="text-2xl font-extrabold text-gray-900">
                                        {job.title}
                                    </div>
                                    <div className="text-base text-gray-600">
                                        {job.company} • {job.industry}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-2xl font-extrabold text-blue-600">
                                    {job.overallMatchScore}%
                                </div>
                                <div className="text-xs text-gray-500">
                                    Skills {job.skillMatchScore}% • Education{" "}
                                    {job.educationScore === 100 ? "✓" : "✗"}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}