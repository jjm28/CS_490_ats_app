import React, { useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import API_BASE from "../../utils/apiBase";
import type {
  Supporter,
  SupporterPermissions,
  SupporterBoundaries,
  SupporterPrivacyPresetKey,
} from "../../types/support.types";

const SUPPORTERS_ENDPOINT = `${API_BASE}/api/supporters`;

interface Props {
  supporter: Supporter;
  userId: string;
  open: boolean;
  onClose: () => void;
  onUpdated: (updated: Supporter) => void;
}

const presetLabels: Record<SupporterPrivacyPresetKey, string> = {
  high_level: "High-level only",
  standard: "Standard",
  deep: "Deep transparency",
};

export default function SupporterPrivacyModal({
  supporter,
  userId,
  open,
  onClose,
  onUpdated,
}: Props) {
  const [permissions, setPermissions] = useState<SupporterPermissions>(
    supporter.permissions
  );
  const [boundaries, setBoundaries] = useState<SupporterBoundaries>(
    supporter.boundaries
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const applyPreset = (preset: SupporterPrivacyPresetKey) => {
    if (preset === "high_level") {
      setPermissions({
        canSeeProgressSummary: true,
        canSeeCompanyNames: false,
        canSeeInterviewSchedule: false,
        canSeeRejections: false,
        canSeeSalaryInfo: false,
        canSeeNotes: false,
        canSeeWellbeingCheckins: false,
      });
    } else if (preset === "standard") {
      setPermissions({
        canSeeProgressSummary: true,
        canSeeCompanyNames: true,
        canSeeInterviewSchedule: true,
        canSeeRejections: true,
        canSeeSalaryInfo: false,
        canSeeNotes: false,
        canSeeWellbeingCheckins: true,
      });
    } else {
      // deep
      setPermissions({
        canSeeProgressSummary: true,
        canSeeCompanyNames: true,
        canSeeInterviewSchedule: true,
        canSeeRejections: true,
        canSeeSalaryInfo: true,
        canSeeNotes: true,
        canSeeWellbeingCheckins: true,
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `${SUPPORTERS_ENDPOINT}/${supporter._id}?userId=${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            permissions,
            boundaries,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update supporter");
      }

      const updated: Supporter = await res.json();
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (key: keyof SupporterPermissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateBoundariesField = <
    K extends keyof SupporterBoundaries,
    V extends SupporterBoundaries[K]
  >(
    key: K,
    value: V
  ) => {
    setBoundaries((prev) => ({ ...prev, [key]: value }));
  };

  const topicsString = (boundaries.topicsOffLimits || []).join(", ");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <Card className="bg-white rounded-lg p-4 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">
            Privacy &amp; boundaries for {supporter.fullName}
          </h2>
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-2 text-xs">
          <p className="text-gray-600">
            Choose what this supporter can see and how you want them to show up
            for you.
          </p>

          {/* Presets */}
          <div>
            <div className="font-semibold mb-1">Privacy presets</div>
            <div className="flex gap-2 flex-wrap">
              {(
                ["high_level", "standard", "deep"] as SupporterPrivacyPresetKey[]
              ).map((key) => (
                <button
                  key={key}
                  type="button"
                  className="border rounded px-2 py-1 text-[11px] hover:bg-gray-50"
                  onClick={() => applyPreset(key)}
                >
                  {presetLabels[key]}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div className="mt-2">
            <div className="font-semibold mb-1">What they can see</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              <PermissionToggle
                label="High-level progress"
                description="Total applications, interviews, offers"
                checked={permissions.canSeeProgressSummary}
                disabled
                onChange={() => {}}
              />
              <PermissionToggle
                label="Company names"
                description="Which companies you applied / interview with"
                checked={permissions.canSeeCompanyNames}
                onChange={() => togglePermission("canSeeCompanyNames")}
              />
              <PermissionToggle
                label="Interview schedule"
                description="Dates/times of upcoming interviews"
                checked={permissions.canSeeInterviewSchedule}
                onChange={() => togglePermission("canSeeInterviewSchedule")}
              />
              <PermissionToggle
                label="Rejections & setbacks"
                description="Whether they see when you get a rejection"
                checked={permissions.canSeeRejections}
                onChange={() => togglePermission("canSeeRejections")}
              />
              <PermissionToggle
                label="Salary / offer details"
                description="Comp numbers, offer specifics"
                checked={permissions.canSeeSalaryInfo}
                onChange={() => togglePermission("canSeeSalaryInfo")}
              />
              <PermissionToggle
                label="Your private notes"
                description="Reflections you write in the platform"
                checked={permissions.canSeeNotes}
                onChange={() => togglePermission("canSeeNotes")}
              />
              <PermissionToggle
                label="Well-being check-ins"
                description="Stress/mood snapshot (not full details)"
                checked={permissions.canSeeWellbeingCheckins}
                onChange={() =>
                  togglePermission("canSeeWellbeingCheckins")
                }
              />
            </div>
          </div>

          {/* Boundaries */}
          <div className="mt-3 space-y-2">
            <div className="font-semibold">Boundaries & preferences</div>

            <div className="flex flex-wrap gap-3">
              <div>
                <div className="text-[11px] font-medium">
                  Preferred contact channel
                </div>
                <select
                  className="mt-1 border rounded px-2 py-1 text-xs"
                  value={boundaries.preferredContactChannel}
                  onChange={(e) =>
                    updateBoundariesField(
                      "preferredContactChannel",
                      e.target.value as any
                    )
                  }
                >
                  <option value="in_app">In-app updates</option>
                  <option value="email">Email</option>
                  <option value="sms">Text / SMS</option>
                  <option value="none">No proactive contact</option>
                </select>
              </div>

              <div>
                <div className="text-[11px] font-medium">
                  How often to check in
                </div>
                <select
                  className="mt-1 border rounded px-2 py-1 text-xs"
                  value={boundaries.preferredCheckinFrequency}
                  onChange={(e) =>
                    updateBoundariesField(
                      "preferredCheckinFrequency",
                      e.target.value as any
                    )
                  }
                >
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                  <option value="ad_hoc">Only when I share something</option>
                </select>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium mb-1">
                Topics that are off-limits
              </div>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-xs"
                placeholder='E.g., "salary, rejections on the same day"'
                value={topicsString}
                onChange={(e) =>
                  updateBoundariesField(
                    "topicsOffLimits",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
              />
            </div>

            <div>
              <div className="text-[11px] font-medium mb-1">
                How you’d like them to support you
              </div>
              <textarea
                className="w-full border rounded px-2 py-1 text-xs"
                rows={3}
                placeholder="E.g., 'Please celebrate interviews with me, but don’t push me to apply daily. Ask before giving feedback on rejections.'"
                value={boundaries.userMessageToSupporter || ""}
                onChange={(e) =>
                  updateBoundariesField(
                    "userMessageToSupporter",
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function PermissionToggle(props: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  const { label, description, checked, disabled, onChange } = props;
  return (
    <label className="flex items-start gap-2">
      <input
        type="checkbox"
        className="mt-[3px]"
        checked={checked}
        disabled={disabled}
        onChange={disabled ? undefined : onChange}
      />
      <div>
        <div className="font-medium text-[11px]">{label}</div>
        {description && (
          <div className="text-[10px] text-gray-600">{description}</div>
        )}
      </div>
    </label>
  );
}
