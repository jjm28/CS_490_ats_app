import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import {
  getTeamById,
  inviteToTeam,
  updateTeamMemberRoles,
  removeTeamMember,
  type TeamWithMembers,
  type TeamMember,
} from "../../api/teams";

// ✅ NEW IMPORTS
import TeamDashboard from "./TeamDashboard";
import TeamChat from "./TeamChat";
import TeamProgressTracker from "./TeamProgressTracker";

const ROLE_OPTIONS = ["admin", "mentor", "candidate"] as const;

const TeamDetailPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<TeamWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"mentor" | "candidate">(
    "candidate"
  );
  const [inviting, setInviting] = useState(false);

  // ✅ NEW STATE for tab navigation
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "messages" | "progress"
  >("dashboard");

  useEffect(() => {
    if (!teamId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getTeamById(teamId);
        setData(result);
      } catch (err: any) {
        console.error("Error loading team:", err);
        setError(
          err?.message || "Failed to load team. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [teamId]);

  const refresh = async () => {
    if (!teamId) return;
    try {
      const result = await getTeamById(teamId);
      setData(result);
    } catch (err) {
      console.error("Error refreshing team:", err);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId || !inviteEmail.trim()) return;

    try {
      setInviting(true);
      setError(null);

      await inviteToTeam({
        teamId,
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      setInviteEmail("");
      await refresh();
    } catch (err: any) {
      console.error("Error inviting member:", err);
      setError(
        err?.message ||
          "Failed to invite member. Make sure the user is already registered."
      );
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRoles = async (member: TeamMember, roles: string[]) => {
    if (!teamId) return;
    try {
      await updateTeamMemberRoles({
        teamId,
        memberUserId: member.userId,
        roles,
      });
      await refresh();
    } catch (err: any) {
      console.error("Error updating roles:", err);
      alert(err?.message || "Failed to update roles.");
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!teamId) return;
    if (
      !window.confirm(
        "Remove this member from the team? They will lose access to this team."
      )
    ) {
      return;
    }

    try {
      await removeTeamMember({
        teamId,
        memberUserId: member.userId,
      });
      await refresh();
    } catch (err: any) {
      console.error("Error removing member:", err);
      alert(err?.message || "Failed to remove member.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500">Loading team…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Team Details
          </h1>
          <Button onClick={() => navigate("/teams")}>Back to Teams</Button>
        </div>
        <Card>
          <p className="text-sm text-red-600 mb-2">
            {error ||
              "Something went wrong loading this team. Try refreshing the page."}
          </p>
        </Card>
      </div>
    );
  }

  const { team, members } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {team.name}
          </h1>
          {team.description && (
            <p className="mt-1 text-sm text-gray-600">
              {team.description}
            </p>
          )}
          {team.billing && (
            <p className="mt-1 text-xs text-gray-500">
              Billing plan:{" "}
              <span className="font-medium">{team.billing.plan}</span>{" "}
              · Status:{" "}
              <span className="font-medium">{team.billing.status}</span>
            </p>
          )}
        </div>
        <Button onClick={() => navigate("/teams")}>Back to Teams</Button>
      </div>

      {/* ✅ New Tab Navigation Bar */}
      <div className="flex border-b border-gray-200 space-x-6 text-sm font-medium">
        <button
          className={`pb-2 ${
            activeTab === "dashboard"
              ? "border-b-2 border-teal-600 text-teal-700"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`pb-2 ${
            activeTab === "messages"
              ? "border-b-2 border-teal-600 text-teal-700"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("messages")}
        >
          Messages
        </button>
        <button
          className={`pb-2 ${
            activeTab === "progress"
              ? "border-b-2 border-teal-600 text-teal-700"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("progress")}
        >
          Progress
        </button>
      </div>

      {/* ✅ Tab Content */}
      <div>
        {activeTab === "dashboard" && <TeamDashboard teamId={teamId!} />}
        {activeTab === "messages" && <TeamChat teamId={teamId!} />}
        {activeTab === "progress" && (
          <TeamProgressTracker teamId={teamId!} members={members} />
        )}
      </div>

      {/* Existing functionality continues below */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              Candidate Documents &amp; Feedback
            </h2>
            <p className="mt-1 text-xs text-gray-600 max-w-xl">
              Open the review workspace to see what candidates have chosen to
              share (profiles, resumes, cover letters) and leave comments on
              how they can improve. You can also view a consolidated list of
              all comments left on shared documents.
            </p>
          </div>
          {teamId && (
            <div className="flex gap-2 mt-2 md:mt-0">
              <Button onClick={() => navigate(`/teams/${teamId}/review`)}>
                Open Review Workspace
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(`/teams/${teamId}/comments`)}
              >
                View All Comments
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              Share My Profile &amp; Documents
            </h2>
            <p className="mt-1 text-xs text-gray-600 max-w-xl">
              As a candidate, you can choose which parts of your profile,
              resumes, and cover letters are shared with your coaches across
              your teams. Use the Sharing Center to manage what&apos;s
              visible and copy share links.
            </p>
          </div>
          <Button onClick={() => navigate("/teams/sharing")}>
            Open Sharing Center
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          Invite Member (existing user)
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Invites only work for users who already have an account. Use the
          email they registered with.
        </p>
        <form
          onSubmit={handleInvite}
          className="flex flex-col md:flex-row gap-3 md:items-end"
        >
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="candidate@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "mentor" | "candidate")
              }
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="candidate">Candidate</option>
              <option value="mentor">Mentor</option>
            </select>
          </div>
          <Button type="submit" disabled={inviting}>
            {inviting ? "Sending…" : "Send Invite"}
          </Button>
        </form>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          Team Members
        </h2>
        {members.length === 0 ? (
          <p className="text-sm text-gray-500">
            No members yet. Invite mentors and candidates to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="py-2 pr-4">Member</th>
                  <th className="py-2 pr-4">Roles</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Invited By</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m._id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-xs text-gray-700">
                      {m.email || m.invitedEmail || m.userId}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-700">
                      {m.roles && m.roles.length
                        ? m.roles
                            .map(
                              (role) =>
                                role.charAt(0).toUpperCase() + role.slice(1)
                            )
                            .join(", ")
                        : "-"}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-600">
                      {m.status}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-500">
                      {m.invitedByEmail || m.invitedBy || "-"}
                    </td>
                    <td className="py-2 pr-4 space-x-2">
                      {m.status !== "removed" && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleRemoveMember(m)}
                        >
                          Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-400">
              Role changes and deletions can only be handled by Team Admin.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TeamDetailPage;
