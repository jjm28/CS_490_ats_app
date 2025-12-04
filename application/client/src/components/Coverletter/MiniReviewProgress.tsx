// src/components/CoverLetter/MiniReviewProgress.tsx
import React, { useMemo } from "react";

type ReviewerStatus = "invited" | "viewed" | "commented" | "completed";

export type ReviewerMeta = {
  email: string;
  role?: "mentor" | "peer" | "advisor" | "recruiter" | "other";
  status?: ReviewerStatus;
  lastActivityAt?: string;
  completedAt?: string;
};

interface MiniReviewProgressProps {
  reviewers: ReviewerMeta[];
  reviewDeadline?: string; // "YYYY-MM-DD" or ISO
}

function computeDeadlineLabel(reviewDeadline?: string) {
  if (!reviewDeadline) return { label: "No deadline set", tone: "neutral" as const };

  const deadlineDate = new Date(reviewDeadline);
  if (Number.isNaN(deadlineDate.getTime())) {
    return { label: "Deadline: invalid date", tone: "neutral" as const };
  }

  const today = new Date();
  // Normalize times
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffMs = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `Deadline passed (${Math.abs(diffDays)} day${diffDays === -1 ? "" : "s"} ago)`, tone: "danger" as const };
  }
  if (diffDays === 0) {
    return { label: "Due today", tone: "warning" as const };
  }
  if (diffDays <= 3) {
    return { label: `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`, tone: "warning" as const };
  }
  return { label: `Due in ${diffDays} days`, tone: "ok" as const };
}

export default function MiniReviewProgress({
  reviewers,
  reviewDeadline,
}: MiniReviewProgressProps) {
  const {
    total,
    invited,
    active,
    completed,
    percentCompleted,
  } = useMemo(() => {
    const total = reviewers.length;
    let invited = 0;
    let active = 0;
    let completed = 0;

    reviewers.forEach((r) => {
      const s = r.status ?? "invited";
      if (s === "invited") invited += 1;
      else if (s === "viewed" || s === "commented") active += 1;
      else if (s === "completed") completed += 1;
    });

    const percentCompleted =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, invited, active, completed, percentCompleted };
  }, [reviewers]);

  const deadlineInfo = computeDeadlineLabel(reviewDeadline);

  if (!total && !reviewDeadline) {
    // nothing to show
    return null;
  }

  const barInnerClass =
    deadlineInfo.tone === "danger"
      ? "bg-red-500"
      : deadlineInfo.tone === "warning"
      ? "bg-yellow-500"
      : "bg-emerald-500";

  return (
    <div className="inline-flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-gray-800">Review progress</div>
          <div className="text-[11px] text-gray-500">
            {total
              ? `${completed} of ${total} reviewers completed`
              : "No reviewers invited yet"}
          </div>
        </div>
        {reviewDeadline && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${
              deadlineInfo.tone === "danger"
                ? "bg-red-50 text-red-700 border border-red-200"
                : deadlineInfo.tone === "warning"
                ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            {deadlineInfo.label}
          </span>
        )}
      </div>

      {total > 0 && (
        <>
          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full ${barInnerClass} transition-all`}
              style={{ width: `${percentCompleted}%` }}
            />
          </div>
          {/* Status pills */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600 border border-gray-200">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
              Invited: {invited}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 border border-blue-200">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Active: {active}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Completed: {completed}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
