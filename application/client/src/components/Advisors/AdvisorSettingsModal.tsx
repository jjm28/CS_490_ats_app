// components/Advisors/AdvisorSettingsModal.tsx
import React, { useState } from "react";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import type {
  AdvisorRelationshipSummary,
  AdvisorPermissions,
} from "../../types/advisors.types";

interface AdvisorSettingsModalProps {
  advisor: AdvisorRelationshipSummary;
  ownerUserId: string;
  onClose: () => void;
  onUpdated: (updated: AdvisorRelationshipSummary) => void;
}

export default function AdvisorSettingsModal({
  advisor,
  ownerUserId,
  onClose,
  onUpdated,
}: AdvisorSettingsModalProps) {
  const [advisorName, setAdvisorName] = useState(
    advisor.advisorName || ""
  );
  const [advisorType, setAdvisorType] = useState<
    "Mentor" | "Coach"
  >(advisor.advisorType || "Mentor");
  const [permissions, setPermissions] =
    useState<AdvisorPermissions>(advisor.permissions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePermission = (key: keyof AdvisorPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Update metadata
      const metaRes = await fetch(
        `${API_BASE}/api/advisors/${advisor.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ownerUserId,
            advisorName,
            advisorType,
          }),
        }
      );

      if (!metaRes.ok) {
        const body = await metaRes.json().catch(() => ({}));
        throw new Error(
          body?.error ||
            "Failed to update advisor basic settings"
        );
      }

      // Update permissions
      const permRes = await fetch(
        `${API_BASE}/api/advisors/${advisor.id}/permissions`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ownerUserId,
            permissions,
          }),
        }
      );

      if (!permRes.ok) {
        const body = await permRes.json().catch(() => ({}));
        throw new Error(
          body?.error ||
            "Failed to update advisor permissions"
        );
      }

      const updatedPerm = await permRes.json();

      onUpdated({
        ...advisor,
        advisorName,
        advisorType,
        permissions: updatedPerm.permissions || permissions,
      });

      onClose();
    } catch (err: any) {
      console.error("Error saving advisor settings:", err);
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <Card className="w-full max-w-lg p-6 relative">
        <button
          type="button"
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-xl"
          onClick={onClose}
          disabled={saving}
        >
          &times;
        </button>
        <h2 className="text-lg font-semibold mb-1">
          Advisor settings
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Update how this advisor appears and what they can see.
        </p>

        {error && (
          <div className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Advisor name
            </label>
            <input
              type="text"
              value={advisorName}
              onChange={(e) => setAdvisorName(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Advisor type
            </label>
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="advisorType"
                  value="Mentor"
                  checked={advisorType === "Mentor"}
                  onChange={() => setAdvisorType("Mentor")}
                />
                Mentor
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="advisorType"
                  value="Coach"
                  checked={advisorType === "Coach"}
                  onChange={() => setAdvisorType("Coach")}
                />
                Coach
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              What can they see?
            </label>
            <div className="space-y-2 text-sm">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={permissions.canViewBasicProfile}
                  onChange={() =>
                    togglePermission("canViewBasicProfile")
                  }
                />
                <span>
                  Profile overview{" "}
                  <span className="text-gray-500">
                    (name, headline, goals)
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={permissions.canViewJobSummary}
                  onChange={() =>
                    togglePermission("canViewJobSummary")
                  }
                />
                <span>
                  Job search summary{" "}
                  <span className="text-gray-500">
                    (counts &amp; recent roles)
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={permissions.canViewDocumentsSummary}
                  onChange={() =>
                    togglePermission(
                      "canViewDocumentsSummary"
                    )
                  }
                />
                <span>
                  Documents summary{" "}
                  <span className="text-gray-500">
                    (resumes &amp; cover letters overview)
                  </span>
                </span>
              </label>
            </div>
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
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
