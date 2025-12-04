import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type {
  Cohort,
  CohortMember,
  PaginatedResult,
} from "../../types/cohort";
import AddMembersModal from "./AddMembersModal";
import { getAuthMeta } from "../../types/cohort";
import { Button } from "@headlessui/react";

interface MembersResponse extends PaginatedResult<CohortMember> {}

const CohortDetail: React.FC = () => {
  const { cohortId } = useParams<{ cohortId: string }>();
  const navigate = useNavigate();

  const authUserRaw = localStorage.getItem("authUser");
  const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
  const role: string | undefined = authUser?.user?.role;

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [members, setMembers] = useState<MembersResponse | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRemoving, setIsRemoving] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Handshake import
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleImportToCohort(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile || !cohortId) return;

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch(
        `/api/integrations/handshake/import-students?cohortId=${cohortId}`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to import to cohort");
      }

      const json = await res.json();
      await Promise.all([fetchMembers(), fetchCohort()]);
      alert(
        `Imported to cohort: ${json.createdCount} created, ${json.updatedCount} updated, ${json.skippedCount} skipped.`
      );
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error importing to cohort");
    } finally {
      setImporting(false);
    }
  }

  // role guard
  useEffect(() => {
    if (role !== "org_admin" && role !== "super_admin") {
      navigate("/not-authorized");
    }
  }, [role, navigate]);

  useEffect(() => {
    if (cohortId) fetchCohort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortId]);

  useEffect(() => {
    if (cohortId) fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortId, page, search]);

  async function fetchCohort() {
    try {
      const { userId, role, organizationId } = getAuthMeta();
      const res = await fetch(`/api/enterprise/cohorts/${cohortId}`, {
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
      });
      if (!res.ok) throw new Error("Failed to fetch cohort");
      const json = (await res.json()) as Cohort;
      setCohort(json);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchMembers() {
    try {
      setMembersLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "25");
      if (search.trim()) params.set("search", search.trim());
      const { userId, role, organizationId } = getAuthMeta();

      const res = await fetch(
        `/api/enterprise/cohorts/${cohortId}/members?${params.toString()}`,
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
      if (!res.ok) throw new Error("Failed to fetch members");
      const json = (await res.json()) as MembersResponse;
      setMembers(json);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setMembersLoading(false);
    }
  }

  async function handleArchive() {
    const { userId, role, organizationId } = getAuthMeta();
    if (!window.confirm("Archive this cohort?")) return;

    try {
      const res = await fetch(
        `/api/enterprise/cohorts/${cohortId}/archive`,
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
        }
      );
      if (!res.ok) throw new Error("Failed to archive cohort");
      await fetchCohort();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRemoveSelected() {
    if (!selectedIds.length || !cohortId) return;
    if (!window.confirm("Remove selected members from this cohort?")) return;
    const { userId, role, organizationId } = getAuthMeta();

    try {
      setIsRemoving(true);
      const res = await fetch(
        `/api/enterprise/cohorts/${cohortId}/members`,
        {
          method: "DELETE",
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
            jobSeekerUserIds: selectedIds,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to remove members");
      await Promise.all([fetchMembers(), fetchCohort()]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRemoving(false);
    }
  }

  function toggleSelectAll() {
    if (!members?.items) return;
    if (selectedIds.length === members.items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(members.items.map((m) => m.jobSeekerUserId));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  if (!cohort) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        Loading cohort...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Cohort summary */}
        <div className="flex flex-col justify-between gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-start">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              {cohort.name}
            </h1>
            {cohort.description && (
              <p className="max-w-2xl text-sm text-slate-600">
                {cohort.description}
              </p>
            )}

            {cohort.tags && cohort.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {cohort.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  cohort.status === "archived"
                    ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                }`}
              >
                {cohort.status}
              </span>
              <span className="text-sm text-slate-500">
                {cohort.memberCount} members
              </span>
            </div>

            <button
              onClick={handleArchive}
              disabled={cohort.status === "archived"}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Archive
            </button>
          </div>
        </div>

        {/* Import + members header */}
        <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Members</h2>
              <p className="text-sm text-slate-500">
                View, import, and manage cohort members.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-3 sm:justify-end">
              {/* Handshake import */}
              <form
                onSubmit={handleImportToCohort}
                className="flex items-center gap-2"
              >
                <Button
                  type="button"
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                  onClick={() => {
                    const input = document.getElementById(
                      "handshake-cohort-file"
                    ) as HTMLInputElement | null;
                    input?.click();
                  }}
                >
                  {importing ? "Importing…" : "Import from Handshake"}
                </Button>
                <input
                  id="handshake-cohort-file"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setImportFile(file);
                    if (file) {
                      const fakeEvent = { preventDefault() {} } as React.FormEvent;
                      void handleImportToCohort(fakeEvent);
                    }
                  }}
                />
              </form>

              {/* Add / remove */}
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Add Members
              </button>
              <button
                type="button"
                disabled={!selectedIds.length || isRemoving}
                onClick={handleRemoveSelected}
                className="inline-flex items-center rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRemoving ? "Removing…" : "Remove Selected"}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-xs">
              <input
                type="text"
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Members table / states */}
          {membersLoading && (
            <div className="py-10 text-center text-sm text-slate-500">
              Loading members…
            </div>
          )}

          {!membersLoading && members && members.items.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">
                No members in this cohort yet.
              </p>
              <p className="text-xs text-slate-500">
                Use “Add Members” or import a CSV from Handshake.
              </p>
            </div>
          )}

          {!membersLoading && members && members.items.length > 0 && (
            <>
              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="w-10 px-4 py-2">
                        <input
                          type="checkbox"
                          onChange={toggleSelectAll}
                          checked={
                            members.items.length > 0 &&
                            selectedIds.length === members.items.length
                          }
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Name
                      </th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Email
                      </th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Headline
                      </th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Joined
                      </th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Source
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {members.items.map((m) => {
                      const isSelected = selectedIds.includes(
                        m.jobSeekerUserId
                      );
                      return (
                        <tr
                          key={m._id}
                          className={isSelected ? "bg-indigo-50/40" : ""}
                        >
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(m.jobSeekerUserId)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-900">
                            {m.profile.fullName || "(No name)"}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-700">
                            {m.user.email}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-500">
                            {m.profile.headline || "—"}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-500">
                            {m.joinedAt
                              ? new Date(m.joinedAt).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-500">
                            {m.source || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span>
                  Page {members.page} of {members.totalPages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) =>
                      members && p < members.totalPages ? p + 1 : p
                    )
                  }
                  disabled={page >= members.totalPages}
                  className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>

        {cohortId && (
          <AddMembersModal
            cohortId={cohortId}
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onAdded={async () => {
              await Promise.all([fetchMembers(), fetchCohort()]);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CohortDetail;
