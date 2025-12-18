import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMaterialComparison } from "../../api/analytics";

// -----------------------------
// Shared comparison bar
// -----------------------------
function ComparisonBar({
  label,
  aValue,
  bValue,
  aLabel,
  bLabel,
}: {
  label: string;
  aValue: number;
  bValue: number;
  aLabel: string;
  bLabel: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">{label}</p>

      {/* Version A */}
      <div className="flex items-center gap-3">
        <span className="w-24 text-xs text-gray-500">{aLabel}</span>
        <div className="flex-1 h-3 bg-gray-200 rounded">
          <div
            className="h-3 bg-blue-600 rounded"
            style={{ width: `${aValue}%` }}
          />
        </div>
        <span className="w-10 text-xs text-right">{aValue}%</span>
      </div>

      {/* Version B */}
      <div className="flex items-center gap-3">
        <span className="w-24 text-xs text-gray-500">{bLabel}</span>
        <div className="flex-1 h-3 bg-gray-200 rounded">
          <div
            className="h-3 bg-green-600 rounded"
            style={{ width: `${bValue}%` }}
          />
        </div>
        <span className="w-10 text-xs text-right">{bValue}%</span>
      </div>
    </div>
  );
}

// -----------------------------
// Types
// -----------------------------
interface VersionMetric {
  versionId: string;
  versionLabel?: string;
  applications: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
}

export default function MaterialComparisonChart() {
  const { type, baseId } = useParams<{
    type: "resume" | "cover-letter";
    baseId: string;
  }>();

  const navigate = useNavigate();
  const [versions, setVersions] = useState<VersionMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (!type || !baseId) return;
        const data = await getMaterialComparison(type, baseId);
        setVersions(data);
      } catch (err) {
        console.error("Failed to load comparison", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [type, baseId]);

  if (loading) return <div className="p-10">Loading comparison…</div>;

  const [a, b] = versions;

  function rankVersions(list: VersionMetric[]) {
    return [...list].sort((x, y) => {
      if (y.offerRate !== x.offerRate) return y.offerRate - x.offerRate;
      if (y.interviewRate !== x.interviewRate) return y.interviewRate - x.interviewRate;
      return y.responseRate - x.responseRate;
    });
  }

  const ranked = versions.length >= 2 ? rankVersions(versions) : [];
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];

  return (
    <div className="p-10 max-w-5xl mx-auto space-y-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2
             px-4 py-2 rounded-lg bg-(--brand-navy)
             text-white text-sm font-medium
             hover:bg-(--brand-navy-hover) transition"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold">
        {type === "resume" ? "Resume" : "Cover Letter"} Version Comparison
      </h1>

      <p className="text-sm text-gray-600">
        Comparing performance across versions derived from the same{" "}
        {type === "resume" ? "resume" : "cover letter"}.
      </p>

      {/* ===== UNIFIED COMPARISON CHART ===== */}
      {versions.length === 2 && (
        <div className="bg-white border rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-800">
            Performance Comparison
          </h3>

          <ComparisonBar
            label="Response Rate"
            aValue={a.responseRate}
            bValue={b.responseRate}
            aLabel={a.versionLabel ?? "Version A"}
            bLabel={b.versionLabel ?? "Version B"}
          />

          <ComparisonBar
            label="Interview Rate"
            aValue={a.interviewRate}
            bValue={b.interviewRate}
            aLabel={a.versionLabel ?? "Version A"}
            bLabel={b.versionLabel ?? "Version B"}
          />

          <ComparisonBar
            label="Offer Rate"
            aValue={a.offerRate}
            bValue={b.offerRate}
            aLabel={a.versionLabel ?? "Version A"}
            bLabel={b.versionLabel ?? "Version B"}
          />
        </div>
      )}

      {/* ===== TABLE (REFERENCE) ===== */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Version</th>
              <th className="px-4 py-3 text-center">Apps</th>
              <th className="px-4 py-3 text-center">Response %</th>
              <th className="px-4 py-3 text-center">Interview %</th>
              <th className="px-4 py-3 text-center">Offer %</th>
            </tr>
          </thead>
          <tbody>
            {versions.map(v => (
              <tr key={v.versionId} className="border-t">
                <td className="px-4 py-3 font-medium">
                  {v.versionLabel ?? v.versionId}
                </td>
                <td className="px-4 py-3 text-center">{v.applications}</td>
                <td className="px-4 py-3 text-center">{v.responseRate}%</td>
                <td className="px-4 py-3 text-center">{v.interviewRate}%</td>
                <td className="px-4 py-3 text-center">{v.offerRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 italic">
        Meaningful comparisons require at least 10 applications per version.
      </p>
      {best && worst && best.versionId !== worst.versionId && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-(--brand-navy)">
            Actionable Recommendations
          </h2>

          <div className="text-sm text-gray-700 space-y-3">
            <p>
              ⭐ <span className="font-semibold">
                {best.versionLabel ?? best.versionId}
              </span>{" "}
              is your strongest-performing {type === "resume" ? "resume" : "cover letter"} version.
              It shows the highest overall conversion to offers.
            </p>

            <p>
              📈 This version achieved an offer rate of{" "}
              <span className="font-semibold">{best.offerRate}%</span>, compared to{" "}
              <span className="font-semibold">{worst.offerRate}%</span> for{" "}
              <span className="font-semibold">
                {worst.versionLabel ?? worst.versionId}
              </span>.
            </p>

            <p>
              ⚠️ Consider revising or deprioritizing{" "}
              <span className="font-semibold">
                {worst.versionLabel ?? worst.versionId}
              </span>{" "}
              unless it is tailored for a very specific role.
            </p>

            <p className="italic text-gray-500">
              Recommendation confidence improves with more applications per version.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}