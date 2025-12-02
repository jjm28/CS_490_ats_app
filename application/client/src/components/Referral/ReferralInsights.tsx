import { useEffect, useState } from "react";
import {
  getEtiquetteGuidance,
  getTimingSuggestions,
  getPersonalizationTips,
} from "../../api/referrals";

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
    <div className="border rounded p-4 bg-white shadow-sm mb-4">
      <h2 className="font-semibold text-lg mb-2">{title}</h2>

      {loading && <p className="text-gray-500">Loading...</p>}

      {!loading && (!content || content.length === 0) && (
        <p className="text-gray-500 text-sm">No insights found.</p>
      )}

      <ul className="list-disc pl-5 space-y-1">
        {content?.map((tip: string, idx: number) => (
          <li key={idx} className="text-sm text-gray-700">
            {tip}
          </li>
        ))}
      </ul>
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
  const [etiquette, setEtiquette] = useState<string[] | null>(null);
  const [timing, setTiming] = useState<string[] | null>(null);
  const [personalization, setPersonalization] = useState<string[] | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadInsights();
  }, [jobTitle, relationship]);

  /* ----------------------------------
     Helper: Parse AI Bullet Text → Array
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
      /* ------------------------------
         1. Etiquette
      ------------------------------ */
      const e = await getEtiquetteGuidance();
      setEtiquette(parseBulletList(e.data.guidance));

      /* ------------------------------
         2. Timing
      ------------------------------ */
      const t = await getTimingSuggestions({
        jobTitle: jobTitle || "General",
      });
      setTiming(parseBulletList(t.data.timing));

      /* ------------------------------
         3. Personalization
         Only fetch if BOTH fields filled
      ------------------------------ */
      if (jobTitle.trim() && relationship.trim()) {
        const p = await getPersonalizationTips({
          jobTitle,
          relationship,
        });

        // Backend returns { success: true, tips: string }
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
    <div className="mt-6">
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
  );
}
