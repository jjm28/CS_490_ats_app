import React, { useState } from "react";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import { type Job } from "../../types/jobs.types";
import API_BASE from "../../utils/apiBase";
import { useToast } from "../../hooks/useToast";

interface BulkDeadlineManagerProps {
  jobs: Job[];
  selectedJobIds: Set<string>;
  onToggleSelect: (jobId: string) => void;
  onToggleSelectAll: () => void;
  onBulkExtend: (jobIds: string[], days: number) => Promise<void>;
  onBulkSetDeadline: (jobIds: string[], deadline: string) => Promise<void>;
  onBulkRemoveDeadline: (jobIds: string[]) => Promise<void>;
  onJobsArchived?: (archivedIds: string[]) => void;
}

type BulkAction =
  | "extend"
  | "setDeadline"
  | "removeDeadline"
  | "archive"
  | null;

function BulkDeadlineManager({
  jobs,
  selectedJobIds,
  onToggleSelect,
  onToggleSelectAll,
  onBulkExtend,
  onBulkSetDeadline,
  onBulkRemoveDeadline,
  onJobsArchived,
}: BulkDeadlineManagerProps) {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkAction>(null);
  const [extendDays, setExtendDays] = useState<number>(7);
  const [newDeadline, setNewDeadline] = useState("");
  const [archiveReason, setArchiveReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast, Toast } = useToast();

  const selectedJobs = jobs.filter((job) => selectedJobIds.has(job._id));
  const allSelected = jobs.length > 0 && selectedJobIds.size === jobs.length;
  const someSelected = selectedJobIds.size > 0 && !allSelected;

  const openBulkAction = (action: BulkAction) => {
    if (selectedJobIds.size === 0) {
      alert("Please select at least one job first");
      return;
    }
    setBulkAction(action);
    setShowBulkModal(true);
    setError(null);
  };

  const handleBulkAction = async () => {
    if (selectedJobIds.size === 0) return;
    const jobIds = Array.from(selectedJobIds);
    try {
      setLoading(true);
      setError(null);

      switch (bulkAction) {
        case "extend":
          if (!extendDays || extendDays <= 0) {
            setError("Please enter a valid number of days");
            return;
          }
          await onBulkExtend(jobIds, extendDays);
          break;

        case "setDeadline":
          if (!newDeadline) {
            setError("Please select a deadline date");
            return;
          }
          await onBulkSetDeadline(jobIds, newDeadline);
          break;

        case "removeDeadline":
          if (
            !confirm(
              `Are you sure you want to remove deadlines from ${selectedJobIds.size} job(s)?`
            )
          )
            return;
          await onBulkRemoveDeadline(jobIds);
          break;

        case "archive": {
          const token =
            localStorage.getItem("authToken") ||
            localStorage.getItem("token") ||
            "";

          await Promise.all(
            jobIds.map(async (id) => {
              const res = await fetch(`${API_BASE}/api/jobs/${id}/archive`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  archive: true,
                  reason: archiveReason || "Bulk archive",
                }),
              });

              if (!res.ok && res.status !== 204) {
                const text = await res.text();
                throw new Error(`Failed to archive job ${id}: ${text}`);
              }
            })
          );

          if (onJobsArchived) onJobsArchived(jobIds);

          showToast(
            `Archived ${jobIds.length} job${jobIds.length > 1 ? "s" : ""}`,
            {
              actionLabel: "Undo",
              onAction: async () => {
                await Promise.all(
                  jobIds.map(async (id) =>
                    fetch(`${API_BASE}/api/jobs/${id}/archive`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ archive: false }),
                    })
                  )
                );
                showToast("Undo successful!");
              },
            }
          );
          break;
        }
      }

      setShowBulkModal(false);
      setBulkAction(null);
      setArchiveReason("");
    } catch (err: any) {
      setError(err.message || "Failed to perform bulk action");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toolbar */}
      {selectedJobIds.size > 0 && (
        <Card className="mb-4 bg-blue-50 border-blue-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="font-semibold text-blue-900">
                {selectedJobIds.size} job
                {selectedJobIds.size !== 1 ? "s" : ""} selected
              </div>
              <button
                onClick={onToggleSelectAll}
                className="text-sm text-blue-700 hover:text-blue-900 underline"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => openBulkAction("extend")}
                disabled={loading}
              >
                📅 Extend Deadlines
              </Button>
              <Button
                variant="secondary"
                onClick={() => openBulkAction("setDeadline")}
                disabled={loading}
              >
                📌 Set Deadline
              </Button>
              <Button
                variant="secondary"
                onClick={() => openBulkAction("removeDeadline")}
                disabled={loading}
              >
                🗑️ Remove Deadlines
              </Button>
              <Button
                variant="secondary"
                onClick={() => openBulkAction("archive")}
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                🗃️ Archive Selected
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Select All Checkbox */}
      <div className="mb-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(input) => {
              if (input) input.indeterminate = someSelected;
            }}
            onChange={onToggleSelectAll}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 font-medium">
            Select All Jobs
          </span>
        </label>
      </div>

      {/* Bulk Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {bulkAction === "extend" && "Bulk Extend Deadlines"}
                {bulkAction === "setDeadline" && "Bulk Set Deadline"}
                {bulkAction === "removeDeadline" && "Bulk Remove Deadlines"}
                {bulkAction === "archive" && "Bulk Archive Jobs"}
              </h2>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkAction(null);
                  setError(null);
                }}
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

            {/* Selected Jobs List */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Applying to {selectedJobIds.size} job
                {selectedJobIds.size !== 1 ? "s" : ""}:
              </h3>
              <div className="max-h-40 overflow-y-auto border rounded p-3 bg-gray-50">
                <ul className="space-y-1 text-sm">
                  {selectedJobs.map((job) => (
                    <li key={job._id} className="text-gray-700">
                      • {job.jobTitle} at {job.company}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Inputs */}
            <div className="space-y-4">
              {bulkAction === "extend" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Extend all selected deadlines by:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={extendDays}
                      onChange={(e) => setExtendDays(parseInt(e.target.value))}
                      min="1"
                      max="365"
                      className="w-24 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loading}
                    />
                    <span className="text-gray-700">days</span>
                  </div>
                </div>
              )}

              {bulkAction === "setDeadline" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Set deadline for all selected jobs to:
                  </label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
              )}

              {bulkAction === "removeDeadline" && (
                <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    This will remove deadlines from all selected jobs. You can
                    always add them back later.
                  </p>
                </div>
              )}

              {bulkAction === "archive" && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Optional archive reason:
                  </label>
                  <textarea
                    value={archiveReason}
                    onChange={(e) => setArchiveReason(e.target.value)}
                    placeholder="e.g., position filled, no longer interested..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    disabled={loading}
                  ></textarea>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkAction(null);
                  setError(null);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleBulkAction} disabled={loading}>
                {loading
                  ? "Processing..."
                  : bulkAction === "extend"
                  ? "Extend Deadlines"
                  : bulkAction === "setDeadline"
                  ? "Set Deadline"
                  : bulkAction === "removeDeadline"
                  ? "Remove Deadlines"
                  : "Archive Jobs"}
              </Button>
            </div>
          </Card>
        </div>
      )}
      <Toast />
    </>
  );
}

export default BulkDeadlineManager;