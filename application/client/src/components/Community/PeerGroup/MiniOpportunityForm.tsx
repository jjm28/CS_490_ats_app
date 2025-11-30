import React, { useEffect, useState } from "react";

export type OpportunityDraft = {
  title: string;
  company: string;
  location?: string;
  jobUrl?: string;
  source?: string;
  tags: string;           // comma-separated string in UI
  notes: string;
  referralAvailable: boolean;
  maxReferrals: number | "";
};

type ValidationErrors = Partial<Record<keyof OpportunityDraft, string>>;

export default function MiniOpportunityForm({
  open,
  onCancel,
  onSubmit,
  initial,
  titleLabel = "Share an opportunity with your group",
}: {
  open: boolean;
  onCancel: () => void;
  onSubmit: (draft: OpportunityDraft) => void;
  initial?: Partial<OpportunityDraft>;
  titleLabel?: string;
}) {
  const [form, setForm] = useState<OpportunityDraft>({
    title: "",
    company: "",
    location: "",
    jobUrl: "",
    source: "",
    tags: "",
    notes: "",
    referralAvailable: true,
    maxReferrals: "",
    ...initial,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm((prev) => ({
      ...prev,
      ...initial,
    }));
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const setField = <K extends keyof OpportunityDraft>(name: K, value: OpportunityDraft[K]) => {
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((prev) => {
      const n = { ...prev };
      if (name === "title" && !String(value || "").trim()) {
        n.title = "Title is required";
      } else if (name === "company" && !String(value || "").trim()) {
        n.company = "Company is required";
      } else if (name === "jobUrl" && value) {
        const v = String(value);
        if (!v.match(/^https?:\/\/.+/)) n.jobUrl = "Enter a valid URL";
        else delete n.jobUrl;
      } else {
        delete n[name];
      }
      return n;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const collected: ValidationErrors = {};
    if (!form.title.trim()) collected.title = "Title is required";
    if (!form.company.trim()) collected.company = "Company is required";
    if (form.jobUrl && !String(form.jobUrl).match(/^https?:\/\/.+/)) {
      collected.jobUrl = "Enter a valid URL";
    }

    setErrors(collected);
    if (Object.keys(collected).length) return;

    const payload: OpportunityDraft = {
      ...form,
      maxReferrals:
        form.maxReferrals === "" || form.maxReferrals === undefined
          ? ""
          : Number(form.maxReferrals),
    };

    onSubmit(payload);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end md:items-center md:justify-center"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative w-full md:w-[720px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl p-5 md:p-6 max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{titleLabel}</h3>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label className="form-label">Role title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                className={`form-input ${errors.title ? "!border-red-500" : ""}`}
                placeholder="e.g. Software Engineer Intern"
              />
              {errors.title && (
                <p className="text-xs text-red-600 mt-1">{errors.title}</p>
              )}
            </div>

            {/* Company */}
            <div>
              <label className="form-label">Company *</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setField("company", e.target.value)}
                className={`form-input ${errors.company ? "!border-red-500" : ""}`}
                placeholder="e.g. Nvidia"
              />
              {errors.company && (
                <p className="text-xs text-red-600 mt-1">{errors.company}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="form-label">Location</label>
              <input
                type="text"
                value={form.location || ""}
                onChange={(e) => setField("location", e.target.value)}
                className="form-input"
                placeholder="Remote, NYC, etc."
              />
            </div>

            {/* Job URL */}
            <div>
              <label className="form-label">Job posting URL</label>
              <input
                type="url"
                value={form.jobUrl || ""}
                onChange={(e) => setField("jobUrl", e.target.value)}
                className={`form-input ${errors.jobUrl ? "!border-red-500" : ""}`}
                placeholder="https://company.com/careers/123"
              />
              {errors.jobUrl && (
                <p className="text-xs text-red-600 mt-1">{errors.jobUrl}</p>
              )}
            </div>

            {/* Source */}
            <div>
              <label className="form-label">Source</label>
              <input
                type="text"
                value={form.source || ""}
                onChange={(e) => setField("source", e.target.value)}
                className="form-input"
                placeholder="Internal referral, LinkedIn, careers site…"
              />
            </div>

            {/* Max referrals */}
            <div>
              <label className="form-label">Max referrals</label>
              <input
                type="number"
                value={form.maxReferrals ?? ""}
                onChange={(e) => setField("maxReferrals", e.target.value as any)}
                className="form-input"
                placeholder="e.g. 3"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="form-label">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setField("tags", e.target.value)}
              className="form-input"
              placeholder="internship, 2026, backend"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="form-label">Notes to the group</label>
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={3}
              className="form-input"
              placeholder="What you know about the team, expectations, timeline, etc."
            />
          </div>

          {/* Referral checkbox */}
          <div className="flex items-center gap-2">
            <input
              id="referralAvailable"
              type="checkbox"
              className="h-4 w-4"
              checked={form.referralAvailable}
              onChange={(e) => setField("referralAvailable", e.target.checked)}
            />
            <label htmlFor="referralAvailable" className="text-sm text-gray-800">
              I can refer for this role
            </label>
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
              className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-black"
            >
              Share opportunity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
