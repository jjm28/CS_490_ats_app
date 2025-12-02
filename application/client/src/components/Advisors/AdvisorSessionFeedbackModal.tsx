import React, { useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import API_BASE from "../../utils/apiBase";
import type { AdvisorSession } from "../../types/advisors.types";

interface Props {
  session: AdvisorSession;
  ownerUserId: string; // candidate
  onClose: () => void;
  onUpdated: (session: AdvisorSession) => void;
}

export default function AdvisorSessionFeedbackModal({
  session,
  ownerUserId,
  onClose,
  onUpdated,
}: Props) {
  const [rating, setRating] = useState<number>(
    session.candidateRating ?? 5
  );
  const [feedback, setFeedback] = useState<string>(
    session.candidateFeedback || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setError("Please choose a rating between 1 and 5.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const res = await fetch(
        `${API_BASE}/api/advisors/sessions/${session.id}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            role: "candidate",
            userId: ownerUserId,
            rating,
            feedback,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error ||
            "Failed to submit session feedback"
        );
      }

      const updated =
        (await res.json()) as AdvisorSession;
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      console.error("Error submitting feedback:", err);
      setError(
        err.message || "Failed to submit feedback"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          type="button"
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-xl"
          onClick={onClose}
          disabled={saving}
        >
          &times;
        </button>

        <h2 className="text-lg font-semibold mb-1">
          Rate this session
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Help your advisor understand what’s working and what
          could be better.
        </p>

        {error && (
          <p className="text-xs text-red-600 mb-2">{error}</p>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 text-sm"
        >
          <div>
            <label className="block text-xs font-medium mb-1">
              Overall rating
            </label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={rating}
              onChange={(e) =>
                setRating(Number(e.target.value))
              }
            >
              <option value={5}>5 – Excellent</option>
              <option value={4}>4 – Very good</option>
              <option value={3}>3 – Okay</option>
              <option value={2}>2 – Needs improvement</option>
              <option value={1}>1 – Not helpful</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Comments (optional)
            </label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm min-h-[80px]"
              value={feedback}
              onChange={(e) =>
                setFeedback(e.target.value)
              }
              placeholder="What was most helpful? Anything you’d like to change next time?"
            />
          </div>

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
              {saving ? "Saving..." : "Submit rating"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
