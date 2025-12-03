// components/Advisors/AdvisorInviteModal.tsx
import React, { useState } from "react";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import type {
  AdvisorRelationshipSummary,
  AdvisorPermissions,
} from "../../types/advisors.types";

interface AdvisorInviteModalProps {
  ownerUserId: string;
  onClose: () => void;
  onSuccess: (advisor: AdvisorRelationshipSummary) => void;
}

export default function AdvisorInviteModal({
  ownerUserId,
  onClose,
  onSuccess,
}: AdvisorInviteModalProps) {
  const [advisorName, setAdvisorName] = useState("");
  const [advisorEmail, setAdvisorEmail] = useState("");
  const [advisorType, setAdvisorType] = useState<
    "Mentor" | "Coach"
  >("Mentor");
  const [permissions, setPermissions] =
    useState<AdvisorPermissions>({
      canViewBasicProfile: true,
      canViewJobSummary: true,
      canViewDocumentsSummary: false,
    });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePermission = (key: keyof AdvisorPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorEmail) {
      setError("Advisor email is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(
        `${API_BASE}/api/advisors/invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            ownerUserId,
            advisorName,
            advisorEmail,
            advisorType,
            permissions,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error || "Failed to create advisor invite"
        );
      }

      const data = (await res.json()) as AdvisorRelationshipSummary;
      onSuccess(data);
      onClose();
    } catch (err: any) {
      console.error("Error creating advisor invite:", err);
      setError(
        err.message || "Failed to create advisor invite"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <Card className="w-full max-w-lg p-6 relative">
        <button
          type="button"
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-xl"
          onClick={onClose}
          disabled={submitting}
        >
          &times;
        </button>
        <h2 className="text-lg font-semibold mb-1">
          Invite Advisor / Coach
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Send an invite so they can access a privacy-friendly
          summary of your profile and job search.
        </p>

        {error && (
          <div className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Advisor name (optional)
            </label>
            <input
              type="text"
              value={advisorName}
              onChange={(e) => setAdvisorName(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Advisor email
            </label>
            <input
              type="email"
              value={advisorEmail}
              onChange={(e) => setAdvisorEmail(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="jane@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Type
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
                    (application counts and key jobs)
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
                    (number of resumes / cover letters)
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
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending invite..." : "Send invite"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
