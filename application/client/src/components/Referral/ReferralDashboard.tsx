import { useEffect, useState } from "react";
import type { Referral } from "../../api/referrals";

import { 
  getReferralList,
  getReferralSources,
  getEtiquetteGuidance,
  getTimingSuggestions
} from "../../api/referrals";

import ReferralCard from "./ReferralCard";
import ReferralRequestModal from "./ReferralRequestModal";

/* ============================================================
   SMALL TIMING SUGGESTION BOX (AI)
============================================================ */
function TimingBox({ timing }: { timing: string }) {
  if (!timing) return null;

  return (
    <div className="p-4 border rounded-lg bg-purple-50 text-sm whitespace-pre-line mt-4">
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

  const stored = localStorage.getItem("authUser");
  const user = stored ? JSON.parse(stored) : null;

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
    /* -----------------------------
       1. Etiquette Tips
    ----------------------------- */
    const etiquetteResp = await getEtiquetteGuidance();
    setAiEtiquette(etiquetteResp.data.guidance || "");


    /* -----------------------------
       2. Timing Suggestions
       getTimingSuggestions expects:
       { jobTitle: string }
    ----------------------------- */
    const timingResp = await getTimingSuggestions({ jobTitle: "General" });
    setAiTiming(timingResp.data.timing || "");


    /* -----------------------------
       3. Referral Source Suggestions
       getReferralSources expects:
       {
         userId: string;
         targetCompany: string;
         jobTitle: string;
       }
    ----------------------------- */
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
        return new Date(b.dateRequested).getTime() - new Date(a.dateRequested).getTime();

      if (sortOption === "oldest")
        return new Date(a.dateRequested).getTime() - new Date(b.dateRequested).getTime();

      if (sortOption === "status")
        return a.status.localeCompare(b.status);

      return 0;
    });

    setFiltered(list);
  };

  const openNewReferralModal = () => setShowModal(true);

  /* ============================================================
      STATS
  ============================================================ */
  const total = referrals.length;
  const pending = referrals.filter((r) => r.status === "pending").length;
  const followups = referrals.filter((r) => r.status === "followup").length;
  const completed = referrals.filter((r) => r.status === "completed").length;

  /* ============================================================
      RENDER
  ============================================================ */
  return (
    <div className="p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Referral Management</h1>

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={openNewReferralModal}
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

      {/* Timing Box */}
      <TimingBox timing={aiTiming} />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6 mt-6">
        <StatCard label="Total" value={total} />
        <StatCard label="Pending" value={pending} />
        <StatCard label="Follow-ups" value={followups} />
        <StatCard label="Completed" value={completed} />
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <input
          className="border rounded p-2 w-full"
          placeholder="Search by referrer or job..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border rounded p-2"
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
          className="border rounded p-2"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="status">Status</option>
        </select>
      </div>

      {/* Loading */}
      {loading && <p className="text-gray-500">Loading referrals...</p>}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center text-gray-500 mt-20">No referrals found.</div>
      )}

      {/* List */}
      <div className="grid gap-4">
        {filtered.map((r) => (
          <ReferralCard key={r._id} referral={r} reload={loadReferrals} />
        ))}
      </div>

      {/* Modal */}
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
    <div className="border p-4 rounded shadow-sm bg-white text-center">
      <p className="text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
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
    <div className="bg-white border rounded p-5 shadow-sm">
      <h2 className="text-lg font-bold mb-3">AI Referral Insights</h2>

      {/* SOURCES */}
      <div className="mb-4">
        <h3 className="font-semibold mb-1">Suggested Referral Sources</h3>
        <ul className="list-disc ml-6 text-sm">
          {sources?.map((src, idx) => (
            <li key={idx}>
              <strong>{src.name}</strong> — {src.role}
              <p className="text-gray-500 text-xs">{src.why_good_fit}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* ETIQUETTE */}
      <div className="mb-4">
        <h3 className="font-semibold mb-1">Referral Etiquette Tips</h3>
        <p className="text-sm text-gray-700 whitespace-pre-line">{etiquette}</p>
      </div>

      {/* TIMING */}
      <div>
        <h3 className="font-semibold mb-1">Timing Recommendations</h3>
        <p className="text-sm text-gray-700 whitespace-pre-line">{timing}</p>
      </div>
    </div>
  );
}
