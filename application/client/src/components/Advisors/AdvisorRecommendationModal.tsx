import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import API_BASE from "../../utils/apiBase";
import type {
  AdvisorClientMaterials,
  AdvisorRecommendation,
  AdvisorRecommendationCategory,
} from "../../types/advisors.types";

interface Props {
  relationshipId: string;
  advisorUserId: string;
  materials: AdvisorClientMaterials | null;
  onClose: () => void;
  onCreated: (rec: AdvisorRecommendation) => void;
}

type FormState = {
  title: string;
  description: string;
  category: AdvisorRecommendationCategory;
  jobId: string;
  resumeId: string;
  coverLetterId: string;
};

const defaultForm: FormState = {
  title: "",
  description: "",
  category: "general",
  jobId: "",
  resumeId: "",
  coverLetterId: "",
};

export default function AdvisorRecommendationModal({
  relationshipId,
  advisorUserId,
  materials,
  onClose,
  onCreated,
}: Props) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    field: keyof FormState,
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = e.target.value as AdvisorRecommendationCategory;
    setForm((prev) => ({
      ...prev,
      category: value,
      jobId: "",
      resumeId: "",
      coverLetterId: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/advisors/clients/${relationshipId}/recommendations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            advisorUserId,
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
            jobId: form.category === "job" ? form.jobId || null : null,
            resumeId:
              form.category === "resume" ? form.resumeId || null : null,
            coverLetterId:
              form.category === "cover_letter"
                ? form.coverLetterId || null
                : null,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to create recommendation");
      }

      const created = (await res.json()) as AdvisorRecommendation;
      onCreated(created);
      onClose();
    } catch (err: any) {
      console.error("Error creating recommendation:", err);
      setError(err.message || "Failed to create recommendation");
    } finally {
      setSaving(false);
    }
  };

  const resumes =
    materials?.documents?.resumes ?? [];
  const coverLetters =
    materials?.documents?.coverLetters ?? [];
  const jobs = materials?.applications?.jobs ?? [];

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          type="button"
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-xl"
          onClick={onClose}
          disabled={saving}
        >
          &times;
        </button>

        <h2 className="text-lg font-semibold mb-1">
          Add recommendation
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Create a clear, actionable recommendation for this client.
        </p>

        {error && (
          <p className="text-xs text-red-600 mb-2">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium mb-1">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) =>
                handleChange("title", e.target.value)
              }
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="e.g., Tighten resume bullets for Stripe SWE role"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Category
            </label>
            <select
              value={form.category}
              onChange={handleCategoryChange}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="general">General</option>
              <option value="resume">Resume</option>
              <option value="cover_letter">Cover letter</option>
              <option value="job">Specific job</option>
              <option value="interview">Interview prep</option>
            </select>
          </div>

          {/* Linked entity selection */}
          {form.category === "resume" && (
            <div>
              <label className="block text-xs font-medium mb-1">
                Related resume
              </label>
              <select
                value={form.resumeId}
                onChange={(e) =>
                  handleChange("resumeId", e.target.value)
                }
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">
                  Select a shared resume (optional)
                </option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.filename} ·{" "}
                    {new Date(
                      r.updatedAt
                    ).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Only resumes shared with you are listed here.
              </p>
            </div>
          )}

          {form.category === "cover_letter" && (
            <div>
              <label className="block text-xs font-medium mb-1">
                Related cover letter
              </label>
              <select
                value={form.coverLetterId}
                onChange={(e) =>
                  handleChange("coverLetterId", e.target.value)
                }
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">
                  Select a shared cover letter (optional)
                </option>
                {coverLetters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.filename} ·{" "}
                    {new Date(
                      c.updatedAt
                    ).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Only cover letters shared with you are listed here.
              </p>
            </div>
          )}

          {form.category === "job" && (
            <div>
              <label className="block text-xs font-medium mb-1">
                Related job
              </label>
              <select
                value={form.jobId}
                onChange={(e) =>
                  handleChange("jobId", e.target.value)
                }
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">
                  Select a shared job (optional)
                </option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.jobTitle} @ {j.company} ·{" "}
                    {j.status}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Only job applications shared with you are listed here.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1">
              Description (optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                handleChange("description", e.target.value)
              }
              className="w-full border rounded px-3 py-2 text-sm min-h-[80px]"
              placeholder="Add specific instructions or context."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
