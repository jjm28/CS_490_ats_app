import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../StyledComponents/Button";
import { listProfiles, type Profile } from "../../api/profiles";
import Card from "../StyledComponents/Card";
import "../../styles/StyledComponents/FormInput.css";
import API_BASE from "../../utils/apiBase"; 

function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const token = useMemo(
    () => localStorage.getItem("authToken") || localStorage.getItem("token") || "",
    []
  );
  const isLoggedIn = !!token;

  useEffect(() => {
    // show flash message after returning from form
    const f = (location.state as any)?.flash;
    if (f) setFlash(f);
  }, [location.state]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const data = await listProfiles();
        if (!cancelled) setProfiles(data);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load profiles.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (isLoggedIn) run();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const createNew = () => navigate("/ProfileForm");
  const editProfile = (id: string) => navigate(`/ProfileForm/${id}`);

  // Default avatar (inline SVG) for when no photoUrl is present
  const DEFAULT_AVATAR =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.5'><circle cx='12' cy='8' r='4'/><path d='M4 20c0-4 4-6 8-6s8 2 8 6'/></svg>`
    );

  const resolvePhoto = (p: Profile) => {
    if (!p.photoUrl) return DEFAULT_AVATAR;
    if (p.photoUrl.startsWith("http")) return p.photoUrl;
    return API_BASE + p.photoUrl;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Profiles</h1>
      <p className="text-gray-600 mb-6">
        Create multiple profiles for different roles. Select one to edit or create a new one below.
      </p>

      {flash && <p className="mb-4 text-sm text-green-700">{flash}</p>}
      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

      {!isLoggedIn && (
        <Card>
          <Button disabled>Log in to continue</Button>
          <p className="mt-3 text-sm text-amber-700">
            You’re not logged in. Log in, then create your profile(s).
          </p>
          <div className="mt-10" />
        </Card>
      )}

      {isLoggedIn && (
        <>
          {loading ? (
            <p className="text-sm text-gray-600">Loading…</p>
          ) : profiles.length === 0 ? (
            <div className="mx-6">
              <Card>
                You don’t have any profiles yet. Click “Create new profile” to get started.
              </Card>
            </div>
          ) : (
            <ul className="space-y-3">
              {profiles.map((p) => (
                <li key={p._id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={resolvePhoto(p)}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover border"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">{p.fullName}</div>
                        <div className="text-sm text-gray-600">{p.email}</div>
                        <div className="text-sm text-gray-600">
                          {p.headline || p.industry} • {p.experienceLevel}
                        </div>
                        {p.location?.city || p.location?.state ? (
                          <div className="text-sm text-gray-600">
                            {p.location?.city}
                            {p.location?.city && p.location?.state ? ", " : ""}
                            {p.location?.state}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <Button onClick={() => editProfile(p._id!)}>Edit</Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6">
            <Button onClick={createNew}>Create new profile</Button>
          </div>
        </>
      )}
    </div>
  );
}

export default ProfilePage;
