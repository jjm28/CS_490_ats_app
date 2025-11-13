// components/Jobs/JobUrlImporter.tsx
import React, { useState } from "react";
import Button from "../StyledComponents/Button";
import API_BASE from "../../utils/apiBase";

// Configuration
const JOBS_ENDPOINT = `${API_BASE}/api/jobs`;

interface ImportStatus {
  status: 'idle' | 'loading' | 'success' | 'partial' | 'failed';
  message?: string;
  jobBoard?: string;
  extractedFields?: {
    jobTitle: boolean;
    company: boolean;
    location: boolean;
    description: boolean;
  };
}

interface JobUrlImporterProps {
  onImportSuccess: (data: any) => void;
  onImportError: (error: string) => void;
}

const JobUrlImporter: React.FC<JobUrlImporterProps> = ({ 
  onImportSuccess, 
  onImportError 
}) => {
  const [url, setUrl] = useState("");
  const [importStatus, setImportStatus] = useState<ImportStatus>({ status: 'idle' });

  const handleImport = async () => {
    if (!url.trim()) {
      onImportError("Please enter a job posting URL");
      return;
    }

    setImportStatus({ status: 'loading' });

    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token") || "";
      
      const response = await fetch(`${JOBS_ENDPOINT}/import-from-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setImportStatus({
          status: 'failed',
          message: result.error || "Failed to import job data",
          jobBoard: result.jobBoard
        });
        onImportError(result.error || "Failed to import job data");
        return;
      }

      setImportStatus({
        status: result.status,
        message: result.message,
        jobBoard: result.jobBoard,
        extractedFields: result.extractedFields
      });

      // Pass the imported data to parent
      onImportSuccess(result.data);

      // Clear the URL field on success
      setUrl("");

    } catch (error: any) {
      console.error("Error importing job:", error);
      setImportStatus({
        status: 'failed',
        message: "Network error - please try again"
      });
      onImportError(error?.message || "Failed to import job data");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleImport();
    }
  };

  const getStatusIcon = () => {
    switch (importStatus.status) {
      case 'loading':
        return '⏳';
      case 'success':
        return '✅';
      case 'partial':
        return '⚠️';
      case 'failed':
        return '❌';
      default:
        return '🔗';
    }
  };

  const getStatusMessage = () => {
    if (importStatus.status === 'idle') {
      return (
        <p className="text-xs text-gray-500 mt-1">
          Paste a job URL from LinkedIn, Indeed, or Glassdoor to auto-fill the form
        </p>
      );
    }

    if (importStatus.status === 'loading') {
      return (
        <p className="text-xs text-blue-600 mt-1">
          🔍 Fetching job details...
        </p>
      );
    }

    if (importStatus.status === 'success') {
      return (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
          <p className="text-green-800 font-medium">
            ✅ {importStatus.message}
          </p>
          {importStatus.jobBoard && importStatus.jobBoard !== 'unknown' && (
            <p className="text-green-600 mt-1">
              Detected: {importStatus.jobBoard.charAt(0).toUpperCase() + importStatus.jobBoard.slice(1)}
            </p>
          )}
        </div>
      );
    }

    if (importStatus.status === 'partial') {
      return (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <p className="text-yellow-800 font-medium">
            ⚠️ {importStatus.message}
          </p>
          {importStatus.extractedFields && (
            <div className="mt-1 text-yellow-700">
              <p>Extracted fields:</p>
              <ul className="ml-4 mt-1 space-y-0.5">
                {importStatus.extractedFields.jobTitle && <li>✓ Job Title</li>}
                {importStatus.extractedFields.company && <li>✓ Company</li>}
                {importStatus.extractedFields.location && <li>✓ Location</li>}
                {importStatus.extractedFields.description && <li>✓ Description</li>}
              </ul>
              <p className="mt-1">Please fill in the missing required fields.</p>
            </div>
          )}
        </div>
      );
    }

    if (importStatus.status === 'failed') {
      return (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
          <p className="text-red-800 font-medium">
            ❌ {importStatus.message}
          </p>
          {importStatus.jobBoard === 'unknown' && (
            <p className="text-red-600 mt-1">
              This job board is not yet supported. Try LinkedIn, Indeed, or Glassdoor, or enter the details manually.
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <label className="form-label flex items-center gap-2">
        <span>{getStatusIcon()}</span>
        <span>Import from Job Posting URL</span>
      </label>
      
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          className="form-input flex-1"
          placeholder="https://www.linkedin.com/jobs/view/..."
          disabled={importStatus.status === 'loading'}
        />
        <Button
          type="button"
          onClick={handleImport}
          disabled={!url.trim() || importStatus.status === 'loading'}
          className="whitespace-nowrap"
        >
          {importStatus.status === 'loading' ? 'Importing...' : 'Import'}
        </Button>
      </div>

      {getStatusMessage()}
    </div>
  );
};

export default JobUrlImporter;