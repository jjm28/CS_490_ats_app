import { useState } from "react";
import { getReferralSources } from "../../api/referrals";

/* ---------------------------------------------------
   TYPES (strong typing for predictable props)
---------------------------------------------------- */
interface SourceResult {
  name: string;
  reason: string;
}

interface ReferralSourceGeneratorProps {
  onSelect: (source: SourceResult) => void;
}

/* ---------------------------------------------------
   COMPONENT
---------------------------------------------------- */
export default function ReferralSourceGenerator({
  onSelect,
}: ReferralSourceGeneratorProps) {
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SourceResult[]>([]);
  const [error, setError] = useState("");

  const stored = localStorage.getItem("authUser");
  const user = stored ? JSON.parse(stored) : null;

  /* ---------------------------------------------------
     MAIN SEARCH
  ---------------------------------------------------- */
  const handleSearch = async () => {
    setError("");
    setResults([]);

    if (!company.trim() || !jobTitle.trim()) {
      setError("Please enter a company and job title.");
      return;
    }

    if (!user?.userId) {
      setError("User not logged in.");
      return;
    }

    setLoading(true);

    try {
      const resp = await getReferralSources({
        userId: user.userId,
        targetCompany: company,
        jobTitle,
      });

      const list: SourceResult[] = resp.data.sources || [];
      setResults(list);
    } catch (err) {
      console.error("Referral Source Generator Error:", err);
      setError("Failed to fetch referral recommendations.");
    }

    setLoading(false);
  };

  /* ---------------------------------------------------
     RENDER
  ---------------------------------------------------- */
  return (
    <div className="p-4 border rounded bg-white shadow mt-4">
      <h2 className="text-lg font-bold mb-3">AI Referral Source Generator</h2>

      {/* INPUTS */}
      <input
        className="border p-2 rounded w-full mb-2"
        placeholder="Target Company (e.g., Google)"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />

      <input
        className="border p-2 rounded w-full mb-3"
        placeholder="Job Title (e.g., Software Engineer)"
        value={jobTitle}
        onChange={(e) => setJobTitle(e.target.value)}
      />

      {/* SEARCH BUTTON */}
      <button
        onClick={handleSearch}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        {loading ? "Finding best contacts..." : "Find Best Referral Sources"}
      </button>

      {/* ERROR */}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {/* RESULTS */}
      {results.length > 0 && (
        <>
          <h3 className="font-semibold mt-4">Top Recommended Contacts</h3>

          <div className="space-y-3 mt-2">
            {results.map((src, idx) => (
              <div
                key={idx}
                className="p-3 border rounded hover:bg-gray-100 cursor-pointer"
                onClick={() => onSelect(src)}
              >
                <p className="font-semibold">{src.name}</p>
                <p className="text-sm text-gray-600">{src.reason}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
