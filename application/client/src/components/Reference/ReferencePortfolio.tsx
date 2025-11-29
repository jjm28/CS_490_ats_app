import React, { useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import { getReferencePortfolio } from "../../api/reference";
import type { ReferencePortfolioResponse, PortfolioReference } from "../../api/reference";

export default function ReferencePortfolio() {
  const [goal, setGoal] = useState("software engineer internship");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<ReferencePortfolioResponse | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const raw = localStorage.getItem("authUser");
      const user = raw ? JSON.parse(raw).user : null;
      if (!user?._id) throw new Error("Missing user session");

      const resp = await getReferencePortfolio({
        user_id: user._id,
        goal,
        limit: 5,
      });

      setPortfolio(resp);
    } catch (err: any) {
      console.error("Failed to generate portfolio:", err);
      setError(err?.message || "Failed to generate portfolio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Reference Portfolio</h1>
        <p className="text-sm text-gray-600">
          Generate a curated list of your best references for a specific career goal or role type.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="flex flex-col md:flex-row gap-3 items-start">
        <div className="flex-1 w-full">
          <label className="form-label text-sm">
            Career goal / role type
          </label>
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="form-input w-full"
            placeholder="e.g. Backend software engineer, Data analyst, Product manager"
          />
        </div>
        <div className="mt-1">
          <Button type="submit" disabled={loading || !goal.trim()}>
            {loading ? "Generating..." : "Generate Portfolio"}
          </Button>
        </div>
      </form>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {portfolio && (
        <Card className="mt-4 p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-lg font-semibold">
                Portfolio for: <span className="italic">{portfolio.goal}</span>
              </h2>
              <p className="text-xs text-gray-500">
                Generated at {new Date(portfolio.generated_at).toLocaleString()}
              </p>
            </div>
            {/* Placeholder for future Export PDF / Copy actions */}
          </div>

          {portfolio.references.length === 0 ? (
            <p className="text-sm text-gray-600">
              No strong matches yet. Try adjusting your goal or add more references / tags.
            </p>
          ) : (
            <div className="space-y-3">
              {portfolio.references.map((ref: PortfolioReference) => (
                <div
                  key={ref.reference_id}
                  className="border rounded-lg px-3 py-2 text-sm flex justify-between gap-3"
                >
                  <div>
                    <div className="font-medium">
                      {ref.full_name || "Unnamed reference"}
                    </div>
                    <div className="text-xs text-gray-600">
                      {ref.title}
                      {ref.organization && ` • ${ref.organization}`}
                    </div>
                    {ref.relationship && (
                      <div className="text-[11px] text-indigo-700">
                        {ref.relationship}
                      </div>
                    )}
                    {ref.tags && ref.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {ref.tags.map((t, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-xs text-gray-700 whitespace-pre-wrap">
                      {ref.summary}
                    </p>
                  </div>

                  <div className="text-right text-[11px] text-gray-500 flex flex-col gap-1">
                    <span>
                      Apps: {ref.stats.applications} • Offers: {ref.stats.offers}
                    </span>
                    <span>
                      Offer rate:{" "}
                      {Math.round((ref.stats.success_rate || 0) * 100)}%
                    </span>
                    <span>Score: {Math.round(ref.score)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
