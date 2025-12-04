// src/components/Teams/TeamFeedbackPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import {
  getTeamById,
  getTeamSharedDocs,
  resolveSharedDocComment,
  type TeamWithMembers,
  type CandidateSharedDocs,
  type SharedDocComment,
} from "../../api/teams";

type DocKind = "resume" | "coverletter";

const TeamFeedbackPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const [team, setTeam] = useState<TeamWithMembers["team"] | null>(null);
  const [shared, setShared] = useState<CandidateSharedDocs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null);

  const load = async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      const [teamData, sharedDocs] = await Promise.all([
        getTeamById(teamId),
        getTeamSharedDocs(teamId),
      ]);
      setTeam(teamData.team);
      setShared(sharedDocs);
    } catch (err: any) {
      console.error("Error loading feedback:", err);
      setError(err?.message || "Failed to load feedback.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [teamId]);

  const handleResolveComment = async (
    kind: DocKind,
    sharedId: string,
    comment: SharedDocComment
  ) => {
    if (!comment._id) return;
    try {
      setBusyCommentId(comment._id);
      await resolveSharedDocComment({
        sharedId,
        commentId: comment._id,
        type: kind,
        resolved: true,
      });

      setShared((prev) =>
        prev.map((c) => ({
          ...c,
          sharedDocs: {
            ...c.sharedDocs,
            resumes:
              kind === "resume"
                ? c.sharedDocs.resumes.map((r) =>
                    (r._id as any).toString() === sharedId
                      ? {
                          ...r,
                          comments: (r.comments || []).map((cm) =>
                            cm._id === comment._id
                              ? { ...cm, resolved: true }
                              : cm
                          ),
                        }
                      : r
                  )
                : c.sharedDocs.resumes,
            coverletters:
              kind === "coverletter"
                ? c.sharedDocs.coverletters.map((cl) =>
                    (cl._id as any).toString() === sharedId
                      ? {
                          ...cl,
                          comments: (cl.comments || []).map((cm) =>
                            cm._id === comment._id
                              ? { ...cm, resolved: true }
                              : cm
                          ),
                        }
                      : cl
                  )
                : c.sharedDocs.coverletters,
            profiles: c.sharedDocs.profiles,
          },
        }))
      );
    } catch (err) {
      console.error("Error marking comment resolved:", err);
      setError("Failed to mark comment as resolved.");
    } finally {
      setBusyCommentId(null);
    }
  };

  const renderComments = (
    kind: DocKind,
    sharedId: string,
    comments: SharedDocComment[] | undefined
  ) => {
    const list = comments || [];
    if (list.length === 0) {
      return (
        <p className="text-xs text-gray-500">
          No feedback has been left on this document yet.
        </p>
      );
    }

    return (
      <ul className="space-y-1 mt-2">
        {list.map((c) => (
          <li
            key={c._id}
            className="flex items-start justify-between gap-2 text-xs"
          >
            <div>
              <p
                className={
                  c.resolved
                    ? "text-gray-400 line-through"
                    : "text-gray-800"
                }
              >
                {c.text}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {c.createdAt
                  ? new Date(c.createdAt).toLocaleString()
                  : ""}
                {c.resolved && " · resolved"}
              </p>
            </div>
            {!c.resolved && (
              <button
                type="button"
                className="text-[10px] text-teal-600 hover:underline"
                disabled={busyCommentId === c._id}
                onClick={() => handleResolveComment(kind, sharedId, c)}
              >
                {busyCommentId === c._id
                  ? "Updating…"
                  : "Mark resolved"}
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500">Loading feedback…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Feedback on Your Documents
          </h1>
          {team && (
            <p className="mt-1 text-sm text-gray-600">
              Team: {team.name}
            </p>
          )}
        </div>
        <Button onClick={() => navigate(`/teams/${teamId}`)}>
          Back to Team
        </Button>
      </div>

      {error && (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {shared.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500">
            No shared resumes or cover letters found for this team.
          </p>
        </Card>
      ) : (
        shared.map((entry) => {
          const { candidate, sharedDocs } = entry;
          return (
            <Card key={candidate.id}>
              <h2 className="text-sm font-semibold text-gray-900 mb-2">
                Your documents shared as:{" "}
                {candidate.name || candidate.email || candidate.id}
              </h2>

              {/* RESUMES */}
              {sharedDocs.resumes?.length > 0 && (
                <div className="mt-3 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-800">
                    Resume Feedback
                  </h3>
                  {sharedDocs.resumes.map((r) => {
                    const id = (r._id as any).toString();
                    return (
                      <div
                        key={id}
                        className="border border-gray-100 rounded-md px-3 py-2 bg-gray-50"
                      >
                        <p className="text-xs font-medium text-gray-900">
                          {r.filename || "Resume"}
                        </p>
                        {renderComments("resume", id, r.comments)}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* COVER LETTERS */}
              {sharedDocs.coverletters?.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-800">
                    Cover Letter Feedback
                  </h3>
                  {sharedDocs.coverletters.map((cl) => {
                    const id = (cl._id as any).toString();
                    return (
                      <div
                        key={id}
                        className="border border-gray-100 rounded-md px-3 py-2 bg-gray-50"
                      >
                        <p className="text-xs font-medium text-gray-900">
                          {cl.filename || "Cover Letter"}
                        </p>
                        {renderComments("coverletter", id, cl.comments)}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
};

export default TeamFeedbackPage;
