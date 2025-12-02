// components/Advisors/AdvisorsPage.tsx
import React, { useEffect, useState } from "react";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import type {
  AdvisorRelationshipSummary,
  AdvisorPermissions,
} from "../../types/advisors.types";
import AdvisorInviteModal from "./AdvisorInviteModal";
import AdvisorSettingsModal from "./AdvisorSettingsModal";
import { useNavigate } from "react-router-dom";
import AdvisorSharingConfigModal from "./AdvisorSharingConfigModal";

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

export default function AdvisorsPage() {
    const navigate = useNavigate();

  const [advisors, setAdvisors] = useState<
    AdvisorRelationshipSummary[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] =
    useState<boolean>(false);
  const [editingAdvisor, setEditingAdvisor] =
    useState<AdvisorRelationshipSummary | null>(null);
const [sharingAdvisor, setSharingAdvisor] =
  useState<AdvisorRelationshipSummary | null>(null);

  const ownerUserId = getCurrentUserId();

  useEffect(() => {
    if (!ownerUserId) {
      setLoading(false);
      setError("You must be logged in to view advisors.");
      return;
    }

    const fetchAdvisors = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${API_BASE}/api/advisors?ownerUserId=${encodeURIComponent(
            ownerUserId
          )}`,
          {
            credentials: "include",
          }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.error || "Failed to load advisors"
          );
        }

        const data = await res.json();
        setAdvisors(data);
      } catch (err: any) {
        console.error("Error loading advisors:", err);
        setError(err.message || "Failed to load advisors");
      } finally {
        setLoading(false);
      }
    };

    fetchAdvisors();
  }, [ownerUserId]);

  const handleInviteSuccess = (
    newAdvisor: AdvisorRelationshipSummary
  ) => {
    setAdvisors((prev) => [newAdvisor, ...prev]);
  };

  const handleUpdatedAdvisor = (
    updated: AdvisorRelationshipSummary
  ) => {
    setAdvisors((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
  };

  const handleRevoke = async (advisor: AdvisorRelationshipSummary) => {
    if (!ownerUserId) return;
    const confirmed = window.confirm(
      `Revoke access for ${advisor.advisorName || advisor.advisorEmail}?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/advisors/${advisor.id}/revoke`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ownerUserId }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error || "Failed to revoke advisor"
        );
      }

      const data = await res.json();
      setAdvisors((prev) =>
        prev.map((a) =>
          a.id === advisor.id
            ? { ...a, status: data.status, advisorUserId: null }
            : a
        )
      );
    } catch (err: any) {
      console.error("Error revoking advisor:", err);
      alert(err.message || "Failed to revoke advisor");
    }
  };

  const handleDelete = async (
    advisor: AdvisorRelationshipSummary
  ) => {
    if (!ownerUserId) return;
    const confirmed = window.confirm(
      `Delete invite for ${advisor.advisorEmail}? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/advisors/${advisor.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ownerUserId }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error || "Failed to delete advisor invite"
        );
      }

      await res.json();
      setAdvisors((prev) =>
        prev.filter((a) => a.id !== advisor.id)
      );
    } catch (err: any) {
      console.error("Error deleting advisor invite:", err);
      alert(err.message || "Failed to delete advisor invite");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Advisors &amp; Coaches
          </h1>
          <p className="text-sm text-gray-500">
            Invite mentors and career coaches to see a
            privacy-friendly summary of your job search.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowInviteModal(true)}
        >
          Invite Advisor / Coach
        </Button>
      </div>

      {loading && (
        <Card className="p-4">
          <p>Loading advisors...</p>
        </Card>
      )}

      {error && !loading && (
        <Card className="p-4 bg-red-50 text-red-700">
          <p>{error}</p>
        </Card>
      )}

      {!loading && !error && advisors.length === 0 && (
        <Card className="p-6 space-y-2">
          <h2 className="font-medium">
            No advisors added yet
          </h2>
          <p className="text-sm text-gray-500">
            Invite a mentor, professor, or paid coach to help you
            stay accountable and get better feedback on your job
            search.
          </p>
          <Button
            type="button"
            onClick={() => setShowInviteModal(true)}
          >
            Invite your first advisor
          </Button>
        </Card>
      )}

      {!loading && !error && advisors.length > 0 && (
        <div className="space-y-3">
          {advisors.map((advisor) => (
            <Card
              key={advisor.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {advisor.advisorName || advisor.advisorEmail}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {advisor.advisorType}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      advisor.status === "active"
                        ? "bg-green-100 text-green-700"
                        : advisor.status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {advisor.status}
                  </span>
                </div>
                {advisor.advisorProfile?.headline && (
                  <p className="text-sm text-gray-600">
                    {advisor.advisorProfile.headline}
                  </p>
                )}
                <PermissionsBadges
                  permissions={advisor.permissions}
                />
              </div>

              <div className="flex gap-2 justify-end text-xs">
{advisor.status === "pending" ? (
  <Button
    type="button"
    variant="secondary"
    onClick={() => handleDelete(advisor)}
  >
    Delete invite
  </Button>
) : advisor.status === "active" ? (
  <>
    <Button
      type="button"
      variant="secondary"
      onClick={() => setEditingAdvisor(advisor)}
    >
      Edit
    </Button>
    <Button
      type="button"
      variant="secondary"
      onClick={() => setSharingAdvisor(advisor)}
    >
      Configure sharing
    </Button>
    <Button
      type="button"
      variant="secondary"
      onClick={() => handleRevoke(advisor)}
    >
      Revoke access
    </Button>
    <Button
      type="button"
      onClick={() =>
        navigate(`/advisors/${advisor.id}/messages`)
      }
    >
      Message
    </Button>
    <Button
  type="button"
  variant="secondary"
  onClick={() =>
    navigate(`/advisors/${advisor.id}/recommendations`)
  }
>
  View recommendations
</Button>
  </>
) : (
  <Button
    type="button"
    variant="secondary"
    onClick={() => setEditingAdvisor(advisor)}
  >
    Edit
  </Button>
)}

</div>

            </Card>
          ))}
        </div>
      )}

      {showInviteModal && ownerUserId && (
        <AdvisorInviteModal
          ownerUserId={ownerUserId}
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
        />
      )}

      {editingAdvisor && ownerUserId && (
        <AdvisorSettingsModal
          advisor={editingAdvisor}
          ownerUserId={ownerUserId}
          onClose={() => setEditingAdvisor(null)}
          onUpdated={handleUpdatedAdvisor}
        />
      )}
      {sharingAdvisor && ownerUserId && (
  <AdvisorSharingConfigModal
    advisor={sharingAdvisor}
    ownerUserId={ownerUserId}
    onClose={() => setSharingAdvisor(null)}
  />
)}

    </div>
  );
}

function PermissionsBadges({
  permissions,
}: {
  permissions: AdvisorPermissions;
}) {
  const badges: string[] = [];
  if (permissions.canViewBasicProfile) {
    badges.push("Profile overview");
  }
  if (permissions.canViewJobSummary) {
    badges.push("Job search summary");
  }
  if (permissions.canViewDocumentsSummary) {
    badges.push("Documents summary");
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {badges.map((label) => (
        <span
          key={label}
          className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
