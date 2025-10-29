import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Card from "../StyledComponents/Card";
import { listProfiles, type Profile } from "../../api/profiles";
import API_BASE from '../../utils/apiBase';

function formatLocation(loc?: Profile["location"]) {
  const city = loc?.city?.trim();
  const state = loc?.state?.trim();
  if (city && state) return `${city}, ${state}`;
  return city || state || "—";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || "").join("");
}

function pickLatest(profiles: Profile[]): Profile | null {
  if (!profiles?.length) return null;
  const parse = (d?: string) => (d ? new Date(d).getTime() : 0);
  return [...profiles].sort((a, b) => {
    const bu = parse(b.updatedAt) || parse(b.createdAt);
    const au = parse(a.updatedAt) || parse(a.createdAt);
    return bu - au;
  })[0];
}

const ProfileDashboard: React.FC = () => {
  const location = useLocation() as { state?: { flash?: string } };
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await listProfiles();
        setProfiles(data);
      } catch (e: any) {
        setErr(e?.message || "Failed to load profiles.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const latest = useMemo(() => pickLatest(profiles || []), [profiles]);
function printmessage() {
console.log(latest)
}
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="!text-left text-2xl font-bold text-gray-900 mb-2">
        Profile Dashboard
      </h1>

      {location?.state?.flash && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          {location.state.flash}
        </div>
      )}

      {loading && <p className="text-gray-600">Loading…</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {!loading && !err && !latest && (
        <Card>
          <p className="text-gray-700">No profiles found yet.</p>
        </Card>
      )}

      {!loading && !err && latest && (
        <Card>
          {/* Header: Photo + Name/Headline */}
          <div className="flex items-center gap-4">
            {latest.photoUrl ? ( 
              <img
                src={ API_BASE + latest.photoUrl}
                alt={`${latest.fullName} profile`}
                className="h-24 w-24 rounded-full object-cover ring-1 ring-gray-200"
              />
              
            ) : (
              <div className="h-24 w-24 rounded-full bg-gray-200 ring-1 ring-gray-300 flex items-center justify-center text-xl font-semibold text-gray-700">
                {getInitials(latest.fullName || "U N")}
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {latest.fullName || "—"}
              </h2>
              <p className="text-gray-600">
                {latest.headline?.trim() || "No headline provided"}
              </p>
            </div>
          </div>

          {/* Details grid */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Email
              </div>
              <div className="text-gray-900 break-all">
                {latest.email || "—"}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Phone
              </div>
              <div className="text-gray-900">{latest.phone || "—"}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Industry
              </div>
              <div className="text-gray-900">{latest.industry || "—"}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Experience Level
              </div>
              <div className="text-gray-900">
                {latest.experienceLevel || "—"}
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Location
              </div>
              <div className="text-gray-900">
                {formatLocation(latest.location)}
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Bio
              </div>
              <div className="text-gray-900 whitespace-pre-wrap">
                {latest.bio?.trim() || "No bio yet."}
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="mt-6 text-xs text-gray-500">
            <div>
              Updated:{" "}
              {latest.updatedAt
                ? new Date(latest.updatedAt).toLocaleString()
                : "—"}
            </div>
            <div>
              Created:{" "}
              {latest.createdAt
                ? new Date(latest.createdAt).toLocaleString()
                : "—"}
            </div>
          </div>
        </Card>
      )}

      {/* Optional: small note if multiple profiles exist */}
      {!loading && profiles && profiles.length > 1 && (
        <p className="mt-4 text-sm text-gray-500">
          Showing your most recent profile. ({profiles.length} total)
        </p>
      )}
    </div>
  );
};

export default ProfileDashboard;
