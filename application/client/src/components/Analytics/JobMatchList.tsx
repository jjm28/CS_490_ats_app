import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllJobs } from "../../api/jobs";
import { getUserSkillsWithLevels } from "../../api/market";
import { getUserEducationForMatch } from "../../api/market";
import { getSkillsForJob, getEducationForJob } from "../../api/market";

export default function JobMatchList() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        async function load() {
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
                    // --- SKILLS ---
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

                    // --- EDUCATION (binary) ---
                    const jobEducation = await getEducationForJob(job._id);

                    const educationMatch =
                        jobEducation?.level &&
                        userEducation.some((edu: any) => {
                            const userLevel = edu.educationLevel.toLowerCase();
                            const jobLevel = jobEducation.level.toLowerCase();
                            return userLevel.includes(jobLevel);
                        });

                    const educationScore = educationMatch ? 100 : 0;

                    // --- OVERALL SCORE (50 / 50) ---
                    const overallMatchScore = Math.round(
                        skillMatchScore * 0.5 + educationScore * 0.5
                    );

                    return {
                        ...job,
                        skillMatchScore,
                        educationScore,
                        overallMatchScore,
                    };
                })
            );

            // SORT by overall score
            rankedJobs.sort(
                (a, b) => b.overallMatchScore - a.overallMatchScore
            );

            setJobs(rankedJobs);
            setLoading(false);
        }

        load();
    }, []);

    if (loading) {
        return <div className="p-8 text-center">Loading jobs…</div>;
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
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
                            {/* LEFT SIDE: RANK + JOB INFO */}
                            <div className="flex items-center gap-4">
                                {/* RANK */}
                                <div className="text-3xl font-extrabold text-gray-400 w-10 text-center">
                                    #{index + 1}
                                </div>

                                {/* JOB INFO */}
                                <div>
                                    <div className="text-2xl font-extrabold text-gray-900">
                                        {job.title}
                                    </div>
                                    <div className="text-base text-gray-600">
                                        {job.company} • {job.industry}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT SIDE: SCORE */}
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