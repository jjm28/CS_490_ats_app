import React, { useState } from "react";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import { type Job } from "../../types/jobs.types";

interface ExtendDeadlineModalProps {
  job: Job;
  onClose: () => void;
  onExtend: (
    jobId: string,
    newDeadline: string,
    reason?: string
  ) => Promise<void>;
}

function ExtendDeadlineModal({
  job,
  onClose,
  onExtend,
}: ExtendDeadlineModalProps) {
  const [newDeadline, setNewDeadline] = useState(
    job.applicationDeadline
      ? new Date(job.applicationDeadline).toISOString().split("T")[0]
      : ""
  );
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick extend options
  const quickExtendDays = [3, 7, 14, 30];

  const handleQuickExtend = (days: number) => {
    const currentDeadline = job.applicationDeadline
      ? new Date(job.applicationDeadline)
      : new Date();
    const extendedDate = new Date(currentDeadline);
    extendedDate.setDate(extendedDate.getDate() + days);
    setNewDeadline(extendedDate.toISOString().split("T")[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newDeadline) {
      setError("Please select a new deadline");
      return;
    }

    const oldDeadline = job.applicationDeadline
      ? new Date(job.applicationDeadline)
      : null;
    const selectedDeadline = new Date(newDeadline);

    // Validate that new deadline is different and in the future
    if (oldDeadline && selectedDeadline <= oldDeadline) {
      setError("New deadline must be after the current deadline");
      return;
    }

    try {
      setLoading(true);
      await onExtend(job._id, newDeadline, reason);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to extend deadline");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Extend Application Deadline
            </h2>
            <p className="text-gray-600 mt-1">
              {job.jobTitle} at {job.company}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Deadline
            </label>
            <div className="p-3 bg-gray-50 rounded border">
              {job.applicationDeadline
                ? new Date(job.applicationDeadline).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )
                : "No deadline set"}
            </div>
          </div>

          {/* Quick Extend Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Extend
            </label>
            <div className="flex flex-wrap gap-2">
              {quickExtendDays.map((days) => (
                <Button
                  key={days}
                  type="button"
                  variant="secondary"
                  onClick={() => handleQuickExtend(days)}
                  disabled={loading}
                >
                  +{days} {days === 1 ? "day" : "days"}
                </Button>
              ))}
            </div>
          </div>

          {/* New Deadline Date Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Deadline Date *
            </label>
            <input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={loading}
              min={
                job.applicationDeadline
                  ? new Date(
                      new Date(job.applicationDeadline).getTime() + 86400000
                    )
                      .toISOString()
                      .split("T")[0]
                  : new Date().toISOString().split("T")[0]
              }
            />
          </div>

          {/* Reason (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Extension (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Company extended deadline, need more time to prepare application..."
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              This note will be saved with the deadline change history
            </p>
          </div>

          {/* Preview */}
          {newDeadline && (
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Preview</h4>
              <p className="text-sm text-blue-800">
                The new deadline will be:{" "}
                <strong>
                  {new Date(newDeadline).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </strong>
              </p>
              {job.applicationDeadline && (
                <p className="text-xs text-blue-700 mt-1">
                  Extension of{" "}
                  {Math.ceil(
                    (new Date(newDeadline).getTime() -
                      new Date(job.applicationDeadline).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}{" "}
                  days from the current deadline
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Extending..." : "Extend Deadline"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default ExtendDeadlineModal;
