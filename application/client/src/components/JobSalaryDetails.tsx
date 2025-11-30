import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API_BASE from "../utils/apiBase";
import Card from "./StyledComponents/Card";
import Button from "./StyledComponents/Button";
import {
  type Job,
  extractDecimal,
  formatSalary,
} from "../types/jobs.types";

type JobWithSalaryExtras = Job & {
  salaryBonus?: number;
  salaryEquity?: number;
  benefitsValue?: number;
  offerStage?: string;
  negotiationOutcome?: string;
  offerDate?: string;
  salaryNotes?: string;
  finalSalary?: number;
  salaryHistory?: {
    finalSalary: number;
    negotiationOutcome: string;
    date: string;
  }[];
};

interface SalaryFormState {
  salaryMin: string;
  salaryMax: string;
  salaryBonus: string;
  salaryEquity: string;
  benefitsValue: string;
  offerStage: string;
  offerDate: string;
  negotiationOutcome: string;
  salaryNotes: string;
  finalSalary: string;
}

export default function JobSalaryDetails() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  // ALWAYS go back to the main Jobs dashboard
  const backTarget = "/Jobs";

  const [job, setJob] = useState<JobWithSalaryExtras | null>(null);
  const [form, setForm] = useState<SalaryFormState>({
    salaryMin: "",
    salaryMax: "",
    salaryBonus: "",
    salaryEquity: "",
    benefitsValue: "",
    offerStage: "Applied",
    offerDate: "",
    negotiationOutcome: "Not attempted",
    salaryNotes: "",
    finalSalary: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const token = useMemo(
    () =>
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      "",
    []
  );

  useEffect(() => {
    if (!jobId) return;

    async function loadJob() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load job salary details");
        }

        const data: JobWithSalaryExtras = await res.json();
        setJob(data);

        setForm({
          salaryMin: extractDecimal(data.salaryMin),
          salaryMax: extractDecimal(data.salaryMax),
          salaryBonus: data.salaryBonus != null ? String(data.salaryBonus) : "",
          salaryEquity: data.salaryEquity != null ? String(data.salaryEquity) : "",
          benefitsValue: data.benefitsValue != null ? String(data.benefitsValue) : "",
          offerStage: data.offerStage || "Applied",
          offerDate: data.offerDate ? new Date(data.offerDate).toISOString().slice(0, 10) : "",
          negotiationOutcome: data.negotiationOutcome || "Not attempted",
          salaryNotes: data.salaryNotes || "",
          finalSalary: data.finalSalary != null ? String(data.finalSalary) : "",   // ✅ NEW
        });
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Error loading salary details");
      } finally {
        setLoading(false);
      }
    }

    void loadJob();
  }, [jobId, token]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId) return;

    try {
      setSaving(true);
      setError(null);

      const payload: Record<string, any> = {};

      if (form.salaryMin) payload.salaryMin = Number(form.salaryMin);
      if (form.salaryMax) payload.salaryMax = Number(form.salaryMax);
      if (form.finalSalary) payload.finalSalary = Number(form.finalSalary);
      if (form.salaryBonus) payload.salaryBonus = Number(form.salaryBonus);
      if (form.salaryEquity) payload.salaryEquity = Number(form.salaryEquity);
      if (form.benefitsValue)
        payload.benefitsValue = Number(form.benefitsValue);
      if (form.offerStage) payload.offerStage = form.offerStage;
      if (form.offerDate) payload.offerDate = form.offerDate;
      if (isFirstEntry) {
        payload.negotiationOutcome = "Not attempted"; // enforce
      } else if (form.negotiationOutcome) {
        payload.negotiationOutcome = form.negotiationOutcome;
      }
      payload.salaryNotes = form.salaryNotes;

      const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save salary details");
      }

      const updated: JobWithSalaryExtras = await res.json();
      setJob(updated);
      navigate(backTarget);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to save salary details");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-6">Loading salary details…</p>;
  }

  if (!job) {
    return <p className="p-6 text-red-600">Job not found.</p>;
  }

  // 🚨 True if this is the first ever salary entry
  const isFirstEntry =
    !job.salaryHistory || job.salaryHistory.length === 0;

  // 🚨 Prevent access unless job is in Offer stage
  if (job.status !== "offer") {
    return (
      <div className="p-6 text-red-600">
        Salary details can only be added for jobs in the <b>Offer</b> stage. <br />
        Move this job to the Offer column in your Application Pipeline to continue.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex justify-between items-center">
        {flash && <span className="text-sm text-green-700">{flash}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <Card className="p-6">
        <h1 className="text-2xl font-semibold mb-4 text-center">
          Salary Details — {job.jobTitle}
        </h1>

        <p className="text-gray-700 mb-2">
          <b>Company:</b> {job.company}
        </p>
        <p className="text-gray-700 mb-6">
          <b>Current Stored Range:</b>{" "}
          {formatSalary(job.salaryMin, job.salaryMax) || "Not specified"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Base salary range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Base Salary Min</label>
              <input
                type="number"
                name="salaryMin"
                value={form.salaryMin}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g. 110000"
              />
            </div>
            <div>
              <label className="form-label">Base Salary Max</label>
              <input
                type="number"
                name="salaryMax"
                value={form.salaryMax}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g. 145000"
              />
            </div>
            <div>
              <label className="form-label">Final Salary (Agreed Salary)</label>
              <input
                type="number"
                name="finalSalary"
                value={form.finalSalary}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter final negotiated salary"
                min={form.salaryMin}
                max={form.salaryMax}
              />
            </div>
          </div>

          {/* Extra compensation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Annual Bonus (approx)</label>
              <input
                type="number"
                name="salaryBonus"
                value={form.salaryBonus}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g. 15000"
              />
            </div>
            <div>
              <label className="form-label">Equity Value / yr</label>
              <input
                type="number"
                name="salaryEquity"
                value={form.salaryEquity}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g. 20000"
              />
            </div>
            <div>
              <label className="form-label">Benefits Value / yr</label>
              <input
                type="number"
                name="benefitsValue"
                value={form.benefitsValue}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g. 8000"
              />
            </div>
          </div>

          {/* Offer & negotiation metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Offer Stage</label>
              <select
                name="offerStage"
                value={form.offerStage}
                onChange={handleChange}
                className="form-input"
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offer Received">Offer Received</option>
                <option value="Offer Accepted">Offer Accepted</option>
                <option value="Offer Declined">Offer Declined</option>
              </select>
            </div>
            <div>
              <label className="form-label">Offer Date</label>
              <input
                type="date"
                name="offerDate"
                value={form.offerDate}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Negotiation Outcome</label>
              <select
                name="negotiationOutcome"
                value={form.negotiationOutcome}
                onChange={handleChange}
                className="form-input"
                disabled={isFirstEntry} // 🔒 lock dropdown for first entry
              >
                <option value="Not attempted">Not attempted</option>
                <option value="Improved" disabled={isFirstEntry}>Improved</option>
                <option value="No change" disabled={isFirstEntry}>No change</option>
                <option value="Worse" disabled={isFirstEntry}>Worse</option>
                <option value="Lost offer" disabled={isFirstEntry}>Lost offer</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="form-label">Salary & Negotiation Notes</label>
            <textarea
              name="salaryNotes"
              value={form.salaryNotes}
              onChange={handleChange}
              rows={4}
              className="form-input"
              placeholder="Notes on recruiter call, benchmark links, negotiation strategy/results..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(backTarget)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Salary Details"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}