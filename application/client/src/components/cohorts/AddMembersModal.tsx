import React, { useState } from "react";
import type { JobSeekerSearchResult } from "../../types/cohort";
import { getAuthMeta } from "../../types/cohort";
interface AddMembersModalProps {
  cohortId: string;
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void; // callback after successful add
}

interface SearchResponse {
  items: JobSeekerSearchResult[];
}

const AddMembersModal: React.FC<AddMembersModalProps> = ({
  cohortId,
  isOpen,
  onClose,
  onAdded,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<JobSeekerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
          const { userId, role, organizationId } = getAuthMeta();

      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      params.set("limit", "20");

      const res = await fetch(
        `/api/enterprise/jobseekers?${params.toString()}`,
        { credentials: "include" ,        headers: {
          "Content-Type": "application/json",
          ...(userId
            ? {
                "x-user-id": userId,
                "x-user-role": role || "",
                "x-org-id": organizationId || "",
              }
            : {}),
        },}
      );
      if (!res.ok) {
        throw new Error("Failed to search job seekers");
      }
      const json = (await res.json()) as SearchResponse;
      setResults(json.items || []);
      setSelectedIds([]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error searching job seekers");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(userId: string) {
    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  async function handleAddSelected() {
    if (!selectedIds.length) return;
    setError(null);

    try {
                const { userId, role, organizationId } = getAuthMeta();

      setAdding(true);
      const res = await fetch(
        `/api/enterprise/cohorts/${cohortId}/members`,
        {
          method: "POST",
           headers: {
          "Content-Type": "application/json",
          ...(userId
            ? {
                "x-user-id": userId,
                "x-user-role": role || "",
                "x-org-id": organizationId || "",
              }
            : {}),
        },
          credentials: "include",
          body: JSON.stringify({ jobSeekerUserIds: selectedIds }),
        }
      );
      if (!res.ok) {
        throw new Error("Failed to add members");
      }

      onAdded(); // e.g. refresh members + cohort in parent
      onClose();
      setQuery("");
      setResults([]);
      setSelectedIds([]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error adding members");
    } finally {
      setAdding(false);
    }
  }

  function handleClose() {
    if (adding) return;
    onClose();
    setQuery("");
    setResults([]);
    setSelectedIds([]);
    setError(null);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Add members to cohort</h2>
          <button onClick={handleClose}>×</button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Search by name, email, or headline"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 border rounded px-2 py-1"
            />
            <button
              type="submit"
              className="border rounded px-3 py-1"
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          {error && (
            <div className="mb-3 text-sm text-red-600">{error}</div>
          )}

          {results.length === 0 && !loading && (
            <p className="text-sm text-gray-500">
              No results yet. Try searching for a student in this organization.
            </p>
          )}

          {results.length > 0 && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Select</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Headline</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const selected = selectedIds.includes(r.userId);
                  return (
                    <tr key={r.userId} className="border-b">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(r.userId)}
                        />
                      </td>
                      <td className="p-2">{r.fullName || "(No name)"}</td>
                      <td className="p-2">{r.email}</td>
                      <td className="p-2">
                        {r.headline || <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Selected: {selectedIds.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="border rounded px-3 py-1"
              disabled={adding}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddSelected}
              className="border rounded px-3 py-1"
              disabled={adding || selectedIds.length === 0}
            >
              {adding ? "Adding..." : "Add selected"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMembersModal;
