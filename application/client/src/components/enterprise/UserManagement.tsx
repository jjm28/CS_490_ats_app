import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import type { JobSeekerSummary, PaginatedResult } from "../../types/jobSeeker";

interface JobSeekerResponse extends PaginatedResult<JobSeekerSummary> {}

function getAuthMeta() {
  const raw = localStorage.getItem("authUser");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    const user = parsed.user || {};
    return {
      userId: user._id,
      role: user.role,
      organizationId: user.organizationId,
    };
  } catch {
    return {};
  }
}

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { userId, role, organizationId } = getAuthMeta();

  const [search, setSearch] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<JobSeekerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [addingToCohort, setAddingToCohort] = useState(false);
  const [cohortId, setCohortId] = useState("");

  useEffect(() => {
    if (role !== "org_admin" && role !== "super_admin") {
      navigate("/not-authorized");
    }
  }, [role, navigate]);

  useEffect(() => {
    fetchJobSeekers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, includeDeleted, search]);

  async function fetchJobSeekers() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "20");
      params.set("includeDeleted", includeDeleted ? "true" : "false");
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(
        `${API_BASE}/api/enterprise/jobseekers?${params.toString()}`,
        {
          credentials: "include",
          headers: {
            ...(userId
              ? {
                  "x-user-id": userId,
                  "x-user-role": role || "",
                  "x-org-id": organizationId || "",
                }
              : {}),
          },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch job seekers");
      const json = (await res.json()) as JobSeekerResponse;
      setData(json);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelectAll() {
    if (!data?.items) return;
    if (selectedIds.length === data.items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.items.map((u) => u._id));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function updateDeletion(isDeleted: boolean) {
    if (!selectedIds.length) return;
    if (
      !window.confirm(
        isDeleted
          ? "Deactivate selected accounts?"
          : "Reactivate selected accounts?"
      )
    )
      return;

    try {
      setUpdating(true);
      const res = await fetch(
        `${API_BASE}/api/enterprise/jobseekers/deletion`,
        {
          method: "PATCH",
          credentials: "include",
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
          body: JSON.stringify({
            userIds: selectedIds,
            isDeleted,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to update accounts");
      await fetchJobSeekers();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  }

  async function addSelectedToCohort() {
    if (!selectedIds.length || !cohortId) return;
    try {
      setAddingToCohort(true);
      const res = await fetch(
        `${API_BASE}/api/enterprise/jobseekers/add-to-cohort`,
        {
          method: "POST",
          credentials: "include",
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
          body: JSON.stringify({
            userIds: selectedIds,
            cohortId,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to add to cohort");
      setSelectedIds([]);
      setCohortId("");
    } catch (err) {
      console.error(err);
    } finally {
      setAddingToCohort(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          User Management
        </h1>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/enterprise/onboarding")}
        >
          Bulk Onboarding
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            className="border rounded px-3 py-2 text-sm flex-1 min-w-[200px]"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => {
                setPage(1);
                setIncludeDeleted(e.target.checked);
              }}
            />
            Include deactivated
          </label>
        </div>

        {loading && <p className="text-sm text-slate-500">Loading users...</p>}

        {!loading && data && data.items.length === 0 && (
          <p className="text-sm text-slate-500">
            No job seekers found in this organization.
          </p>
        )}

        {!loading && data && data.items.length > 0 && (
          <>
            {selectedIds.length > 0 && (
              <div className="flex items-center justify-between py-2 border-b mb-2 text-sm">
                <span>
                  {selectedIds.length} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={updating}
                    onClick={() => updateDeletion(true)}
                  >
                    {updating ? "Updating..." : "Deactivate"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={updating}
                    onClick={() => updateDeletion(false)}
                  >
                    {updating ? "Updating..." : "Reactivate"}
                  </Button>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-xs"
                      placeholder="Cohort ID"
                      value={cohortId}
                      onChange={(e) => setCohortId(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={addingToCohort || !cohortId}
                      onClick={addSelectedToCohort}
                    >
                      {addingToCohort ? "Adding..." : "Add to Cohort"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="px-2 py-2">
                      <input
                        type="checkbox"
                        onChange={toggleSelectAll}
                        checked={
                          data.items.length > 0 &&
                          selectedIds.length === data.items.length
                        }
                      />
                    </th>
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Email</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Cohorts</th>
                    <th className="px-2 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((u) => {
                    const checked = selectedIds.includes(u._id);
                    return (
                      <tr key={u._id} className="border-b">
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelect(u._id)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          {u.fullName || "(No name)"}
                        </td>
                        <td className="px-2 py-2">{u.email}</td>
                        <td className="px-2 py-2">
                          <span
                            className={
                              u.isDeleted
                                ? "inline-flex px-2 py-1 rounded-full text-xs bg-red-50 text-red-700"
                                : "inline-flex px-2 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700"
                            }
                          >
                            {u.isDeleted ? "Deactivated" : "Active"}
                          </span>
                        </td>
                        <td className="px-2 py-2">{u.cohortsCount}</td>
                        <td className="px-2 py-2">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-3 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </button>
              <span>
                Page {data.page} of {data.totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) =>
                    data && p < data.totalPages ? p + 1 : p
                  )
                }
                disabled={page >= data.totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default UserManagement;
