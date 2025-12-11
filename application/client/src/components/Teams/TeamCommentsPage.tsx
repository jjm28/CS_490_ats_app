// src/components/Teams/TeamCommentsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import {
  getTeamById,
  getTeamSharedDocs,
  getSharedDocComments,
  type CandidateSharedDocs,
  type TeamWithMembers,
  type SharedDocComment,
} from "../../api/teams";

type DocKind = "resume" | "coverletter";

const TeamCommentsPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [shared, setShared] = useState<CandidateSharedDocs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map of "kind:docId" → comments[]
  const [commentsByDoc, setCommentsByDoc] = useState<
    Record<string, SharedDocComment[]>
  >({});

  // Build a lookup of userId → { name, email } from the team members
  const memberLookup = useMemo(() => {
    const map: Record<string, { name?: string | null; email?: string | null }> =
      {};

    if (!team) return map;

    for (const m of team.members || []) {
      const uid =
        (m.userId as any)?.toString?.() ??
        (m._id as any)?.toString?.() ??
        String(m.userId || "");
      if (!uid) continue;

      map[uid] = {
        name: m.name ?? null,
        email: m.email ?? m.invitedEmail ?? null,
      };
    }

    return map;
  }, [team]);

  useEffect(() => {
    const load = async () => {
      if (!teamId) {
        setError("Missing team id in the URL.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load team (for header + member lookup) and all shared docs
        const [teamData, docs] = await Promise.all([
          getTeamById(teamId),
          getTeamSharedDocs(teamId),
        ]);

        setTeam(teamData);
        setShared(docs || []);

        // 🔁 After we know what docs exist, pull comments for each
        const commentsMap: Record<string, SharedDocComment[]> = {};

        for (const entry of docs || []) {
          const { sharedDocs } = entry;

          // Resumes
          for (const r of sharedDocs.resumes || []) {
            const docId = (r._id as any)?.toString?.() ?? String(r._id);
            const key = `resume:${docId}`;

            try {
              // If backend already returns comments on the doc, use those;
              // otherwise call the comments endpoint as a fallback.
              const initial = (r as any).comments as SharedDocComment[] | undefined;
              if (initial && initial.length > 0) {
                commentsMap[key] = initial;
              } else {
                const res = await getSharedDocComments(docId, "resume");
                commentsMap[key] = res.comments || [];
              }
            } catch (err) {
              console.error("Error loading comments for resume", docId, err);
            }
          }

          // Cover letters
          for (const cl of sharedDocs.coverletters || []) {
            const docId = (cl._id as any)?.toString?.() ?? String(cl._id);
            const key = `coverletter:${docId}`;

            try {
              const initial = (cl as any).comments as
                | SharedDocComment[]
                | undefined;
              if (initial && initial.length > 0) {
                commentsMap[key] = initial;
              } else {
                const res = await getSharedDocComments(docId, "coverletter");
                commentsMap[key] = res.comments || [];
              }
            } catch (err) {
              console.error(
                "Error loading comments for coverletter",
                docId,
                err
              );
            }
          }
        }

        setCommentsByDoc(commentsMap);
      } catch (err: any) {
        console.error("Error loading team comments:", err);
        setError(err?.message || "Failed to load comments.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [teamId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500">Loading comments…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Team Comments
          </h1>
          <Button onClick={() => navigate(`/teams/${teamId || ""}`)}>
            Back to Team
          </Button>
        </div>
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {team?.team?.name
              ? `Comments for ${team.team.name}`
              : "Team Comments"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Here are the comments that have been left on the shared resumes and
            cover letters for this team.
          </p>
        </div>
        <Button onClick={() => navigate(`/teams/${teamId || ""}`)}>
          Back to Team
        </Button>
      </div>

      {shared.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500">
            No comments found for any shared documents.
          </p>
        </Card>
      ) : (
        shared.map((entry) => {
          const { candidate, sharedDocs } = entry;

          // Attach kind to each doc so we know whether it's a resume or cover letter
          const allDocs: { kind: DocKind; doc: any }[] = [
            ...(sharedDocs.resumes || []).map((doc) => ({
              kind: "resume" as DocKind,
              doc,
            })),
            ...(sharedDocs.coverletters || []).map((doc) => ({
              kind: "coverletter" as DocKind,
              doc,
            })),
          ];

          return (
            <Card key={candidate.id}>
              <h2 className="text-sm font-semibold text-gray-900 mb-2">
                {candidate.name || candidate.email || "Candidate"}
              </h2>

              {allDocs.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No resumes or cover letters shared for this candidate.
                </p>
              ) : (
                allDocs.map(({ kind, doc }) => {
                  const docId =
                    (doc._id as any)?.toString?.() ?? String(doc._id);
                  const docKey = `${kind}:${docId}`;

                  const comments =
                    commentsByDoc[docKey] || (doc.comments as
                      | SharedDocComment[]
                      | undefined) ||
                    [];

                  const label =
                    kind === "resume" ? "Resume" : "Cover Letter";

                  return (
                    <div
                      key={docKey}
                      className="border-t border-gray-200 pt-2 mt-2"
                    >
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        {label}: {doc.filename || "Untitled Document"}
                      </p>

                      {comments.length === 0 ? (
                        <p className="text-[11px] text-gray-500">
                          No comments yet.
                        </p>
                      ) : (
                        <ul className="text-xs space-y-1">
                          {comments.map((c, idx) => {
                            const id =
                              (c._id as any)?.toString?.() ??
                              `${docId}:${idx}`;

                            // Try multiple possible id fields: viewerId, userId, authorId
                            const rawAuthorId =
                              (c as any).viewerId ||
                              (c as any).userId ||
                              (c as any).authorId ||
                              "";
                            const authorInfo =
                              memberLookup[rawAuthorId] || null;
                            const authorLabel =
                              authorInfo?.name ||
                              authorInfo?.email ||
                              "Coach";

                            const createdAt = c.createdAt
                              ? new Date(c.createdAt).toLocaleString()
                              : "";
                            const resolved = !!c.resolved;

                            return (
                              <li
                                key={id}
                                className={
                                  resolved
                                    ? "text-gray-400 line-through"
                                    : "text-gray-800"
                                }
                              >
                                <span className="font-medium">
                                  {authorLabel}:{" "}
                                </span>
                                <span>{c.text}</span>
                                {createdAt && (
                                  <span className="text-[10px] text-gray-400 ml-1">
                                    ({createdAt}
                                    {resolved ? " · resolved" : ""})
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })
              )}
            </Card>
          );
        })
      )}
    </div>
  );
};

export default TeamCommentsPage;
