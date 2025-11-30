import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import API_BASE from "../../utils/apiBase";
import type { Supporter } from "../../types/support.types";

const SUPPORTERS_ENDPOINT = `${API_BASE}/api/supporters`;
const MILESTONES_ENDPOINT = `${API_BASE}/api/supporters/milestones`;

type MilestoneType =
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_PASSED"
  | "OFFER_RECEIVED"
  | "OFFER_ACCEPTED"
  | "NEW_JOB_STARTED"
  | "CUSTOM_CELEBRATION";

interface Props {
  userId: string; // job seeker
  open: boolean;
  onClose: () => void;

  // optional job context
  jobId?: string;
  jobTitle?: string | null;
  jobCompany?: string | null;

  defaultType?: MilestoneType;
  defaultTitle?: string;
}

export default function MilestoneShareModal({
  userId,
  open,
  onClose,
  jobId,
  jobTitle,
  jobCompany,
  defaultType = "CUSTOM_CELEBRATION",
  defaultTitle,
}: Props) {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loadingSupporters, setLoadingSupporters] = useState(false);

  const [type, setType] = useState<MilestoneType>(defaultType);
  const [title, setTitle] = useState(
    defaultTitle || "I want to celebrate a win"
  );
  const [message, setMessage] = useState("");
  const [visibility, setVisibility] = useState<"all" | "custom">("all");
  const [selectedSupporterIds, setSelectedSupporterIds] = useState<string[]>(
    []
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load supporters when modal opens
  useEffect(() => {
    if (!open) return;
    const fetchSupporters = async () => {
      try {
        setLoadingSupporters(true);
        const res = await fetch(
          `${SUPPORTERS_ENDPOINT}?userId=${userId}`,
          { credentials: "include" }
        );
        if (!res.ok) return;
        const data: Supporter[] = await res.json();
        setSupporters(data.filter((s) => s.status === "accepted"));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSupporters(false);
      }
    };
    fetchSupporters();
  }, [open, userId]);

  const toggleSupporter = (id: string) => {
    setSelectedSupporterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (visibility === "custom" && selectedSupporterIds.length === 0) {
      setError("Select at least one supporter or choose 'All'");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(
        `${MILESTONES_ENDPOINT}?userId=${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            type,
            title: title.trim(),
            message: message.trim() || undefined,
            jobId: jobId || undefined,
            visibility,
            supporterIds:
              visibility === "custom" ? selectedSupporterIds : undefined,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to share milestone");
      }

      // We don't need the response here; just close
      onClose();
      // Optional: you could show a toast in parent
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <Card className="bg-white rounded-lg p-4 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm">
            Share a win with your supporters
          </h2>
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-[11px] font-medium mb-1">
                Type of win
              </label>
              <select
                className="border rounded px-2 py-1 text-xs"
                value={type}
                onChange={(e) => setType(e.target.value as MilestoneType)}
              >
                <option value="INTERVIEW_SCHEDULED">
                  Interview scheduled
                </option>
                <option value="INTERVIEW_PASSED">
                  Passed an interview round
                </option>
                <option value="OFFER_RECEIVED">Offer received</option>
                <option value="OFFER_ACCEPTED">Accepted an offer</option>
                <option value="NEW_JOB_STARTED">Started a new job</option>
                <option value="CUSTOM_CELEBRATION">Custom win</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium mb-1">
              Title
            </label>
            <input
              className="w-full border rounded px-2 py-1 text-xs"
              placeholder="E.g., Got an interview for a role I’m excited about"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {jobTitle || jobCompany ? (
            <div className="bg-gray-50 border rounded px-2 py-2 text-[11px] text-gray-700">
              <div className="font-medium mb-1">Linked job</div>
              <div>
                {jobTitle && <span>{jobTitle}</span>}
                {jobTitle && jobCompany && <span> @ </span>}
                {jobCompany && <span>{jobCompany}</span>}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                Company names may be hidden for supporters who don&apos;t have
                permission to see them.
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-[11px] font-medium mb-1">
              Optional message
            </label>
            <textarea
              className="w-full border rounded px-2 py-1 text-xs"
              rows={3}
              placeholder="E.g., Thanks for cheering me on — this really means a lot!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium mb-1">
              Who should see this?
            </label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  value="all"
                  checked={visibility === "all"}
                  onChange={() => setVisibility("all")}
                />
                <span>All active supporters</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  value="custom"
                  checked={visibility === "custom"}
                  onChange={() => setVisibility("custom")}
                />
                <span>Choose specific people</span>
              </label>
            </div>

            {visibility === "custom" && (
              <div className="border rounded px-2 py-2 max-h-32 overflow-y-auto">
                {loadingSupporters ? (
                  <p className="text-[11px] text-gray-500">Loading…</p>
                ) : supporters.length === 0 ? (
                  <p className="text-[11px] text-gray-500">
                    You don&apos;t have any accepted supporters yet.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {supporters.map((s) => (
                      <label
                        key={s._id}
                        className="flex items-center gap-2 text-[11px]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSupporterIds.includes(s._id)}
                          onChange={() => toggleSupporter(s._id)}
                        />
                        <span>
                          {s.fullName} ({s.relationship})
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-[11px] text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sharing..." : "Share celebration"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
