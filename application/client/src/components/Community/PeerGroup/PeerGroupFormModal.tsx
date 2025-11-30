import React from "react";
import Button from "../../StyledComponents/Button";
import type { PeerGroup } from "../../../api/peerGroups";

// -------------------
// Types
// -------------------

export type PeerGroupFormValues = {
  name: string;
  description: string;
  industry: string;
  role: string;
  tags: string; // comma-separated
};

export interface PeerGroupFormModalProps {
  open: boolean;
  onClose: () => void;
  initialGroup?: PeerGroup | null;
  onSubmit: (values: PeerGroupFormValues) => Promise<void>;
}

// -------------------
// Component
// -------------------

export default function PeerGroupFormModal({
  open,
  onClose,
  initialGroup,
  onSubmit,
}: PeerGroupFormModalProps) {
  const [form, setForm] = React.useState<PeerGroupFormValues>({
    name: "",
    description: "",
    industry: "",
    role: "",
    tags: "",
  });

  const [submitting, setSubmitting] = React.useState(false);
  const isEdit = !!initialGroup;

  // Populate form when editing
  React.useEffect(() => {
    if (!open) return;

    if (initialGroup) {
      setForm({
        name: initialGroup.name || "",
        description: initialGroup.description || "",
        industry: initialGroup.industry || "",
        role: initialGroup.role || "",
        tags: (initialGroup.tags || []).join(", "),
      });
    } else {
      setForm({
        name: "",
        description: "",
        industry: "",
        role: "",
        tags: "",
      });
    }
  }, [open, initialGroup]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setSubmitting(true);
      await onSubmit(form);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
        <h2 className="text-lg font-semibold mb-4">
          {isEdit ? "Edit peer group" : "Create a new peer group"}
        </h2>

        <form className="space-y-3" onSubmit={handleSubmit}>
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded px-3 py-1.5 text-sm"
              placeholder="e.g. SWE Internships 2026 – Tech"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full border rounded px-3 py-1.5 text-sm"
              rows={3}
              placeholder="What is this group for?"
            />
          </div>

          {/* Industry + Role */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Industry</label>
              <input
                name="industry"
                value={form.industry}
                onChange={handleChange}
                className="w-full border rounded px-3 py-1.5 text-sm"
                placeholder="Technology, Finance, Aerospace..."
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Role</label>
              <input
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full border rounded px-3 py-1.5 text-sm"
                placeholder="Software Engineer, Data, Quant..."
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Tags (comma-separated)
            </label>
            <input
              name="tags"
              value={form.tags}
              onChange={handleChange}
              className="w-full border rounded px-3 py-1.5 text-sm"
              placeholder="Internship 2026, New Grad 2025"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Create group"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
