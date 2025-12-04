// src/components/Enterprise/HandshakeIntegrationCard.tsx
import React, { useState } from "react";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";

export default function HandshakeIntegrationCard() {
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleImportStudents(e: React.FormEvent) {
    e.preventDefault();
    if (!studentFile) return;

    try {
      setLoading(true);
      setResultMessage(null);

      const formData = new FormData();
      formData.append("file", studentFile);

      const res = await fetch(
        `${API_BASE}/api/integrations/handshake/import-students`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to import students");
      }

      const json = await res.json();
      setResultMessage(
        `Students import: ${json.createdCount} created, ${json.updatedCount} updated, ${json.skippedCount} skipped (total rows: ${json.totalRows}).`
      );
    } catch (err: any) {
      console.error(err);
      setResultMessage(err.message || "Error importing students");
    } finally {
      setLoading(false);
    }
  }

  async function handleImportJobs(e: React.FormEvent) {
    e.preventDefault();
    if (!jobFile) return;

    try {
      setLoading(true);
      setResultMessage(null);

      const formData = new FormData();
      formData.append("file", jobFile);

      const res = await fetch(
        `${API_BASE}/api/integrations/handshake/import-jobs`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to import jobs");
      }

      const json = await res.json();
      setResultMessage(
        `Jobs import: ${json.createdCount} created, ${json.skippedCount} skipped (total rows: ${json.totalRows}).`
      );
    } catch (err: any) {
      console.error(err);
      setResultMessage(err.message || "Error importing jobs");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-6">
      <h2 className="text-xl font-semibold">Handshake Integration</h2>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium mb-1">Import students from Handshake</h3>
          <p className="text-sm text-gray-600 mb-2">
            Upload your <strong>Students CSV</strong> (Handshake-style) to create or
            update job seeker accounts under this organization.
          </p>
          <form onSubmit={handleImportStudents} className="flex flex-col gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={(e) =>
                setStudentFile(e.target.files ? e.target.files[0] : null)
              }
            />
            <Button type="submit" disabled={!studentFile || loading}>
              {loading ? "Importing..." : "Import Students"}
            </Button>
          </form>
        </div>

        <hr />

        <div>
          <h3 className="font-medium mb-1">Import jobs from Handshake</h3>
          <p className="text-sm text-gray-600 mb-2">
            Upload a jobs CSV with columns like{" "}
            <code>job_title, employer, location, url</code> to create job
            records tagged with source{" "}
            <code>Handshake</code>.
          </p>
          <form onSubmit={handleImportJobs} className="flex flex-col gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={(e) =>
                setJobFile(e.target.files ? e.target.files[0] : null)
              }
            />
            <Button type="submit" disabled={!jobFile || loading}>
              {loading ? "Importing..." : "Import Jobs"}
            </Button>
          </form>
        </div>
      </div>

      {resultMessage && (
        <p className="text-sm text-gray-800 mt-4">{resultMessage}</p>
      )}
    </Card>
  );
}
