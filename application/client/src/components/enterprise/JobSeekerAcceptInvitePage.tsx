// src/components/Onboarding/JobSeekerAcceptInvitePage.tsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import { getAuthMeta } from "../../types/cohort";
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

type InviteStatus = "loading" | "invalid" | "ready" | "submitting" | "success";

interface InviteInfo {
  email: string;
  organizationId: string;
  cohortId: string | null;
  expiresAt: string;
}

export default function JobSeekerAcceptInvitePage() {
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get("token") || "";
  const { userId, role, organizationId } = getAuthMeta();

  const [status, setStatus] = useState<InviteStatus>("loading");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setError("Missing invite token.");
      return;
    }

    const fetchInvite = async () => {
      try {
        setStatus("loading");
        setError(null);
 const res = await fetch(
  `${API_BASE}/api/public/jobseeker-invites/${encodeURIComponent(token)}`,
  {
    method: "GET",
              headers: {
            ...(userId
              ? {
                  "x-user-id": userId,
                  "x-user-role": "job_seeker",
                  "x-org-id": organizationId || "",
                }
              : {}),
          },
  }
);




          
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg = body.error || "This invite is no longer valid.";
          setError(msg);
          setStatus("invalid");
          return;
        }
        const data = (await res.json()) as InviteInfo;
        setInvite(data);
        setStatus("ready");
      } catch (err) {
        console.error(err);
        setError("Could not verify this invite. Please try again later.");
        setStatus("invalid");
      }
    };

    fetchInvite();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setStatus("submitting");
      setError(null);

      const res = await fetch(
        `${API_BASE}/api/public/jobseeker-invites/${encodeURIComponent(
          token
        )}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password,
            fullName: fullName.trim(),
          }),
        }
      );

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error || "Failed to accept invite.");
        setStatus("ready");
        return;
      }

      setStatus("success");
      // optional: after a delay, navigate to login page
      // setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setStatus("ready");
    }
  }

  // UI rendering

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="p-6 max-w-md w-full">
          <p className="text-center">Checking your invite…</p>
        </Card>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="p-6 max-w-md w-full">
          <h1 className="text-xl font-semibold mb-2">Invite not valid</h1>
          <p className="mb-4">{error || "This invite cannot be used."}</p>
          <Button type="button" onClick={() => navigate("/")}>
            Go to homepage
          </Button>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="p-6 max-w-md w-full">
          <h1 className="text-xl font-semibold mb-2">You’re all set!</h1>
          <p className="mb-4">
            Your account has been created and linked to this organization.
          </p>
          <Button type="button" onClick={() => navigate("/login")}>
            Go to login
          </Button>
        </Card>
      </div>
    );
  }

  // status === "ready" or "submitting"
  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="p-6 max-w-md w-full">
        <h1 className="text-2xl font-semibold mb-2">
          Join this career program
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Create your account to get started with your job search tools.
        </p>

        {invite && (
          <div className="mb-4 text-sm">
            <p className="font-medium">You’re joining with email:</p>
            <p className="font-mono break-all">{invite.email}</p>
          </div>
        )}

        {error && (
          <p className="text-red-600 text-sm mb-3">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Full name
            </label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
            />
            <p className="text-xs text-gray-500 mt-1">
              At least 8 characters.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Confirm password
            </label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 text-sm"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="Re-enter your password"
            />
          </div>

          <Button
            type="submit"
            disabled={status === "submitting"}
            className="w-full mt-2"
          >
            {status === "submitting" ? "Creating your account…" : "Join program"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
