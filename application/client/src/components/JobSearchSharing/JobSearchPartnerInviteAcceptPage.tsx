import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import { acceptPartnerInviteByTokenApi } from "../../api/jobSearchSharing";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function getCurrentUserIdFromStorage(): string | null {
  try {
    const stored = window.localStorage.getItem("user");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?._id || null;
  } catch {
    return null;
  }
}

export default function JobSearchPartnerInviteAcceptPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get("token") || "";
    const currentUserId =  JSON.parse(localStorage.getItem("authUser") ?? "").user._id || "dfs";

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !currentUserId) return;

    let mounted = true;

    async function acceptInvite() {
      try {
        setStatus("loading");
        setError(null);

        const invite = await acceptPartnerInviteByTokenApi({
          token,
          userId: currentUserId,
        });

        if (!mounted) return;

        setOwnerUserId(invite.ownerUserId);
        setStatus("success");
      } catch (err: any) {
        console.error(err);
        if (!mounted) return;
        setError(err.message || "Error accepting invite");
        setStatus("error");
      }
    }

    acceptInvite();
    return () => {
      mounted = false;
    };
  }, [token, currentUserId]);

  if (!token) {
    return (
      <div className="max-w-lg mx-auto mt-8 px-4">
        <Card className="p-4">
          <p className="text-sm text-red-600">
            This invite link is missing a token. Please check that you copied
            the full URL from your email.
          </p>
        </Card>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="max-w-lg mx-auto mt-8 px-4">
        <Card className="p-4 space-y-2">
          <p className="text-sm">
            You need to be logged in to accept this invite.
          </p>
          <p className="text-xs text-gray-600">
            Log in to your ATS for Candidates account, then click this link
            again or paste it into your browser.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-8 px-4">
      <Card className="p-4 space-y-3">
        {status === "loading" && (
          <p className="text-sm">Accepting your invitation…</p>
        )}

        {status === "error" && (
          <>
            <p className="text-sm text-red-600">
              We couldn&apos;t accept this invitation.
            </p>
            {error && <p className="text-xs text-gray-600">{error}</p>}
          </>
        )}

        {status === "success" && ownerUserId && (
          <>
            <p className="text-sm">
              You&apos;re now an accountability partner for{" "}
              <span className="font-mono">{ownerUserId}</span>.
            </p>
            <Button
              type="button"
              onClick={() => navigate(`/job-sharing/${ownerUserId}`)}
            >
              Go to their dashboard
            </Button>
          </>
        )}

        {status === "idle" && (
          <p className="text-sm">
            Preparing to accept your invitation. This should only take a
            moment…
          </p>
        )}
      </Card>
    </div>
  );
}
