import React from "react";
import Button from "../../StyledComponents/Button";
import type { PeerGroupMembership, PeerGroup } from "../../../api/peerGroups";

export type GroupPrivacyFormValues = {
  interactionLevel: "public" | "alias" | "anonymous";
  alias: string;
  allowDirectMessages: boolean;
  showProfileLink: boolean;
  showRealNameInGroup: boolean;
};

interface GroupPrivacyModalProps {
  open: boolean;
  onClose: () => void;
  group: PeerGroup | null;
  membership: PeerGroupMembership | null;
  onSubmit: (values: GroupPrivacyFormValues) => Promise<void>;
}

export default function GroupPrivacyModal({
  open,
  onClose,
  group,
  membership,
  onSubmit,
}: GroupPrivacyModalProps) {
  const [form, setForm] = React.useState<GroupPrivacyFormValues>({
    interactionLevel: "public",
    alias: "",
    allowDirectMessages: true,
    showProfileLink: true,
    showRealNameInGroup: true,
  });
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open || !membership) return;

    setForm({
      interactionLevel: membership.interactionLevel || "public",
      alias: membership.alias || "",
      allowDirectMessages:
        membership.allowDirectMessages !== undefined
          ? membership.allowDirectMessages
          : true,
      showProfileLink:
        membership.showProfileLink !== undefined
          ? membership.showProfileLink
          : true,
      showRealNameInGroup:
        membership.showRealNameInGroup !== undefined
          ? membership.showRealNameInGroup
          : true,
    });
  }, [open, membership]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
      const { name, value, type } = e.target;
    if (type === "checkbox") {
     const checked = (e.target as HTMLInputElement).checked;

      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membership) return;
    try {
      setSubmitting(true);
      await onSubmit(form);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !group || !membership) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
        <h2 className="text-lg font-semibold mb-2">
          Privacy settings – {group.name}
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Control how your identity and profile appear to peers within this group. These
          settings apply only to this group.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Interaction level */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Interaction level
            </label>
            <div className="space-y-1 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="interactionLevel"
                  value="public"
                  checked={form.interactionLevel === "public"}
                  onChange={handleChange}
                />
                <span>
                  <span className="font-medium">Public</span> – Show your full name and
                  profile in posts and interactions.
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="interactionLevel"
                  value="alias"
                  checked={form.interactionLevel === "alias"}
                  onChange={handleChange}
                />
                <span>
                  <span className="font-medium">Alias</span> – Show a custom display name
                  instead of your real name.
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="interactionLevel"
                  value="anonymous"
                  checked={form.interactionLevel === "anonymous"}
                  onChange={handleChange}
                />
                <span>
                  <span className="font-medium">Anonymous</span> – Show only “Anonymous”
                  for your posts and interactions.
                </span>
              </label>
            </div>
          </div>

          {/* Alias input when alias mode is selected */}
          {form.interactionLevel === "alias" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Alias display name
              </label>
              <input
                name="alias"
                value={form.alias}
                onChange={handleChange}
                className="w-full border rounded px-3 py-1.5 text-sm"
                placeholder="e.g. SWE Candidate, Data Explorer..."
              />
              <p className="text-[11px] text-gray-500 mt-1">
                This name will be shown instead of your real name in this group.
              </p>
            </div>
          )}

          {/* Additional toggles */}
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="allowDirectMessages"
                checked={form.allowDirectMessages}
                onChange={handleChange}
              />
              <span>Allow peers to send you direct messages from this group</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="showProfileLink"
                checked={form.showProfileLink}
                onChange={handleChange}
              />
              <span>Allow peers to view your full profile from this group</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="showRealNameInGroup"
                checked={form.showRealNameInGroup}
                onChange={handleChange}
                disabled={form.interactionLevel !== "public"}
              />
              <span>
                Show your real name in group member lists (only applies to Public mode)
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save privacy settings"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
