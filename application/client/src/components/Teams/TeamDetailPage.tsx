// src/components/Teams/TeamDetailPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import {
  getTeamById,
  inviteToTeam,
  updateTeamMemberRoles,
  removeTeamMember,
  getMyTeams,
  type TeamWithMembers,
  type TeamMember,
  type TeamMembershipSummary,
} from "../../api/teams";

// ✅ Tabs / sub-pages
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

  // ✅ Current user’s roles on THIS team
  const [myRoles, setMyRoles] = useState<string[]>([]);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"mentor" | "candidate">(
    "candidate"
  );
  const [inviting, setInviting] = useState(false);

  // ✅ Tab navigation state
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "messages" | "progress"
  >("dashboard");

  useEffect(() => {
    if (!teamId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load full team + member list AND my membership summary
        const [teamResult, myTeams] = await Promise.all([
          getTeamById(teamId),
          getMyTeams(),
        ]);

        setData(teamResult);

        const me: TeamMembershipSummary | undefined = (myTeams || []).find(
          (t) => t.teamId === teamId
        );
        setMyRoles(me?.roles || []);
      } catch (err: any) {
        console.error("Error loading team:", err);
        setError(err?.message || "Failed to load team. Please try again later.");
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
    if (!teamId || !member.userId) return;

    if (
      !window.confirm(
        `Remove ${member.email || "this member"} from the team?\n\nThey will lose access to this team.`
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

  // ✅ Role flags for current user
  const isAdmin = myRoles.includes("admin");
  const isMentor = myRoles.includes("mentor");
  const isCoach = isAdmin || isMentor;
  const isCandidateOnly = myRoles.includes("candidate") && !isCoach;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {team.name}
          </h1>
          {team.description && (
            <p className="mt-1 text-sm text-gray-600">{team.description}</p>
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

      {/* ✅ Tab Navigation Bar */}
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

      {/* ✅ Tab Content (role-aware via viewerRoles) */}
      <div>
        {activeTab === "dashboard" && (
          <TeamDashboard teamId={teamId!} viewerRoles={myRoles} />
        )}
        {activeTab === "messages" && <TeamChat teamId={teamId!} />}
        {activeTab === "progress" && (
          <TeamProgressTracker
            teamId={teamId!}
            members={members}
            viewerRoles={myRoles}
          />
        )}
      </div>

      {/* ============================
          Coach-only review workspace
         ============================ */}
      {isCoach && (
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
      )}

      {/* ============================
          Candidate Sharing Center (ALL roles can open;
          for admins/mentors this is how they coach candidates to share)
         ============================ */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              Share My Profile &amp; Documents
            </h2>
            <p className="mt-1 text-xs text-gray-600 max-w-xl">
              {isCandidateOnly
                ? "Choose which parts of your profile, resumes, and cover letters you want your mentors/admins to see. You stay in control of what is shared."
                : "Ask your candidates to use this sharing center so they can decide which parts of their profile, resumes, and cover letters you can see."}
            </p>
          </div>

          {teamId && (
            <div className="flex flex-col sm:flex-row gap-2 mt-2 md:mt-0">
              {/* Always available: Sharing Center */}
              <Button onClick={() => navigate(`/teams/${teamId}/share`)}>
                Open Sharing Center
              </Button>

              {/* Candidate-only: View All Comments */}
              {isCandidateOnly && (
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/teams/${teamId}/comments`)}
                >
                  View All Comments
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ============================
          Invite members (Admins only)
         ============================ */}
      {isAdmin && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-2">
            Invite Members
          </h2>
          {error && (
            <p className="text-xs text-red-600 mb-2">
              {error}
            </p>
          )}
          <form
            className="flex flex-col md:flex-row gap-2 md:items-center"
            onSubmit={handleInvite}
          >
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="candidate@example.com"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              required
            />
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "mentor" | "candidate")
              }
              className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="candidate">Candidate</option>
              <option value="mentor">Mentor</option>
            </select>
            <Button type="submit" disabled={inviting}>
              {inviting ? "Sending Invite…" : "Send Invite"}
            </Button>
          </form>
          <p className="mt-2 text-xs text-gray-500">
            Only admins can add or remove people from the team. Mentors share
            the same coaching privileges, but they can&apos;t manage membership.
          </p>
        </Card>
      )}

      {/* ============================
          Team Members (Admins + Mentors see list,
          only Admins get destructive actions)
         ============================ */}
      {isCoach && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-2">
            Team Members
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 pr-4">Name / Email</th>
                  <th className="py-2 pr-4">Roles</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Updated</th>
                  <th className="py-2 pr-4">Manage</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const roles = m.roles && m.roles.length ? m.roles : ["member"];
                  const statusLabel = m.status || "active";

                  return (
                    <tr key={m.userId || m._id} className="border-b border-gray-100">
                      <td className="py-2 pr-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">
                            {m.name || "Member"}
                          </span>
                          <span className="text-gray-500">
                            {m.email || m.invitedEmail || ""}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {ROLE_OPTIONS.map((role) => {
                            const hasRole = roles.includes(role);
                            return (
                              <button
                                key={role}
                                type="button"
                                disabled={!isAdmin}
                                onClick={() => {
                                  if (!isAdmin) return;
                                  const next = hasRole
                                    ? roles.filter((r) => r !== role)
                                    : [...roles, role];
                                  handleUpdateRoles(m, next);
                                }}
                                className={`px-2 py-0.5 rounded-full text-[11px] border ${
                                  hasRole
                                    ? "bg-teal-50 border-teal-500 text-teal-700"
                                    : "bg-gray-50 border-gray-300 text-gray-500"
                                } ${!isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
                              >
                                {role}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-2 pr-4 capitalize text-gray-700">
                        {statusLabel}
                      </td>
                      <td className="py-2 pr-4 text-gray-500">
                        {m.updatedAt
                          ? new Date(m.updatedAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="py-2 pr-4 space-x-2">
                        {isAdmin && m.status !== "removed" && (
                          <Button
                            variant="secondary"
                            className="text-red-600 border border-red-200 hover:bg-red-50"
                            onClick={() => void handleRemoveMember(m)}
                          >
                            Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TeamDetailPage;
