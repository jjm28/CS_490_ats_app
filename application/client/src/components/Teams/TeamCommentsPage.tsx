// src/components/Teams/TeamCommentsPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import {
  getTeamById,
  getTeamSharedDocs,
  getSharedDocComments,
  type CandidateSharedDocs,
} from "../../api/teams";

const TeamCommentsPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const [teamName, setTeamName] = useState<string | null>(null);
  const [shared, setShared] = useState<CandidateSharedDocs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentsByDoc, setCommentsByDoc] = useState<Record<string, any[]>>({});

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

        // Load team (for the header) + all shared docs for this team
        const [teamData, docs] = await Promise.all([
          getTeamById(teamId),
          getTeamSharedDocs(teamId),
        ]);

        setTeamName(teamData.team?.name ?? null);
        setShared(docs || []);
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
            {teamName ? `Comments for ${teamName}` : "Team Comments"}
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

          const allDocs = [
            ...(sharedDocs.resumes || []),
            ...(sharedDocs.coverletters || []),
          ];

          return (
            <Card key={candidate.id}>
              <h2 className="text-sm font-semibold text-gray-900 mb-2">
                {candidate.name ||
                  candidate.email ||
                  "Candidate"}{" "}
                {/* you can tweak this label if you want */}
              </h2>

              {allDocs.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No resumes or cover letters shared for this candidate.
                </p>
              ) : (
                allDocs.map((doc: any) => (
                  <div
                    key={(doc._id as any)?.toString?.() ?? String(doc._id)}
                    className="border-t border-gray-200 pt-2 mt-2"
                  >
                    <p className="text-xs font-medium text-gray-700 mb-1">
                      {doc.filename || "Untitled Document"}
                    </p>
                    {(doc.comments || []).length === 0 ? (
                      <p className="text-[11px] text-gray-500">
                        No comments yet.
                      </p>
                    ) : (
                      <ul className="text-xs space-y-1">
                        {doc.comments.map((c: any, idx: number) => {
                          const id =
                            (c._id as any)?.toString?.() ??
                            `${doc._id}:${idx}`;
                          const resolved = !!c.resolved;
                          const createdAt = c.createdAt
                            ? new Date(c.createdAt).toLocaleString()
                            : "";

                          return (
                            <li
                              key={id}
                              className={
                                resolved
                                  ? "text-gray-400 line-through"
                                  : "text-gray-800"
                              }
                            >
                              {c.text}{" "}
                              {createdAt && (
                                <span className="text-[10px] text-gray-400">
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
                ))
              )}
            </Card>
          );
        })
      )}
    </div>
  );
};

export default TeamCommentsPage;
