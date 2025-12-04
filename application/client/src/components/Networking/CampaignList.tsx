import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCampaigns, deleteCampaign } from "../../api/campaign";
import type { Campaign } from "../../api/campaign";
import { Target, Plus, TrendingUp, Users, Calendar, BarChart3 } from "lucide-react";

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    loadCampaigns();
  }, [filter]);

  async function loadCampaigns() {
    try {
      setLoading(true);
      const statusFilter = filter === "all" ? undefined : filter;
      const data = await getCampaigns(statusFilter);
      setCampaigns(data);
    } catch (err) {
      console.error("Failed to load campaigns:", err);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this campaign?")) {
      return;
    }

    try {
      await deleteCampaign(id);
      setCampaigns(campaigns.filter((c) => c._id !== id));
    } catch (err) {
      console.error("Failed to delete campaign:", err);
      alert("Failed to delete campaign");
    }
  }

  if (loading) {
    return (
      <div className="text-center mt-20 text-gray-600 animate-pulse">
        Loading campaigns...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Back Button */}
      <button
        onClick={() => navigate("/networking")}
        className="mb-8 flex items-center gap-2 px-4 py-2 text-sm font-medium
                        text-white bg-emerald-600 rounded-lg shadow hover:bg-emerald-700 transition"
      >
        ← Back to Network Dashboard
      </button>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Target className="w-8 h-8 text-emerald-600" />
            Networking Campaigns
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your targeted networking efforts
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate("/networking/campaigns/analytics")}
            className="px-5 py-2.5 text-sm font-semibold text-emerald-600
                 bg-emerald-50 rounded-lg shadow hover:bg-emerald-100 
                 transition flex items-center gap-2 border border-emerald-200"
          >
            <BarChart3 className="w-5 h-5" />
            Analytics
          </button>

          <button
            onClick={() => navigate("/networking/campaigns/create")}
            className="px-5 py-2.5 text-sm font-semibold text-white
                 bg-emerald-600 rounded-lg shadow hover:bg-emerald-700 
                 transition transform hover:scale-105 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 mb-8">
        {["all", "active", "paused", "completed"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === status
                ? "bg-emerald-600 text-white shadow"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <div className="text-center py-20">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-6">
            No campaigns found. Create your first campaign to get started!
          </p>
          <button
            onClick={() => navigate("/networking/campaigns/create")}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg shadow 
                       hover:bg-emerald-700 transition"
          >
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign._id}
              campaign={campaign}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* Campaign Card Component */
function CampaignCard({
  campaign,
  onDelete,
}: {
  campaign: Campaign;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();

  const statusColors = {
    active: "bg-green-100 text-green-800",
    paused: "bg-yellow-100 text-yellow-800",
    completed: "bg-gray-100 text-gray-800",
  };

  const outreachProgress = Math.round(
    (campaign.metrics.totalOutreach / campaign.goals.outreachCount) * 100
  );

  const responseProgress = Math.round(
    (campaign.metrics.responses / campaign.goals.responseTarget) * 100
  );

  return (
    <div
      className="bg-white rounded-xl shadow-md border border-gray-200 p-6 
                 hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => navigate(`/networking/campaigns/${campaign._id}`)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            {campaign.name}
          </h3>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
              statusColors[campaign.status]
            }`}
          >
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Description */}
      {campaign.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {campaign.description}
        </p>
      )}

      {/* Metrics */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-gray-700">
            <Users className="w-4 h-4" />
            Outreach
          </span>
          <span className="font-semibold">
            {campaign.metrics.totalOutreach} / {campaign.goals.outreachCount}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-emerald-600 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(outreachProgress, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-gray-700">
            <TrendingUp className="w-4 h-4" />
            Responses
          </span>
          <span className="font-semibold">
            {campaign.metrics.responses} / {campaign.goals.responseTarget}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(responseProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Response Rate */}
      <div className="flex items-center justify-between pt-4 border-t">
        <span className="text-sm text-gray-600">Response Rate</span>
        <span className="text-lg font-bold text-emerald-600">
          {campaign.metrics.responseRate}%
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/networking/campaigns/${campaign._id}`);
          }}
          className="flex-1 px-4 py-2 bg-indigo-50 text-emerald-600 rounded-lg 
                     hover:bg-emerald-100 transition text-sm font-medium"
        >
          View Details
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(campaign._id);
          }}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg 
                     hover:bg-red-100 transition text-sm font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
