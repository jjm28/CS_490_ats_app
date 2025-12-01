// components/Accountability/JobSearchSharingSettings.tsx
import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import type {
  JobSearchSharingProfile,
  VisibilityMode,
  ReportFrequency,
  SharingScopes,
} from "../../api/jobSearchSharing";
import {
  fetchSharingProfile,
  updateSharingProfile,
} from "../../api/jobSearchSharing";

// TODO: replace this with your real teammates/partners data from backend
interface PotentialPartner {
  id: string;
  name: string;
}
const MOCK_PARTNERS: PotentialPartner[] = [
  { id: "user_1", name: "Jordan" },
  { id: "user_2", name: "Keegan" },
  { id: "user_3", name: "Rhiannon" },
];

interface Props {
  currentUserId: string;
}

export default function JobSearchSharingSettings({ currentUserId }: Props) {
  const [profile, setProfile] = useState<JobSearchSharingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // local editable state
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>("private");
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>([]);
  const [scopes, setScopes] = useState<SharingScopes>({
    shareGoals: true,
    shareMilestones: true,
    shareStats: true,
    shareNotes: false,
  });
  const [defaultReportFrequency, setDefaultReportFrequency] =
    useState<ReportFrequency>("weekly");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSharingProfile(currentUserId);
        if (!isMounted) return;

        setProfile(data);
        setVisibilityMode(data.visibilityMode);
        setAllowedUserIds(data.allowedUserIds || []);
        setScopes(data.scopes);
        setDefaultReportFrequency(data.defaultReportFrequency);
      } catch (err: any) {
        console.error(err);
        if (!isMounted) return;
        setError(err.message || "Error loading sharing settings");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  const toggleAllowedUser = (id: string) => {
    setAllowedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleScopeChange = (key: keyof SharingScopes) => {
    setScopes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const updated = await updateSharingProfile(currentUserId, {
        visibilityMode,
        allowedUserIds,
        scopes,
        defaultReportFrequency,
      });

      setProfile(updated);
      setSuccessMessage("Sharing settings saved.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error saving sharing settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <p>Loading sharing settings...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <p className="text-red-600 mb-2">Error: {error}</p>
        <Button type="button" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Job Search Sharing & Privacy
        </h2>
      </div>

      {successMessage && (
        <div className="text-green-700 text-sm">{successMessage}</div>
      )}

      {/* Visibility Mode */}
      <section className="space-y-2">
        <h3 className="font-medium">Who can see your progress?</h3>
        <div className="space-y-1 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="visibilityMode"
              value="private"
              checked={visibilityMode === "private"}
              onChange={() => setVisibilityMode("private")}
            />
            <span>
              <strong>Private</strong> – only you can see your job search data.
            </span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="visibilityMode"
              value="partners-only"
              checked={visibilityMode === "partners-only"}
              onChange={() => setVisibilityMode("partners-only")}
            />
            <span>
              <strong>Accountability partners only</strong> – only selected
              people can see your progress.
            </span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="visibilityMode"
              value="team"
              checked={visibilityMode === "team"}
              onChange={() => setVisibilityMode("team")}
            />
            <span>
              <strong>Team / Peer group</strong> – your peer group members can
              see certain parts of your progress. (Future integration)
            </span>
          </label>
        </div>
      </section>

      {/* Partner selection */}
      {(visibilityMode === "partners-only" || visibilityMode === "team") && (
        <section className="space-y-2">
          <h3 className="font-medium">Select accountability partners</h3>
          <p className="text-sm text-gray-600">
            These people will be able to view your shared progress (subject to
            the options below).
          </p>
          <div className="flex flex-wrap gap-2">
            {MOCK_PARTNERS.map((partner) => {
              const selected = allowedUserIds.includes(partner.id);
              return (
                <button
                  key={partner.id}
                  type="button"
                  onClick={() => toggleAllowedUser(partner.id)}
                  className={
                    "px-3 py-1 rounded-full border text-sm " +
                    (selected
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-800 border-gray-300")
                  }
                >
                  {partner.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Scopes */}
      <section className="space-y-2">
        <h3 className="font-medium">What do you want to share?</h3>
        <div className="space-y-1 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={scopes.shareGoals}
              onChange={() => handleScopeChange("shareGoals")}
            />
            <span>Goal progress (e.g., % completion)</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={scopes.shareMilestones}
              onChange={() => handleScopeChange("shareMilestones")}
            />
            <span>Milestone achievements</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={scopes.shareStats}
              onChange={() => handleScopeChange("shareStats")}
            />
            <span>Weekly stats (applications, interviews, etc.)</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={scopes.shareNotes}
              onChange={() => handleScopeChange("shareNotes")}
            />
            <span>Notes & reflections (more personal, optional)</span>
          </label>
        </div>
      </section>

      {/* Report frequency */}
      <section className="space-y-2">
        <h3 className="font-medium">Progress reports</h3>
        <p className="text-sm text-gray-600">
          How often should your partners receive summaries of your progress?
        </p>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={defaultReportFrequency}
          onChange={(e) =>
            setDefaultReportFrequency(e.target.value as ReportFrequency)
          }
        >
          <option value="none">No automatic reports</option>
          <option value="daily">Daily summary</option>
          <option value="weekly">Weekly summary</option>
          <option value="monthly">Monthly summary</option>
        </select>
      </section>

      {/* Save button */}
      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </Card>
  );
}
