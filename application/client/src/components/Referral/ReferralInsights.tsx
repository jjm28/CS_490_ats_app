import { useEffect, useState } from "react";
import {
  getEtiquetteGuidance,
  getTimingSuggestions,
  getPersonalizationTips,
} from "../../api/referrals";
import { useNavigate } from "react-router-dom";

/* ----------------------------------
   TYPES
----------------------------------- */
interface ReferralInsightsProps {
  jobTitle: string;
  relationship: string;
}

interface InsightSectionProps {
  title: string;
  content: string[] | null;
  loading: boolean;
}

/* ----------------------------------
   REUSABLE UI SECTION
----------------------------------- */
function InsightSection({ title, content, loading }: InsightSectionProps) {
  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-3">{title}</h2>

      {loading && (
        <p className="text-blue-600 text-sm animate-pulse">Loading...</p>
      )}

      {!loading && (!content || content.length === 0) && (
        <p className="text-gray-500 text-sm">No insights available.</p>
      )}

      {!loading && content && (
        <ul className="list-disc pl-5 space-y-1 mt-2">
          {content.map((tip: string, idx: number) => (
            <li key={idx} className="text-sm text-gray-700">
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------------
   MAIN COMPONENT
----------------------------------- */
export default function ReferralInsights({
  jobTitle,
  relationship,
}: ReferralInsightsProps) {
  const navigate = useNavigate();

  const [etiquette, setEtiquette] = useState<string[] | null>(null);
  const [timing, setTiming] = useState<string[] | null>(null);
  const [personalization, setPersonalization] = useState<string[] | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadInsights();
  }, [jobTitle, relationship]);

  /* ----------------------------------
     Helper: Parse AI bullet text → Array
  ----------------------------------- */
  const parseBulletList = (text: string = ""): string[] =>
    text
      .split("\n")
      .map((line) => line.replace(/^[\-\*\•]\s*/, "").trim())
      .filter(Boolean);

  /* ----------------------------------
     LOAD ALL INSIGHT GROUPS
  ----------------------------------- */
  const loadInsights = async () => {
    setLoading(true);

    try {
      const e = await getEtiquetteGuidance();
      setEtiquette(parseBulletList(e.data.guidance));

      const t = await getTimingSuggestions({
        jobTitle: jobTitle || "General",
      });
      setTiming(parseBulletList(t.data.timing));

      if (jobTitle.trim() && relationship.trim()) {
        const p = await getPersonalizationTips({
          jobTitle,
          relationship,
        });
        setPersonalization(parseBulletList(p.data.tips));
      } else {
        setPersonalization([]);
      }
    } catch (err) {
      console.error("ReferralInsights AI Load Error:", err);
    }

    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

{/* Back Button */}
<button
  onClick={() => navigate("/networking")}
  className="mb-6 text-blue-600 hover:underline text-sm"
>
  ← Back to Network Dashboard
</button>

      {/* Page Header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        Referral Insights
      </h1>

      <div className="space-y-6">
        <InsightSection
          title="Referral Etiquette Guidance"
          content={etiquette}
          loading={loading}
        />

        <InsightSection
          title="Optimal Timing Suggestions"
          content={timing}
          loading={loading}
        />

        <InsightSection
          title="Personalization Insights"
          content={personalization}
          loading={loading}
        />
      </div>
    </div>
  );
}
