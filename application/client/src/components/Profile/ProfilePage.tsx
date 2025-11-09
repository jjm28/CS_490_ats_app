import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../StyledComponents/Button";
import { listProfiles, type Profile } from "../../api/profiles";
import Card from "../StyledComponents/Card";
import "../../styles/StyledComponents/FormInput.css";
import API_BASE from "../../utils/apiBase"; 
import ProfileStrength from "./ProfileStrength";
import Education from "../Education/Education";
import Skills from "../Skills/Skills";
import Projects from "../Projects/Projects";
import axios from "axios";

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
        if (!cancelled) setErr(e?.message || "Failed to load profile.");
        if (e?.message?.includes("Account deleted") || e?.message?.includes("Unauthorized")) {
          localStorage.removeItem("token");
          navigate("/login", { state: { flash: "Your account has been deleted or your session expired." } });
        }
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

  // Profile completeness
  const [completeness, setCompleteness] = useState<any | null>(null);
  const [completenessLoading, setCompletenessLoading] = useState(false);

  const refreshCompleteness = async () => {
    if (!profiles.length) return;
    const userId = profiles[0]?.userId;
    if (!userId) return;

    setCompletenessLoading(true);

    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_BASE}/api/profile/completeness/${userId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(`Failed to fetch completeness (${res.status})`);
      const data = await res.json();
      setCompleteness({ ...data, score: Number(data.score ?? 0) });
    } catch (err) {
      console.error("Error fetching completeness:", err);
      setCompleteness({
        score: 0,
        badge: "Unknown",
        suggestions: [],
        comparison: 0,
        industryAverage: 0,
      });
    } finally {
      setCompletenessLoading(false);
    }
  };

  // Run completeness refresh **after profiles are loaded**
  useEffect(() => {
    if (profiles.length > 0) refreshCompleteness();
  }, [profiles, location.key]);

   const handleProfileUpdated = async () => {
    await refreshCompleteness();
  };

  // Navigate to create/edit form
  const createOrEditProfile = () => navigate("/ProfileForm");

  // Helper to join fields only if they exist
  const joinFields = (fields: (string | undefined)[], separator = " - ") =>
    fields.filter(Boolean).join(separator);

  // DELETE account handler
const handleDelete = async () => {
  const password = prompt("Confirm your password to delete your account:");
  if (!password) return;

  try {
    const response = await fetch("http://localhost:5050/api/auth/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Failed to delete account.");
      return;
    }

    // ✅ Success: Show confirmation, log out, and redirect
    alert("Account deleted successfully. Redirecting to login...");

    // Clear tokens and redirect
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");

    // Optional: Add slight delay for UX polish
    setTimeout(() => {
      window.location.href = "/login";
    }, 800);
  } catch (err) {
    console.error("Delete failed:", err);
    alert("Something went wrong while deleting your account.");
  }
};




  if (loading) return <p className="p-6">Loading...</p>;

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
      
    <div className="mt-6">
      {completenessLoading ? (
      // Loading placeholder
    <div className="p-4 bg-white rounded-lg shadow-sm border">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Profile Strength</h2>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div className="bg-gray-400 h-3 rounded-full animate-pulse w-3/4"></div>
      </div>
      <p className="mt-2 text-sm text-gray-700">Loading...</p>
    </div>
  ) : completeness ? (
    <ProfileStrength
      score={completeness.score}
      badge={completeness.badge}
      suggestions={completeness.suggestions}
      comparison={completeness.comparison}
      industryAverage={completeness.industryAverage}
    />
  ) : (
    // Fallback if no profile at all
    <ProfileStrength
      score={0}
      badge="No profile yet"
      suggestions={[]}
      comparison={0}
      industryAverage={0}
    />
  )}
      </div>
       <Education onUpdate={handleProfileUpdated} />
      <Skills onUpdate={handleProfileUpdated} />
      <Projects onUpdate={handleProfileUpdated} />

      <p className="text-gray-600 mb-6">
        Create your Personal Profile
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
          <div className="mt-8 text-center">
  <button
    onClick={handleDelete}
    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-5 rounded-lg transition-colors duration-200"
  >
    Delete Account
  </button>
</div>

        </>
      )}
    </div>
    
  );
}

export default ProfilePage;