import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import API_BASE from "../../utils/apiBase";
import type { SupportedPerson } from "../../types/support.types";
import { useNavigate } from "react-router-dom";

const SUPPORTERS_ENDPOINT = `${API_BASE}/api/supporters`;

type AuthUser = {
  _id: string;
  // any other fields you use
};

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user ?? null;
  } catch {
    return null;
  }
}

export default function MySupportedPeople() {
  const navigate = useNavigate();

  // 🔹 user is read once and the reference stays stable
  const [user] = useState<AuthUser | null>(() => getStoredUser());
  const [list, setList] = useState<SupportedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // if no user, just show the "must be logged in" message once
    if (!user) {
      setLoading(false);
      setError("You need to be logged in to view who you're supporting.");
      return;
    }

    const fetchSupported = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${SUPPORTERS_ENDPOINT}/as-supporter?userId=${user._id}`,
          { credentials: "include" }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load supported people");
        }

        const data: SupportedPerson[] = await res.json();
        setList(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error loading supported people");
      } finally {
        setLoading(false);
      }
    };

    fetchSupported();
  }, [user]); // ✅ user is now a stable state value, so this runs at most once per actual user

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="p-4">
          <p className="text-sm text-red-500">{error}</p>
        </Card>
      </div>
    );
  }

  return (
  <div className="space-y-4">

      <Card className="p-4">
        {error && (
          <p className="text-xs text-red-500 mb-2">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-gray-600">
            You’re not actively supporting anyone yet. When someone invites you
            via email and you accept, they’ll show up here.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {list.map((entry) => (
              <li
                key={entry._id}
                className="flex items-center justify-between border rounded px-3 py-2"
              >
                <div>
                  <div className="font-medium">
                    {entry.jobSeeker?.fullName || "Job seeker"}
                  </div>
                  <div className="text-xs text-gray-600">
                    {entry.relationship} •{" "}
                    {entry.jobSeeker?.email || "email not available"}
                  </div>
                  {entry.lastViewedAt && (
                    <div className="text-[10px] text-gray-500">
                      Last viewed:{" "}
                      {new Date(entry.lastViewedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      navigate(`/supporter/dashboard/${entry._id}`)
                    }
                  >
                    Open dashboard
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
