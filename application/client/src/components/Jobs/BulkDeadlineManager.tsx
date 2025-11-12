import React, { useState } from "react";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import { type Job } from "../../types/jobs.types";

interface BulkDeadlineManagerProps {
  jobs: Job[];
  selectedJobIds: Set<string>;
  onToggleSelect: (jobId: string) => void;
  onToggleSelectAll: () => void;
  onBulkExtend: (jobIds: string[], days: number) => Promise<void>;
  onBulkSetDeadline: (jobIds: string[], deadline: string) => Promise<void>;
  onBulkRemoveDeadline: (jobIds: string[]) => Promise<void>;
}

type BulkAction = "extend" | "setDeadline" | "removeDeadline" | null;

function BulkDeadlineManager({
  jobs,
  selectedJobIds,
  onToggleSelect,
  onToggleSelectAll,
  onBulkExtend,
  onBulkSetDeadline,
  onBulkRemoveDeadline,
}: BulkDeadlineManagerProps) {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkAction>(null);
  const [extendDays, setExtendDays] = useState<number>(7);
  const [newDeadline, setNewDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    try {
      setLoading(true);
      setError(null);
      const jobIds = Array.from(selectedJobIds);

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
          ) {
            return;
          }
          await onBulkRemoveDeadline(jobIds);
          break;
      }

      setShowBulkModal(false);
      setBulkAction(null);
    } catch (err: any) {
      setError(err.message || "Failed to perform bulk action");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bulk Actions Toolbar */}
      {selectedJobIds.size > 0 && (
        <Card className="mb-4 bg-blue-50 border-blue-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="font-semibold text-blue-900">
                {selectedJobIds.size} job{selectedJobIds.size !== 1 ? "s" : ""}{" "}
                selected
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
            </div>
          </div>
        </Card>
      )}

      {/* Select All Checkbox in Table Header */}
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

      {/* Bulk Action Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {bulkAction === "extend" && "Bulk Extend Deadlines"}
                {bulkAction === "setDeadline" && "Bulk Set Deadline"}
                {bulkAction === "removeDeadline" && "Bulk Remove Deadlines"}
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

            {/* Selected Jobs Preview */}
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
                      {job.applicationDeadline && (
                        <span className="text-gray-500 ml-2">
                          (Current deadline:{" "}
                          {new Date(job.applicationDeadline).toLocaleDateString()})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action-Specific Forms */}
            <div className="space-y-4">
              {bulkAction === "extend" && (
                <>
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

                  <div className="flex flex-wrap gap-2">
                    <p className="text-sm text-gray-600 w-full">Quick select:</p>
                    {[3, 7, 14, 30].map((days) => (
                      <Button
                        key={days}
                        type="button"
                        variant="secondary"
                        onClick={() => setExtendDays(days)}
                        disabled={loading}
                      >
                        {days} days
                      </Button>
                    ))}
                  </div>

                  <div className="p-4 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-blue-800">
                      This will extend each selected job's deadline by{" "}
                      <strong>{extendDays}</strong> day
                      {extendDays !== 1 ? "s" : ""} from its current deadline. Jobs
                      without a deadline will have one set {extendDays} days from
                      today.
                    </p>
                  </div>
                </>
              )}

              {bulkAction === "setDeadline" && (
                <>
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

                  {newDeadline && (
                    <div className="p-4 bg-blue-50 rounded border border-blue-200">
                      <p className="text-sm text-blue-800">
                        All selected jobs will have their deadline set to:{" "}
                        <strong>
                          {new Date(newDeadline).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </strong>
                      </p>
                    </div>
                  )}
                </>
              )}

              {bulkAction === "removeDeadline" && (
                <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                  <div className="flex gap-3">
                    <div className="text-2xl">⚠️</div>
                    <div>
                      <h4 className="font-semibold text-yellow-900 mb-1">
                        Remove Deadlines
                      </h4>
                      <p className="text-sm text-yellow-800">
                        This will remove the application deadline from all{" "}
                        {selectedJobIds.size} selected job
                        {selectedJobIds.size !== 1 ? "s" : ""}. This action cannot be
                        undone, but you can always add deadlines back later.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
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
                  : "Remove Deadlines"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export default BulkDeadlineManager;