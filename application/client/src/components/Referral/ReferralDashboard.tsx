import { useEffect, useState } from "react";
import type { Referral } from "../../api/referrals";

import {
  getReferralList,
  getReferralSources,
  getEtiquetteGuidance,
  getTimingSuggestions,
} from "../../api/referrals";

import ReferralCard from "./ReferralCard";
import ReferralRequestModal from "./ReferralRequestModal";
import { useNavigate } from "react-router-dom";

/* ============================================================
   SMALL TIMING SUGGESTION BOX (AI)
============================================================ */
function TimingBox({ timing }: { timing: string }) {
  if (!timing) return null;

  return (
    <div className="p-4 border rounded-xl bg-purple-50 text-sm whitespace-pre-line mt-4 shadow-sm">
      <h3 className="font-semibold text-purple-700 mb-2">
        Best Time to Request a Referral
      </h3>
      {timing}
    </div>
  );
}

/* ============================================================
   MAIN DASHBOARD
============================================================ */
export default function ReferralDashboard() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [filtered, setFiltered] = useState<Referral[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // AI STATES
  const [aiSources, setAiSources] = useState<any[]>([]);
  const [aiEtiquette, setAiEtiquette] = useState("");
  const [aiTiming, setAiTiming] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
  const [sortOption, setSortOption] = useState("newest");

  const navigate = useNavigate();
  const stored = localStorage.getItem("authUser");
  const user = stored ? JSON.parse(stored) : null;

  /* LOADERS */
  useEffect(() => {
    loadReferrals();
    loadAIGuidance();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [referrals, search, statusFilter, sortOption]);

  /* ============================================================
        LOAD REFERRALS
  ============================================================ */
  const loadReferrals = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const resp = await getReferralList(user.userId);
      setReferrals(resp.data.referrals || []);
    } catch (err) {
      console.error("Referral load error:", err);
    }
    setLoading(false);
  };

  /* ============================================================
        LOAD AI GUIDANCE
  ============================================================ */
  const loadAIGuidance = async () => {
    try {
      const etiquetteResp = await getEtiquetteGuidance();
      setAiEtiquette(etiquetteResp.data.guidance || "");

      const timingResp = await getTimingSuggestions({ jobTitle: "General" });
      setAiTiming(timingResp.data.timing || "");

      const sourceResp = await getReferralSources({
        userId: user?.userId || "",
        targetCompany: "General",
        jobTitle: "General",
      });

      setAiSources(sourceResp.data.sources || []);
    } catch (err) {
      console.error("AI load error:", err);
    }
  };

  /* ============================================================
        FILTER + SORT
  ============================================================ */
  const applyFilters = () => {
    let list = [...referrals];

    if (search.trim()) {
      list = list.filter(
        (r) =>
          r.referrerName.toLowerCase().includes(search.toLowerCase()) ||
          r.jobId?.jobTitle.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }

    list.sort((a, b) => {
      if (sortOption === "newest")
        return (
          new Date(b.dateRequested).getTime() -
          new Date(a.dateRequested).getTime()
        );

      if (sortOption === "oldest")
        return (
          new Date(a.dateRequested).getTime() -
          new Date(b.dateRequested).getTime()
        );

      if (sortOption === "status")
        return a.status.localeCompare(b.status);

      return 0;
    });

    setFiltered(list);
  };

  /* METRICS */
  const total = referrals.length;
  const pending = referrals.filter((r) => r.status === "pending").length;
  const followups = referrals.filter((r) => r.status === "followup").length;
  const completed = referrals.filter((r) => r.status === "completed").length;

  /* ============================================================
       RENDER
  ============================================================ */
  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* BACK BUTTON */}
      <button
        onClick={() => navigate("/networking")}
        className="mb-4 text-sm text-blue-600 hover:underline"
      >
        ← Back to Networking Dashboard
      </button>

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Referral Management
        </h1>

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow-md transition"
          onClick={() => setShowModal(true)}
        >
          Request Referral
        </button>
      </div>

      {/* AI PANEL */}
      <AIReferralPanel
        sources={aiSources}
        etiquette={aiEtiquette}
        timing={aiTiming}
      />

      <TimingBox timing={aiTiming} />

      {/* STATS GRID */}
      <div className="grid grid-cols-4 gap-4 mt-8">
        <StatCard label="Total" value={total} />
        <StatCard label="Pending" value={pending} />
        <StatCard label="Follow-ups" value={followups} />
        <StatCard label="Completed" value={completed} />
      </div>

      {/* STICKY FILTER BAR */}
      <div className="mt-8 sticky top-0 bg-white py-3 z-10 shadow-sm rounded-lg flex gap-3 px-4">
        <input
          className="border rounded-lg p-2 w-full bg-gray-50"
          placeholder="Search by referrer or job..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border rounded-lg p-2 bg-gray-50"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="followup">Follow-up</option>
          <option value="completed">Completed</option>
          <option value="declined">Declined</option>
        </select>

        <select
          className="border rounded-lg p-2 bg-gray-50"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="status">Status</option>
        </select>
      </div>

      {/* LOADING */}
      {loading && (
        <p className="text-gray-500 mt-20 text-center">Loading referrals...</p>
      )}

      {/* EMPTY STATE */}
      {!loading && filtered.length === 0 && (
        <div className="mt-20 text-center text-gray-500">
          No referrals found.
        </div>
      )}

      {/* LIST */}
      <div className="grid gap-4 mt-4">
        {filtered.map((r) => (
          <ReferralCard key={r._id} referral={r} reload={loadReferrals} />
        ))}
      </div>

      {/* MODAL */}
      {showModal && (
        <ReferralRequestModal
          onClose={() => setShowModal(false)}
          reload={loadReferrals}
          contact=""
          job=""
          tone="professional"
        />
      )}
    </div>
  );
}

/* ============================================================
   STAT CARD
============================================================ */
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 bg-white rounded-xl shadow-md text-center">
      <p className="text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

/* ============================================================
   AI REFERRAL PANEL
============================================================ */
function AIReferralPanel({
  sources,
  etiquette,
  timing,
}: {
  sources: any[];
  etiquette: string;
  timing: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 border">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        🔍 AI Referral Insights
      </h2>

      {/* SOURCES */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-700 mb-1">
          Suggested Referral Sources
        </h3>
        <ul className="list-disc ml-6 text-sm text-gray-700">
          {sources?.map((src, idx) => (
            <li key={idx} className="mb-1">
              <strong>{src.name}</strong> — {src.role}
              <p className="text-gray-500 text-xs">{src.why_good_fit}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* ETIQUETTE */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-700 mb-1">
          Referral Etiquette Tips
        </h3>
        <p className="text-sm text-gray-600 whitespace-pre-line">
          {etiquette}
        </p>
      </div>

      {/* TIMING */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-1">
          Timing Recommendations
        </h3>
        <p className="text-sm text-gray-600 whitespace-pre-line">
          {timing}
        </p>
      </div>
    </div>
  );
}
