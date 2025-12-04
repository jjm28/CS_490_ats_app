import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCampaignAnalytics, getCampaigns } from "../../api/campaign";
import type { CampaignAnalytics as AnalyticsType, Campaign } from "../../api/campaign";
import {
  TrendingUp,
  Target,
  Users,
  CheckCircle,
  Award,
  BarChart3,
  Download,
} from "lucide-react";

export default function CampaignAnalytics() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsType | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const [analyticsData, campaignsData] = await Promise.all([
        getCampaignAnalytics(),
        getCampaigns(),
      ]);
      setAnalytics(analyticsData);
      setCampaigns(campaignsData);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    if (!analytics) return;

    // Create CSV content
    const csvContent = [
      ["Campaign Analytics Report"],
      ["Generated:", new Date().toLocaleString()],
      [""],
      ["Overview"],
      ["Total Campaigns", analytics.totalCampaigns],
      ["Active Campaigns", analytics.activeCampaigns],
      ["Total Outreaches", analytics.totalOutreaches],
      ["Total Responses", analytics.totalResponses],
      ["Overall Response Rate", `${analytics.overallResponseRate}%`],
      [""],
      ["Campaign Breakdown"],
      ["Campaign Name", "Status", "Outreach", "Responses", "Response Rate", "Outreach Progress", "Response Progress"],
      ...analytics.campaignBreakdown.map((c) => [
        c.name,
        c.status,
        c.metrics.totalOutreach,
        c.metrics.responses,
        `${c.metrics.responseRate}%`,
        `${c.goalProgress.outreachProgress}%`,
        `${c.goalProgress.responseProgress}%`,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // Calculate best performing campaigns
  const topCampaigns = analytics?.campaignBreakdown
    .filter((c) => c.metrics.sent > 0)
    .sort((a, b) => b.metrics.responseRate - a.metrics.responseRate)
    .slice(0, 3) || [];

  // Get all A/B test variants across campaigns
  const allVariants = campaigns.flatMap((campaign) =>
    campaign.abTestVariants.map((variant) => ({
      campaignName: campaign.name,
      ...variant,
    }))
  );

  const topVariants = allVariants
    .filter((v) => v.sent > 0)
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="text-center mt-20 text-gray-600 animate-pulse">
        Loading analytics...
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center mt-20 text-red-600">
        Failed to load analytics
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Back Button */}
      <button
        onClick={() => navigate("/networking/campaigns")}
        className="mb-8 flex items-center gap-2 px-4 py-2 text-sm font-medium
                   text-white bg-emerald-600 rounded-lg shadow hover:bg-emerald-700 transition"
      >
        ← Back to Campaigns
      </button>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-emerald-600" />
            Campaign Analytics
          </h1>
          <p className="text-gray-600 mt-2">
            Performance insights and A/B test results across all campaigns
          </p>
        </div>

        <button
          onClick={downloadReport}
          className="px-5 py-2.5 text-sm font-semibold text-white
                     bg-emerald-600 rounded-lg shadow hover:bg-emerald-700 
                     transition transform hover:scale-105 flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download Report
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <OverviewCard
          title="Total Campaigns"
          value={analytics.totalCampaigns}
          icon={<Target className="w-6 h-6 text-emerald-600" />}
          subtitle={`${analytics.activeCampaigns} active`}
        />
        <OverviewCard
          title="Total Outreaches"
          value={analytics.totalOutreaches}
          icon={<Users className="w-6 h-6 text-blue-600" />}
        />
        <OverviewCard
          title="Total Responses"
          value={analytics.totalResponses}
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
        />
        <OverviewCard
          title="Overall Response Rate"
          value={`${analytics.overallResponseRate}%`}
          icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
        />
      </div>

      {/* Top Performing Campaigns */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Award className="w-6 h-6 text-yellow-500" />
          Top Performing Campaigns
        </h2>

        {topCampaigns.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            No campaigns with sent outreaches yet
          </p>
        ) : (
          <div className="space-y-4">
            {topCampaigns.map((campaign, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border border-gray-200 
                           rounded-lg hover:bg-gray-50 transition cursor-pointer"
                onClick={() => {
                  const fullCampaign = campaigns.find((c) => c.name === campaign.name);
                  if (fullCampaign) navigate(`/networking/campaigns/${fullCampaign._id}`);
                }}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className={`text-2xl font-bold ${
                      index === 0
                        ? "text-yellow-500"
                        : index === 1
                        ? "text-gray-400"
                        : "text-orange-600"
                    }`}
                  >
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{campaign.name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>{campaign.metrics.sent} sent</span>
                      <span>{campaign.metrics.responses} responses</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          campaign.status === "active"
                            ? "bg-green-100 text-green-800"
                            : campaign.status === "paused"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-emerald-600">
                      {campaign.metrics.responseRate}%
                    </div>
                    <div className="text-xs text-gray-600">Response Rate</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* A/B Test Results */}
      {topVariants.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            A/B Test Results - Best Performing Variants
          </h2>

          <div className="space-y-3">
            {topVariants.map((variant, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 
                           border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800">
                      {variant.variantName}
                    </h3>
                    <span className="text-xs text-gray-500">
                      ({variant.campaignName})
                    </span>
                  </div>
                  {variant.description && (
                    <p className="text-sm text-gray-600">{variant.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span>{variant.sent} sent</span>
                    <span>{variant.responses} responses</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-600">
                    {variant.successRate}%
                  </div>
                  <div className="text-xs text-gray-600">Success Rate</div>
                </div>
              </div>
            ))}
          </div>

          {/* Insights */}
          {topVariants.length > 1 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Insights</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • Best performer: <strong>{topVariants[0].variantName}</strong>{" "}
                  with {topVariants[0].successRate}% success rate
                </li>
                {topVariants.length > 1 && topVariants[0].successRate > topVariants[1].successRate && (
                  <li>
                    • {Math.round(
                      ((topVariants[0].successRate - topVariants[1].successRate) /
                        topVariants[1].successRate) *
                        100
                    )}
                    % better than the next best variant
                  </li>
                )}
                {topVariants[0].sent >= 10 && (
                  <li>• Sufficient sample size for reliable conclusions</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* All Campaigns Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          All Campaigns Performance
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Campaign
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Status
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">
                  Outreach
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">
                  Sent
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">
                  Responses
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">
                  Response Rate
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody>
              {analytics.campaignBreakdown.map((campaign, index) => {
                const fullCampaign = campaigns.find((c) => c.name === campaign.name);
                return (
                  <tr
                    key={index}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      if (fullCampaign) navigate(`/networking/campaigns/${fullCampaign._id}`);
                    }}
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-800">{campaign.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          campaign.status === "active"
                            ? "bg-green-100 text-green-800"
                            : campaign.status === "paused"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {campaign.metrics.totalOutreach}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {campaign.metrics.sent}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {campaign.metrics.responses}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-emerald-600">
                        {campaign.metrics.responseRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-sm">
                        <div>
                          Outreach: {campaign.goalProgress.outreachProgress}%
                        </div>
                        <div>
                          Response: {campaign.goalProgress.responseProgress}%
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* Overview Card Component */
function OverviewCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-600">{title}</p>
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}