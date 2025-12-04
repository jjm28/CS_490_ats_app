import React, { useState } from "react";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";

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

const BulkOnboardingPage: React.FC = () => {
  const { userId, role, organizationId } = getAuthMeta();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCohortId, setInviteCohortId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [csvCohortId, setCsvCohortId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setInviting(true);
      setInviteMessage(null);

      const res = await fetch(
        `${API_BASE}/api/enterprise/onboarding/invite`,
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
            email: inviteEmail.trim(),
            cohortId: inviteCohortId || undefined,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to send invite");
      }

      setInviteMessage("Invite sent successfully.");
      setInviteEmail("");
      setInviteCohortId("");
    } catch (err: any) {
      console.error(err);
      setInviteMessage(err.message || "Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function importCsv(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    try {
      setImporting(true);
      setImportResult(null);

      const formData = new FormData();
      formData.append("file", file);
      if (csvCohortId) {
        formData.append("cohortId", csvCohortId);
      }
console.log(file)
      const res = await fetch(
        `${API_BASE}/api/enterprise/onboarding/import`,
        {
          method: "POST",
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
          body: formData,
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to import CSV");
      }

      const json = await res.json();
      setImportResult(json);
      setFile(null);
      setCsvCohortId("");
    } catch (err: any) {
      console.error(err);
      setImportResult({ error: err.message || "Failed to import CSV" });
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const header = "firstName,lastName,email,gradYear,program,tags\n";
    const blob = new Blob([header], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jobseekers_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        Bulk Onboarding
      </h1>

      {/* Single invite */}
      <Card className="p-4 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Invite a single job seeker
        </h2>
        <p className="text-sm text-slate-600">
          Send an email invite that will onboard the job seeker directly into this organization
          (and optionally a cohort).
        </p>
        <form onSubmit={sendInvite} className="space-y-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-700">Email</label>
            <input
              type="email"
              className="border rounded px-3 py-2 text-sm"
              placeholder="jobseeker@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-700">
              Cohort ID (optional)
            </label>
            <input
              type="text"
              className="border rounded px-3 py-2 text-sm"
              placeholder="e.g. 6758fd..."
              value={inviteCohortId}
              onChange={(e) => setInviteCohortId(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={inviting}>
              {inviting ? "Sending..." : "Send invite"}
            </Button>
            {inviteMessage && (
              <span className="text-sm text-slate-600">{inviteMessage}</span>
            )}
          </div>
        </form>
      </Card>

      {/* CSV import */}
      <Card className="p-4 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Import multiple job seekers (CSV)
        </h2>
        <p className="text-sm text-slate-600">
          Upload a CSV with columns: firstName, lastName, email, gradYear, program, tags.
          You can optionally add all imported users to a specific cohort.
        </p>
        <div>
          <Button type="button" variant="secondary" onClick={downloadTemplate}>
            Download CSV template
          </Button>
        </div>
        <form onSubmit={importCsv} className="space-y-3 mt-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-700">CSV file</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-700">
              Cohort ID (optional)
            </label>
            <input
              type="text"
              className="border rounded px-3 py-2 text-sm"
              placeholder="e.g. 6758fd..."
              value={csvCohortId}
              onChange={(e) => setCsvCohortId(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={importing || !file}>
            {importing ? "Importing..." : "Import CSV"}
          </Button>
        </form>

        {importResult && (
          <div className="mt-3 text-sm text-slate-700 space-y-1">
            {"error" in importResult && (
              <p className="text-red-600">{importResult.error}</p>
            )}
            {"created" in importResult && (
              <>
                <p>Created: {importResult.created}</p>
                <p>Updated: {importResult.updated}</p>
                <p>Reactivated: {importResult.reactivated}</p>
                <p>Added to cohort: {importResult.addedToCohort}</p>
                {Array.isArray(importResult.errors) &&
                  importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Row errors:</p>
                      <ul className="list-disc ml-5">
                        {importResult.errors.map(
                          (err: any, idx: number) => (
                            <li key={idx}>
                              Row {err.row}: {err.error}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default BulkOnboardingPage;
