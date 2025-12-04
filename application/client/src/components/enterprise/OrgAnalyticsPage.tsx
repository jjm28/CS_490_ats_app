// src/features/analytics/OrgAnalyticsPage.tsx
import React, { useEffect, useState, useMemo } from "react";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import type {
  AnalyticsOverviewResponse,
  CohortAnalyticsRow,
  AnalyticsInsight,
} from "../../types/enterprise";
import { getAuthMeta } from "../../types/cohort";

type TabKey = "effectiveness" | "roi" | "insights";

interface CohortOption {
  value: string;
  label: string;
}

// For fetching cohort dropdown; keep it minimal
interface CohortListItem {
  _id: string;
  name: string;
}

interface CohortListResponse {
  items: CohortListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type RangePreset = "last30" | "last90" | "last180";

function computeDateRange(preset: RangePreset): { from: string; to: string } {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  let days = 90;
  if (preset === "last30") days = 30;
  if (preset === "last180") days = 180;

  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

const OrgAnalyticsPage: React.FC = () => {
  const authUserRaw = localStorage.getItem("authUser");
  const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
  const role: string | undefined = authUser?.user?.role;
  const { userId,  organizationId } = getAuthMeta();

  const [activeTab, setActiveTab] = useState<TabKey>("effectiveness");
  const [rangePreset, setRangePreset] = useState<RangePreset>("last90");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");

  const [cohortOptions, setCohortOptions] = useState<CohortOption[]>([]);
  const [loadingCohorts, setLoadingCohorts] = useState(false);

  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    if (customFrom && customTo) {
      return {
        from: new Date(customFrom).toISOString(),
        to: new Date(customTo).toISOString(),
      };
    }
    return computeDateRange(rangePreset);
  }, [rangePreset, customFrom, customTo]);

  useEffect(() => {
    if (role !== "org_admin" && role !== "super_admin") {
      setError("You are not authorized to view analytics.");
      return;
    }
    fetchCohorts();
  }, [role]);

  useEffect(() => {
    if (role !== "org_admin" && role !== "super_admin") return;
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangePreset, customFrom, customTo, selectedCohortId]);

  async function fetchCohorts() {
    try {
      setLoadingCohorts(true);
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "100");
      params.set("status", "active");

      const res = await fetch(
        `${API_BASE}/api/enterprise/cohorts?${params.toString()}`,
        {
          credentials: "include",          headers: {
            ...(userId
              ? {
                  "x-user-id": userId,
                  "x-user-role": role || "",
                  "x-org-id": organizationId || "",
                }
              : {}),
          },
        }
      );
      if (!res.ok) {
        throw new Error("Failed to fetch cohorts");
      }
      const json = (await res.json()) as CohortListResponse;

      const options: CohortOption[] = json.items.map((c) => ({
        value: c._id,
        label: c.name,
      }));
      setCohortOptions(options);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCohorts(false);
    }
  }

  async function fetchAnalytics() {
    try {
      setLoadingAnalytics(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("from", dateRange.from);
      params.set("to", dateRange.to);
      if (selectedCohortId) params.set("cohortId", selectedCohortId);

      const res = await fetch(
        `${API_BASE}/api/enterprise/analytics/overview?${params.toString()}`,
        {
          credentials: "include",
                    headers: {
            ...(userId
              ? {
                  "x-user-id": userId,
                  "x-user-role": role || "",
                  "x-org-id": organizationId || "",
                }
              : {}),
          },
        }
      );
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Failed to fetch analytics");
      }

      setData(body as AnalyticsOverviewResponse);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error loading analytics");
    } finally {
      setLoadingAnalytics(false);
    }
  }

  function handlePresetChange(preset: RangePreset) {
    setRangePreset(preset);
    setCustomFrom("");
    setCustomTo("");
  }

  function formatPercent(value: number) {
    return `${(value * 100).toFixed(1)}%`;
  }

  function formatNumber(value: number) {
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    });
  }

  function effectivenessCards() {
    if (!data) return null;
    const e = data.effectiveness;

    const cards = [
      {
        label: "Total job seekers",
        value: e.totalJobSeekers,
        subtitle: "Non-deleted job seekers in this org",
      },
      {
        label: "Active job seekers",
        value: e.activeJobSeekers,
        subtitle: "Scoped by org & filters",
      },
      {
        label: "Applications submitted",
        value: e.applicationsSubmitted,
        subtitle: "Jobs created in this period",
      },
      {
        label: "Interviews",
        value: e.interviews,
        subtitle: "Interviews scheduled in this period",
      },
      {
        label: "Hires",
        value: e.hires,
        subtitle: "Jobs with accepted offers",
      },
      {
        label: "Placement rate",
        value: formatPercent(e.placementRate),
        subtitle: "Hires / completed searches",
      },
      {
        label: "Avg. time-to-hire (days)",
        value: formatNumber(e.averageTimeToHireDays),
        subtitle: "Hired jobs only",
      },
      {
        label: "Applications per candidate",
        value: formatNumber(e.applicationsPerCandidate),
        subtitle: "Applications / active job seekers",
      },
    ];

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mt-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="text-xs uppercase text-gray-500 mb-1">
              {c.label}
            </div>
            <div className="text-2xl font-semibold mb-1">{c.value}</div>
            <div className="text-xs text-gray-500">{c.subtitle}</div>
          </Card>
        ))}
      </div>
    );
  }

  function cohortTable() {
    if (!data) return null;
    const rows = data.cohorts;

    if (rows.length === 0) {
      return (
        <Card className="p-4 mt-6">
          <p className="text-sm text-gray-600">
            No cohorts found for this organization. Create cohorts to see
            program-level analytics.
          </p>
        </Card>
      );
    }

    return (
      <Card className="p-4 mt-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Cohort performance</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-4">Cohort</th>
              <th className="text-right py-2 pr-4">Members</th>
              <th className="text-right py-2 pr-4">Active seekers</th>
              <th className="text-right py-2 pr-4">Applications / candidate</th>
              <th className="text-right py-2 pr-4">Placement rate</th>
              <th className="text-right py-2 pr-0">Hires</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: CohortAnalyticsRow) => (
              <tr key={row.cohortId} className="border-b last:border-0">
                <td className="py-2 pr-4">{row.name}</td>
                <td className="py-2 pr-4 text-right">
                  {row.memberCount}
                </td>
                <td className="py-2 pr-4 text-right">
                  {row.activeJobSeekers}
                </td>
                <td className="py-2 pr-4 text-right">
                  {formatNumber(row.applicationsPerCandidate)}
                </td>
                <td className="py-2 pr-4 text-right">
                  {formatPercent(row.placementRate)}
                </td>
                <td className="py-2 pr-0 text-right">{row.hires}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    );
  }

  function roiContent() {
    if (!data) return null;
    const { outcomes, roi } = data;

    const cards = [
      {
        label: "Hires in this period",
        value: outcomes.hires,
        subtitle: "Jobs with accepted offers",
      },
      {
        label: "Offers",
        value: outcomes.offers,
        subtitle: "Offer received / accepted",
      },
      {
        label: "Avg. salary / total comp",
        value:
          outcomes.averageSalary > 0
            ? `$${formatNumber(outcomes.averageSalary)}`
            : "—",
        subtitle: "Based on hired roles with salary data",
      },
      {
        label: "Offer acceptance rate",
        value: formatPercent(outcomes.offerAcceptanceRate),
        subtitle: "Hires / offers",
      },
      {
        label: "Estimated program cost",
        value:
          roi.estimatedProgramCost > 0
            ? `$${formatNumber(roi.estimatedProgramCost)}`
            : "—",
        subtitle:
          roi.estimatedProgramCost > 0
            ? "Based on org cost settings"
            : "Set cost in Organization to unlock ROI",
      },
      {
        label: "Estimated value from hires",
        value:
          roi.estimatedValueFromHires > 0
            ? `$${formatNumber(roi.estimatedValueFromHires)}`
            : "—",
        subtitle: "Sum of total compensation for hired roles",
      },
      {
        label: "Estimated ROI",
        value:
          roi.roi != null
            ? `${(roi.roi * 100).toFixed(1)}%`
            : "—",
        subtitle:
          roi.roi != null
            ? "((Value - Cost) / Cost)"
            : "Set cost fields to compute ROI",
      },
    ];

    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mt-4">
          {cards.map((c) => (
            <Card key={c.label} className="p-4">
              <div className="text-xs uppercase text-gray-500 mb-1">
                {c.label}
              </div>
              <div className="text-2xl font-semibold mb-1">{c.value}</div>
              <div className="text-xs text-gray-500">{c.subtitle}</div>
            </Card>
          ))}
        </div>

        <Card className="p-4 mt-6">
          <h2 className="text-sm font-semibold mb-2">
            How ROI is calculated
          </h2>
          <p className="text-sm text-gray-600">
            Estimated program cost is calculated as <code>fixedProgramCost</code>{" "}
            + <code>programCostPerJobSeeker × activeJobSeekers</code>. Estimated
            value from hires is the sum of total compensation for hired roles in
            the selected period. ROI is{" "}
            <code>(value - cost) / cost</code> when cost is greater than zero.
          </p>
        </Card>
      </>
    );
  }

  function insightsContent() {
    if (!data) return null;
    const insights = data.insights;

    if (insights.length === 0) {
      return (
        <Card className="p-4 mt-4">
          <h2 className="text-sm font-semibold mb-1">
            No insights to display yet
          </h2>
          <p className="text-sm text-gray-600">
            As more job search activity, offers, and hires accumulate, this
            section will surface patterns, bottlenecks, and best-practice
            recommendations.
          </p>
        </Card>
      );
    }

    const severityColor: Record<string, string> = {
      info: "bg-blue-50 text-blue-800 border-blue-200",
      warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
      success: "bg-green-50 text-green-800 border-green-200",
    };

    return (
      <div className="mt-4 space-y-3">
        {insights.map((i: AnalyticsInsight, idx: number) => {
          const cls = severityColor[i.severity] || severityColor.info;
          return (
            <Card
              key={`${i.type}-${idx}`}
              className={`p-4 border ${cls}`}
            >
              <div className="text-sm font-semibold mb-1">
                {i.message}
              </div>
              {i.details && (
                <p className="text-xs leading-relaxed">{i.details}</p>
              )}
            </Card>
          );
        })}
      </div>
    );
  }

  if (role !== "org_admin" && role !== "super_admin") {
    return (
      <div className="p-4">
        <Card className="p-4 max-w-lg">
          <h1 className="text-lg font-semibold mb-2">Not authorized</h1>
          <p className="text-sm text-gray-600">
            You don’t have permission to view enterprise analytics.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Program Analytics</h1>
          <p className="text-sm text-gray-600">
            Track program effectiveness, ROI, and optimization insights across
            your cohorts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500">Time range:</span>
          <Button
            type="button"
            variant={rangePreset === "last30" ? "primary" : "secondary"}
            onClick={() => handlePresetChange("last30")}
          >
            Last 30 days
          </Button>
          <Button
            type="button"
            variant={rangePreset === "last90" ? "primary" : "secondary"}
            onClick={() => handlePresetChange("last90")}
          >
            Last 90 days
          </Button>
          <Button
            type="button"
            variant={rangePreset === "last180" ? "primary" : "secondary"}
            onClick={() => handlePresetChange("last180")}
          >
            Last 180 days
          </Button>
          <span className="text-xs text-gray-500 ml-2">or custom:</span>
          <input
            type="date"
            className="border rounded px-2 py-1 text-xs"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
          />
          <span className="text-xs text-gray-500">to</span>
          <input
            type="date"
            className="border rounded px-2 py-1 text-xs"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 rounded-full p-1">
          <button
            className={`px-3 py-1 text-xs rounded-full ${
              activeTab === "effectiveness"
                ? "bg-white shadow font-semibold"
                : "text-gray-600"
            }`}
            onClick={() => setActiveTab("effectiveness")}
          >
            Effectiveness
          </button>
          <button
            className={`px-3 py-1 text-xs rounded-full ${
              activeTab === "roi"
                ? "bg-white shadow font-semibold"
                : "text-gray-600"
            }`}
            onClick={() => setActiveTab("roi")}
          >
            Outcomes & ROI
          </button>
          <button
            className={`px-3 py-1 text-xs rounded-full ${
              activeTab === "insights"
                ? "bg-white shadow font-semibold"
                : "text-gray-600"
            }`}
            onClick={() => setActiveTab("insights")}
          >
            Insights
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Cohort filter:</span>
          <select
            className="border rounded px-2 py-1 text-xs"
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            disabled={loadingCohorts}
          >
            <option value="">All cohorts</option>
            {cohortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <Card className="p-3 border border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {loadingAnalytics && (
        <Card className="p-4">
          <p className="text-sm">Loading analytics…</p>
        </Card>
      )}

      {!loadingAnalytics && data && activeTab === "effectiveness" && (
        <>
          {effectivenessCards()}
          {cohortTable()}
        </>
      )}

      {!loadingAnalytics && data && activeTab === "roi" && roiContent()}

      {!loadingAnalytics && data && activeTab === "insights" && insightsContent()}
    </div>
  );
};

export default OrgAnalyticsPage;
