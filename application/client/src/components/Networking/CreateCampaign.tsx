import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createCampaign } from "../../api/campaign";
import type { CampaignGoals, ABTestVariant } from "../../api/campaign";
import type { Job } from "../../types/jobs.types";
import { Target, Plus, Trash2 } from "lucide-react";
import API_BASE from "../../utils/apiBase";

export default function CreateCampaign() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState("");
  const [strategyNotes, setStrategyNotes] = useState("");

  // Goals
  const [outreachCount, setOutreachCount] = useState<number>(10);
  const [responseTarget, setResponseTarget] = useState<number>(3);
  const [timeline, setTimeline] = useState("");

  // A/B Test Variants
  const [abTestVariants, setAbTestVariants] = useState<ABTestVariant[]>([]);
  const [variantName, setVariantName] = useState("");
  const [variantDescription, setVariantDescription] = useState("");

  // Jobs linked to campaign
  const [linkedJobs, setLinkedJobs] = useState<string[]>([]);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState("");

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    try {
      const token = JSON.parse(localStorage.getItem("authUser") || "{}").token;
      const res = await fetch(`${API_BASE}/api/jobs`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to load jobs");

      const data = await res.json();
      // Filter to only show jobs that aren't completed/rejected
      const activeJobs = data.filter(
        (job: Job) => !["rejected", "withdrawn"].includes(job.status)
      );
      setAvailableJobs(activeJobs);
    } catch (err) {
      console.error("Failed to load jobs:", err);
      setAvailableJobs([]);
    }
  }

  function addLinkedJob() {
    if (selectedJob && !linkedJobs.includes(selectedJob)) {
      setLinkedJobs([...linkedJobs, selectedJob]);
      setSelectedJob("");
    }
  }

  function removeLinkedJob(jobId: string) {
    setLinkedJobs(linkedJobs.filter((id) => id !== jobId));
  }

  // Handle adding target company
  function addCompany() {
    if (companyInput.trim()) {
      setTargetCompanies([...targetCompanies, companyInput.trim()]);
      setCompanyInput("");
    }
  }

  function removeCompany(index: number) {
    setTargetCompanies(targetCompanies.filter((_, i) => i !== index));
  }

  // Handle adding A/B test variant
  function addVariant() {
    if (variantName.trim()) {
      setAbTestVariants([
        ...abTestVariants,
        {
          variantName: variantName.trim(),
          description: variantDescription.trim(),
          outreachIds: [],
          sent: 0,
          responses: 0,
          successRate: 0,
        },
      ]);
      setVariantName("");
      setVariantDescription("");
    }
  }

  function removeVariant(index: number) {
    setAbTestVariants(abTestVariants.filter((_, i) => i !== index));
  }

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Campaign name is required");
      return;
    }

    if (!timeline) {
      alert("Timeline is required");
      return;
    }

    const goals: CampaignGoals = {
      outreachCount,
      responseTarget,
      timeline,
    };

    try {
      setLoading(true);

      const newCampaign = await createCampaign({
        name: name.trim(),
        description: description.trim(),
        targetIndustry: targetIndustry.trim(),
        targetCompanies,
        goals,
        strategyNotes: strategyNotes.trim(),
        abTestVariants,
        linkedJobs, // ADD THIS LINE
        status: "active",
      });

      navigate(`/networking/campaigns/${newCampaign._id}`);
    } catch (err) {
      console.error("Failed to create campaign:", err);
      alert("Failed to create campaign. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Back Button */}
      <button
        onClick={() => navigate("/networking/campaigns")}
        className="mb-8 flex items-center gap-2 px-4 py-2 text-sm font-medium
                   text-white bg-emerald-600 rounded-lg shadow hover:bg-emerald-700 transition"
      >
        ← Back to Campaigns
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Target className="w-8 h-8 text-emerald-600" />
          Create New Campaign
        </h1>
        <p className="text-gray-600 mt-2">
          Set up a targeted networking campaign to track your outreach efforts
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Basic Information
          </h2>

          <div className="space-y-4">
            {/* Campaign Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Tech Companies Q1 2025"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your campaign goals and strategy..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Target Industry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Industry
              </label>
              <input
                type="text"
                value={targetIndustry}
                onChange={(e) => setTargetIndustry(e.target.value)}
                placeholder="e.g., Technology, Finance, Healthcare"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Target Companies */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Companies
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addCompany())
                  }
                  placeholder="Enter company name"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg 
                             focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addCompany}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg 
                             hover:bg-emerald-700 transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              {/* Companies List */}
              {targetCompanies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {targetCompanies.map((company, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1 bg-emerald-50 
                                 text-emerald-700 rounded-full text-sm"
                    >
                      {company}
                      <button
                        type="button"
                        onClick={() => removeCompany(index)}
                        className="hover:text-emerald-900"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Campaign Goals
          </h2>

          <div className="space-y-4">
            {/* Outreach Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Outreach Count <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={outreachCount}
                onChange={(e) => setOutreachCount(Number(e.target.value))}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>

            {/* Response Target */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Response Target <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={responseTarget}
                onChange={(e) => setResponseTarget(Number(e.target.value))}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>

            {/* Timeline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Timeline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        {/* A/B Test Variants (Optional) */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            A/B Test Variants (Optional)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Create different outreach approaches to test which performs better
          </p>

          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                placeholder="Variant name (e.g., Approach A)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <input
                type="text"
                value={variantDescription}
                onChange={(e) => setVariantDescription(e.target.value)}
                placeholder="Description"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addVariant}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg 
                           hover:bg-emerald-700 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Variants List */}
            {abTestVariants.length > 0 && (
              <div className="space-y-2">
                {abTestVariants.map((variant, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 
                               rounded-lg border border-gray-200"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {variant.variantName}
                      </p>
                      {variant.description && (
                        <p className="text-sm text-gray-600">
                          {variant.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Strategy Notes */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Strategy Notes
          </h2>
          <textarea
            value={strategyNotes}
            onChange={(e) => setStrategyNotes(e.target.value)}
            placeholder="Document your strategy, key talking points, or any notes about this campaign..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Linked Jobs */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Link to Job Applications (Optional)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Connect this campaign to specific job applications to track outcomes
          </p>

          <div className="space-y-4">
            <div className="flex gap-3">
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg 
                   focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Select a job application...</option>
                {availableJobs
                  .filter((job) => !linkedJobs.includes(job._id))
                  .map((job) => (
                    <option key={job._id} value={job._id}>
                      {job.jobTitle} at {job.company}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={addLinkedJob}
                disabled={!selectedJob}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg 
                   hover:bg-emerald-700 transition flex items-center gap-2
                   disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Linked Jobs List */}
            {linkedJobs.length > 0 && (
              <div className="space-y-2">
                {linkedJobs.map((jobId) => {
                  const job = availableJobs.find((j) => j._id === jobId);
                  if (!job) return null;

                  return (
                    <div
                      key={jobId}
                      className="flex items-center justify-between p-3 bg-gray-50 
                         rounded-lg border border-gray-200"
                    >
                      <div>
                        <p className="font-medium text-gray-800">
                          {job.jobTitle}
                        </p>
                        <p className="text-sm text-gray-600">{job.company}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLinkedJob(jobId)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate("/networking/campaigns")}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 
                       rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg 
                       hover:bg-emerald-700 transition font-medium disabled:opacity-50 
                       disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Campaign"}
          </button>
        </div>
      </form>
    </div>
  );
}
