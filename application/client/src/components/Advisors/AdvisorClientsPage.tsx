// components/AdvisorPortal/AdvisorClientsPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import type { AdvisorClientSummary } from "../../types/advisors.types";
import { Button } from "@headlessui/react";

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
  const [clients, setClients] = useState<AdvisorClientSummary[]>(
    []
  );
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

    const fetchClients = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${API_BASE}/api/advisors/clients?advisorUserId=${encodeURIComponent(
            advisorUserId
          )}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.error || "Failed to load clients"
          );
        }
        const data = await res.json();
        setClients(data);
      } catch (err: any) {
        console.error("Error loading advisor clients:", err);
        setError(err.message || "Failed to load clients");
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [advisorUserId]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold">My Clients</h1>
      <p className="text-sm text-gray-500">
        View the candidates who’ve invited you and their job
        search summaries.
      </p>

      {loading && (
        <Card className="p-4">
          <p>Loading clients...</p>
        </Card>
      )}

      {error && !loading && (
        <Card className="p-4 bg-red-50 text-red-700">
          <p>{error}</p>
        </Card>
      )}

      {!loading && !error && clients.length === 0 && (
        <Card className="p-6">
          <p className="text-sm text-gray-600">
            You don’t have any clients yet. When a candidate invites
            you, they’ll appear here.
          </p>
        </Card>
      )}

      {!loading && !error && clients.length > 0 && (
        <div className="space-y-3">
          {clients.map((c) => (
            <Card
              key={c.relationshipId}
              className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {c.candidate.fullName || "Unnamed candidate"}
                  </span>
                  {c.candidate.headline && (
                    <span className="text-xs text-gray-500">
                      {c.candidate.headline}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Access:{" "}
                  {[
                    c.permissions.canViewBasicProfile &&
                      "Profile",
                    c.permissions.canViewJobSummary &&
                      "Job summary",
                    c.permissions.canViewDocumentsSummary &&
                      "Documents",
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
              <button
                type="button"
                className="text-sm text-blue-600 hover:underline"
                onClick={() =>
                  navigate(
                    `/advisor/clients/${c.relationshipId}`
                  )
                }
              >
                View client
              </button>
              <button
              type="button"
              className="text-sm text-blue-600 hover:underline"
              onClick={() =>
                navigate(
                  `/advisor/clients/${c.relationshipId}/messages`
                )
              }
            >
              Messages
                </button>
                      <Button
        type="button"
        onClick={() => navigate("/advisor/availability")}
      >
        Availability &amp; session types
      </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
