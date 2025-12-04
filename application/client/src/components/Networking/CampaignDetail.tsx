import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getCampaign,
  updateCampaign,
  addOutreach,
  updateOutreach,
  deleteOutreach,
} from "../../api/campaign";
import { getContacts } from "../../api/contact";
import type { Campaign, Outreach } from "../../api/campaign";
import type { Contact } from "../../api/contact";
import { STATUS_DISPLAY, type Job } from "../../types/jobs.types";
import {
  Target,
  TrendingUp,
  Users,
  Calendar,
  Edit,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Send,
} from "lucide-react";
import API_BASE from "../../utils/apiBase";

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddOutreach, setShowAddOutreach] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [linkedJobs, setLinkedJobs] = useState<Job[]>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [campaignData, contactsData] = await Promise.all([
        getCampaign(id!),
        getContacts(),
      ]);
      setCampaign(campaignData);
      setContacts(contactsData);

      // Load linked jobs
      if (campaignData.linkedJobs && campaignData.linkedJobs.length > 0) {
        await loadLinkedJobs(campaignData.linkedJobs);
      }
    } catch (err) {
      console.error("Failed to load campaign:", err);
      alert("Failed to load campaign");
      navigate("/networking/campaigns");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(
    newStatus: "active" | "paused" | "completed"
  ) {
    if (!campaign) return;

    try {
      const updated = await updateCampaign(campaign._id, { status: newStatus });
      setCampaign(updated);
      setEditingStatus(false);
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update campaign status");
    }
  }

  async function loadLinkedJobs(jobIds: string[]) {
    if (jobIds.length === 0) {
      setLinkedJobs([]);
      return;
    }

    try {
      const token = JSON.parse(localStorage.getItem("authUser") || "{}").token;

      // Fetch each job
      const jobPromises = jobIds.map(async (jobId) => {
        const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return null;
        return res.json();
      });

      const jobs = await Promise.all(jobPromises);
      setLinkedJobs(jobs.filter((job): job is Job => job !== null));
    } catch (err) {
      console.error("Failed to load linked jobs:", err);
      setLinkedJobs([]);
    }
  }

  if (loading) {
    return (
      <div className="text-center mt-20 text-gray-600 animate-pulse">
        Loading campaign...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center mt-20 text-red-600">Campaign not found</div>
    );
  }

  const outreachProgress = Math.round(
    (campaign.metrics.totalOutreach / campaign.goals.outreachCount) * 100
  );
  const responseProgress = Math.round(
    (campaign.metrics.responses / campaign.goals.responseTarget) * 100
  );

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
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3 mb-2">
              <Target className="w-8 h-8 text-emerald-600" />
              {campaign.name}
            </h1>
            {campaign.description && (
              <p className="text-gray-600">{campaign.description}</p>
            )}
          </div>

          {/* Status Badge with Edit */}
          <div className="flex items-center gap-2">
            {editingStatus ? (
              <select
                value={campaign.status}
                onChange={(e) =>
                  handleStatusChange(
                    e.target.value as "active" | "paused" | "completed"
                  )
                }
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                onBlur={() => setEditingStatus(false)}
                autoFocus
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            ) : (
              <>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    campaign.status === "active"
                      ? "bg-green-100 text-green-800"
                      : campaign.status === "paused"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {campaign.status.charAt(0).toUpperCase() +
                    campaign.status.slice(1)}
                </span>
                <button
                  onClick={() => setEditingStatus(true)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Campaign Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {campaign.targetIndustry && (
            <div>
              <p className="text-sm text-gray-600">Target Industry</p>
              <p className="font-semibold text-gray-800">
                {campaign.targetIndustry}
              </p>
            </div>
          )}
          {campaign.targetCompanies.length > 0 && (
            <div>
              <p className="text-sm text-gray-600">Target Companies</p>
              <p className="font-semibold text-gray-800">
                {campaign.targetCompanies.join(", ")}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600">Timeline</p>
            <p className="font-semibold text-gray-800 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(campaign.goals.timeline).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Outreach"
          value={campaign.metrics.totalOutreach}
          target={campaign.goals.outreachCount}
          icon={<Users className="w-6 h-6 text-emerald-600" />}
          progress={outreachProgress}
        />
        <MetricCard
          title="Sent"
          value={campaign.metrics.sent}
          icon={<Send className="w-6 h-6 text-blue-600" />}
        />
        <MetricCard
          title="Responses"
          value={campaign.metrics.responses}
          target={campaign.goals.responseTarget}
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
          progress={responseProgress}
        />
        <MetricCard
          title="Response Rate"
          value={`${campaign.metrics.responseRate}%`}
          icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
        />
      </div>

      {/* A/B Test Results */}
      {campaign.abTestVariants.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            A/B Test Results
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {campaign.abTestVariants.map((variant, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg bg-gray-50"
              >
                <h3 className="font-semibold text-gray-800 mb-2">
                  {variant.variantName}
                </h3>
                {variant.description && (
                  <p className="text-sm text-gray-600 mb-3">
                    {variant.description}
                  </p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sent:</span>
                    <span className="font-semibold">{variant.sent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Responses:</span>
                    <span className="font-semibold">{variant.responses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success Rate:</span>
                    <span className="font-bold text-emerald-600">
                      {variant.successRate}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Notes */}
      {campaign.strategyNotes && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Strategy Notes
          </h2>
          <p className="text-gray-700 whitespace-pre-wrap">
            {campaign.strategyNotes}
          </p>
        </div>
      )}

      {/* Linked Jobs */}
      {linkedJobs.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Linked Job Applications
          </h2>
          <div className="space-y-3">
            {linkedJobs.map((job) => (
              <div
                key={job._id}
                className="flex items-center justify-between p-4 border border-gray-200 
                        rounded-lg hover:bg-gray-50 transition cursor-pointer"
                onClick={() => navigate(`/jobs/${job._id}`)} // Adjust route as needed
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{job.jobTitle}</p>
                  <p className="text-sm text-gray-600">{job.company}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.status === "offer"
                          ? "bg-green-100 text-green-800"
                          : job.status === "interview"
                          ? "bg-yellow-100 text-yellow-800"
                          : job.status === "applied"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {STATUS_DISPLAY[job.status] || job.status}
                    </span>
                    {job.location && (
                      <span className="text-xs text-gray-500">
                        📍 {job.location}
                      </span>
                    )}
                  </div>
                </div>
                <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                  View Details →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outreaches Section */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Outreaches</h2>
          <button
            onClick={() => setShowAddOutreach(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg 
                       hover:bg-emerald-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Outreach
          </button>
        </div>

        {campaign.outreaches.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No outreaches yet</p>
            <button
              onClick={() => setShowAddOutreach(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg 
                         hover:bg-emerald-700 transition"
            >
              Add First Outreach
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaign.outreaches.map((outreach) => (
              <OutreachRow
                key={outreach.outreachId}
                outreach={outreach}
                campaignId={campaign._id}
                variants={campaign.abTestVariants}
                onUpdate={loadData}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Outreach Modal */}
      {showAddOutreach && (
        <AddOutreachModal
          campaignId={campaign._id}
          contacts={contacts}
          variants={campaign.abTestVariants}
          onClose={() => setShowAddOutreach(false)}
          onSuccess={() => {
            setShowAddOutreach(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

/* Metric Card Component */
function MetricCard({
  title,
  value,
  target,
  icon,
  progress,
}: {
  title: string;
  value: number | string;
  target?: number;
  icon: React.ReactNode;
  progress?: number;
}) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-600">{title}</p>
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-800">
        {value}
        {target && <span className="text-lg text-gray-500"> / {target}</span>}
      </p>
      {progress !== undefined && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* Outreach Row Component */
function OutreachRow({
  outreach,
  campaignId,
  variants,
  onUpdate,
}: {
  outreach: Outreach;
  campaignId: string;
  variants: any[];
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(outreach.status);
  const [notes, setNotes] = useState(outreach.notes || "");

  const statusIcons = {
    pending: <Clock className="w-4 h-4 text-yellow-600" />,
    sent: <Send className="w-4 h-4 text-blue-600" />,
    responded: <CheckCircle className="w-4 h-4 text-green-600" />,
    "no-response": <XCircle className="w-4 h-4 text-gray-600" />,
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    sent: "bg-blue-100 text-blue-800",
    responded: "bg-green-100 text-green-800",
    "no-response": "bg-gray-100 text-gray-800",
  };

  async function handleUpdate() {
    try {
      await updateOutreach(campaignId, outreach.outreachId, { status, notes });
      setEditing(false);
      onUpdate();
    } catch (err) {
      console.error("Failed to update outreach:", err);
      alert("Failed to update outreach");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this outreach?")) {
      return;
    }

    try {
      await deleteOutreach(campaignId, outreach.outreachId);
      onUpdate();
    } catch (err) {
      console.error("Failed to delete outreach:", err);
      alert("Failed to delete outreach");
    }
  }

  if (editing) {
    return (
      <div className="p-4 border border-emerald-300 bg-emerald-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="responded">Responded</option>
              <option value="no-response">No Response</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Add notes..."
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleUpdate}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg 
                       hover:bg-emerald-700 transition text-sm"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg 
                       hover:bg-gray-50 transition text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
          {statusIcons[outreach.status]}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{outreach.contactName}</p>
          <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                statusColors[outreach.status]
              }`}
            >
              {outreach.status}
            </span>
            {outreach.approach && <span>via {outreach.approach}</span>}
            {outreach.variantUsed && (
              <span className="text-purple-600">• {outreach.variantUsed}</span>
            )}
          </div>
          {outreach.notes && (
            <p className="text-sm text-gray-600 mt-1">{outreach.notes}</p>
          )}
        </div>
        {outreach.sentDate && (
          <div className="text-sm text-gray-600">
            Sent: {new Date(outreach.sentDate).toLocaleDateString()}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setEditing(true)}
          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* Add Outreach Modal */
function AddOutreachModal({
  campaignId,
  contacts,
  variants,
  onClose,
  onSuccess,
}: {
  campaignId: string;
  contacts: Contact[];
  variants: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [contactId, setContactId] = useState("");
  const [approach, setApproach] = useState("");
  const [variantUsed, setVariantUsed] = useState("");
  const [status, setStatus] = useState<"pending" | "sent">("pending");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!contactId) {
      alert("Please select a contact");
      return;
    }

    try {
      await addOutreach(campaignId, {
        contactId,
        approach,
        variantUsed: variantUsed || undefined,
        status,
        notes,
        sentDate: status === "sent" ? new Date().toISOString() : undefined,
      });
      onSuccess();
    } catch (err) {
      console.error("Failed to add outreach:", err);
      alert("Failed to add outreach");
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Add Outreach</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Contact Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact <span className="text-red-500">*</span>
            </label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            >
              <option value="">Select a contact...</option>
              {contacts.map((contact) => (
                <option key={contact._id} value={contact._id}>
                  {contact.name} {contact.company && `(${contact.company})`}
                </option>
              ))}
            </select>
          </div>

          {/* Approach */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Approach
            </label>
            <input
              type="text"
              value={approach}
              onChange={(e) => setApproach(e.target.value)}
              placeholder="e.g., LinkedIn message, Email, Phone call"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* A/B Test Variant */}
          {variants.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                A/B Test Variant (Optional)
              </label>
              <select
                value={variantUsed}
                onChange={(e) => setVariantUsed(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">None</option>
                {variants.map((variant, index) => (
                  <option key={index} value={variant.variantName}>
                    {variant.variantName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "pending" | "sent")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this outreach..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 
                         rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg 
                         hover:bg-emerald-700 transition"
            >
              Add Outreach
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
