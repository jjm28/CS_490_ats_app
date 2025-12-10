// components/AdvisorPortal/AdvisorClientsPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import type {
  AdvisorClientSummary,
  AdvisorPerformanceSummary,
} from "../../types/advisors.types";
import Button from "../StyledComponents/Button";

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user?._id || null;
  } catch {
    return null;
  }
}

export default function AdvisorClientsPage() {
  const [clients, setClients] = useState<AdvisorClientSummary[]>([]);
  const [performance, setPerformance] =
    useState<AdvisorPerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const advisorUserId = getCurrentUserId();

  useEffect(() => {
    if (!advisorUserId) {
      setLoading(false);
      setError("You must be logged in as an advisor.");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [clientsRes, perfRes] = await Promise.all([
          fetch(
            `${API_BASE}/api/advisors/clients?advisorUserId=${encodeURIComponent(
              advisorUserId
            )}`,
            { credentials: "include" }
          ),
          fetch(
            `${API_BASE}/api/advisors/performance?advisorUserId=${encodeURIComponent(
              advisorUserId
            )}`,
            { credentials: "include" }
          ),
        ]);

        if (!clientsRes.ok) {
          const body = await clientsRes.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to load clients");
        }
        if (!perfRes.ok) {
          const body = await perfRes.json().catch(() => ({}));
          throw new Error(
            body?.error || "Failed to load performance overview"
          );
        }

        const clientsJson =
          (await clientsRes.json()) as AdvisorClientSummary[];
        const perfJson =
          (await perfRes.json()) as AdvisorPerformanceSummary;

        setClients(clientsJson);
        setPerformance(perfJson);
      } catch (err: any) {
        console.error("Error loading advisor clients:", err);
        setError(err.message || "Failed to load advisor clients");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [advisorUserId]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            My Clients
          </h1>
          <p className="mt-1 text-sm text-gray-500 max-w-xl">
            See the candidates who’ve invited you into their job search,
            and jump into their workspace to review progress, documents,
            and sessions.
          </p>
        </div>

        <div className="flex sm:items-center sm:justify-end">
          <Button
            type="button"
            onClick={() => navigate("/advisor/availability")}
          >
            Availability &amp; session types
          </Button>
        </div>
      </div>

      {/* Performance overview */}
      {performance && (
        <Card className="p-4 sm:p-5 border border-gray-100 shadow-sm bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-blue-600 uppercase">
                Performance overview
              </p>
              <h2 className="mt-1 text-sm font-semibold text-gray-900">
                Your advisor impact
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Snapshot of how many clients you’re supporting and how your
                sessions are performing.
              </p>
            </div>

            {typeof performance.averageRating === "number" && (
              <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                Avg rating&nbsp;
                <span className="ml-1 text-sm font-semibold">
                  {performance.averageRating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Active clients</dt>
              <dd className="mt-0.5 text-base font-medium text-gray-900">
                {performance.totalClients}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Completed sessions</dt>
              <dd className="mt-0.5 text-base font-medium text-gray-900">
                {performance.completedSessions}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Rated sessions</dt>
              <dd className="mt-0.5 text-base font-medium text-gray-900">
                {performance.ratedSessions}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">
                Shared jobs at interview stage
              </dt>
              <dd className="mt-0.5 text-base font-medium text-gray-900">
                {performance.sharedJobsAtInterviewStage}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">
                Shared jobs with offers
              </dt>
              <dd className="mt-0.5 text-base font-medium text-gray-900">
                {performance.sharedJobsWithOffers}
              </dd>
            </div>
          </dl>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <Card className="p-4 sm:p-6">
          <p className="text-sm text-gray-600">Loading clients…</p>
        </Card>
      )}

      {/* Error state */}
      {error && !loading && (
        <Card className="p-4 sm:p-6 bg-red-50 border border-red-100">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && clients.length === 0 && (
        <Card className="p-6 sm:p-8 text-center">
          <h2 className="text-sm font-semibold text-gray-900">
            No clients yet
          </h2>
          <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
            When a candidate invites you to support their job search, they’ll
            show up here with links to their profile, job summary, and
            documents.
          </p>
        </Card>
      )}

      {/* Clients list */}
      {!loading && !error && clients.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Client roster
            </h2>
            <p className="text-xs text-gray-500">
              Click a client to open their workspace or send a message.
            </p>
          </div>

          <div className="space-y-3">
            {clients.map((c) => {
              const fullName =
                c.candidate?.fullName || "Unnamed candidate";
              const headline = c.candidate?.headline;

              const accessLabels = [
                c.permissions.canViewBasicProfile && "Profile",
                c.permissions.canViewJobSummary && "Job summary",
                c.permissions.canViewDocumentsSummary && "Documents",
              ].filter(Boolean) as string[];

              return (
                <Card
                  key={c.relationshipId}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-gray-100 hover:border-blue-100 hover:shadow-sm transition"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {fullName}
                      </span>
                      {headline && (
                        <span className="text-xs text-gray-500">
                          {headline}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <span className="text-[11px] font-medium text-gray-500">
                        Access:
                      </span>
                      {accessLabels.length > 0 ? (
                        accessLabels.map((label) => (
                          <span
                            key={label}
                            className="text-[11px] rounded-full bg-gray-100 px-2 py-0.5 text-gray-700"
                          >
                            {label}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-gray-400">
                          No permissions granted yet
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button
                      type="button"
                      onClick={() =>
                        navigate(`/advisor/clients/${c.relationshipId}`)
                      }
                    >
                      View client
                    </Button>
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                      onClick={() =>
                        navigate(
                          `/advisor/clients/${c.relationshipId}/messages`
                        )
                      }
                    >
                      Messages
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
