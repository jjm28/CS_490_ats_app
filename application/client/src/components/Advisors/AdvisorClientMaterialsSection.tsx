import React, { useEffect, useState } from "react";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import type { AdvisorMessage } from "../../types/advisors.types"; // if needed

interface AdvisorClientMaterials {
  documents: {
    resumes: {
      id: string;
      filename: string;
      templateKey: string;
      updatedAt: string;
    }[];
    coverLetters: {
      id: string;
      filename: string;
      templateKey: string;
      updatedAt: string;
    }[];
  } | null;
  applications: {
    jobs: {
      id: string;
      jobTitle: string;
      company: string;
      status: string;
      updatedAt: string;
      createdAt: string;
      applicationDeadline?: string;
    }[];
  } | null;
  progress: {
    enabled: boolean;
    jobStatusCounts?: Record<string, number>;
    recentGoals?: {
      id: string;
      title: string;
      status: string;
      createdAt: string;
      targetDate?: string;
    }[];
    recentMilestones?: {
      id: string;
      title: string;
      description: string;
      achievedAt: string;
    }[];
  } | null;
}

interface Props {
  relationshipId: string;
  advisorUserId: string;
}

export default function AdvisorClientMaterialsSection({
  relationshipId,
  advisorUserId,
}: Props) {
  const [data, setData] = useState<AdvisorClientMaterials | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${API_BASE}/api/advisors/clients/${relationshipId}/materials?advisorUserId=${encodeURIComponent(
            advisorUserId
          )}`,
          { credentials: "include" }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.error || "Failed to load client materials"
          );
        }

        const json = await res.json();
        setData(json);
      } catch (err: any) {
        console.error(
          "Error loading advisor client materials:",
          err
        );
        setError(err.message || "Failed to load materials");
      } finally {
        setLoading(false);
      }
    };

    if (relationshipId && advisorUserId) {
      fetchMaterials();
    }
  }, [relationshipId, advisorUserId]);

  if (loading) {
    return (
      <Card className="p-4">
        <p className="text-sm">Loading materials...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 bg-red-50 text-red-700">
        <p className="text-sm">{error}</p>
      </Card>
    );
  }

  if (!data) return null;

  const { documents, applications, progress } = data;

  return (
    <div className="space-y-4">
      {/* Documents */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-2">
          Documents
        </h2>
        {!documents ? (
          <p className="text-xs text-gray-500">
            This client has not shared any documents with you.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium mb-1">Resumes</h3>
              {documents.resumes.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No shared resumes.
                </p>
              ) : (
                <ul className="space-y-1">
                  {documents.resumes.map((r) => (
                    <li
                      key={r.id}
                      className="border rounded px-3 py-2"
                    >
                      <div>{r.filename}</div>
                      <div className="text-[11px] text-gray-500">
                        {r.templateKey} ·{" "}
                        {new Date(
                          r.updatedAt
                        ).toLocaleDateString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="font-medium mb-1">
                Cover letters
              </h3>
              {documents.coverLetters.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No shared cover letters.
                </p>
              ) : (
                <ul className="space-y-1">
                  {documents.coverLetters.map((c) => (
                    <li
                      key={c.id}
                      className="border rounded px-3 py-2"
                    >
                      <div>{c.filename}</div>
                      <div className="text-[11px] text-gray-500">
                        {c.templateKey} ·{" "}
                        {new Date(
                          c.updatedAt
                        ).toLocaleDateString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Applications */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-2">
          Job applications
        </h2>
        {!applications ? (
          <p className="text-xs text-gray-500">
            This client has not shared their job applications
            with you.
          </p>
        ) : applications.jobs.length === 0 ? (
          <p className="text-xs text-gray-500">
            No shared jobs yet.
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            {applications.jobs.map((j) => (
              <div
                key={j.id}
                className="border rounded px-3 py-2"
              >
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">
                      {j.jobTitle}
                    </div>
                    <div className="text-xs text-gray-500">
                      {j.company}
                    </div>
                  </div>
                  <div className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {j.status}
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  Last updated:{" "}
                  {new Date(
                    j.updatedAt
                  ).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Progress */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-2">
          Progress
        </h2>
        {!progress || !progress.enabled ? (
          <p className="text-xs text-gray-500">
            This client hasn&apos;t shared their progress summary
            with you.
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            {progress.jobStatusCounts && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(progress.jobStatusCounts).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs"
                    >
                      {status}: {count}
                    </div>
                  )
                )}
              </div>
            )}

            {progress.recentGoals &&
              progress.recentGoals.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium mb-1">
                    Recent goals
                  </h3>
                  <ul className="space-y-1">
                    {progress.recentGoals.map((g) => (
                      <li key={g.id} className="text-xs">
                        <span className="font-medium">
                          {g.title}
                        </span>{" "}
                        <span className="text-gray-500">
                          ({g.status})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {progress.recentMilestones &&
              progress.recentMilestones.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium mb-1">
                    Recent milestones
                  </h3>
                  <ul className="space-y-1">
                    {progress.recentMilestones.map((m) => (
                      <li key={m.id} className="text-xs">
                        <div className="font-medium">
                          {m.title}
                        </div>
                        {m.description && (
                          <div className="text-gray-500">
                            {m.description}
                          </div>
                        )}
                        <div className="text-[11px] text-gray-400">
                          {new Date(
                            m.achievedAt
                          ).toLocaleDateString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}
      </Card>
    </div>
  );
}
