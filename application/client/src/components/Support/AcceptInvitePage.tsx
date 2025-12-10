// src/components/Support/AcceptInvitePage.tsx
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import API_BASE from "../../utils/apiBase";

const SUPPORTERS_ENDPOINT = `${API_BASE}/api/supporters`;

interface AcceptResponse {
  supporterId: string;
  ownerUserId: string;
  fullName: string;
  relationship: string;
}

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const  user  = JSON.parse(localStorage.getItem("authUser") ?? "").user._id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptData, setAcceptData] = useState<AcceptResponse | null>(null);

  useEffect(() => {
    // If somehow we end up here without token, just show an error
    if (!token) {
      setError("Missing invite token. Please use the link from your email.");
      setLoading(false);
      return;
    }

    const acceptInvite = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(user)
        // user._id should be available thanks to PrivateRoute
        const supporterUserId = user;
        if (!supporterUserId) {
          throw new Error("Missing supporter user id.");
        }

        const res = await fetch(
          `${SUPPORTERS_ENDPOINT}/accept-invite-auth?supporterUserId=${encodeURIComponent(
            supporterUserId
          )}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ token }),
          }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Invalid or expired invite");
        }

        const data: AcceptResponse = await res.json();
        setAcceptData(data);
      } catch (err: any) {
        console.error("Error accepting invite:", err);
        setError(err.message || "Unable to accept invite");
      } finally {
        setLoading(false);
      }
    };

    acceptInvite();
  }, [token, user]);

  if (loading) {
    return (
      <CenteredCard>
        <p className="text-sm text-gray-600">Accepting invite…</p>
      </CenteredCard>
    );
  }

  if (error && !acceptData) {
    return (
      <CenteredCard>
        <p className="text-sm text-red-500">{error}</p>
      </CenteredCard>
    );
  }

  if (!acceptData) {
    return (
      <CenteredCard>
        <p className="text-sm text-gray-600">
          Something went wrong finalizing your invite.
        </p>
      </CenteredCard>
    );
  }

  return (
    <CenteredCard>
      <h1 className="font-semibold text-lg">You&apos;re set up as a supporter</h1>
      <p className="text-sm text-gray-700 mt-2">
        You&apos;re now supporting{" "}
        <span className="font-semibold">{acceptData.fullName}</span> as{" "}
        {acceptData.relationship}.
      </p>
      <p className="text-xs text-gray-600 mt-1">
        You&apos;ll see a privacy-safe view of their job search, including
        overall progress and milestones they choose to share.
      </p>
      <div className="flex justify-end mt-3">
        <Button
          type="button"
          onClick={() =>
            navigate(`/supporter/dashboard/${acceptData.supporterId}`)
          }
        >
          Go to support dashboard
        </Button>
      </div>
    </CenteredCard>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="p-4 max-w-md w-full space-y-2">{children}</Card>
    </div>
  );
}
