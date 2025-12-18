import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getIndustries,
  getSkillsForIndustry,
  getUserSkills,
  getTopCompanies,
  getIndustryTrends,
  getEmergingSkills,
  getJobCount
} from "./../../api/market";

interface SkillStat {
  skill: string;
  count: number;
}

interface CompanyStat {
  company: string;
  count: number;
}

export default function MarketTrends() {
  const navigate = useNavigate();
  const [industries, setIndustries] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [skillData, setSkillData] = useState<SkillStat[]>([]);
  const [userSkills, setUserSkillsState] = useState<string[]>([]);
  const [topCompanies, setTopCompanies] = useState<CompanyStat[]>([]);
  const [industryTrends, setIndustryTrends] = useState<any[]>([]);
  const [emergingSkills, setEmergingSkills] = useState<SkillStat[]>([]);
  const [loading, setLoading] = useState(false);

  const [jobCount, setJobCount] = useState(0);
  const [industryHasDescriptions, setIndustryHasDescriptions] = useState(true);

  // Load core info on mount
  useEffect(() => {
    async function load() {
      const list = await getIndustries();
      setIndustries(Array.isArray(list) ? list : []);

      const skills = await getUserSkills();
      setUserSkillsState(Array.isArray(skills) ? skills : []);

      const trends = await getIndustryTrends();
      setIndustryTrends(Array.isArray(trends) ? trends : []);

      const emerging = await getEmergingSkills();
      setEmergingSkills(Array.isArray(emerging) ? emerging : []);

      const count = await getJobCount();
      setJobCount(count.count || 0);
    }
    load();
  }, []);

  async function handleSelect(e: any) {
    setLoading(true);
    const industry = e.target.value;
    setSelected(industry);

    if (!industry) {
      setSkillData([]);
      setTopCompanies([]);
      return;
    }

    // refresh skills
    const fresh = await getUserSkills();
    setUserSkillsState(fresh);

    const data = await getSkillsForIndustry(industry);
    setSkillData(Array.isArray(data) ? data : []);

    // detect missing descriptions
    setIndustryHasDescriptions(data.length > 0);

    const companies = await getTopCompanies(industry);
    setTopCompanies(Array.isArray(companies) ? companies : []);

    setLoading(false);
  }

  const recommendedSkills = skillData
    .filter((s) => !userSkills.includes(s.skill.toLowerCase()))
    .slice(0, 5);

  const transferableSkills = userSkills.filter((us) =>
    skillData.some((s) => s.skill.toLowerCase() === us.toLowerCase())
  );

  const generateSummary = () => {
    if (!skillData.length) return "";
    const top = skillData.slice(0, 3).map((s) => s.skill).join(", ");
    return `The most in-demand skills in ${selected} right now include ${top}.`;
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold">Market Trends</h1>

        <button
          onClick={() => navigate("/analytics/job-match")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
        >
          Job Match Analysis
        </button>
      </div>
      {/* 🚨 No jobs in entire system */}
      {jobCount === 0 && (
        <>
          <div className="bg-yellow-50 border border-yellow-400 text-yellow-800 p-6 rounded-xl text-center mb-8">
            <p className="font-semibold text-lg">
              Add a job to unlock Market Trends and industry insights.
            </p>
          </div>

          <div className="text-center text-gray-500 mt-5">
            Start by adding your first job to see skill trends,
            hiring demand, and market intelligence.
          </div>
        </>
      )}

      {/* Stop rendering anything else if no jobs exist */}
      {jobCount === 0 && <></>}
      {jobCount === 0 && null}
      {jobCount === 0 && (
        <div className="mt-20 text-center text-gray-400">
          (Nothing else to show yet)
        </div>
      )}
      {jobCount === 0 && null /* Prevents further rendering */}

      {/* SELECT DROPDOWN */}
      {jobCount > 0 && (
        <div className="flex justify-center mb-10">
          <select
            className="border p-2 rounded-lg shadow-sm bg-white"
            value={selected}
            onChange={handleSelect}
          >
            <option value="">-- Select --</option>
            {industries.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="bg-white shadow-lg rounded-2xl p-8 border text-center mb-10">
          <div className="animate-pulse mb-3 text-lg font-semibold text-gray-600">
            Loading market insights…
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-400 h-3 rounded-full animate-pulse"
              style={{ width: "65%" }}
            />
          </div>
        </div>
      )}

      {/* 🚨 No descriptions in this industry */}
      {selected && !loading && !industryHasDescriptions && (
        <div className="bg-red-50 border border-red-400 text-red-700 p-6 rounded-xl text-center mb-8">
          <p className="font-semibold text-lg">
            Add job descriptions to unlock insights for the {selected} industry.
          </p>
        </div>
      )}

      {/* MAIN CONTENT */}
      {skillData.length > 0 && industryHasDescriptions && (
        <div className="space-y-10">

          {/* TOP SKILLS */}
          <div className="bg-white shadow-xl rounded-2xl p-8 border">
            <h2 className="text-2xl font-bold mb-4">
              Top Skills in {selected}
            </h2>

            {skillData.slice(0, 8).map((s) => {
              const highest = skillData[0]?.count || 1;
              const percent = Math.round((s.count / highest) * 100);

              return (
                <div key={s.skill} className="mb-3">
                  <div className="flex justify-between">
                    <span className="capitalize">{s.skill}</span>
                    <span className="text-sm">{s.count} uses</span>
                  </div>
                  <div className="w-full bg-gray-200 h-3 rounded-full">
                    <div
                      className="bg-blue-600 h-3 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* SUMMARY */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-xl shadow">
            <h3 className="text-xl font-bold mb-2">What This Means</h3>
            <p>{generateSummary()}</p>
          </div>

          {/* TOP COMPANIES */}
          <div className="bg-white shadow-lg rounded-2xl p-6 border">
            <h3 className="text-xl font-bold mb-3">
              Top Hiring Companies in {selected}
            </h3>

            {topCompanies.length === 0 ? (
              <p className="text-gray-500">No hiring data available.</p>
            ) : (
              <div className="space-y-2">
                {topCompanies.map((c) => (
                  <div key={c.company} className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>{c.company}</span>
                    <span className="font-semibold">{c.count} listings</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RECOMMENDED SKILLS */}
          <div className="bg-white shadow-lg rounded-2xl p-6 border">
            <h3 className="text-xl font-bold mb-3">Recommended Skills to Learn</h3>

            {recommendedSkills.length === 0 ? (
              <p>You already have most top skills — great job!</p>
            ) : (
              <div className="flex gap-3 flex-wrap">
                {recommendedSkills.map((s) => (
                  <span
                    key={s.skill}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full capitalize"
                  >
                    {s.skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* TRANSFERABLE SKILLS */}
          <div className="bg-white shadow-lg rounded-2xl p-6 border">
            <h3 className="text-xl font-bold mb-3">Your Transferable Strengths</h3>

            {transferableSkills.length === 0 ? (
              <p>No direct matches — time to grow into this industry!</p>
            ) : (
              <div className="flex gap-3 flex-wrap">
                {transferableSkills.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full capitalize"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* EMERGING SKILLS */}
          <div className="bg-white shadow-lg rounded-2xl p-6 border">
            <h3 className="text-xl font-bold mb-3">Emerging Skills in the Market</h3>
            <p className="text-gray-600 mb-3">
              These skills are rising in demand across ALL industries.
            </p>

            {emergingSkills.length === 0 ? (
              <p className="text-gray-500">No emerging skill data available.</p>
            ) : (
              emergingSkills.map((s) => (
                <span
                  key={s.skill}
                  className="inline-block px-3 py-1 mx-1 mb-2 bg-yellow-100 text-yellow-800 rounded-full capitalize"
                >
                  {s.skill}
                </span>
              ))
            )}
          </div>

          {/* INDUSTRY TRENDS */}
          <div className="bg-white shadow-lg rounded-2xl p-6 border">
            <h3 className="text-xl font-bold mb-3">Market Opportunity by Industry</h3>

            <div className="space-y-3">
              {industryTrends.map((i) => (
                <div
                  key={i.industry}
                  className="flex justify-between p-2 rounded bg-gray-50"
                >
                  <span className="capitalize">{i.industry}</span>
                  <span>{i.count} roles</span>
                </div>
              ))}
            </div>

            <p className="mt-3 text-gray-600">
              Higher numbers = more opportunity & better timing for applications.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}