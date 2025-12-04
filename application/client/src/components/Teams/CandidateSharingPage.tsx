// src/components/Teams/CandidateSharingPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import {
  getMySharedDocs,
  setProfileSharing,
  setResumeSharing,
  setCoverletterSharing,
  type MySharedDocs,
  type SharedResumeDoc,
  type SharedCoverletterDoc,
} from "../../api/teams";

const CandidateSharingPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<MySharedDocs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingResumeId, setSavingResumeId] = useState<string | null>(null);
  const [savingCoverId, setSavingCoverId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const docs = await getMySharedDocs();

        // 🔹 Normalize so we ALWAYS have arrays, even if the backend
        // returns singular keys or omits these fields.
        setData({
          ...docs,
          profiles: (docs as any).profiles ?? [],
          resumes: docs.resumes ?? [],
          coverletters: docs.coverletters ?? [],
        });
      } catch (err: any) {
        console.error("Error loading shared docs for candidate:", err);
        setError(
          err?.message ||
            "Failed to load sharing information. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleToggleProfile = async () => {
    if (!data) return;

    // 🔹 Safe access: handle missing/undefined profiles
    const current = !!data.profiles?.[0]?.isShared;
    const next = !current;

    try {
      setSavingProfile(true);
      setError(null);
      await setProfileSharing(next);

      setData((prev) =>
        prev
          ? {
              ...prev,
              profiles: (() => {
                const existing = prev.profiles ?? [];
                if (existing.length === 0) {
                  // if we don't have a profile row yet, create a minimal one
                  return [{ isShared: next }] as any[];
                }
                return existing.map((p, idx) =>
                  idx === 0 ? { ...p, isShared: next } : p
                );
              })(),
            }
          : prev
      );
    } catch (err: any) {
      console.error("Error toggling profile sharing:", err);
      setError(err?.message || "Failed to update profile sharing.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleResume = async (resume: SharedResumeDoc) => {
    if (!data) return;
    const resumeId = (resume._id as any).toString();
    const next = !resume.isShared;

    try {
      setSavingResumeId(resumeId);
      setError(null);
      await setResumeSharing({ resumeId, share: next });
      setData((prev) =>
        prev
          ? {
              ...prev,
              resumes: prev.resumes.map((r) =>
                (r._id as any).toString() === resumeId
                  ? { ...r, isShared: next }
                  : r
              ),
            }
          : prev
      );
    } catch (err: any) {
      console.error("Error toggling resume sharing:", err);
      setError(err?.message || "Failed to update resume sharing.");
    } finally {
      setSavingResumeId(null);
    }
  };

  const handleToggleCoverletter = async (cover: SharedCoverletterDoc) => {
    if (!data) return;
    const coverId = (cover._id as any).toString();
    const next = !cover.isShared;

    try {
      setSavingCoverId(coverId);
      setError(null);
      await setCoverletterSharing({ coverletterId: coverId, share: next });
      setData((prev) =>
        prev
          ? {
              ...prev,
              coverletters: prev.coverletters.map((cl) =>
                (cl._id as any).toString() === coverId
                  ? { ...cl, isShared: next }
                  : cl
              ),
            }
          : prev
      );
    } catch (err: any) {
      console.error("Error toggling cover letter sharing:", err);
      setError(err?.message || "Failed to update cover letter sharing.");
    } finally {
      setSavingCoverId(null);
    }
  };

  const copyToClipboard = (url: string) => {
    if (!url) return;
    void navigator.clipboard.writeText(url);
    alert("Link copied to clipboard.");
  };

  // 🔹 Safe: profiles might be undefined or empty
  const profileShared = !!data?.profiles?.[0]?.isShared;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Sharing Center
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Choose what you share with your coaches and teams. Use the switches
            below to control visibility of your profile, resumes, and cover
            letters.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      {error && (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {loading || !data ? (
        <Card>
          <p className="text-sm text-gray-500">Loading your sharing data…</p>
        </Card>
      ) : (
        <>
          {/* Profile */}
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Profile</h2>
                <p className="mt-1 text-xs text-gray-600 max-w-2xl">
                  Share your core profile (headline, location, basic info) with
                  your teams so mentors can quickly understand your background.
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Status:{" "}
                  <span className="font-medium">
                    {profileShared ? "Shared" : "Not shared"}
                  </span>
                </p>
              </div>
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  profileShared ? "bg-teal-600" : "bg-gray-300"
                } ${savingProfile ? "opacity-60 cursor-wait" : ""}`}
                onClick={handleToggleProfile}
                disabled={savingProfile}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    profileShared ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </Card>

          {/* Resumes */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-800">Resumes</h2>
            </div>
            {data.resumes && data.resumes.length > 0 ? (
              <ul className="space-y-2">
                {data.resumes.map((r) => {
                  const resumeId = (r._id as any).toString();
                  const link = (r as any).url || null;
                  const isShared = !!r.isShared;
                  const saving = savingResumeId === resumeId;

                  return (
                    <li
                      key={resumeId}
                      className="flex items-center justify-between gap-3 border border-gray-100 rounded-md px-3 py-2 bg-gray-50"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {r.filename || "Resume"}
                        </p>
                        {r.lastSaved && (
                          <p className="text-xs text-gray-500">
                            Last updated:{" "}
                            {new Date(r.lastSaved).toLocaleString()}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">
                          Visibility:{" "}
                          <span className="font-medium">
                            {isShared ? "Shared with teams" : "Not shared"}
                          </span>
                        </p>
                        {link && isShared && (
                          <div className="mt-1 flex items-center gap-2">
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-teal-600 hover:underline"
                            >
                              View Link
                            </a>
                            <button
                              type="button"
                              className="text-xs text-gray-600 underline"
                              onClick={() => copyToClipboard(link)}
                            >
                              Copy Link
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          isShared ? "bg-teal-600" : "bg-gray-300"
                        } ${saving ? "opacity-60 cursor-wait" : ""}`}
                        onClick={() => handleToggleResume(r)}
                        disabled={saving}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            isShared ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                You don&apos;t have any resumes yet or they haven&apos;t been
                synced into the Sharing Center. Once you create a resume, it
                will show up here so you can toggle whether it&apos;s shared.
              </p>
            )}
          </Card>

          {/* Cover letters */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-800">
                Cover Letters
              </h2>
            </div>
            {data.coverletters && data.coverletters.length > 0 ? (
              <ul className="space-y-2">
                {data.coverletters.map((cl) => {
                  const coverId = (cl._id as any).toString();
                  const link = (cl as any).url || null;
                  const isShared = !!cl.isShared;
                  const saving = savingCoverId === coverId;

                  return (
                    <li
                      key={coverId}
                      className="flex items-center justify-between gap-3 border border-gray-100 rounded-md px-3 py-2 bg-gray-50"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {cl.filename || "Cover Letter"}
                        </p>
                        {cl.lastSaved && (
                          <p className="text-xs text-gray-500">
                            Last updated:{" "}
                            {new Date(cl.lastSaved).toLocaleString()}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">
                          Visibility:{" "}
                          <span className="font-medium">
                            {isShared ? "Shared with teams" : "Not shared"}
                          </span>
                        </p>
                        {link && isShared && (
                          <div className="mt-1 flex items-center gap-2">
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-teal-600 hover:underline"
                            >
                              View Link
                            </a>
                            <button
                              type="button"
                              className="text-xs text-gray-600 underline"
                              onClick={() => copyToClipboard(link)}
                            >
                              Copy Link
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          isShared ? "bg-teal-600" : "bg-gray-300"
                        } ${saving ? "opacity-60 cursor-wait" : ""}`}
                        onClick={() => handleToggleCoverletter(cl)}
                        disabled={saving}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            isShared ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                You don&apos;t have any cover letters yet or they haven&apos;t
                been synced into the Sharing Center. Once you create a cover
                letter, it will show up here so you can toggle whether it&apos;s
                shared.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default CandidateSharingPage;
