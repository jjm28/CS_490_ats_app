// src/components/Reports/CustomReportPage.tsx
import React, { useState, useEffect } from "react";
import Button from "../StyledComponents/Button";
import { fetchJobFilters, generateCustomReport } from "../../api/customReports";

export default function CustomReportPage() {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    industries: [] as string[],
    roles: [] as string[],
    companies: [] as string[],
    metrics: [] as string[],
  });

  const [format, setFormat] = useState("json");
  const [output, setOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [industries, setIndustries] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);

  // ✅ Fetch dropdown filter data
  useEffect(() => {
    async function loadFilters() {
      try {
        const data = await fetchJobFilters();
        setIndustries(data.industries || []);
        setRoles(data.roles || []);
        setCompanies(data.companies || []);
        setOutput((prev: any) => ({ ...prev, jobStats: data.stats }));
      } catch (err) {
        console.error("Failed to load job filters:", err);
      }
    }
    loadFilters();
  }, []);

  // ✅ Handle file + JSON report generation
  async function handleGenerateReport() {
    setLoading(true);
    try {
      const data = await generateCustomReport(filters, { format });

      if (format === "pdf" || format === "excel") {
        const blob = new Blob([data]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `custom-report.${format === "pdf" ? "pdf" : "xlsx"}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      setOutput(data);
    } catch (err) {
      console.error("Failed to generate report", err);
      alert("Error generating report");
    } finally {
      setLoading(false);
    }
  }

  function addFilterValue(
    key: "industries" | "roles" | "companies" | "metrics",
    value: string
  ) {
    setFilters((prev) => ({
      ...prev,
      [key]: Array.from(new Set([...(prev[key] || []), value])),
    }));
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Custom Job Search Report Builder</h1>

      {/* Date Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">Start Date</label>
          <input
            type="date"
            className="border rounded w-full p-2"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">End Date</label>
          <input
            type="date"
            className="border rounded w-full p-2"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
        </div>
      </div>

      {/* Dropdown Filters */}
      {[
        { label: "Industry", key: "industries", values: industries },
        { label: "Role", key: "roles", values: roles },
        { label: "Company", key: "companies", values: companies },
      ].map(({ label, key, values }) => (
        <div key={key} className="mb-4">
          <label className="block text-sm font-medium mb-1">{label}</label>
          <select
            className="border rounded w-full p-2"
            value={filters[key as keyof typeof filters][0] || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                [key]: e.target.value ? [e.target.value] : [],
              })
            }
          >
            <option value="">All {label}s</option>
            {values.map((val) => (
              <option key={val} value={val}>
                {val}
              </option>
            ))}
          </select>
        </div>
      ))}

      {/* Metrics */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Metrics</label>
        <input
          type="text"
          placeholder="Comma separated metrics"
          className="border rounded w-full p-2"
          onChange={(e) =>
            setFilters({
              ...filters,
              metrics: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>

      {/* Format Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium">Output Format</label>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="border rounded w-full p-2"
        >
          <option value="json">JSON (Preview)</option>
          <option value="pdf">PDF</option>
          <option value="excel">Excel</option>
        </select>
      </div>

      <Button onClick={handleGenerateReport} disabled={loading}>
        {loading ? "Generating..." : "Generate Report"}
      </Button>

      {/* Display Results */}
      {output?.jobStats && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-2">Your Job Success Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 border rounded bg-gray-50">
              <strong>Total Applications:</strong> {output.jobStats.totalApplications}
            </div>
            <div className="p-3 border rounded bg-gray-50">
              <strong>Total Interviews:</strong> {output.jobStats.totalInterviews}
            </div>
            <div className="p-3 border rounded bg-gray-50">
              <strong>Total Offers:</strong> {output.jobStats.totalOffers}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
