import React, { useEffect, useMemo, useState } from "react";

/** The minimal job draft we need to kick off AI generation */
export type JobDraft = {
  jobTitle: string;
  company: string;
  industry: string;        // required
  type: string;            // required
  location?: string;
  salaryMin?: number | "";
  salaryMax?: number | "";
  jobPostingUrl?: string;
  applicationDeadline?: string; // YYYY-MM-DD
  description?: string;
   _id: string;
  createdAt: string;
  updatedAt: string;
};

type ValidationErrors = Partial<Record<keyof JobDraft, string>>;

export default function MiniJobForm({
  open,
  onCancel,
  onSubmit,
  initial,
  autoFocus = true,
  title = "Enter job details",
}: {
  open: boolean;
  onCancel: () => void;
  onSubmit: (draft: JobDraft) => void;
  initial?: Partial<JobDraft>;
  autoFocus?: boolean;
  title?: string;
}) {
  const [form, setForm] = useState<JobDraft>({
    jobTitle: "",
    company: "",
    industry: "",
    type: "",
    location: "",
    salaryMin: "",
    salaryMax: "",
    jobPostingUrl: "",
    applicationDeadline: "",
    description: "",
    ...initial,
    _id: "Buogus",
  createdAt: "Buogus",
  updatedAt: "Buogus"
  });

  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm((prev) => ({ ...prev, ...(initial || {}) }));
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const validateField = (
    name: keyof JobDraft,
    value: string | number | undefined,
    otherSalary?: string | number | ""
  ) => {
    let error = "";

    switch (name) {
      case "jobTitle":
        if (!String(value || "").trim()) error = "Job title is required";
        else if (String(value).length > 150)
          error = "Job title must be 150 characters or less";
        break;

      case "company":
        if (!String(value || "").trim()) error = "Company is required";
        else if (String(value).length > 150)
          error = "Company must be 150 characters or less";
        break;

      case "industry":
        if (!value) error = "Industry is required";
        break;

      case "type":
        if (!value) error = "Job type is required";
        break;

      case "location":
        if (String(value || "").length > 150)
          error = "Location must be 150 characters or less";
        break;

      case "salaryMin": {
        const v = String(value || "");
        if (v && parseFloat(v) < 0) error = "Salary min must be positive";
        else if (v && otherSalary && parseFloat(v) > parseFloat(String(otherSalary)))
          error = "Salary min cannot exceed salary max";
        break;
      }

      case "salaryMax": {
        const v = String(value || "");
        if (v && parseFloat(v) < 0) error = "Salary max must be positive";
        else if (v && otherSalary && parseFloat(v) < parseFloat(String(otherSalary)))
          error = "Salary max cannot be less than salary min";
        break;
      }

      case "jobPostingUrl":
        if (value && !String(value).match(/^https?:\/\/.+/))
          error = "Enter a valid URL (e.g., https://example.com)";
        break;

      case "description":
        if (String(value || "").length > 2000)
          error = "Description must be 2000 characters or less";
        break;
    }

    return error;
  };

  const setField = (
    name: keyof JobDraft,
    value: string
  ) => {
    setForm((p) => ({ ...p, [name]: value }));

    // validate current
    const err = validateField(
      name,
      value,
      name === "salaryMin" ? form.salaryMax ?? "" : form.salaryMin ?? ""
    );

    setErrors((prev) => {
      const n = { ...prev };
      if (err) n[name] = err;
      else delete n[name];
      return n;
    });

    // cross-validate counterpart when salaries change
    if (name === "salaryMin" && (form.salaryMax ?? "") !== "") {
      const maxErr = validateField("salaryMax", form.salaryMax ?? "", value);
      setErrors((prev) => {
        const n = { ...prev };
        if (maxErr) n.salaryMax = maxErr;
        else delete n.salaryMax;
        return n;
      });
    }
    if (name === "salaryMax" && (form.salaryMin ?? "") !== "") {
      const minErr = validateField("salaryMin", form.salaryMin ?? "", value);
      setErrors((prev) => {
        const n = { ...prev };
        if (minErr) n.salaryMin = minErr;
        else delete n.salaryMin;
        return n;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // final validation pass
    const fields: (keyof JobDraft)[] = [
      "jobTitle",
      "company",
      "industry",
      "type",
      "location",
      "salaryMin",
      "salaryMax",
      "jobPostingUrl",
      "applicationDeadline",
      "description",
    ];

    const collected: ValidationErrors = {};
    fields.forEach((f) => {
      const err = validateField(
        f,
        form[f],
        f === "salaryMin" ? form.salaryMax : form.salaryMin
      );
      if (err) collected[f] = err;
    });

    // required only
    ["jobTitle", "company", "industry", "type"].forEach((f) => {
      const k = f as keyof JobDraft;
      if (!String(form[k] ?? "").trim()) collected[k] ??= "This field is required";
    });

    setErrors(collected);
    if (Object.keys(collected).length) return;

    // normalize salary fields to numbers if present
    const payload: JobDraft = {
      ...form,
      salaryMin:
        form.salaryMin === "" || form.salaryMin === undefined
          ? ""
          : Number(form.salaryMin),
      salaryMax:
        form.salaryMax === "" || form.salaryMax === undefined
          ? ""
          : Number(form.salaryMax),
    };

    onSubmit(payload);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end md:items-center md:justify-center"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative w-full md:w-[760px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl p-5 md:p-6 max-h-[88vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Job Title */}
            <div>
              <label className="form-label">Job Title *</label>
              <input
                autoFocus={autoFocus}
                type="text"
                name="jobTitle"
                value={form.jobTitle}
                onChange={(e) => setField("jobTitle", e.target.value)}
                className={`form-input ${errors.jobTitle ? "!border-red-500" : ""}`}
                placeholder="e.g. Software Engineer Intern"
              />
              {errors.jobTitle && (
                <p className="text-sm text-red-600 -mt-2 mb-2">{errors.jobTitle}</p>
              )}
            </div>

            {/* Company */}
            <div>
              <label className="form-label">Company *</label>
              <input
                type="text"
                name="company"
                value={form.company}
                onChange={(e) => setField("company", e.target.value)}
                className={`form-input ${errors.company ? "!border-red-500" : ""}`}
                placeholder="e.g. TechCorp"
              />
              {errors.company && (
                <p className="text-sm text-red-600 -mt-2 mb-2">{errors.company}</p>
              )}
            </div>

            {/* Industry */}
            <div>
              <label className="form-label">Industry *</label>
              <select
                name="industry"
                value={form.industry}
                onChange={(e) => setField("industry", e.target.value)}
                className={`form-input ${errors.industry ? "!border-red-500" : ""}`}
              >
                <option value="">Select industry</option>
                <option value="Technology">Technology</option>
                <option value="Finance">Finance</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Education">Education</option>
                <option value="Retail">Retail</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Consulting">Consulting</option>
                <option value="Marketing">Marketing</option>
                <option value="Engineering">Engineering</option>
                <option value="Design">Design</option>
                <option value="Sales">Sales</option>
                <option value="Other">Other</option>
              </select>
              {errors.industry && (
                <p className="text-sm text-red-600 -mt-2 mb-2">{errors.industry}</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="form-label">Job Type *</label>
              <select
                name="type"
                value={form.type}
                onChange={(e) => setField("type", e.target.value)}
                className={`form-input ${errors.type ? "!border-red-500" : ""}`}
              >
                <option value="">Select type</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Freelance">Freelance</option>
              </select>
              {errors.type && (
                <p className="text-sm text-red-600 -mt-2 mb-2">{errors.type}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="form-label">Location</label>
              <input
                type="text"
                name="location"
                value={form.location || ""}
                onChange={(e) => setField("location", e.target.value)}
                className="form-input"
                placeholder="e.g. Remote or San Francisco, CA"
              />
              {errors.location && (
                <p className="text-sm text-red-600 -mt-2 mb-2">{errors.location}</p>
              )}
            </div>

            {/* Salary Min */}
            <div>
              <label className="form-label">Salary Min</label>
              <input
                type="number"
                name="salaryMin"
                value={form.salaryMin ?? ""}
                onChange={(e) => setField("salaryMin", e.target.value)}
                className={`form-input ${errors.salaryMin ? "!border-red-500" : ""}`}
                placeholder="e.g. 100000"
              />
              {errors.salaryMin && (
                <p className="text-sm text-red-600 -mt-2 mb-2">{errors.salaryMin}</p>
              )}
            </div>

            {/* Salary Max */}
            <div>
              <label className="form-label">Salary Max</label>
              <input
                type="number"
                name="salaryMax"
                value={form.salaryMax ?? ""}
                onChange={(e) => setField("salaryMax", e.target.value)}
                className={`form-input ${errors.salaryMax ? "!border-red-500" : ""}`}
                placeholder="e.g. 150000"
              />
              {errors.salaryMax && (
                <p className="text-sm text-red-600 -mt-2 mb-2">{errors.salaryMax}</p>
              )}
            </div>

            {/* Job Posting URL */}
            <div className="md:col-span-2">
              <label className="form-label">Job Posting URL</label>
              <input
                type="url"
                name="jobPostingUrl"
                value={form.jobPostingUrl || ""}
                onChange={(e) => setField("jobPostingUrl", e.target.value)}
                className={`form-input ${errors.jobPostingUrl ? "!border-red-500" : ""}`}
                placeholder="https://example.com/job/123"
              />
              {errors.jobPostingUrl && (
                <p className="text-sm text-red-600 -mt-2 mb-2">{errors.jobPostingUrl}</p>
              )}
            </div>

            {/* Application Deadline */}
            <div>
              <label className="form-label">Application Deadline</label>
              <input
                type="date"
                name="applicationDeadline"
                value={form.applicationDeadline || ""}
                onChange={(e) => setField("applicationDeadline", e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Description</label>
            <textarea
              name="description"
              value={form.description || ""}
              onChange={(e) => setField("description", e.target.value)}
              rows={4}
              className={`form-input ${errors.description ? "!border-red-500" : ""}`}
              placeholder="Paste the job description or notes here…"
            />
            {errors.description && (
              <p className="text-sm text-red-600 -mt-2 mb-2">{errors.description}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Continue with AI
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
