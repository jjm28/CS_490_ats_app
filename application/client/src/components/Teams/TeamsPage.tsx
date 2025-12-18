// src/components/Teams/TeamsPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import {
  getMyTeams,
  acceptTeamInvite,
  declineTeamInvite,
  type TeamMembershipSummary,
} from "../../api/teams";
import { handleError } from "../../utils/errorHandler";

const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<TeamMembershipSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyTeamId, setBusyTeamId] = useState<string | null>(null);

  const navigate = useNavigate();

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyTeams();
      setTeams(data || []);
    } catch (err: any) {
      handleError(err);
      console.error("Error loading teams:", err);
      setError(err?.message || "Failed to load teams. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeams();
  }, []);

  const handleAcceptInvite = async (teamId: string) => {
    setBusyTeamId(teamId);
    setError(null);

    try {
      await acceptTeamInvite(teamId);
    } catch (err: any) {
      handleError(err);
      console.error("Error accepting team invite:", err);
      const msg = err?.message || "";

      // If the backend says "No pending invite", treat it as already processed.
      // We still refresh the list so the UI stays in sync, but we don't show a scary error.
      const isAlreadyHandled =
        msg.toLowerCase().includes("no pending invite");

      if (!isAlreadyHandled) {
        setError(msg || "Failed to accept invite.");
      }
    } finally {
      // Always reload teams so the invitations list reflects the latest state
      await loadTeams();
      setBusyTeamId(null);
    }
  };

  const handleDeclineInvite = async (teamId: string) => {
    const confirm = window.confirm(
      "Ignore this invitation? You can only join again if you're invited in the future."
    );
    if (!confirm) return;

    setBusyTeamId(teamId);
    setError(null);

    try {
      await declineTeamInvite(teamId);
    } catch (err: any) {
      handleError(err);
      console.error("Error declining team invite:", err);
      const msg = err?.message || "";

      const isAlreadyHandled =
        msg.toLowerCase().includes("no pending invite");

      if (!isAlreadyHandled) {
        setError(msg || "Failed to decline invite.");
      }
    } finally {
      await loadTeams();
      setBusyTeamId(null);
    }
  };

  const activeTeams = teams.filter(
    (t) => t.status !== "invited" && t.status !== "removed"
  );
  const invitations = teams.filter((t) => t.status === "invited");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Coaching &amp; Teams
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            View your coaching teams, open your team workspace, or respond to
            invitations.
          </p>
        </div>
        <Button onClick={() => navigate("/teams/new")}>
          Create New Team
        </Button>
      </div>

      {error && (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {/* Invitations */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          Invitations
        </h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading invitations…</p>
        ) : invitations.length === 0 ? (
          <p className="text-sm text-gray-500">
            You don&apos;t have any pending team invitations.
          </p>
        ) : (
          <ul className="space-y-3">
            {invitations.map((t) => {
              const team = t.team;
              const rolesLabel = t.roles.length
                ? t.roles.join(", ")
                : "member";

              const isBusy = busyTeamId === t.teamId;

              return (
                <li
                  key={t.teamId}
                  className="flex items-center justify-between gap-4 border border-gray-100 rounded-lg px-4 py-3 bg-white"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {team?.name || "Untitled Team"}
                    </p>
                    {team?.description && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {team.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Invited as: {rolesLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      disabled={isBusy}
                      onClick={() => handleDeclineInvite(t.teamId)}
                    >
                      {isBusy && busyTeamId === t.teamId
                        ? "Working…"
                        : "Ignore"}
                    </Button>
                    <Button
                      disabled={isBusy}
                      onClick={() => handleAcceptInvite(t.teamId)}
                    >
                      {isBusy && busyTeamId === t.teamId
                        ? "Accepting…"
                        : "Accept"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* My Teams */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          My Teams
        </h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading teams…</p>
        ) : activeTeams.length === 0 ? (
          <p className="text-sm text-gray-500">
            You&apos;re not in any active teams yet. Create a team above or
            accept an invitation.
          </p>
        ) : (
          <ul className="space-y-3">
            {activeTeams.map((t) => {
              const team = t.team;
              const rolesLabel = t.roles.length
                ? t.roles.join(", ")
                : "member";

              return (
                <li
                  key={t.teamId}
                  className="flex items-center justify-between gap-4 border border-gray-100 rounded-lg px-4 py-3 bg-white"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {team?.name || "Untitled Team"}
                    </p>
                    {team?.description && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {team.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Roles: {rolesLabel} · Status: {t.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => navigate(`/teams/${t.teamId}`)}
                    >
                      Open
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default TeamsPage;
