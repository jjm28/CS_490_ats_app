import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../../utils/apiBase";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import "../../styles/StyledComponents/FormInput.css";
import type { Job } from "../../types/jobs.types";

interface JobFormProps {
  mode: "create" | "edit";
  token: string;
  onClose: () => void;
  onSaved: (saved: Job) => void;
  initial?: Partial<Job>; // when editing
}

const JOBS_ENDPOINT = `${API_BASE}/api/jobs`;

const INDUSTRY_OPTIONS = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Retail",
  "Manufacturing",
  "Consulting",
  "Marketing",
  "Engineering",
  "Design",
  "Sales",
  "Other",
];

const TYPE_OPTIONS = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Freelance",
];

type Errors = Record<string, string>;

export default function JobForm({
  mode,
  token,
  onClose,
  onSaved,
  initial,
}: JobFormProps) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    jobTitle: "",
    company: "",
    industry: "",
    type: "",
    otherIndustry: "",
    otherType: "",
    location: "",
    salaryMin: "",
    salaryMax: "",
    jobPostingUrl: "",
    applicationDeadline: "",
    description: "",
    autoArchiveDays: "60",
  });

  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  // Seed when editing
  useEffect(() => {
    if (!initial) return;

    setForm((prev) => ({
      ...prev,
      jobTitle: initial.jobTitle ?? "",
      company: (initial as any).company ?? "",
      industry: (initial as any).industry ?? "",
      type: (initial as any).type ?? "",
      location: (initial as any).location ?? "",
      salaryMin:
        (initial as any).salaryMin != null
          ? String((initial as any).salaryMin.$numberDecimal ?? (initial as any).salaryMin)
          : "",
      salaryMax:
        (initial as any).salaryMax != null
          ? String((initial as any).salaryMax.$numberDecimal ?? (initial as any).salaryMax)
          : "",
      jobPostingUrl: (initial as any).jobPostingUrl ?? "",
      applicationDeadline: (initial as any).applicationDeadline
        ? new Date((initial as any).applicationDeadline).toISOString().split("T")[0]
        : "",
      description: (initial as any).description ?? "",
      autoArchiveDays:
        (initial as any).autoArchiveDays != null
          ? String((initial as any).autoArchiveDays)
          : "60",
      otherIndustry: "",
      otherType: "",
    }));
  }, [initial]);

  const resolvedIndustry =
    form.industry === "Other" ? form.otherIndustry : form.industry;
  const resolvedType = form.type === "Other" ? form.otherType : form.type;

  const setField = (
    name:
      | "jobTitle"
      | "company"
      | "industry"
      | "type"
      | "otherIndustry"
      | "otherType"
      | "location"
      | "salaryMin"
      | "salaryMax"
      | "jobPostingUrl"
      | "applicationDeadline"
      | "description"
      | "autoArchiveDays",
    value: string
  ) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => {
      const copy = { ...e };
      delete copy[name];
      return copy;
    });
  };

  const validate = (): boolean => {
    const e: Errors = {};

    if (!form.jobTitle.trim()) e.jobTitle = "Position is required";
    if (!form.company.trim()) e.company = "Company name is required";

    const ind = resolvedIndustry?.trim();
    if (!ind) e.industry = "Industry is required";

    const t = resolvedType?.trim();
    if (!t) e.type = "Job type is required";

    if (form.salaryMin) {
      const n = Number(form.salaryMin);
      if (isNaN(n) || n < 0) e.salaryMin = "Salary min must be a positive number";
    }
    if (form.salaryMax) {
      const n = Number(form.salaryMax);
      if (isNaN(n) || n < 0) e.salaryMax = "Salary max must be a positive number";
    }
    if (form.salaryMin && form.salaryMax) {
      if (Number(form.salaryMin) > Number(form.salaryMax)) {
        e.salaryMin = "Salary min cannot exceed salary max";
      }
    }

    if (form.jobPostingUrl) {
      const ok = /^https?:\/\/.+/.test(form.jobPostingUrl);
      if (!ok) e.jobPostingUrl = "Enter a valid URL (https://...)";
    }

    if (form.autoArchiveDays) {
      const n = Number(form.autoArchiveDays);
      if (isNaN(n) || n < 1) e.autoArchiveDays = "Enter a positive number";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const payload = useMemo(() => {
    const base: any = {
      jobTitle: form.jobTitle.trim(),
      company: form.company.trim(),
      industry: resolvedIndustry?.trim() ?? "",
      type: resolvedType?.trim() ?? "",
      location: form.location.trim() || "",
      description: form.description.trim() || "",
      jobPostingUrl: form.jobPostingUrl.trim() || "",
      autoArchiveDays: form.autoArchiveDays ? Number(form.autoArchiveDays) : 60,
    };
    if (form.salaryMin) base.salaryMin = Number(form.salaryMin);
    if (form.salaryMax) base.salaryMax = Number(form.salaryMax);
    if (form.applicationDeadline) {
      // Send as ISO date
      const d = new Date(form.applicationDeadline);
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      base.applicationDeadline = d.toISOString();
    }
    return base;
  }, [form, resolvedIndustry, resolvedType]);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const url = isEdit && (initial as any)?._id
        ? `${JOBS_ENDPOINT}/${(initial as any)._id}`
        : JOBS_ENDPOINT;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const fieldErrs =
          data?.error?.fields || data?.fields || (data?.message ? { form: data.message } : {});
        setErrors(fieldErrs || {});
        return;
      }
      onSaved(data as Job);
    } catch (err) {
      setErrors({ form: "Failed to save. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? "Edit Job Opportunity" : "Add Job Opportunity"}
          </h2>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-5">
          {errors.form && (
            <p className="text-red-600 text-sm -mb-2">{errors.form}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Position */}
            <div>
              <label className="form-label">Position *</label>
              <input
                className={`form-input ${errors.jobTitle ? "!border-red-500" : ""}`}
                value={form.jobTitle}
                onChange={(e) => setField("jobTitle", e.target.value)}
                placeholder="e.g. Software Engineer"
              />
              {errors.jobTitle && (
                <p className="text-xs text-red-600 mt-1">{errors.jobTitle}</p>
              )}
            </div>

            {/* Company */}
            <div>
              <label className="form-label">Company *</label>
              <input
                className={`form-input ${errors.company ? "!border-red-500" : ""}`}
                value={form.company}
                onChange={(e) => setField("company", e.target.value)}
                placeholder="e.g. Google"
              />
              {errors.company && (
                <p className="text-xs text-red-600 mt-1">{errors.company}</p>
              )}
            </div>

            {/* Industry */}
            <div>
              <label className="form-label">Industry *</label>
              <select
                className={`form-input ${errors.industry ? "!border-red-500" : ""}`}
                value={form.industry}
                onChange={(e) => setField("industry", e.target.value)}
              >
                <option value="">Select industry</option>
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {form.industry === "Other" && (
                <input
                  className="form-input mt-2"
                  value={form.otherIndustry}
                  onChange={(e) => setField("otherIndustry", e.target.value)}
                  placeholder="Enter industry"
                />
              )}
              {errors.industry && (
                <p className="text-xs text-red-600 mt-1">{errors.industry}</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="form-label">Job Type *</label>
              <select
                className={`form-input ${errors.type ? "!border-red-500" : ""}`}
                value={form.type}
                onChange={(e) => setField("type", e.target.value)}
              >
                <option value="">Select job type</option>
                {TYPE_OPTIONS.concat("Other").map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {form.type === "Other" && (
                <input
                  className="form-input mt-2"
                  value={form.otherType}
                  onChange={(e) => setField("otherType", e.target.value)}
                  placeholder="Enter job type"
                />
              )}
              {errors.type && (
                <p className="text-xs text-red-600 mt-1">{errors.type}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="form-label">Location</label>
              <input
                className="form-input"
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="Remote or City, ST"
              />
            </div>

            {/* Job Posting URL */}
            <div>
              <label className="form-label">Job Posting URL</label>
              <input
                className={`form-input ${errors.jobPostingUrl ? "!border-red-500" : ""}`}
                value={form.jobPostingUrl}
                onChange={(e) => setField("jobPostingUrl", e.target.value)}
                placeholder="https://company.com/jobs/..."
              />
              {errors.jobPostingUrl && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.jobPostingUrl}
                </p>
              )}
            </div>

            {/* Salary Min */}
            <div>
              <label className="form-label">Salary Min</label>
              <input
                className={`form-input ${errors.salaryMin ? "!border-red-500" : ""}`}
                value={form.salaryMin}
                onChange={(e) => setField("salaryMin", e.target.value)}
                placeholder="80000"
                inputMode="numeric"
              />
              {errors.salaryMin && (
                <p className="text-xs text-red-600 mt-1">{errors.salaryMin}</p>
              )}
            </div>

            {/* Salary Max */}
            <div>
              <label className="form-label">Salary Max</label>
              <input
                className={`form-input ${errors.salaryMax ? "!border-red-500" : ""}`}
                value={form.salaryMax}
                onChange={(e) => setField("salaryMax", e.target.value)}
                placeholder="120000"
                inputMode="numeric"
              />
              {errors.salaryMax && (
                <p className="text-xs text-red-600 mt-1">{errors.salaryMax}</p>
              )}
            </div>

            {/* Deadline (optional) */}
            <div>
              <label className="form-label">Application Deadline (optional)</label>
              <input
                type="date"
                className="form-input"
                value={form.applicationDeadline}
                onChange={(e) => setField("applicationDeadline", e.target.value)}
              />
            </div>

            {/* Auto-archive days */}
            <div>
              <label className="form-label">Auto-archive after (days)</label>
              <input
                className={`form-input ${errors.autoArchiveDays ? "!border-red-500" : ""}`}
                value={form.autoArchiveDays}
                onChange={(e) => setField("autoArchiveDays", e.target.value)}
                placeholder="60"
                inputMode="numeric"
              />
              {errors.autoArchiveDays && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.autoArchiveDays}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Description / Notes</label>
            <textarea
              className="form-input"
              rows={4}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Notes, requirements, contacts, etc."
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {isEdit ? "Save changes" : "Add job"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}