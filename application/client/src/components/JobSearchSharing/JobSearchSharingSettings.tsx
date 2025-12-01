// components/Accountability/JobSearchSharingSettings.tsx
import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import type {
  JobSearchSharingProfile,
  VisibilityMode,
  ReportFrequency,
  SharingScopes,  PartnerInvite,
   OwnerPartnerOf,
} from "../../api/jobSearchSharing";
import {
  fetchSharingProfilepat,
  updateSharingProfile, removeAccountabilityPartnerApi,  createPartnerInviteApi,
  fetchPartnerInvitesForOwner,
  fetchOwnersWhereUserIsPartner,
 

} from "../../api/jobSearchSharing";

// TODO: replace this with your real teammates/partners data from backend
interface PotentialPartner {
  id: string;
  name: string;
}


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
const [savingPartner, setSavingPartner] = useState(false);
const [newPartnerEmail, setNewPartnerEmail] = useState("");
const [savingInvite, setSavingInvite] = useState(false);
const [partnerInvites, setPartnerInvites] = useState<PartnerInvite[]>([]);
const [ownersWhereImPartner, setOwnersWhereImPartner] = useState<
  OwnerPartnerOf[]
>([]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSharingProfilepat(currentUserId);
        if (!isMounted) return;

        setProfile(data);
        const invites = await fetchPartnerInvitesForOwner(currentUserId);
        if (isMounted) {
          console.log(invites)
          setPartnerInvites(invites);
        }

        // Load owners where I am a partner
        const owners = await fetchOwnersWhereUserIsPartner(currentUserId);
        if (isMounted) {
          setOwnersWhereImPartner(owners);
        }
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

  const handleInvitePartner = async () => {
  const email = newPartnerEmail.trim();
  if (!email) return;

  try {
    setSavingInvite(true);
    setError(null);

    const invite = await createPartnerInviteApi({
      ownerUserId: currentUserId,
      email,
    });

setPartnerInvites(prev => {
  const exists = prev.some(item => item.invitedEmail === invite.invitedEmail);
  if (exists) return prev;
  return [invite, ...prev]; // or whatever your object shape is
});

    setNewPartnerEmail("");
    setSuccessMessage("Invitation sent.");
  } catch (err: any) {
    console.error(err);
    setError(err.message || "Error sending partner invitation");
  } finally {
    setSavingInvite(false);
  }
};



const handleRemovePartner = async (partnerUserId: string) => {
  if (!profile) return;

  try {
    setSavingPartner(true);
    setError(null);

    const updated = await removeAccountabilityPartnerApi({
      ownerUserId: currentUserId,
      partnerUserId,
    });

    setProfile(updated);
  } catch (err: any) {
    console.error(err);
    setError(err.message || "Error removing accountability partner");
  } finally {
    setSavingPartner(false);
  }
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

        </div>
      </section>

      {/* Partner selection */}
      {(visibilityMode === "partners-only" || visibilityMode === "team") && (
        <section className="space-y-2">
         {/* Accountability partners section – drop this where the placeholder list was */}
<div className="border rounded-md p-3 space-y-2 mt-3">
  <h3 className="text-sm font-semibold text-gray-800">
    Accountability partners
  </h3>
  <p className="text-xs text-gray-600">
    These people will be able to view your shared job search dashboard
    (subject to the options below). Use their user ID or email
    associated with your ATS account.
  </p>

  {/* Add partner input */}
  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center mt-2">
<input
  className="border rounded px-2 py-1 text-sm flex-1"
  placeholder="Invite by email (your partner’s ATS email)"
  value={newPartnerEmail}
  onChange={(e) => setNewPartnerEmail(e.target.value)}
/>
<Button
  type="button"
  onClick={handleInvitePartner}
  disabled={savingInvite || !newPartnerEmail.trim()}
>
  {savingInvite ? "Sending..." : "Send invite"}
</Button>

  </div>

  {/* Current partners list */}
  <div className="mt-2 space-y-1">
    {profile?.allowedUserIds?.length === 0 ? (
      <p className="text-xs text-gray-500">
        You haven&apos;t added any accountability partners yet.
      </p>
    ) : (
      <ul className="flex flex-wrap gap-2">
        {profile!.allowedUserIds.map((partnerId) => (
          <li
            key={partnerId}
            className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-800"
          >
            <span className="font-mono">{partnerId}</span>
            <button
              type="button"
              onClick={() => handleRemovePartner(partnerId)}
              className="text-gray-500 hover:text-red-600 text-[11px]"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>

{/* Pending invitations */}
<div className="mt-3 border-t pt-2">
  <h4 className="text-xs font-semibold text-gray-700">
    Pending invitations
  </h4>
  {partnerInvites.length === 0 ? (
    <p className="text-xs text-gray-500">
      You haven&apos;t sent any invitations yet.
    </p>
  ) : (
    <ul className="mt-1 space-y-1">
      {partnerInvites.map((invite) => (
        <li
          key={invite._id}
          className="flex items-center justify-between text-xs"
        >
          <span className="text-gray-700">
            {invite.invitedEmail}{" "}
            <span className="text-gray-500">
              ({invite.status})
            </span>
          </span>
          {/* You could later add a "cancel" button for pending invites */}
        </li>
      ))}
    </ul>
  )}
</div>

  {/* Share link */}
  <div className="mt-3 border-t pt-2">
    <p className="text-xs text-gray-600 mb-1">
      Share this link with your accountability partners so they can
      view your dashboard:
    </p>
    <div className="flex items-center gap-2 text-xs">
      <span className="font-mono break-all bg-white border rounded px-2 py-1 flex-1">
        {`${window.location.origin}/job-sharing/${currentUserId}`}
      </span>
    </div>
  </div>
</div>

{/* Where I am a partner */}
<section className="space-y-2 mt-4">
  <h3 className="font-medium text-sm">You&apos;re an accountability partner for</h3>
  {ownersWhereImPartner.length === 0 ? (
    <p className="text-xs text-gray-500">
      You are not an accountability partner for anyone yet.
    </p>
  ) : (
    <ul className="text-xs text-gray-700 space-y-1">
      {ownersWhereImPartner.map((o) => (
        <li key={o.ownerUserId} className="flex items-center justify-between">
          <span className="font-mono">{o.ownerUserId}</span>
          <span className="text-[11px] text-gray-500">
            Last updated:{" "}
            {o.lastUpdatedAt
              ? new Date(o.lastUpdatedAt).toLocaleDateString()
              : "n/a"}
          </span>
        </li>
      ))}
    </ul>
  )}
</section>

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
