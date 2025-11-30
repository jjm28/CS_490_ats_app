import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import API_BASE from "../../utils/apiBase";
import type {
  Supporter,
  SupporterRelationship,
  SupporterPrivacyPresetKey,
} from "../../types/support.types";
import { useNavigate } from "react-router-dom";
import SupporterPrivacyModal from "./SupporterPrivacyModal";
import SupportUpdateComposer from "./SupportUpdateComposer";

const SUPPORTERS_ENDPOINT = `${API_BASE}/api/supporters`;

interface Props {
  userId: string;
}

export default function SupporterSettings({ userId }: Props) {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteFormOpen, setInviteFormOpen] = useState(false);
  const [inviteData, setInviteData] = useState<{
    fullName: string;
    email: string;
    relationship: SupporterRelationship | "other";
    presetKey: SupporterPrivacyPresetKey;
  }>({
    fullName: "",
    email: "",
    relationship: "parent",
    presetKey: "standard",
  });
  const [error, setError] = useState<string | null>(null);

  const [editingSupporter, setEditingSupporter] = useState<Supporter | null>(
    null
  );

  const navigate = useNavigate();

  useEffect(() => {
    const fetchSupporters = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${SUPPORTERS_ENDPOINT}?userId=${userId}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load supporters");
        }
        const data: Supporter[] = await res.json();
        setSupporters(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error loading supporters");
      } finally {
        setLoading(false);
      }
    };
    fetchSupporters();
  }, [userId]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(
        `${SUPPORTERS_ENDPOINT}/invite?userId=${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(inviteData),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to invite supporter");
      }

      const supporter: Supporter = await res.json();
      setSupporters((prev) => [supporter, ...prev]);
      setInviteFormOpen(false);
      setInviteData({
        fullName: "",
        email: "",
        relationship: "parent",
        presetKey: "standard",
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error inviting supporter");
    }
  };

  const handleSupporterUpdated = (updated: Supporter) => {
    setSupporters((prev) =>
      prev.map((s) => (s._id === updated._id ? updated : s))
    );
  };

  const revokeSupporter = async (supporter: Supporter) => {
    try {
      const res = await fetch(
        `${SUPPORTERS_ENDPOINT}/${supporter._id}?userId=${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: "revoked" }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to revoke supporter");
      }
      const updated: Supporter = await res.json();
      handleSupporterUpdated(updated);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Family &amp; Personal Support</h2>
          <p className="text-sm text-gray-600">
            Invite trusted people to see a privacy-safe summary of your job
            search and learn how to support you.
          </p>
        </div>
        <Button type="button" onClick={() => setInviteFormOpen(true)}>
          Invite supporter
        </Button>
      </Card>
     <SupportUpdateComposer userId={userId} />
      {inviteFormOpen && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Invite a supporter</h3>
          <form onSubmit={handleInviteSubmit} className="space-y-3 text-sm">
            <div>
              <label className="block text-xs font-medium">Full name</label>
              <input
                className="mt-1 w-full border rounded px-2 py-1 text-sm"
                value={inviteData.fullName}
                onChange={(e) =>
                  setInviteData((prev) => ({
                    ...prev,
                    fullName: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium">Email</label>
              <input
                type="email"
                className="mt-1 w-full border rounded px-2 py-1 text-sm"
                value={inviteData.email}
                onChange={(e) =>
                  setInviteData((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-xs font-medium">
                  Relationship
                </label>
                <select
                  className="mt-1 border rounded px-2 py-1 text-sm"
                  value={inviteData.relationship}
                  onChange={(e) =>
                    setInviteData((prev) => ({
                      ...prev,
                      relationship: e.target.value as any,
                    }))
                  }
                >
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="partner">Partner</option>
                  <option value="friend">Friend</option>
                  <option value="mentor">Mentor</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium">
                  Privacy preset
                </label>
                <select
                  className="mt-1 border rounded px-2 py-1 text-sm"
                  value={inviteData.presetKey}
                  onChange={(e) =>
                    setInviteData((prev) => ({
                      ...prev,
                      presetKey: e.target.value as any,
                    }))
                  }
                >
                  <option value="high_level">High-level only</option>
                  <option value="standard">Standard</option>
                  <option value="deep">Deep transparency</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setInviteFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Send invite</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Your supporters</h3>
          {loading && (
            <span className="text-[10px] text-gray-500">
              Loading…
            </span>
          )}
        </div>
        {supporters.length === 0 ? (
          <p className="text-sm text-gray-600">
            You haven&apos;t invited any supporters yet.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {supporters.map((s) => (
              <li
                key={s._id}
                className="flex items-center justify-between border rounded px-3 py-2"
              >
                <div>
                  <div className="font-medium">{s.fullName}</div>
                  <div className="text-xs text-gray-600">
                    {s.relationship} • {s.email} • {s.status}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate(`/supporters/preview/${s._id}`)}
                  >
                    Preview view
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditingSupporter(s)}
                  >
                    Privacy &amp; boundaries
                  </Button>
                  {s.status !== "revoked" && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => revokeSupporter(s)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editingSupporter && (
        <SupporterPrivacyModal
          supporter={editingSupporter}
          userId={userId}
          open={!!editingSupporter}
          onClose={() => setEditingSupporter(null)}
          onUpdated={handleSupporterUpdated}
        />
      )}
    </div>
  );
}
