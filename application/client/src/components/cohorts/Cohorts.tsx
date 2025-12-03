import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  Cohort,
  CohortStatus,
  PaginatedResult,
} from "../../types/cohort";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import API_BASE from "../../utils/apiBase";
interface CohortListResponse extends PaginatedResult<Cohort> {}


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
const Cohorts: React.FC = () => {
  const navigate = useNavigate();

  const authUserRaw = localStorage.getItem("authUser");
  const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
  const role: string | undefined = authUser?.user?.role;

  const [statusFilter, setStatusFilter] = useState<CohortStatus | "all">(
    "active"
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CohortListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Guard: only org_admin / super_admin
  useEffect(() => {
    if (role !== "org_admin" && role !== "super_admin") {
      navigate("/not-authorized");
    }
  }, [role, navigate]);

  useEffect(() => {
    fetchCohorts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, search]);

 async function fetchCohorts() {
  try {
    setLoading(true);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "20");
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());

    const { userId, role, organizationId } = getAuthMeta();

    const res = await fetch(
      `${API_BASE}/api/enterprise/cohorts?${params.toString()}`,
      {
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
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch cohorts");
    }

    const json = (await res.json()) as CohortListResponse;
    setData(json);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
}


  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
        const { userId, role, organizationId } = getAuthMeta();

    try {
      setCreating(true);
      const res = await fetch("/api/enterprise/cohorts", {
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
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim(),
          tags: [],
        }),
      });
      if (!res.ok) throw new Error("Failed to create cohort");
      setNewName("");
      setNewDescription("");
      setPage(1);
      await fetchCohorts();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page title */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Cohorts</h1>
      </div>

      {/* Create cohort form */}
      <Card className="mb-6 p-4 flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-medium text-slate-900">
            Create a new cohort
          </h2>
          <p className="text-sm text-slate-500">
            Group students into cohorts so you can track them and run analytics later.
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-3 md:flex-row md:items-end"
        >
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Cohort name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="e.g. Fall 2025 CS Seniors"
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="e.g. All CS majors graduating in 2025"
            />
          </div>

          <div className="md:w-auto">
            <Button
              type="submit"
              disabled={creating || !newName.trim()}
              className="w-full md:w-auto"
            >
              {creating ? "Creating..." : "Create cohort"}
            </Button>
          </div>
        </form>
      </Card>

      {/* List + filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-700">Status</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as CohortStatus | "all")
              }
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </div>

          <div className="flex-1 md:max-w-xs">
            <input
              type="text"
              placeholder="Search by cohort name"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        {loading && <p className="text-sm text-slate-500">Loading cohorts...</p>}

        {!loading && data && data.items.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-500">
            <p>No cohorts yet.</p>
            <p>Create your first cohort using the form above.</p>
          </div>
        )}

        {!loading && data && data.items.length > 0 && (
          <>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-2 font-medium text-slate-700">
                    Name
                  </th>
                  <th className="text-left p-2 font-medium text-slate-700">
                    Members
                  </th>
                  <th className="text-left p-2 font-medium text-slate-700">
                    Status
                  </th>
                  <th className="text-left p-2 font-medium text-slate-700">
                    Last updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr
                    key={c._id}
                    className="border-b hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/enterprise/cohorts/${c._id}`)}
                  >
                    <td className="p-2">{c.name}</td>
                    <td className="p-2">{c.memberCount}</td>
                    <td className="p-2 capitalize">{c.status}</td>
                    <td className="p-2">
                      {new Date(c.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between mt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-600">
                Page {data.page} of {data.totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= data.totalPages}
                onClick={() =>
                  setPage((p) =>
                    data && p < data.totalPages ? p + 1 : p
                  )
                }
              >
                Next
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default Cohorts;
