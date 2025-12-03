import React, { useEffect, useState } from "react";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import type {
  AdvisorRelationshipSummary,
  AdvisorSharingConfig,
  AdvisorSharingOptions,
} from "../../types/advisors.types";

interface Props {
  advisor: AdvisorRelationshipSummary;
  ownerUserId: string;
  onClose: () => void;
  onUpdatedConfig?: (config: AdvisorSharingConfig) => void;
}

export default function AdvisorSharingConfigModal({
  advisor,
  ownerUserId,
  onClose,
  onUpdatedConfig,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<AdvisorSharingConfig>({
    sharedResumeIds: [],
    sharedCoverLetterIds: [],
    sharedJobIds: [],
    shareProgressSummary: false,
  });

  const [options, setOptions] = useState<AdvisorSharingOptions>({
    resumes: [],
    coverLetters: [],
    jobs: [],
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${API_BASE}/api/advisors/${advisor.id}/sharing-config?ownerUserId=${encodeURIComponent(
            ownerUserId
          )}`,
          { credentials: "include" }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.error || "Failed to load sharing settings"
          );
        }

        const data = await res.json();
        setConfig(data.config);
        setOptions(data.options);
      } catch (err: any) {
        console.error(
          "Error loading advisor sharing config:",
          err
        );
        setError(err.message || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [advisor.id, ownerUserId]);

  const toggleId = (
    listKey: keyof AdvisorSharingConfig,
    id: string
  ) => {
    setConfig((prev) => {
      const current = new Set(
        (prev[listKey] as string[]) || []
      );
      if (current.has(id)) current.delete(id);
      else current.add(id);
      return {
        ...prev,
        [listKey]: Array.from(current),
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/advisors/${advisor.id}/sharing-config`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ownerUserId,
            sharedResumeIds: config.sharedResumeIds,
            sharedCoverLetterIds: config.sharedCoverLetterIds,
            sharedJobIds: config.sharedJobIds,
            shareProgressSummary: config.shareProgressSummary,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error ||
            "Failed to update advisor sharing config"
        );
      }

      const updated = (await res.json()) as AdvisorSharingConfig;
      setConfig(updated);
      onUpdatedConfig?.(updated);
      onClose();
    } catch (err: any) {
      console.error(
        "Error saving advisor sharing config:",
        err
      );
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          type="button"
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-xl"
          onClick={onClose}
          disabled={saving}
        >
          &times;
        </button>
        <h2 className="text-lg font-semibold mb-1">
          What can {advisor.advisorName || "this advisor"} see?
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Choose which resumes, cover letters, and job
          applications this advisor can view, plus whether they
          see your progress summary.
        </p>

        {loading && <p className="text-sm">Loading...</p>}

        {error && (
          <p className="text-sm text-red-600 mb-3">{error}</p>
        )}

        {!loading && !error && (
          <form
            onSubmit={handleSave}
            className="space-y-6 text-sm"
          >
            {/* Documents */}
            <section>
              <h3 className="font-medium mb-1">Documents</h3>
              <p className="text-xs text-gray-500 mb-2">
                Pick which resumes and cover letters they can
                review.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Resumes */}
                <div>
                  <h4 className="font-medium mb-1">Resumes</h4>
                  {options.resumes.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No resumes found.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto border rounded p-2">
                      {options.resumes.map((r) => (
                        <label
                          key={r.id}
                          className="flex items-start gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={config.sharedResumeIds.includes(
                              r.id
                            )}
                            onChange={() =>
                              toggleId("sharedResumeIds", r.id)
                            }
                          />
                          <span>
                            <div>{r.filename}</div>
                            <div className="text-[11px] text-gray-500">
                              {r.templateKey} ·{" "}
                              {new Date(
                                r.updatedAt
                              ).toLocaleDateString()}
                            </div>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cover letters */}
                <div>
                  <h4 className="font-medium mb-1">
                    Cover letters
                  </h4>
                  {options.coverLetters.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No cover letters found.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto border rounded p-2">
                      {options.coverLetters.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-start gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={config.sharedCoverLetterIds.includes(
                              c.id
                            )}
                            onChange={() =>
                              toggleId(
                                "sharedCoverLetterIds",
                                c.id
                              )
                            }
                          />
                          <span>
                            <div>{c.filename}</div>
                            <div className="text-[11px] text-gray-500">
                              {c.templateKey} ·{" "}
                              {new Date(
                                c.updatedAt
                              ).toLocaleDateString()}
                            </div>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Applications */}
            <section>
              <h3 className="font-medium mb-1">
                Job applications
              </h3>
              <p className="text-xs text-gray-500 mb-2">
                These are the specific jobs this advisor will be
                able to see.
              </p>

              {options.jobs.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No active jobs found.
                </p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto border rounded p-2">
                  {options.jobs.map((j) => (
                    <label
                      key={j.id}
                      className="flex items-start gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={config.sharedJobIds.includes(
                          j.id
                        )}
                        onChange={() =>
                          toggleId("sharedJobIds", j.id)
                        }
                      />
                      <span>
                        <div>
                          {j.jobTitle}{" "}
                          <span className="text-gray-500">
                            @ {j.company}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Status: {j.status} ·{" "}
                          {new Date(
                            j.updatedAt
                          ).toLocaleDateString()}
                        </div>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            {/* Progress */}
            <section>
              <h3 className="font-medium mb-1">
                Progress summary
              </h3>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.shareProgressSummary}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      shareProgressSummary:
                        e.target.checked,
                    }))
                  }
                />
                <span>
                  <div>Share your progress summary</div>
                  <div className="text-xs text-gray-500">
                    This includes job status counts and a few
                    recent goals and milestones. Detailed notes
                    remain private.
                  </div>
                </span>
              </label>
            </section>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
