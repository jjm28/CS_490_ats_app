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
// inside CohortDetail.tsx, in members header
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
    // refresh members + cohort summary
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
        { credentials: "include" ,         headers: {
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
        { method: "POST", credentials: "include",         headers: {
          "Content-Type": "application/json",
          ...(userId
            ? {
                "x-user-id": userId,
                "x-user-role": role || "",
                "x-org-id": organizationId || "",
              }
            : {}),
        }, }
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
    return <p>Loading cohort...</p>;
  }

  return (
    <div className="cohort-detail-page">
      <div className="cohort-summary-card">
        <div className="left">
          <h1>{cohort.name}</h1>
          {cohort.description && <p>{cohort.description}</p>}
          {cohort.tags && cohort.tags.length > 0 && (
            <div className="tags">
              {cohort.tags.map((t) => (
                <span key={t} className="tag-pill">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="right">
          <span className={`status-pill status-${cohort.status}`}>
            {cohort.status}
          </span>
          <p>{cohort.memberCount} members</p>
          <button onClick={handleArchive} disabled={cohort.status === "archived"}>
            Archive
          </button>
        </div>
      </div>
<Button
  type="button"
  onClick={() => {
    const input = document.getElementById("handshake-cohort-file") as HTMLInputElement | null;
    input?.click();
  }}
>
  Import from Handshake
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
      // auto-trigger import or show a small modal; here we just auto-run:
      const fakeEvent = { preventDefault() {} } as React.FormEvent;
      void handleImportToCohort(fakeEvent);
    }
  }}
/>
      <div className="members-section">
        <div className="members-header-row">
          <h2>Members</h2>
          <div className="members-actions">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Members
            </button>
            <button
              type="button"
              disabled={!selectedIds.length || isRemoving}
              onClick={handleRemoveSelected}
            >
              {isRemoving ? "Removing..." : "Remove Selected"}
            </button>
          </div>
        </div>

        <div className="members-filters">
          <input
            type="text"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>

        {membersLoading && <p>Loading members...</p>}

        {!membersLoading && members && members.items.length === 0 && (
          <div className="empty-state">
            <p>No members in this cohort yet.</p>
            <p>Use “Add Members” to add job seekers.</p>
          </div>
        )}

        {!membersLoading && members && members.items.length > 0 && (
          <>
            <table className="members-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={
                        members.items.length > 0 &&
                        selectedIds.length === members.items.length
                      }
                    />
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Headline</th>
                  <th>Joined</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {members.items.map((m) => {
                  const isSelected = selectedIds.includes(m.jobSeekerUserId);
                  return (
                    <tr key={m._id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(m.jobSeekerUserId)}
                        />
                      </td>
                      <td>{m.profile.fullName || "(No name)"}</td>
                      <td>{m.user.email}</td>
                      <td>{m.profile.headline}</td>
                      <td>
                        {m.joinedAt
                          ? new Date(m.joinedAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td>{m.source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
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
  );
};

export default CohortDetail;
