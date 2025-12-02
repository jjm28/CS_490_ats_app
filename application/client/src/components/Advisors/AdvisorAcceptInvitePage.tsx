// components/AdvisorPortal/AdvisorAcceptInvitePage.tsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user?._id || null;
  } catch {
    return null;
  }
}

export default function AdvisorAcceptInvitePage() {
  const query = useQuery();
  const token = query.get("token") || "";
  const advisorUserId = getCurrentUserId();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // if no token we just show error
    if (!token) {
      setError("Invite token is missing.");
    }
  }, [token]);

  const handleAccept = async () => {
    if (!advisorUserId) {
      setError(
        "You need to be logged in to accept this invite."
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(
        `${API_BASE}/api/advisors/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            token,
            advisorUserId,
            advisorProfileInput: {
              // you can later collect headline/specialties via small form
            },
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error || "Failed to accept advisor invite"
        );
      }

      await res.json();
      navigate("/advisor/clients");
    } catch (err: any) {
      console.error("Error accepting advisor invite:", err);
      setError(
        err.message || "Failed to accept advisor invite"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <h1 className="text-xl font-semibold">
          Accept advisor invitation
        </h1>
        {!token && (
          <p className="text-sm text-red-600">
            Invite token is missing or invalid.
          </p>
        )}
        {token && (
          <>
            <p className="text-sm text-gray-600">
              You’ve been invited to advise a candidate on their job
              search using the ATS for Candidates platform.
            </p>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                {error}
              </div>
            )}
            <Button
              type="button"
              onClick={handleAccept}
              disabled={submitting || !advisorUserId}
            >
              {submitting
                ? "Accepting..."
                : advisorUserId
                ? "Accept invitation"
                : "Log in to accept"}
            </Button>
            {!advisorUserId && (
              <p className="text-xs text-gray-500">
                Log in or create an account, then refresh this page.
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
