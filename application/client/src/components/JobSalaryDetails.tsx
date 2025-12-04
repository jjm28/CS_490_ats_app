import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const backTarget = location.state?.from || "/Jobs";

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

        if (!res.ok) throw new Error("Failed to load job salary details");

        const data: JobWithSalaryExtras = await res.json();
        setJob(data);

        setForm({
          salaryMin: extractDecimal(data.salaryMin),
          salaryMax: extractDecimal(data.salaryMax),
          salaryBonus: data.salaryBonus != null ? String(data.salaryBonus) : "",
          salaryEquity: data.salaryEquity != null ? String(data.salaryEquity) : "",
          benefitsValue: data.benefitsValue != null ? String(data.benefitsValue) : "",
          offerStage: data.offerStage || "Applied",
          offerDate: data.offerDate
            ? new Date(data.offerDate).toISOString().slice(0, 10)
            : "",
          negotiationOutcome: data.negotiationOutcome || "Not attempted",
          salaryNotes: data.salaryNotes || "",
          finalSalary:
            data.finalSalary != null ? String(data.finalSalary) : "",
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

  // 🚨 IS FIRST ENTRY?
  const isFirstEntry =
    !job || !job.salaryHistory || job.salaryHistory.length === 0;

  // 🚨 LOST OFFER LOGIC
  const isLostOffer = form.negotiationOutcome === "Lost offer";

  // ===========================
  // HANDLE CHANGE
  // ===========================
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    // If Lost Offer selected → zero everything + disable
    if (name === "negotiationOutcome" && value === "Lost offer") {
      setForm(prev => ({
        ...prev,
        negotiationOutcome: value,
        finalSalary: "0",
        salaryBonus: "0",
        salaryEquity: "0",
        benefitsValue: "0",
      }));
      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));
  };

  // ===========================
  // HANDLE SUBMIT
  // ===========================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return setError("Job data is missing.");

    try {
      setSaving(true);
      setError(null);

      const newSalary = Number(form.finalSalary);
      const lastEntry =
        job.salaryHistory?.[job.salaryHistory.length - 1] ?? null;
      const lastSalary = lastEntry?.finalSalary ?? null;
      const outcome = form.negotiationOutcome;

      //
      // 🟢 VALIDATION — SKIP ALL RULES IF LOST OFFER
      //
      if (!isLostOffer) {
        if (!newSalary || Number.isNaN(newSalary)) {
          setSaving(false);
          setError("Please enter a valid salary amount.");
          return;
        }

        if (!isFirstEntry && lastSalary != null) {
          if (outcome === "Improved" && newSalary <= lastSalary) {
            setSaving(false);
            setError("Improved outcome requires a higher salary than before.");
            return;
          }
          if (outcome === "Worse" && newSalary >= lastSalary) {
            setSaving(false);
            setError("Worse outcome requires a lower salary than before.");
            return;
          }
        }
      }

      // LOST OFFER salary must be exactly zero
      if (outcome === "Lost offer" && newSalary !== 0) {
        setSaving(false);
        setError("Lost offer should always have salary = 0.");
        return;
      }

      //
      // BUILD PAYLOAD
      //
      const payload: Record<string, any> = {
        salaryMin: Number(form.salaryMin),
        salaryMax: Number(form.salaryMax),
        offerStage: form.offerStage,
        offerDate: form.offerDate,
        salaryNotes: form.salaryNotes,
        negotiationOutcome: outcome,
      };

      if (isLostOffer) {
        payload.finalSalary = 0;
        payload.salaryBonus = 0;
        payload.salaryEquity = 0;
        payload.benefitsValue = 0;
      } else {
        payload.finalSalary = Number(form.finalSalary);
        payload.salaryBonus = Number(form.salaryBonus);
        payload.salaryEquity = Number(form.salaryEquity);
        payload.benefitsValue = Number(form.benefitsValue);
      }

      if (isFirstEntry && !payload.finalSalary && !isLostOffer) {
        setSaving(false);
        setError("Please enter your initial agreed salary.");
        return;
      }

      const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save salary details");

      navigate(backTarget);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to save salary details");
    } finally {
      setSaving(false);
    }
  };

  //
  // UI BLOCKS
  //
  if (loading) return <p className="p-6">Loading salary details…</p>;
  if (!job) return <p className="p-6 text-red-600">Job not found.</p>;

  // Prevent access unless status = offer
  if (job.status !== "offer") {
    return (
      <div className="p-6 text-red-600">
        Salary details can only be added for jobs in the <b>Offer</b> stage.
        <br />
        Move this job to the Offer column to continue.
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
          {/* Base salary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Base Salary Min</label>
              <input
                type="number"
                name="salaryMin"
                value={form.salaryMin}
                onChange={handleChange}
                className="form-input"
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
              />
            </div>

            <div>
              <label className="form-label">Final Salary</label>
              <input
                type="number"
                name="finalSalary"
                value={form.finalSalary}
                onChange={handleChange}
                disabled={isLostOffer}
                className={`form-input ${
                  isLostOffer ? "bg-gray-200 cursor-not-allowed" : ""
                }`}
                min={isLostOffer ? 0 : form.salaryMin}
                max={isLostOffer ? undefined : form.salaryMax}
              />
            </div>
          </div>

          {/* Extra comp */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Annual Bonus</label>
              <input
                type="number"
                name="salaryBonus"
                value={form.salaryBonus}
                onChange={handleChange}
                disabled={isLostOffer}
                className={`form-input ${
                  isLostOffer ? "bg-gray-200 cursor-not-allowed" : ""
                }`}
              />
            </div>

            <div>
              <label className="form-label">Equity / yr</label>
              <input
                type="number"
                name="salaryEquity"
                value={form.salaryEquity}
                onChange={handleChange}
                disabled={isLostOffer}
                className={`form-input ${
                  isLostOffer ? "bg-gray-200 cursor-not-allowed" : ""
                }`}
              />
            </div>

            <div>
              <label className="form-label">Benefits / yr</label>
              <input
                type="number"
                name="benefitsValue"
                value={form.benefitsValue}
                onChange={handleChange}
                disabled={isLostOffer}
                className={`form-input ${
                  isLostOffer ? "bg-gray-200 cursor-not-allowed" : ""
                }`}
              />
            </div>
          </div>

          {/* Offer metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                disabled={isFirstEntry}
              >
                <option value="Not attempted">Not attempted</option>
                <option value="Improved">Improved</option>
                <option value="Worse">Worse</option>
                <option value="No change">No change</option>
                <option value="Lost offer">Lost offer</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="form-label">Salary Notes</label>
            <textarea
              name="salaryNotes"
              value={form.salaryNotes}
              onChange={handleChange}
              rows={4}
              className="form-input"
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